// src/anichi/extractors.js

// JavaScript port of the Packer (p,a,c,k,e,d) unpacker
export function unpack(code) {
    try {
        const match = code.match(/}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|\7\)/);
        if (match) {
            let [_, quote1, p, a, c, quote2, kStr] = match;
            p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            a = parseInt(a);
            c = parseInt(c);
            const k = kStr.split('|');
            const e = (c) => (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
            const d = {};
            while (c--) d[e(c)] = k[c] || e(c);
            return p.replace(/\b\w+\b/g, (w) => d[w]);
        }
    } catch (e) {
        console.error('[Anichi Extractor] Unpack error:', e.message);
    }
    return code;
}

// Cryptography/Encoding helpers for WebCrypto and Base64
function base64ToBytes(b64) {
    if (typeof atob !== 'undefined') {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i) & 0xff;
        }
        return bytes;
    }
    if (typeof Buffer !== 'undefined') {
        const buf = Buffer.from(b64, 'base64');
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
    }
    throw new Error("Base64 decoding not supported in this environment");
}

function b64UrlDecode(s) {
    const fixed = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (fixed.length % 4)) % 4;
    const padded = fixed + '='.repeat(pad);
    return base64ToBytes(padded);
}

function utf8Decode(bytes) {
    if (typeof TextDecoder !== "undefined") {
        return new TextDecoder().decode(bytes);
    }
    let out = "";
    for (let i = 0; i < bytes.length;) {
        const b0 = bytes[i++];
        if (b0 < 0x80) {
            out += String.fromCharCode(b0);
        } else if (b0 >= 0xc0 && b0 < 0xe0) {
            const b1 = bytes[i++] & 0x3f;
            out += String.fromCharCode(((b0 & 0x1f) << 6) | b1);
        } else if (b0 >= 0xe0 && b0 < 0xf0) {
            const b1 = bytes[i++] & 0x3f;
            const b2 = bytes[i++] & 0x3f;
            out += String.fromCharCode(((b0 & 0x0f) << 12) | (b1 << 6) | b2);
        } else {
            const b1 = bytes[i++] & 0x3f;
            const b2 = bytes[i++] & 0x3f;
            const b3 = bytes[i++] & 0x3f;
            let code = ((b0 & 0x07) << 18) | (b1 << 12) | (b2 << 6) | b3;
            code -= 0x10000;
            out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
        }
    }
    return out;
}

function buildAesKey(playback) {
    const p1 = b64UrlDecode(playback.key_parts[0]);
    const p2 = b64UrlDecode(playback.key_parts[1]);
    const keyBytes = new Uint8Array(p1.length + p2.length);
    keyBytes.set(p1, 0);
    keyBytes.set(p2, p1.length);
    return keyBytes;
}

async function decryptPlayback(playback) {
    const keyBytes = buildAesKey(playback);
    const ivBytes = b64UrlDecode(playback.iv);
    const cipherBytes = b64UrlDecode(playback.payload);
    
    let webCrypto;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        webCrypto = crypto.subtle;
    } else {
        try {
            const nodeCrypto = require('crypto');
            if (nodeCrypto.webcrypto) {
                webCrypto = nodeCrypto.webcrypto.subtle;
            }
        } catch (e) {}
    }
    if (!webCrypto) {
        throw new Error("WebCrypto API is not available");
    }
    
    const cryptoKey = await webCrypto.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );
    
    const plainBuffer = await webCrypto.decrypt(
        {
            name: "AES-GCM",
            iv: ivBytes,
            tagLength: 128
        },
        cryptoKey,
        cipherBytes
    );
    
    const jsonStr = utf8Decode(new Uint8Array(plainBuffer)).trim();
    const cleanJson = jsonStr.startsWith("\uFEFF") ? jsonStr.substring(1) : jsonStr;
    const data = JSON.parse(cleanJson);
    return data.sources?.[0]?.url || null;
}

async function decryptAesCbc(cipherHex, keyStr, ivStr) {
    const keyBytes = new TextEncoder().encode(keyStr);
    const ivBytes = new TextEncoder().encode(ivStr);
    
    // Parse hex to Uint8Array
    const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    let webCrypto;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        webCrypto = crypto.subtle;
    } else {
        try {
            const nodeCrypto = require('crypto');
            if (nodeCrypto.webcrypto) {
                webCrypto = nodeCrypto.webcrypto.subtle;
            }
        } catch (e) {}
    }
    if (!webCrypto) {
        throw new Error("WebCrypto API is not available");
    }
    
    const cryptoKey = await webCrypto.importKey(
        "raw",
        keyBytes,
        { name: "AES-CBC" },
        false,
        ["decrypt"]
    );
    
    const plainBuffer = await webCrypto.decrypt(
        {
            name: "AES-CBC",
            iv: ivBytes
        },
        cryptoKey,
        cipherBytes
    );
    
    return utf8Decode(new Uint8Array(plainBuffer));
}

function getBaseUrl(url) {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
}

function getCodeFromUrl(url) {
    const u = new URL(url);
    const path = u.pathname;
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
}

async function getDetails(mainUrl) {
    const base = getBaseUrl(mainUrl);
    const code = getCodeFromUrl(mainUrl);
    const url = `${base}/api/videos/${code}/embed/details`;
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": mainUrl
        }
    });
    if (!res.ok) return null;
    return await res.json();
}

async function getPlayback(mainUrl) {
    const details = await getDetails(mainUrl);
    if (!details || !details.embed_frame_url) return null;
    const embedFrameUrl = details.embed_frame_url;
    const embedBase = getBaseUrl(embedFrameUrl);
    const code = getCodeFromUrl(embedFrameUrl);
    const playbackUrl = `${embedBase}/api/videos/${code}/embed/playback`;

    const headers = {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.5",
        "referer": embedFrameUrl,
        "x-embed-parent": embedFrameUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    };

    let res = await fetch(playbackUrl, { headers });
    if (res.status === 200) {
        return await res.json();
    } else {
        const postHeaders = {
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Content-Type": "application/json",
            "Referer": embedFrameUrl,
            "X-Embed-Parent": mainUrl,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        };
        const body = JSON.stringify({ fingerprint: {} });
        res = await fetch(playbackUrl, {
            method: 'POST',
            headers: postHeaders,
            body
        });
        if (res.ok) {
            return await res.json();
        }
    }
    return null;
}

export async function extractBysekoze(url) {
    try {
        const playbackRoot = await getPlayback(url);
        if (!playbackRoot || !playbackRoot.playback) return null;
        return await decryptPlayback(playbackRoot.playback);
    } catch (e) {
        console.error(`[Anichi Extractor] Bysekoze error: ${e.message}`);
    }
    return null;
}

export async function extractStreamWish(url) {
    try {
        const embedUrl = url.includes('/e/') ? url : url.replace('/f/', '/e/');
        const res = await fetch(embedUrl);
        if (!res.ok) return null;
        const html = await res.text();
        
        // Find packed script
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/g);
        if (packedMatch) {
            for (const script of packedMatch) {
                const unpacked = unpack(script);
                const fileMatch = unpacked.match(/file\s*:\s*["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.m3u8(?:\?[^"'\s]*)?)["']/);
                if (fileMatch) {
                    return fileMatch[1];
                }
            }
        }
        
        // Fallback: search for direct m3u8 in html
        const m3u8Match = html.match(/["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.m3u8(?:\?[^"'\s]*)?)["']/);
        if (m3u8Match) return m3u8Match[1];
    } catch (e) {
        console.error(`[Anichi Extractor] Streamwish error: ${e.message}`);
    }
    return null;
}

export async function extractFilemoon(url) {
    try {
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": url
        };
        let res = await fetch(url, { headers });
        if (!res.ok) return null;
        let html = await res.text();
        
        // Follow nested iframe if present
        const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        if (iframeMatch) {
            const iframeUrl = iframeMatch[1];
            const iframeHeaders = {
                "User-Agent": headers["User-Agent"],
                "Referer": url,
                "Accept-Language": "en-US,en;q=0.5"
            };
            res = await fetch(iframeUrl, { headers: iframeHeaders });
            if (res.ok) {
                html = await res.text();
            }
        }
        
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/g);
        if (packedMatch) {
            for (const script of packedMatch) {
                const unpacked = unpack(script);
                const fileMatch = unpacked.match(/file\s*:\s*["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.m3u8(?:\?[^"'\s]*)?)["']/) ||
                                  unpacked.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"'\s]+)["']/);
                if (fileMatch) {
                    return fileMatch[1];
                }
            }
        }
        
        const m3u8Match = html.match(/["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.m3u8(?:\?[^"'\s]*)?)["']/);
        if (m3u8Match) return m3u8Match[1];
    } catch (e) {
        console.error(`[Anichi Extractor] Filemoon error: ${e.message}`);
    }
    return null;
}

export async function extractOkRu(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const html = await res.text();
        
        // Find data-options
        const dataOptionsMatch = html.match(/data-options="([^"]+)"/);
        if (dataOptionsMatch) {
            const unescaped = dataOptionsMatch[1]
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
            
            const options = JSON.parse(unescaped);
            const metadataStr = options.flashvars?.metadata;
            if (metadataStr) {
                const metadata = JSON.parse(metadataStr);
                const videos = metadata.videos || [];
                const qualityOrder = { "odnoklassniki": 6, "hd": 5, "sd": 4, "low": 3, "lowest": 2, "mobile": 1 };
                videos.sort((a, b) => (qualityOrder[b.name] || 0) - (qualityOrder[a.name] || 0));
                
                if (videos.length > 0 && videos[0].url) {
                    return {
                        url: videos[0].url,
                        quality: videos[0].name === 'hd' ? '720p' : videos[0].name === 'sd' ? '480p' : 'Unknown'
                    };
                }
            }
        }
    } catch (e) {
        console.error(`[Anichi Extractor] OkRu error: ${e.message}`);
    }
    return null;
}

export async function extractMp4Upload(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const html = await res.text();
        
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/g);
        if (packedMatch) {
            for (const script of packedMatch) {
                const unpacked = unpack(script);
                const srcMatch = unpacked.match(/player\.src\(\s*\{\s*src\s*:\s*["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.mp4(?:\?[^"'\s]*)?)["']/) ||
                                 unpacked.match(/player\.src\(\s*["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.mp4(?:\?[^"'\s]*)?)["']/) ||
                                 unpacked.match(/src\s*:\s*["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.mp4(?:\?[^"'\s]*)?)["']/);
                if (srcMatch) {
                    return srcMatch[1];
                }
            }
        }
        
        const mp4Match = html.match(/["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.mp4(?:\?[^"'\s]*)?)["']/);
        if (mp4Match) return mp4Match[1];
    } catch (e) {
        console.error(`[Anichi Extractor] Mp4Upload error: ${e.message}`);
    }
    return null;
}

export async function extractVidStack(url) {
    try {
        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0"
        };
        const hash = url.split('#').pop().split('/').pop();
        const baseurl = getBaseUrl(url);

        const res = await fetch(`${baseurl}/api/v1/video?id=${hash}`, { headers });
        if (!res.ok) return null;
        const encoded = (await res.text()).trim();

        const key = "kiemtienmua911ca";
        const ivs = ["1234567890oiuytr", "0123456789abcdef"];
        
        let decryptedText = null;
        for (const iv of ivs) {
            try {
                decryptedText = await decryptAesCbc(encoded, key, iv);
                if (decryptedText) break;
            } catch (err) {
                // Ignore and try next IV
            }
        }
        
        if (!decryptedText) {
            console.error("[Anichi Extractor] Vidstack decryption failed with all IVs");
            return null;
        }

        const sourceMatch = decryptedText.match(/"source"\s*:\s*"(.*?)"/);
        if (sourceMatch) {
            const m3u8 = sourceMatch[1].replace(/\\/g, '');
            return m3u8;
        }
    } catch (e) {
        console.error(`[Anichi Extractor] Vidstack error: ${e.message}`);
    }
    return null;
}

export async function extractStreamLare(url) {
    try {
        const id = url.split('/').pop();
        const res = await fetch("https://streamlare.com/api/video/get", {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Referer": url
            },
            body: JSON.stringify({ id })
        });
        if (!res.ok) return null;
        const data = await res.json();
        const result = data.result || {};
        const qualities = Object.keys(result);
        if (qualities.length > 0) {
            const sorted = qualities.sort((a, b) => parseInt(b) - parseInt(a));
            const bestQuality = sorted[0];
            const file = result[bestQuality]?.file;
            if (file) {
                return file;
            }
        }
    } catch (e) {
        console.error(`[Anichi Extractor] Streamlare error: ${e.message}`);
    }
    return null;
}
