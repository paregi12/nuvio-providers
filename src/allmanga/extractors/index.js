import { decrypt } from '../utils.js';
import { request } from '../http.js';
import { BASE_URL } from '../constants.js';

export async function extractStreams(sourceUrls) {
    const streams = [];

    try {
        const versionRes = await request('get', `${BASE_URL}/getVersion`);
        const endPoint = versionRes.data.episodeIframeHead;
        const endPointUrl = new URL(endPoint);

        for (const source of sourceUrls) {
            let url = source.sourceUrl;
            
            if (url.startsWith('--')) {
                url = decrypt(url);
            }

            if (url.includes('/clock')) {
                const clockUrl = url.replace('/clock?', '/clock.json?');
                const finalUrl = clockUrl.startsWith('http') ? clockUrl : `${endPoint}${clockUrl}`;

                try {
                    const res = await request('get', finalUrl, {
                        headers: {
                            'Accept': '*/*',
                            'Origin': endPoint,
                            'Referer': `${endPoint}/`,
                            'Host': endPointUrl.host
                        }
                    });

                    const data = res.data;
                    if (data && data.links) {
                        for (const link of data.links) {
                            let videoUrl = link.link;
                            
                            // Specific fix for SharePoint links - they often need these headers to work
                            const videoHeaders = {
                                'Referer': `${endPoint}/`,
                                'Origin': endPoint,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
                            };

                            if (link.mp4 || link.hls) {
                                streams.push({
                                    url: videoUrl,
                                    quality: link.resolutionStr || 'Auto',
                                    type: link.hls ? 'hls' : 'mp4',
                                    name: `AllManga (${source.sourceName})`,
                                    headers: videoHeaders
                                });
                            }
                        }
                    }
                } catch (e) {
                    // console.error(`[AllManga] Clock request failed: ${finalUrl}`, e.message);
                }
            } else if (url.startsWith('http')) {
                streams.push({
                    url: url,
                    quality: 'Unknown',
                    type: 'iframe',
                    name: source.sourceName
                });
            }
        }
    } catch (error) {
        console.error(`[AllManga] Extraction initialization failed:`, error.message);
    }

    return streams;
}