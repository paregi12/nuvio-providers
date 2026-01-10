import { TMDB_API_KEY } from './constants.js';
import { fetchJson } from './http.js';

export async function getTmdbInfo(tmdbId, mediaType) {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    console.log(`[AnimePahe] Fetching TMDB details from: ${url}`);
    
    try {
        const data = await fetchJson(url);
        // Anime is usually 'tv'
        const title = data.name || data.title || data.original_name;
        const year = (data.first_air_date || data.release_date || "").substring(0, 4);
        
        return { title, year };
    } catch (e) {
        console.error("[AnimePahe] Failed to fetch TMDB metadata", e);
        return null;
    }
}
