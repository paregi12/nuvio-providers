const { fetchJson } = require('./http');
const { getVegaMoviesStreams } = require('./providers/vegamovies');
const { getMoviesModStreams } = require('./providers/moviesmod');
const { getUHDMoviesStreams } = require('./providers/uhdmovies');

// Common TMDB Key
const TMDB_API_KEY = "1a7373301961d03f97f853a876dd1212"; 

async function getMetadata(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        return await fetchJson(url);
    } catch (e) {
        console.error("[CineStream] Failed to fetch metadata", e);
        return null;
    }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        console.log(`[CineStream] Request: ${mediaType} ${tmdbId}`);
        const meta = await getMetadata(tmdbId, mediaType);
        
        if (!meta) {
            console.error("[CineStream] Metadata not found, aborting.");
            return [];
        }

        // Run all providers in parallel
        const results = await Promise.allSettled([
            getVegaMoviesStreams(tmdbId, mediaType, season, episode, meta),
            getMoviesModStreams(tmdbId, mediaType, season, episode, meta),
            getUHDMoviesStreams(tmdbId, mediaType, season, episode, meta)
        ]);

        // Flatten results
        const streams = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                streams.push(...result.value);
            } else {
                console.error(`[CineStream] Provider ${index} failed:`, result.reason);
            }
        });

        console.log(`[CineStream] Total streams found: ${streams.length}`);
        return streams;

    } catch (error) {
        console.error(`[CineStream] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
