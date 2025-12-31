/**
 * 4KHDHub Provider - TMDB API
 */

import { TMDB_API_KEY } from './constants.js';

/**
 * Get TMDB details
 */
export async function getTmdbDetails(tmdbId, type) {
    const isSeries = type === 'series' || type === 'tv';
    const endpoint = isSeries ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;

    console.log(`[4KHDHub] Fetching TMDB details from: ${url}`);

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (isSeries) {
            return {
                title: data.name,
                year: data.first_air_date ? parseInt(data.first_air_date.split('-')[0]) : 0
            };
        } else {
            return {
                title: data.title,
                year: data.release_date ? parseInt(data.release_date.split('-')[0]) : 0
            };
        }
    } catch (error) {
        console.log(`[4KHDHub] TMDB request failed: ${error.message}`);
        return null;
    }
}
