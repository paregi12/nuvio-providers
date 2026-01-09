import axios from 'axios';
import CryptoJS from 'crypto-js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Helper to resolve Zen values
function resolveValue(idx, dataArray, visited = new Set()) {
    if (visited.has(idx)) return null;
    visited.add(idx);

    const val = dataArray[idx];
    if (typeof val === 'number') {
        if (dataArray[val] !== undefined) return resolveValue(val, dataArray, visited);
        return val;
    }
    if (Array.isArray(val)) return val.map(i => typeof i === 'number' ? resolveValue(i, dataArray, new Set(visited)) : i);
    if (val && typeof val === 'object') {
        const obj = {};
        for (const [k, v] of Object.entries(val)) {
            obj[k] = typeof v === 'number' ? resolveValue(v, dataArray, new Set(visited)) : v;
        }
        return obj;
    }
    return val;
}

function findKeyInObj(obj, key) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj[key]) return obj[key];
    for (const k in obj) {
        const res = findKeyInObj(obj[k], key);
        if (res) return res;
    }
    return null;
}

// --- Zen Extractor ---
async function getZenStream(embedUrl) {
    try {
        const urlObj = new URL(embedUrl);
        const dataUrl = `${urlObj.origin}${urlObj.pathname.replace(/\/e\//, '/e/')}/__data.json${urlObj.search}`;
        
        const response = await axios.get(dataUrl, {
            headers: {
                'Referer': 'https://kuudere.ru/',
                'User-Agent': USER_AGENT
            }
        });
        const data = response.data;

        const node = data.nodes.find(n => n && n.data && n.data.some(item => item && item.obfuscation_seed));
        if (!node) return null;

        const dataArray = node.data;
        const metaIdx = dataArray.findIndex(item => item && item.obfuscation_seed);
        const meta = dataArray[metaIdx];
        const seed = dataArray[meta.obfuscation_seed];
        
        const hash = CryptoJS.SHA256(seed).toString();
        const fields = {
            keyField: `kf_${hash.substring(8, 16)}`,
            ivField: `ivf_${hash.substring(16, 24)}`,
            tokenField: `${hash.substring(48, 64)}_${hash.substring(56, 64)}`
        };

        const resolvedMeta = resolveValue(metaIdx, dataArray);
        const encryptedKey = findKeyInObj(resolvedMeta, fields.keyField);
        const encryptedIv = findKeyInObj(resolvedMeta, fields.ivField);
        const token = resolvedMeta[fields.tokenField];

        if (!token || !encryptedKey || !encryptedIv) return null;

        const manifestRes = await axios.get(`${urlObj.origin}/api/m3u8/${token}`, {
            headers: {
                'Referer': embedUrl,
                'User-Agent': USER_AGENT,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        const encryptedB64 = manifestRes.data.video_b64;

        const key = CryptoJS.enc.Base64.parse(encryptedKey);
        const iv = CryptoJS.enc.Base64.parse(encryptedIv);
        const ciphertext = CryptoJS.enc.Base64.parse(encryptedB64);

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );

        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        return null;
    }
}

// --- StreamWish / Vidhide ---
async function getStreamWish(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: {
                'Referer': 'https://kuudere.to/',
                'User-Agent': USER_AGENT
            }
        });
        const html = response.data;
        
        // Match m3u8 file
        const m3u8Match = html.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/) || 
                          html.match(/file\s*:\s*"([^"]+\.txt[^"]*)"/) ||
                          html.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
        
        if (m3u8Match) return m3u8Match[1];

        // Match Packed
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\).+?\)\)/);
        if (packedMatch) {
            // Very basic unpack or regex on packed content is hard.
            // But often the m3u8 url is inside.
            // We can try to regex the packed string for .m3u8
            const innerM3u8 = packedMatch[0].match(/https?:\/\/[^"']+\.m3u8/);
            if (innerM3u8) return innerM3u8[0];
        }

        return null;
    } catch (error) {
        return null;
    }
}

// --- Doodstream Extractor ---
async function getDoodstream(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const html = response.data;
        
        const md5Match = html.match(/\/pass_md5\/([^']*)/);
        if (!md5Match) return null;
        
        const token = md5Match[1];
        const md5Url = `${new URL(embedUrl).origin}/pass_md5/${token}`;
        
        const md5Res = await axios.get(md5Url, {
            headers: { 'Referer': embedUrl, 'User-Agent': USER_AGENT }
        });
        const urlPart = md5Res.data;
        
        // Random string suffix logic from Doodstream player
        const randomString = (length) => {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return result;
        };
        
        return `${urlPart}${randomString(10)}?token=${token}&expiry=${Date.now()}`;
    } catch (error) {
        return null;
    }
}

// --- Mp4Upload Extractor ---
async function getMp4Upload(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const html = response.data;
        
        const srcMatch = html.match(/src\s*:\s*"([^"]+\.mp4)"/);
        return srcMatch ? srcMatch[1] : null;
    } catch (error) {
        return null;
    }
}

// --- Main Extraction Function ---
export async function extractStreams(links) {
    const streams = [];
    
    for (const link of links) {
        try {
            const serverName = link.serverName;
            const embedUrl = link.dataLink;
            let directUrl = null;
            let quality = 'Auto';
            let headers = {};

            // Prioritize specific extractors
            if (serverName.startsWith('Zen')) {
                directUrl = await getZenStream(embedUrl);
                quality = '1080p';
                headers = { "Referer": "https://zencloudz.cc/" };
            } else if (serverName.includes('Wish') || serverName === 'Streamwish') {
                directUrl = await getStreamWish(embedUrl);
                headers = { "Referer": new URL(embedUrl).origin };
            } else if (serverName.includes('Hide') || serverName === 'Vidhide') {
                directUrl = await getStreamWish(embedUrl); // Vidhide often same structure
                headers = { "Referer": new URL(embedUrl).origin };
            } else if (serverName.includes('Dood') || serverName === 'Doodstream') {
                directUrl = await getDoodstream(embedUrl);
                headers = { "Referer": "https://dood.li/" };
            } else if (serverName.includes('Mp4') || serverName === 'Mp4upload') {
                directUrl = await getMp4Upload(embedUrl);
                headers = { "Referer": "https://www.mp4upload.com/" };
            }

            // Only add if we have a direct URL from a known extractor
            if (directUrl) {
                streams.push({
                    name: `Kuudere (${serverName})`,
                    title: `${link.dataType.toUpperCase()} - Direct`,
                    url: directUrl,
                    quality: quality,
                    headers: headers
                });
            } else {
                // FALLBACK STRATEGY
                // If it's a known server type but extraction failed, DO NOT add it (to avoid "not present" errors).
                // If it's an unknown server type, fallback to adding the embed link.
                
                const knownTypes = ['Zen', 'Kumi', 'Wish', 'Hide', 'Streamwish', 'Vidhide', 'Dood', 'Mp4'];
                const isKnown = knownTypes.some(t => serverName.includes(t));
                
                if (!isKnown) {
                     streams.push({
                        name: `Kuudere (${serverName})`,
                        title: `${link.dataType.toUpperCase()} - Embed`,
                        url: embedUrl,
                        quality: "Auto",
                        headers: { "Referer": "https://kuudere.ru/" }
                    });
                }
            }
        } catch (error) {
            console.error(`[Kuudere] Extraction error for ${link.serverName}:`, error.message);
        }
    }
    
    return streams;
}