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

            // Prioritize specific extractors
            if (serverName === 'Zen' || serverName === 'Zen-2') {
                extractionResult = await getZenStream(embedUrl);
                quality = '1080p';
                headers = { "Referer": "https://zencloudz.cc/" };
            } 
            else if (serverName === 'StreamWish' || serverName === 'Streamwish' || serverName === 'S-Wish' || serverName === 'H-Wish') {
                extractionResult = await getStreamWish(embedUrl);
                headers = { "Referer": new URL(embedUrl).origin };
            } 
            else if (serverName === 'Vidhide' || serverName === 'S-Hide' || serverName === 'H-Hide') {
                extractionResult = await getVidhideStream(embedUrl);
                headers = { "Referer": new URL(embedUrl).origin };
            } 
            else if (serverName === 'Doodstream') {
                extractionResult = await getDoodstream(embedUrl);
                headers = { "Referer": "https://dood.li/" };
            } 
            else if (serverName === 'Mp4upload') {
                extractionResult = await getMp4Upload(embedUrl);
                headers = { "Referer": "https://www.mp4upload.com/" };
            }
            else if (serverName.startsWith('Kumi')) {
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
                const embedServers = ['Kumi', 'Kumi-v2', 'Kumi-v3', 'Kumi-v4'];
                const isEmbedOnly = embedServers.includes(serverName);
                
                if (isEmbedOnly) {
                    streams.push({
                        name: `Kuudere (${serverName})`,
                        title: `${link.dataType.toUpperCase()} - Embed`,
                        url: embedUrl,
                        quality: "Auto",
                        headers: { "Referer": "https://kuudere.ru/" }
                    });
                } else {
                    // Filter out known types that failed extraction to keep list clean
                    const knownTypes = [
                        'Zen', 'Zen-2', 'StreamWish', 'Streamwish', 'S-Wish', 'H-Wish', 
                        'Vidhide', 'S-Hide', 'H-Hide', 'Doodstream', 'Mp4upload'
                    ];
                    
                    if (!knownTypes.includes(serverName)) {
                        streams.push({
                            name: `Kuudere (${serverName})`,
                            title: `${link.dataType.toUpperCase()} - Embed`,
                            url: embedUrl,
                            quality: "Auto",
                            headers: { "Referer": "https://kuudere.ru/" }
                        });
                    }
                }
            }
        } catch (error) {
            // Silently ignore individual link errors
        }
    }
    
    return streams;
}
