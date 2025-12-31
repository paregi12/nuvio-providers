/**
 * Vixsrc - TMDB API Functions
 */

import { TMDB_API_KEY } from './constants.js';
import { makeRequest } from './http.js';

/**
 * Get movie/TV info from TMDB
 * @param {string} tmdbId - TMDB ID
 * @param {string} mediaType - 'movie' or 'tv'
 * @returns {Promise<Object>} TMDB info
 */
export async function getTmdbInfo(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;

    const response = await makeRequest(url);
    const data = await response.json();

    const title = mediaType === 'tv' ? data.name : data.title;
    const year = mediaType === 'tv'
        ? data.first_air_date?.substring(0, 4)
        : data.release_date?.substring(0, 4);

    if (!title) {
        throw new Error('Could not extract title from TMDB response');
    }

    console.log(`[Vixsrc] TMDB Info: "${title}" (${year})`);
    return { title, year, data };
}
