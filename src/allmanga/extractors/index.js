import { decrypt } from '../utils.js';
import { BLOG_URL } from '../constants.js';
import { request } from '../http.js';

export async function extractStreams(sourceUrls) {
    const streams = [];

    for (const source of sourceUrls) {
        let url = source.downloads?.downloadUrl || source.sourceUrl;
        
        if (url.startsWith('--')) {
            url = decrypt(url);
        }

        if (url.startsWith('/apivtwo')) {
            url = `${BLOG_URL}${url}`;
        }

        // Standardize clock URL
        if (url.includes('/clock') && !url.includes('/clock/dr')) {
            url = url.replace('/clock', '/clock/dr');
        }

        try {
            if (url.includes('allanime.day/apivtwo/clock') || url.includes('/apivtwo/clock')) {
                const res = await request('get', url);
                if (res.data && res.data.links) {
                    res.data.links.forEach(link => {
                        streams.push({
                            url: link.link,
                            quality: link.resolution ? `${link.resolution}p` : 'Auto',
                            type: link.hls ? 'hls' : 'mp4',
                            name: `AllManga (${source.sourceName})`
                        });
                    });
                }
            } else if (url.includes('filemoon') || url.includes('gogo-stream') || url.includes('mp4upload') || url.includes('ok.ru') || url.includes('streamwish')) {
                streams.push({
                    url: url,
                    quality: 'Unknown',
                    type: 'iframe',
                    name: source.sourceName
                });
            } else if (url.startsWith('http')) {
                streams.push({
                    url: url,
                    quality: 'Auto',
                    type: url.includes('.m3u8') ? 'hls' : 'mp4',
                    name: source.sourceName
                });
            }
        } catch (e) {
            // Skip failed extractions
        }
    }

    return streams;
}