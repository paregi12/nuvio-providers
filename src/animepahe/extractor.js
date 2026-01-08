import { fetchText } from './http.js';
import cheerio from 'cheerio-without-node-native';

// Dean Edwards Unpacker implementation
function detect(source) {
    return /eval\(function\(/.test(source);
}

function unpack(source) {
    try {
        let p, a, c, k, e, d;
        const regex = /eval\(function\(p,a,c,k,e,d\)\{.+?return p\}\('(.+?)',(\d+),(\d+),'(.+?)'\.split\('\|'\),0,\{\}\)/;
        const match = source.match(regex);
        
        if (!match) return source;
        
        p = match[1];
        a = parseInt(match[2]);
        c = parseInt(match[3]);
        k = match[4].split('|');
        
        // Decoding logic
        e = function(c) {
            return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
        };
        
        while (c--) {
            if (k[c]) {
                p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
            }
        }
        return p;
    } catch (err) {
        console.error("Unpack error", err);
        return source;
    }
}

// Pahe/Kwik Custom Decryptor
function decrypt(fullString, key, v1, v2) {
    let r = "";
    let i = 0;
    
    while (i < fullString.length) {
        let s = "";
        while (fullString[i] !== key[v2]) {
            s += key.indexOf(fullString[i]);
            i++;
        }
        let j = 0;
        while (j < fullString.length) {
            s = s.replace(key[v2], j);
            j++;
        }
        r += String.fromCharCode(parseInt(s, v2) - v1);
        i++;
    }
    return r;
}

// Fixed Decryptor based on Kotlin Logic
function decryptKotlinPort(fullString, key, v1, v2) {
    // keyIndexMap not needed if we use indexOf
    let sb = "";
    let i = 0;
    const toFind = key[v2];

    while (i < fullString.length) {
        const nextIndex = fullString.indexOf(toFind, i);
        if (nextIndex === -1) break;

        let decodedCharStr = "";
        for (let j = i; j < nextIndex; j++) {
            decodedCharStr += key.indexOf(fullString[j]);
        }

        i = nextIndex + 1;
        
        try {
            const decodedChar = String.fromCharCode(parseInt(decodedCharStr, v2) - v1);
            sb += decodedChar;
        } catch (e) {}
    }
    return sb;
}

export async function extractKwik(url) {
    console.log(`[Kwik] Extracting: ${url}`);
    
    // Handle Pahe redirect first
    let targetUrl = url;
    if (url.includes("pahe.win")) {
        try {
            // GET /i
            const redirectResponse = await fetch(`${url}/i`, { redirect: 'manual' });
            if (redirectResponse.status === 302 || redirectResponse.status === 301) {
                const loc = redirectResponse.headers.get('location');
                if (loc) {
                    // Kotlin logic: .substringAfterLast("https://")
                    // Example loc: https://image.thum.io/get/.../https://kwik.cx/f/DHJBozjF1Usc
                    const lastHttpsIndex = loc.lastIndexOf("https://");
                    if (lastHttpsIndex !== -1) {
                        targetUrl = loc.substring(lastHttpsIndex);
                    } else {
                        targetUrl = loc;
                    }
                }
            } else {
                const html = await redirectResponse.text();
            }
        } catch (e) {
            console.log("[Kwik] Pahe redirect check failed:", e);
        }
    }

    console.log(`[Kwik] Target URL: ${targetUrl}`);

    const response = await fetch(targetUrl, {
        headers: { "Referer": "https://animepahe.si/" }
    });
    const html = await response.text();
    const cookies = response.headers.get('set-cookie') || "";

    // 1. Try Simple Regex (m3u8)
    const m3u8Match = html.match(/source=\s*['"](.*?)['"]/);
    if (m3u8Match) return m3u8Match[1];

    // 2. Try Advanced Decryption (Kwik Params)
    // Regex: \("(\w+)",\d+,"(\w+)",(\d+),(\d+),\d+\
    const kwikParamsRegex = /\(\"(\w+)\",\d+,\"(\w+)\",(\d+),(\d+),\d+\)/;
    const paramsMatch = html.match(kwikParamsRegex);

    if (paramsMatch) {
        console.log("[Kwik] Found obfuscated parameters, decrypting...");
        const [_, fullString, key, v1, v2] = paramsMatch;
        const decrypted = decryptKotlinPort(fullString, key, parseInt(v1), parseInt(v2));
        
        // Extract URI and Token from decrypted string
        const uriMatch = decrypted.match(/action=\"([^\"]+)\"/);
        const tokenMatch = decrypted.match(/value=\"([^\"]+)\"/);

        if (uriMatch && tokenMatch) {
            const uri = uriMatch[1];
            const token = tokenMatch[1];
            
            console.log(`[Kwik] POST to ${uri} with token ${token}`);
            
            // POST to get redirect
            const postResp = await fetch(uri, {
                method: "POST",
                headers: {
                    "Referer": targetUrl,
                    "Cookie": cookies,
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: `_token=${token}`,
                redirect: 'manual' // We want the Location header
            });

            if (postResp.status === 302 || postResp.status === 301) {
                return postResp.headers.get('location');
            }
        }
    }

    // 3. Try Unpack (Dean Edwards) as last resort
    // ... existing logic ...
    if (detect(html)) {
        // ... (simplified for brevity, the advanced decrypt usually covers Kwik now)
        // If we found packed JS, unpack it and look for source/action
        const $ = cheerio.load(html);
        let found = null;
        $('script').each((i, el) => {
            const c = $(el).html();
            if (c && detect(c)) {
                const u = unpack(c);
                const m = u.match(/source=\s*['"](.*?)['"]/);
                if (m) found = m[1];
            }
        });
        if (found) return found;
    }

    return null;
}
