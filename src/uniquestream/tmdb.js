import { fetchJson } from './http.js';

const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";

export async function getTmdbInfo(tmdbId, mediaType) {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    console.log(`[UniqueStream] Fetching TMDB details from: ${url}`);
    
    try {
        const data = await fetchJson(url);
        const title = data.name || data.title || data.original_name;
        const year = (data.first_air_date || data.release_date || "").substring(0, 4);
        
        return { title, year };
    } catch (e) {
        console.error("[UniqueStream] Failed to fetch TMDB metadata", e);
        return null;
    }
}
