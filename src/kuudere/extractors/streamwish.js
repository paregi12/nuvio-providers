import axios from 'axios';
import { USER_AGENT } from '../constants.js';

function extractSubtitlesFromUrl(url) {
    const subtitles = [];
    try {
        const urlObj = new URL(url);
        // caption_1, caption_2, etc.
        for (const [key, value] of urlObj.searchParams.entries()) {
            if (key.startsWith('caption_')) {
                const langCode = key.replace('caption_', '');
                subtitles.push({
                    url: value,
                    lang: `Caption ${langCode}`, // We don't know the language name, just index
                    label: `Caption ${langCode}`
                });
            }
        }
    } catch (e) {}
    return subtitles;
}

export async function getStreamWish(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: {
                'Referer': 'https://kuudere.to/',
                'User-Agent': USER_AGENT
            }
        });
        const html = response.data;
        
        let streamUrl = null;

        // Match m3u8 file
        const m3u8Match = html.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/) || 
                          html.match(/file\s*:\s*"([^"]+\.txt[^"]*)"/) ||
                          html.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
        
        if (m3u8Match) {
            streamUrl = m3u8Match[1];
        } else {
            // Match Packed
            const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\).+?\)\)/);
            if (packedMatch) {
                const innerM3u8 = packedMatch[0].match(/https?:\/\/[^"']+\.m3u8/);
                if (innerM3u8) streamUrl = innerM3u8[0];
            }
        }

        if (!streamUrl) return null;

        const subtitles = extractSubtitlesFromUrl(embedUrl);
        return { url: streamUrl, subtitles };

    } catch (error) {
        return null;
    }
}
