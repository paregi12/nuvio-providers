import { fetchJson } from './http.js';
import { API_URL } from './constants.js';

export async function search(query) {
    try {
        const searchUrl = `${API_URL}?m=search&l=8&q=${encodeURIComponent(query)}`;
        const searchData = await fetchJson(searchUrl);
        
        if (!searchData || !searchData.data || searchData.data.length === 0) {
            return [];
        }

        return searchData.data.map(anime => ({
            name: "AnimePahe",
            title: anime.title,
            url: anime.session,
            poster: anime.poster,
            year: anime.year,
            type: anime.type.toLowerCase().includes('movie') ? 'movie' : 'tv'
        }));
    } catch (error) {
        console.error(`[AnimePahe] Search error: ${error.message}`);
        return [];
    }
}
