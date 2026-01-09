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
            let directUrl = null;
            let quality = 'Auto';
            let headers = {};

            // Prioritize specific extractors
            if (serverName === 'Zen' || serverName === 'Zen-2') {
                directUrl = await getZenStream(embedUrl);
                quality = '1080p';
                headers = { "Referer": "https://zencloudz.cc/" };
            } 
            else if (serverName === 'StreamWish' || serverName === 'Streamwish' || serverName === 'S-Wish' || serverName === 'H-Wish') {
                directUrl = await getStreamWish(embedUrl);
                headers = { "Referer": new URL(embedUrl).origin };
            } 
            else if (serverName === 'Vidhide' || serverName === 'S-Hide' || serverName === 'H-Hide') {
                directUrl = await getVidhideStream(embedUrl);
                headers = { "Referer": new URL(embedUrl).origin };
            } 
            else if (serverName === 'Doodstream') {
                directUrl = await getDoodstream(embedUrl);
                headers = { "Referer": "https://dood.li/" };
            } 
            else if (serverName === 'Mp4upload') {
                directUrl = await getMp4Upload(embedUrl);
                headers = { "Referer": "https://www.mp4upload.com/" };
            }
            else if (serverName.startsWith('Kumi')) {
                directUrl = await getKumiStream(embedUrl);
                headers = { "Referer": new URL(embedUrl).origin };
            }

            if (directUrl) {
                streams.push({
                    name: `Kuudere (${serverName})`,
                    title: `${link.dataType.toUpperCase()} - Direct`,
                    url: directUrl,
                    quality: quality,
                    headers: headers
                });
            } else {
                // If extraction failed or it's a server we only support via embed (like Kumi for now)
                const embedServers = ['Kumi', 'Kumi-v2', 'Kumi-v3', 'Kumi-v4'];
                const isEmbedOnly = embedServers.includes(serverName);
                
                // For Kumi, always show embed. For others, only if they aren't known broken.
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
            // Silently ignore individual link errors to not break the whole process
        }
    }
    
    return streams;
}