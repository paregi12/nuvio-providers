import { request } from './http.js';
import { getMetadata } from './tmdb.js';
import { extractStreams } from './extractors/index.js';
import { SEARCH_QUERY, EPISODE_QUERY, API_URL } from './constants.js';
import { isMatch } from './utils.js';

async function getStreams(tmdbId, mediaType, season, episode, tmdbData = null) {
    const meta = tmdbData || await getMetadata(tmdbId, mediaType);
    if (!meta) return [];

    console.log(`[AllManga] Searching for: ${meta.title} (${mediaType})`);

    try {
        // 1. Search
        const searchRes = await request('post', API_URL, {
            data: {
                query: SEARCH_QUERY,
                variables: {
                    search: {
                        allowAdult: false,
                        allowUnknown: false,
                        query: meta.title
                    },
                    limit: 26,
                    page: 1,
                    translationType: "sub",
                    countryOrigin: "ALL"
                }
            }
        });

        const shows = searchRes.data?.data?.shows?.edges || [];
        
        // Filter by type if possible, though AllManga doesn't always distinguish movie vs tv in the search edges easily
        // But we can match by title.
        const match = shows.find(s => isMatch(s.name, meta.title) || isMatch(s.englishName, meta.title));

        if (!match) {
            console.log(`[AllManga] No match found for ${meta.title}`);
            return [];
        }

        console.log(`[AllManga] Found match: ${match.name} (${match._id})`);

        // 2. Get Episode Links
        // For movies, episode is usually 1
        const epStr = mediaType === 'movie' ? "1" : String(episode || 1);
        
        const episodeRes = await request('post', API_URL, {
            data: {
                query: EPISODE_QUERY,
                variables: {
                    showId: match._id,
                    translationType: "sub",
                    episodeString: epStr
                }
            }
        });

        const sourceUrls = episodeRes.data?.data?.episode?.sourceUrls || [];
        if (sourceUrls.length === 0) {
            console.log(`[AllManga] No source URLs for ${meta.title} Ep ${epStr}`);
            return [];
        }

        return await extractStreams(sourceUrls);
    } catch (error) {
        console.error(`[AllManga] Error:`, error.message);
        return [];
    }
}

module.exports = { getStreams };
