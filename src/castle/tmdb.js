/**
 * Castle Provider - TMDB API
 */

import { TMDB_API_KEY, TMDB_BASE_URL } from './constants.js';
import { makeRequest } from './http.js';

/**
 * Get movie/TV show details from TMDB
 */
export async function getTMDBDetails(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;

    const response = await makeRequest(url);
    const data = await response.json();

    const title = mediaType === 'tv' ? data.name : data.title;
    const releaseDate = mediaType === 'tv' ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;

    return {
        title,
        year,
        tmdbId
    };
}
