import axios from 'axios';
import { USER_AGENT } from '../constants.js';

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

export async function getMp4Upload(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: { 
                'User-Agent': USER_AGENT,
                'Referer': 'https://kuudere.ru/'
            }
        });
        const html = response.data;
        
        let srcMatch = html.match(/src\s*:\s*"([^"]+\.mp4)"/);
        
        if (!srcMatch) {
            const unpacked = unPack(html);
            if (unpacked) {
                srcMatch = unpacked.match(/src\s*:\s*"([^"]+\.mp4)"/);
            }
        }

        return srcMatch ? { url: srcMatch[1], subtitles: [] } : null;
    } catch (error) {
        return null;
    }
}
