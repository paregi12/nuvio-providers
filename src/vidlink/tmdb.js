/**
 * Vidlink Provider - TMDB & Encryption
 */

import { TMDB_API_KEY, ENC_DEC_API } from './constants.js';
import { makeRequest } from './http.js';

/**
 * Get TMDB info for movie/TV show
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

    console.log(`[Vidlink] TMDB Info: "${title}" (${year})`);
    return { title, year, data };
}

/**
 * Encrypt TMDB ID using enc-dec.app API
 */
export async function encryptTmdbId(tmdbId) {
    console.log(`[Vidlink] Encrypting TMDB ID: ${tmdbId}`);

    const response = await makeRequest(`${ENC_DEC_API}/enc-vidlink?text=${tmdbId}`);
    const data = await response.json();

    if (data && data.result) {
        console.log(`[Vidlink] Successfully encrypted TMDB ID`);
        return data.result;
    } else {
        throw new Error('Invalid encryption response format');
    }
}
