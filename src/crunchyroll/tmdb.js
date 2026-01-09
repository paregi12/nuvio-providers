import axios from 'axios';

const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";

export async function getMetadata(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' || mediaType === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    
    try {
        const response = await axios.get(url);
        const data = response.data;
        return {
            title: data.name || data.title,
            year: (data.first_air_date || data.release_date || '').split('-')[0]
        };
    } catch (error) {
        console.error('[Crunchyroll] TMDB metadata error:', error.message);
        return null;
    }
}
