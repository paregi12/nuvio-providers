import axios from 'axios';
import CryptoJS from 'crypto-js';
import { USER_AGENT } from '../constants.js';

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

function extractSubtitlesFromData(data) {
    const subtitles = [];
    
    // 1. Direct API response structure
    const subLinks = data.subtitle_links || [];
    if (Array.isArray(subLinks)) {
        for (const sub of subLinks) {
            if (sub.url) {
                subtitles.push({
                    url: sub.url,
                    lang: sub.language || 'English',
                    label: sub.language || 'English'
                });
            }
        }
    }

    // 2. SvelteKit state structure (__data.json inside page)
    if (data.nodes) {
        for (const node of data.nodes) {
            if (node && node.data) {
                const dataArray = node.data;
                const meta = dataArray.find(item => item && (item.subtitles || item.tracks));
                if (meta) {
                    let subIndices = meta.subtitles || meta.tracks || [];
                    
                    if (typeof subIndices === 'number') {
                        subIndices = dataArray[subIndices] || [];
                    }

                    if (Array.isArray(subIndices)) {
                        for (const idx of subIndices) {
                            const sub = resolveValue(idx, dataArray);
                            if (sub && sub.url) {
                                subtitles.push({
                                    url: sub.url,
                                    lang: sub.language || sub.label || 'English',
                                    label: sub.language || sub.label || 'English'
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    return subtitles;
}

export async function getZenStream(embedUrl) {
    try {
        const urlObj = new URL(embedUrl);
        // Zen uses __data.json for metadata
        const dataUrl = `${urlObj.origin}${urlObj.pathname}/__data.json${urlObj.search}`;
        
        const response = await axios.get(dataUrl, {
            headers: {
                'Referer': 'https://kuudere.ru/',
                'User-Agent': USER_AGENT
            }
        });
        const data = response.data;

        // Subtitles are in plain data
        const subtitles = extractSubtitlesFromData(data);

        // AES logic for m3u8 token
        const node = data.nodes?.find(n => n && n.data && n.data.some(item => item && item.obfuscation_seed));
        if (!node) {
            return { url: null, subtitles };
        }

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

        if (!token || !encryptedKey || !encryptedIv) return { url: null, subtitles };

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

        const url = decrypted.toString(CryptoJS.enc.Utf8);

        return { url, subtitles };
    } catch (error) {
        return null;
    }
}