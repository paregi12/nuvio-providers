import { request } from './http.js';

export async function extractStreamUrls(videoId) {
    const streams = [];

    // 1. Try the new Play Service endpoint
    try {
        const playUrl = `https://cr-play-service.prd.crunchyrollsvc.com/v1/${videoId}/web/chrome/play`;
        const response = await request('get', playUrl, {
            headers: { 'x-cr-stream-limits': 'false' }
        });
        const data = response.data;

        if (data.streams) {
            for (const stream of data.streams) {
                streams.push({
                    name: `Crunchyroll (${stream.type.toUpperCase()})`,
                    title: `${stream.hardsub_locale || 'No Sub'} - ${stream.audio_locale}`,
                    url: stream.url,
                    quality: "Auto",
                    headers: { "Referer": "https://www.crunchyroll.com/" }
                });
            }
        }
    } catch (error) {
        console.warn('[Crunchyroll] Play service failed:', error.message);
    }

    // 2. Fallback to CMS v2 if no streams found yet
    if (streams.length === 0) {
        try {
            const response = await request('get', `/content/v2/cms/streams/${videoId}`);
            const data = response.data;

            if (data.data && data.data[0]) {
                const streamData = data.data[0];
                if (streamData.adaptive_hls) {
                    for (const [locale, stream] of Object.entries(streamData.adaptive_hls)) {
                        streams.push({
                            name: "Crunchyroll (HLS)",
                            title: `HLS - ${locale}`,
                            url: stream.url,
                            quality: "Auto",
                            headers: { "Referer": "https://www.crunchyroll.com/" }
                        });
                    }
                }
            }
        } catch (error) {
            console.warn('[Crunchyroll] CMS extraction failed:', error.message);
        }
    }

    return streams;
}
