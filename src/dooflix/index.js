import { BASE_API, API_KEY, HEADERS, STREAM_REFERER } from './constants.js';

export async function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
    console.log(`[DooFlix] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    
    try {
        let requestUrl;
        if (mediaType === "movie") {
            requestUrl = `${BASE_API}/api/3/movie/${tmdbId}/links?api_key=${API_KEY}`;
        } else {
            requestUrl = `${BASE_API}/api/3/tv/${tmdbId}/season/${season}/episode/${episode}/links?api_key=${API_KEY}`;
        }

        const response = await fetch(requestUrl, { headers: HEADERS });
        if (!response.ok) {
            console.log(`[DooFlix] API error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        const links = data.links || [];

        const streams = [];

        for (const linkObj of links) {
            try {
                // Fetch the URL with redirect: 'manual' to get the location header
                const res = await fetch(linkObj.url, {
                    method: 'GET',
                    headers: {
                        "Referer": STREAM_REFERER,
                        "User-Agent": HEADERS["User-Agent"]
                    },
                    redirect: 'manual'
                });

                const streamUrl = res.headers.get('location');
                if (streamUrl) {
                    streams.push({
                        name: "DooFlix",
                        title: `DooFlix - ${linkObj.host || "Server"}`,
                        url: streamUrl,
                        quality: "Auto",
                        headers: {
                            "Referer": STREAM_REFERER,
                            "User-Agent": HEADERS["User-Agent"]
                        },
                        provider: "dooflix"
                    });
                }
            } catch (e) {
                console.log(`[DooFlix] Error fetching redirect for ${linkObj.url}: ${e.message}`);
            }
        }

        return streams;

    } catch (error) {
        console.error(`[DooFlix] Error: ${error.message}`);
        return [];
    }
}
