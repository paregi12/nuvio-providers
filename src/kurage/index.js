import { KURAGE_BASE, DEFAULT_HEADERS } from './constants.js';
import { getSyncInfo, resolveAnilistId, fetchJson } from './utils.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // Step 1: Resolve Metadata + Verified AniList ID
        const syncInfo = await getSyncInfo(tmdbId, mediaType, season, episode);
        const resolved = await resolveAnilistId(syncInfo);
        
        if (!resolved || !resolved.alId) {
            console.log(`[Kurage] Could not resolve AniList ID for TMDB ${tmdbId}`);
            return [];
        }

        const { alId, episode: alEp } = resolved;
        console.log(`[Kurage] Resolved to AniList ID: ${alId}, Episode: ${alEp}`);

        // Step 2: Fetch Sources from Kurage tRPC API (Sub & Dub)
        const input = {
            "0": { "json": { "id": alId } },
            "1": { "json": { "animeId": alId, "episode": alEp, "language": "sub" } },
            "2": { "json": { "animeId": alId, "episode": alEp, "language": "dub" } }
        };
        const url = `${KURAGE_BASE}/api/trpc/catalog.anilistInfo,episodes.source,episodes.source?batch=1&input=${encodeURIComponent(JSON.stringify(input))}`;

        const data = await fetchJson(url, {
            headers: {
                'trpc-accept': 'application/json',
                'x-trpc-source': 'nextjs-react'
            }
        });

        // Step 3: Parse and Format Streams
        const allStreams = [];
        data.forEach(r => {
            const servers = r.result?.data?.json?.servers || [];
            servers.forEach(server => {
                const url = server.url.startsWith('/') ? `${KURAGE_BASE}${server.url}` : server.url;
                
                // Extract original headers from URL if we want to provide them to the player
                let extraHeaders = {};
                try {
                    const urlObj = new URL(url);
                    const headersParam = urlObj.searchParams.get('headers');
                    if (headersParam) {
                        extraHeaders = JSON.parse(atob(headersParam));
                    }
                } catch (e) {}

                allStreams.push({
                    name: `Kurage [${server.label}]`,
                    title: `${syncInfo.title} - ${alEp} (${server.language.toUpperCase()})`,
                    url: url,
                    quality: 'Auto',
                    headers: {
                        ...DEFAULT_HEADERS,
                        ...extraHeaders
                    },
                    provider: 'kurage'
                });
            });
        });

        return allStreams;


    } catch (e) {
        console.error(`[Kurage] Error: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
