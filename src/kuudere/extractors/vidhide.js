import axios from 'axios';
import { USER_AGENT } from '../constants.js';

export async function getVidhideStream(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: {
                'Referer': 'https://kuudere.to/',
                'User-Agent': USER_AGENT
            }
        });
        const html = response.data;
        
        // Vidhide/Hide variants usually use the same file: "..." or sources: [...] pattern
        const m3u8Match = html.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/) || 
                          html.match(/file\s*:\s*"([^"]+\.txt[^"]*)"/) ||
                          html.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
        
        if (m3u8Match) return m3u8Match[1];

        // Check for packed logic
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\).+?\)\)/);
        if (packedMatch) {
            const innerM3u8 = packedMatch[0].match(/https?:\/\/[^"']+\.m3u8/);
            if (innerM3u8) return innerM3u8[0];
        }

        return null;
    } catch (error) {
        return null;
    }
}
