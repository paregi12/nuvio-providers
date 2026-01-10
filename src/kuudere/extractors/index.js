import { getZenStream } from './zen.js';
import { getStreamWish } from './streamwish.js';
import { getVidhideStream } from './vidhide.js';
import { getDoodstream } from './doodstream.js';
import { getMp4Upload } from './mp4upload.js';
import { getKumiStream } from './kumi.js';

export async function extractStreams(links) {
    const streams = [];
    
    for (const link of links) {
        try {
            const serverName = link.serverName;
            const embedUrl = link.dataLink;
            
            let extractionResult = null;
            let quality = 'Auto';
            let headers = {};

            // Normalize server name for matching
            const sName = serverName.toLowerCase();

            // Prioritize specific extractors
            if (sName.includes('zen')) {
                extractionResult = await getZenStream(embedUrl);
                quality = '1080p';
                headers = { "Referer": "https://zencloudz.cc/" };
            } 
            else if (sName.includes('wish') || sName.includes('s-wish') || sName.includes('h-wish')) {
                extractionResult = await getStreamWish(embedUrl);
                headers = { "Referer": new URL(embedUrl).origin };
            } 
            else if (sName.includes('vidhide') || sName.includes('s-hide') || sName.includes('h-hide')) {
                extractionResult = await getVidhideStream(embedUrl);
                headers = { "Referer": new URL(embedUrl).origin };
            } 
            else if (sName.includes('doodstream')) {
                extractionResult = await getDoodstream(embedUrl);
                headers = { "Referer": "https://dood.li/" };
            } 
            else if (sName.includes('mp4upload')) {
                extractionResult = await getMp4Upload(embedUrl);
                headers = { "Referer": "https://www.mp4upload.com/" };
            }
            else if (sName.startsWith('kumi')) {
                extractionResult = await getKumiStream(embedUrl);
                headers = { "Referer": new URL(embedUrl).origin };
            }

            if (extractionResult && extractionResult.url) {
                const directUrl = extractionResult.url;
                const subtitles = extractionResult.subtitles || [];

                streams.push({
                    name: `Kuudere (${serverName})`,
                    title: `${link.dataType.toUpperCase()} - Direct`,
                    url: directUrl,
                    quality: quality,
                    headers: headers,
                    subtitles: subtitles
                });
            } else {
                // Fallback / Embed Logic
                // Include ALL links as embeds if extraction fails, 
                // rather than filtering out "knownTypes".
                streams.push({
                    name: `Kuudere (${serverName})`,
                    title: `${link.dataType.toUpperCase()} - Embed`,
                    url: embedUrl,
                    quality: "Auto",
                    headers: { "Referer": "https://kuudere.ru/" }
                });
            }
        } catch (error) {
            // Silently ignore individual link errors
        }
    }
    
    return streams;
}
