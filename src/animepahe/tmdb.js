import { fetchJson } from './http.js';
import { TMDB_API_KEY } from './constants.js';

export async function getTmdbInfo(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' || mediaType === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    
    try {
        const data = await fetchJson(url);
        const title = data.name || data.title || data.original_name;
        const year = (data.first_air_date || data.release_date || "").substring(0, 4);
        
        return { title, year };
    } catch (e) {
        // console.error("[AnimePahe] Failed to fetch TMDB metadata", e);
        return null;
    }
}