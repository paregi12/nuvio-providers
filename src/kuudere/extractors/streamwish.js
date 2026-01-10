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
    try {
        const response = await axios.get(embedUrl, {
            headers: {
                'Referer': 'https://kuudere.ru/',
                'User-Agent': USER_AGENT
            },
            timeout: 5000
        });
        
        let html = response.data;
        
        // Handle redirectors
        html = await handleRedirector(html, embedUrl);
        
        let streamUrl = null;

        // 1. Try unpacking first as it's the standard for StreamWish
        const unpacked = unPack(html);
        if (unpacked) {
            // Find the links object: var links={"hls2":"...", "hls3":"..."}
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

        // 2. Fallback to simple regex if unpacking failed or didn't yield a link
        if (!streamUrl) {
            const m3u8Match = html.match(/file\s*:\s*"([^"]+\.(?:m3u8|txt)[^"]*)"/) || 
                              html.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
            if (m3u8Match) {
                streamUrl = m3u8Match[1];
            }
        }

        if (!streamUrl) return null;

        // Resolve relative URLs
        if (streamUrl.startsWith('/')) {
            const origin = new URL(embedUrl).origin;
            streamUrl = origin + streamUrl;
        }

        return { url: streamUrl };

    } catch (error) {
        return null;
    }
}
