import axios from 'axios';
import { USER_AGENT } from '../constants.js';

/**
 * StreamWish Extractor - Decrypts stream information from StreamWish servers.
 * Handles both direct embeds and redirectors (e.g., kravaxxa.com).
 */

function unPack(code) {
    try {
        // More robust Packer detection
        const packerMatch = code.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\((.*)\)\)/s);
        if (!packerMatch) return null;

        const argsContent = packerMatch[1];
        
        // Robust argument splitting for Packer
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
            if (!kMatch) return null;
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
    } catch (e) {
        // Silently ignore errors
    }
    return null;
}

async function handleRedirector(html, embedUrl) {
    // Detect if this is a JS-based redirector (like kravaxxa.com)
    if (html.includes('main.js?v=1.1.3') || html.includes('Page is loading, please wait...')) {
        const urlObj = new URL(embedUrl);
        // Known StreamWish target domains
        const targets = ['hgplaycdn.com', 'wishembed.com', 'strwish.com', 'dwish.pro', 'awish.pro', 'hlswish.com'];
        
        for (const target of targets) {
            if (target === urlObj.hostname) continue;
            
            const newUrl = `https://${target}${urlObj.pathname}${urlObj.search}`;
            try {
                const res = await axios.get(newUrl, {
                    headers: { 'Referer': 'https://kuudere.ru/', 'User-Agent': USER_AGENT },
                    timeout: 3000
                });
                if (res.data.includes('jwplayer') || res.data.includes('eval(function(p,a,c,k,e,d)')) {
                    return res.data;
                }
            } catch (e) {
                // Continue to next target
            }
        }
    }
    return html;
}

export async function getStreamWish(embedUrl) {
    let finalHtml = null;
    let finalUrl = embedUrl;

    // 1. Follow Redirects / Resolve Final URL
    // Some StreamWish links are just redirectors. We need the final player page.
    try {
        const response = await axios.get(embedUrl, {
            headers: {
                'Referer': 'https://kuudere.ru/',
                'User-Agent': USER_AGENT
            },
            timeout: 5000,
            maxRedirects: 5,
            validateStatus: status => status >= 200 && status < 400
        });
        
        finalHtml = response.data;
        // In case axios followed HTTP redirects automatically, use the final URL
        if (response.request && response.request.res && response.request.res.responseUrl) {
            finalUrl = response.request.res.responseUrl;
        }

        // Handle JS-based redirectors (like kravaxxa)
        const redirectedHtml = await handleRedirector(finalHtml, finalUrl);
        if (redirectedHtml !== finalHtml) {
             finalHtml = redirectedHtml;
        }

    } catch (error) {
        // If initial fetch fails, it might be strict referer. We'll try again in loop below.
    }

    // 2. Domain/Referer Rotation & Content Scraping
    // If we haven't successfully got player HTML (or want to retry with better referers)
    if (!finalHtml || (!finalHtml.includes('jwplayer') && !finalHtml.includes('eval(function'))) {
        let origin = '';
        try { origin = new URL(embedUrl).origin; } catch(e) {}
        
        const referers = [
            'https://kuudere.ru/', 
            'https://strwish.com/', 
            'https://streamwish.com/',
            origin
        ].filter(Boolean);

        for (const referer of referers) {
            try {
                const res = await axios.get(finalUrl, {
                    headers: {
                        'Referer': referer,
                        'User-Agent': USER_AGENT
                    },
                    timeout: 5000
                });
                if (res.data && (res.data.includes('jwplayer') || res.data.includes('eval(function'))) {
                    finalHtml = res.data;
                    break;
                }
            } catch (e) {
                // Try next referer
            }
        }
    }

    if (!finalHtml) return null;

    try {
        let streamUrl = null;

        // 3. Try unpacking first
        const unpacked = unPack(finalHtml);
        if (unpacked) {
            const hls4 = unpacked.match(/"hls4"\s*:\s*"([^"]+)"/);
            const hls3 = unpacked.match(/"hls3"\s*:\s*"([^"]+)"/);
            const hls2 = unpacked.match(/"hls2"\s*:\s*"([^"]+)"/);
            
            streamUrl = (hls4 && hls4[1]) || (hls3 && hls3[1]) || (hls2 && hls2[1]);

            if (!streamUrl) {
                const innerMatch = unpacked.match(/file\s*:\s*"([^"]+\.(?:m3u8|txt)[^"]*)"/) || 
                                   unpacked.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
                if (innerMatch) {
                    streamUrl = innerMatch[1];
                }
            }
        }

        // 4. Fallback to regex
        if (!streamUrl) {
            const m3u8Match = finalHtml.match(/file\s*:\s*"([^"]+\.(?:m3u8|txt)[^"]*)"/) || 
                              finalHtml.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
            if (m3u8Match) {
                streamUrl = m3u8Match[1];
            }
        }

        if (!streamUrl) return null;

        if (streamUrl.startsWith('/')) {
            const origin = new URL(finalUrl).origin;
            streamUrl = origin + streamUrl;
        }

        return { url: streamUrl };

    } catch (error) {
        return null;
    }
}
