import { fetchText } from './utils.js';
import { HEADERS } from './constants.js';

// JavaScript port of the Packer (p,a,c,k,e,d) unpacker
export function unpack(code) {
    try {
        // More robust regex to find the 4 arguments: p, a, c, k
        const match = code.match(/}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|\7\)/);
        
        if (match) {
            let [_, quote1, p, a, c, quote2, kStr] = match;
            
            // UNESCAPE p - This is critical because it often contains \' instead of '
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
        console.error('[AnimePahe] Unpack error:', e.message);
    }
    return code;
}

export async function extractKwik(url) {
    try {
        const settings = globalThis.SCRAPER_SETTINGS || {};
        const baseUrl = settings.domain || "https://animepahe.com";

        // Fetch the kwik page directly (no proxy as it blocks kwik)
        // Referer must be the active AnimePahe server URL to prevent blocking
        const html = await fetchText(url, { 
            headers: { 
                ...HEADERS, 
                "Referer": `${baseUrl}/`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            useProxy: false 
        });
        
        // Find all script tags
        const scripts = html.match(/<script.*?>([\s\S]*?)<\/script>/g) || [];
        const matches = [];
        
        for (const script of scripts) {
            if (script.includes('eval(function(p,a,c,k,e,d)')) {
                let pos = 0;
                while (true) {
                    const start = script.indexOf('eval(function(p,a,c,k,e,d)', pos);
                    if (start === -1) break;
                    
                    const end = script.indexOf('.split(\'|\')', start);
                    if (end === -1) break;
                    
                    const closeParen = script.indexOf('))', end);
                    if (closeParen === -1) break;
                    
                    matches.push(script.substring(start, closeParen + 2));
                    pos = closeParen + 2;
                }
            }
        }
        
        for (const scriptContent of matches) {
            const unpacked = unpack(scriptContent);
            
            // Simplified and robust regex matching both single/double quoted m3u8 source URL
            const m3u8Match = unpacked.match(/source\s*=\s*'([^']+m3u8[^']*)'/) || 
                              unpacked.match(/source\s*=\s*"([^"]+m3u8[^"]*)"/);
            
            if (m3u8Match) {
                const m3u8Url = m3u8Match[1];
                
                // Extract title from HTML
                const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
                const title = titleMatch ? titleMatch[1].trim() : "video";
                const fileName = title.endsWith(".mp4") ? title : title + ".mp4";
                
                // Generate mp4Url like Phisher98
                const urlParts = m3u8Url.replace("/stream/", "/mp4/").split("/");
                urlParts.pop();
                const mp4Base = urlParts.join("/");
                const mp4Url = `${mp4Base}?file=${encodeURIComponent(fileName)}`;

                return {
                    m3u8: m3u8Url,
                    mp4: mp4Url,
                    headers: {
                        "Referer": "https://kwik.cx/",
                        "Origin": "https://kwik.cx",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                };
            }
        }
    } catch (e) {
        console.error('[AnimePahe] Kwik extraction failed:', e.message);
    }
    return null;
}

// Custom decryption for Pahe extractor
function paheDecrypt(fullString, key, v1, v2) {
    const keyIndexMap = {};
    for (let i = 0; i < key.length; i++) keyIndexMap[key[i]] = i;
    
    let result = "";
    let i = 0;
    const toFind = key[v2];

    while (i < fullString.length) {
        const nextIndex = fullString.indexOf(toFind, i);
        if (nextIndex === -1) break;
        
        let decodedCharStr = "";
        for (let j = i; j < nextIndex; j++) {
            decodedCharStr += keyIndexMap[fullString[j]];
        }

        i = nextIndex + 1;
        const decodedChar = String.fromCharCode(parseInt(decodedCharStr, v2) - v1);
        result += decodedChar;
    }

    return result;
}

export async function extractPahe(url) {
    try {
        const initUrl = url.endsWith('/i') ? url : `${url}/i`;
        
        // 1. Fetch initial url /i with redirect manual
        const initRes = await fetch(initUrl, {
            method: 'GET',
            redirect: 'manual',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://pahe.win/"
            }
        });
        
        const redirectLoc = initRes.headers.get('location') || initRes.headers.get('Location');
        if (!redirectLoc) return null;
        
        const kwikUrl = redirectLoc.startsWith('http') ? redirectLoc : `https://${redirectLoc.replace(/^\/+/, '')}`;
        
        // 2. Fetch kwik page with referer: "https://kwik.cx/"
        const kwikRes = await fetch(kwikUrl, {
            method: 'GET',
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://kwik.cx/"
            }
        });
        
        const html = await kwikRes.text();
        const setCookieHeader = kwikRes.headers.get('set-cookie') || kwikRes.headers.get('Set-Cookie');
        let cookie = '';
        if (setCookieHeader) {
            cookie = setCookieHeader.split(';')[0];
        }
        
        const kwikParamsRegex = /\("(\w+)",\d+,"(\w+)",(\d+),(\d+),\d+\)/;
        const match = html.match(kwikParamsRegex);
        if (!match) return null;
        
        const [_, fullString, key, v1, v2] = match;
        const decrypted = paheDecrypt(fullString, key, parseInt(v1), parseInt(v2));
        
        const actionMatch = decrypted.match(/action="([^"]+)"/);
        const tokenMatch = decrypted.match(/value="([^"]+)"/);
        
        if (!actionMatch || !tokenMatch) return null;
        
        const postUri = actionMatch[1];
        const token = tokenMatch[1];
        
        // Prepare POST form body
        const formData = new URLSearchParams();
        formData.append('_token', token);
        
        // 3. Post to the action URL to get 302 redirect
        let tries = 0;
        let postRes = null;
        let location = null;
        
        while (tries < 20) {
            postRes = await fetch(postUri, {
                method: 'POST',
                redirect: 'manual',
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Referer": kwikUrl,
                    "Cookie": cookie,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: formData.toString()
            });
            
            if (postRes.status === 302 || postRes.status === 301) {
                location = postRes.headers.get('location') || postRes.headers.get('Location');
                break;
            }
            tries++;
        }
        
        if (location) {
            return {
                url: location,
                headers: {
                    "Referer": "https://kwik.cx/",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            };
        }
    } catch (e) {
        console.error('[AnimePahe] Pahe extractor failed:', e.message);
    }
    return null;
}
