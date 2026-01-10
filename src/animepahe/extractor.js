import { fetchText } from './http.js';

/**
 * Robust Packer Unpacker
 */
function unpack(code) {
    try {
        const packerMatch = code.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\((.*)\)\)/s);
        if (!packerMatch) return code;

        const argsContent = packerMatch[1];
        const args = [];
        let currentArg = "";
        let inQuote = false;
        let quoteChar = "";
        let parenBalance = 0;

        for (let i = 0; i < argsContent.length; i++) {
            const char = argsContent[i];
            if (char === '\\' && inQuote) {
                currentArg += char + argsContent[++i];
                continue;
            }
            if ((char === "'" || char === '"' || char === '`') && (!inQuote || quoteChar === char)) {
                inQuote = !inQuote;
                quoteChar = inQuote ? char : "";
                currentArg += char;
                continue;
            }
            if (!inQuote) {
                if (char === '(') parenBalance++;
                if (char === ')') parenBalance--;
            }
            
            if (char === "," && !inQuote && parenBalance === 0) {
                args.push(currentArg.trim());
                currentArg = "";
            } else {
                currentArg += char;
            }
        }
        args.push(currentArg.trim());

        if (args.length >= 4) {
            let p = args[0].substring(1, args[0].length - 1);
            const a = parseInt(args[1]);
            const c = parseInt(args[2]);
            const kMatch = args[3].match(/['"](.*?)['"]/s);
            if (!kMatch) return code;
            const k = kMatch[1].split('|');

            const e = function(c) {
                return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
            };

            const dict = {};
            for (let i = 0; i < k.length; i++) {
                if (k[i]) dict[e(i)] = k[i];
            }

            return p.replace(/\b\w+\b/g, (word) => dict[word] || word);
        }
    } catch (e) {}
    return code;
}

/**
 * Decrypts Kwik's obfuscated parameters using the phisherrepo algorithm.
 */
function decryptWithKey(fullString, key, v1, v2) {
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

/**
 * Extracts the direct stream URL from a Kwik embed.
 */
export async function extractKwik(url) {
    console.log(`[Kwik] Extracting: ${url}`);
    
    let targetUrl = url;
    if (url.includes("pahe.win")) {
        try {
            const redirectResponse = await fetch(`${url}/i`, { 
                method: 'GET',
                redirect: 'manual',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
                }
            });
            if (redirectResponse.status === 302 || redirectResponse.status === 301) {
                const loc = redirectResponse.headers.get('location');
                if (loc) {
                    const lastHttpsIndex = loc.lastIndexOf("https://");
                    targetUrl = lastHttpsIndex !== -1 ? loc.substring(lastHttpsIndex) : loc;
                }
            }
        } catch (e) {}
    }

    console.log(`[Kwik] Final Target: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl, {
            headers: { 
                "Referer": "https://animepahe.si/",
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            }
        });
        const html = await response.text();
        const cookie = response.headers.get('set-cookie');

        // Check if blocked by DDoS-Guard
        if (html.includes("DDoS-Guard")) {
            console.log("[Kwik] Blocked by DDoS-Guard");
            return null;
        }

        // 1. Try unpacking first (most reliable for direct source)
        const unpacked = unpack(html);
        if (unpacked !== html) {
            const m3u8Match = unpacked.match(/source=\s*['"](.*?)['"]/);
            if (m3u8Match) return m3u8Match[1];
        }

        // 2. Modern Kwik POST Method
        const kwikParamsRegex = /\(\"(\w+)\",\d+,\"(\w+)\",(\d+),(\d+),\d+\)/;
        const paramsMatch = html.match(kwikParamsRegex);

        if (paramsMatch) {
            const [_, fullString, key, v1, v2] = paramsMatch;
            const decrypted = decryptWithKey(fullString, key, parseInt(v1), parseInt(v2));
            
            const uriMatch = decrypted.match(/action=\"([^\"]+)\"/);
            const tokenMatch = decrypted.match(/value=\"([^\"]+)\"/);

            if (uriMatch && tokenMatch) {
                const uri = uriMatch[1];
                const token = tokenMatch[1];
                
                for (let tries = 0; tries < 5; tries++) {
                    const postResp = await fetch(uri, {
                        method: "POST",
                        headers: {
                            "Referer": targetUrl,
                            "Cookie": cookie || "",
                            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: `_token=${token}`,
                        redirect: 'manual'
                    });

                    if (postResp.status === 302 || postResp.status === 301) {
                        return postResp.headers.get('location');
                    }
                }
            }
        }

        // 3. Simple Regex fallback
        const m3u8Match = html.match(/source=\s*['"](.*?)['"]/);
        if (m3u8Match) return m3u8Match[1];

    } catch (error) {
        console.error(`[Kwik] Extraction error: ${error.message}`);
    }

    return null;
}