import { TMDB_API_KEY } from './constants.js';
import { fetchJson } from './http.js';

export async function getMetadata(tmdbId, mediaType) {
    const isSeries = mediaType === "series" || mediaType === "tv";
    const endpoint = isSeries ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    
    console.log(`[VegaMovies] Fetching TMDB details from: ${url}`);
    
    try {
        const data = await fetchJson(url);
        if (isSeries) {
            return {
                title: data.name,
                year: data.first_air_date ? data.first_air_date.split("-")[0] : ""
            };
        } else {
            return {
                title: data.title,
                year: data.release_date ? data.release_date.split("-")[0] : ""
            };
        }
    } catch (e) {
        console.error("[VegaMovies] Failed to fetch metadata", e);
        return null;
    }
}
