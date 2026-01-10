import axios from 'axios';
import { USER_AGENT } from '../constants.js';

function extractSubtitlesFromUrl(url) {
    const subtitles = [];
    try {
        const urlObj = new URL(url);
        for (const [key, value] of urlObj.searchParams.entries()) {
            if (key.startsWith('caption_')) {
                const langCode = key.replace('caption_', '');
                subtitles.push({
                    url: value,
                    lang: `Caption ${langCode}`,
                    label: `Caption ${langCode}`
                });
            }
        }
    } catch (e) {}
    return subtitles;
}

// Basic Dean Edwards Unpacker
function unPack(code) {
    try {
        const packerMatch = code.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\((.*)\)\)/);
        if (packerMatch) {
            const argsMatch = packerMatch[1].match(/'(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/);
            if (argsMatch) {
                let [_, p, a, c, k] = argsMatch;
                a = parseInt(a);
                c = parseInt(c);
                k = k.split('|');
                
                const e = function(c) {
                    return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
                };
                
                if (true) {
                    const dict = {};
                    while (c--) {
                        dict[e(c)] = k[c] || e(c);
                    }
                    k = [function(c) { return dict[c]; }];
                    c = 1;
                }
                
                while (c--) {
                    if (k[c]) {
                        p = p.replace(new RegExp('\\b\\w+\\b', 'g'), function(e) {
                            return k[c](e) || e;
                        });
                    }
                }
                return p;
            }
        }
    } catch (e) {}
    return null;
}

export async function getVidhideStream(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: {
                'Referer': 'https://kuudere.ru/',
                'User-Agent': USER_AGENT
            }
        });
        const html = response.data;
        
        let streamUrl = null;

        // 1. Check for simple file: "..." match first
        const m3u8Match = html.match(/file\s*:\s*"([^"]+\.(?:m3u8|txt)[^"]*)"/) || 
                          html.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
        
        if (m3u8Match) {
            streamUrl = m3u8Match[1];
        } else {
            // 2. Check for Packed content
            const unpacked = unPack(html);
            if (unpacked) {
                // Try to find the links object: var links={"hls2":"...", "hls3":"..."}
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
        }

        if (!streamUrl) return null;

        // Resolve relative URLs
        if (streamUrl.startsWith('/')) {
            const origin = new URL(embedUrl).origin;
            streamUrl = origin + streamUrl;
        }

        const subtitles = extractSubtitlesFromUrl(embedUrl);
        return { url: streamUrl, subtitles };

    } catch (error) {
        return null;
    }
}