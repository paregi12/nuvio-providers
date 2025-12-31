/**
 * Castle Provider - Castle API Functions
 */

import { CASTLE_BASE, PKG, CHANNEL, CLIENT, LANG } from './constants.js';
import { makeRequest, extractCipherFromResponse, extractDataBlock } from './http.js';
import { decryptCastle } from './decrypt.js';

/**
 * Get security key from Castle API
 */
export async function getSecurityKey() {
    console.log('[Castle] Fetching security key...');

    const url = `${CASTLE_BASE}/v0.1/system/getSecurityKey/1?channel=${CHANNEL}&clientType=${CLIENT}&lang=${LANG}`;
    const response = await makeRequest(url);
    const data = await response.json();

    if (data.code !== 200 || !data.data) {
        throw new Error(`Security key API error: ${JSON.stringify(data)}`);
    }

    console.log('[Castle] Security key obtained');
    return data.data;
}

/**
 * Search Castle by keyword
 */
export async function searchCastle(securityKey, keyword, page = 1, size = 30) {
    console.log(`[Castle] Searching for: ${keyword}`);

    const params = new URLSearchParams({
        channel: CHANNEL,
        clientType: CLIENT,
        keyword,
        lang: LANG,
        mode: '1',
        packageName: PKG,
        page: page.toString(),
        size: size.toString()
    });

    const url = `${CASTLE_BASE}/film-api/v1.1.0/movie/searchByKeyword?${params.toString()}`;
    const response = await makeRequest(url);
    const cipher = await extractCipherFromResponse(response);
    const decrypted = await decryptCastle(cipher, securityKey);

    return JSON.parse(decrypted);
}

/**
 * Get movie/TV details from Castle
 */
export async function getDetails(securityKey, movieId) {
    console.log(`[Castle] Fetching details for movieId: ${movieId}`);

    const url = `${CASTLE_BASE}/film-api/v1.1/movie?channel=${CHANNEL}&clientType=${CLIENT}&lang=${LANG}&movieId=${movieId}&packageName=${PKG}`;
    const response = await makeRequest(url);
    const cipher = await extractCipherFromResponse(response);
    const decrypted = await decryptCastle(cipher, securityKey);

    return JSON.parse(decrypted);
}

/**
 * Get video URL using v2.0.1 (shared streams)
 */
export async function getVideo2(securityKey, movieId, episodeId, resolution = 2) {
    console.log(`[Castle] Fetching video (v2) for movieId: ${movieId}, episodeId: ${episodeId}`);

    const url = `${CASTLE_BASE}/film-api/v2.0.1/movie/getVideo2?clientType=${CLIENT}&packageName=${PKG}&channel=${CHANNEL}&lang=${LANG}`;

    const body = {
        mode: '1',
        appMarket: 'GuanWang',
        clientType: '1',
        woolUser: 'false',
        apkSignKey: 'ED0955EB04E67A1D9F3305B95454FED485261475',
        androidVersion: '13',
        movieId,
        episodeId,
        isNewUser: 'true',
        resolution: resolution.toString(),
        packageName: PKG
    };

    const response = await makeRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const cipher = await extractCipherFromResponse(response);
    const decrypted = await decryptCastle(cipher, securityKey);

    return JSON.parse(decrypted);
}

/**
 * Get video URL using v1.9.1 (language-specific)
 */
export async function getVideoV1(securityKey, movieId, episodeId, languageId, resolution = 2) {
    console.log(`[Castle] Fetching video (v1) for movieId: ${movieId}, languageId: ${languageId}`);

    const params = new URLSearchParams({
        apkSignKey: 'ED0955EB04E67A1D9F3305B95454FED485261475',
        channel: CHANNEL,
        clientType: CLIENT,
        episodeId: episodeId.toString(),
        lang: LANG,
        languageId: languageId.toString(),
        mode: '1',
        movieId: movieId.toString(),
        packageName: PKG,
        resolution: resolution.toString()
    });

    const url = `${CASTLE_BASE}/film-api/v1.9.1/movie/getVideo?${params.toString()}`;
    const response = await makeRequest(url);
    const cipher = await extractCipherFromResponse(response);
    const decrypted = await decryptCastle(cipher, securityKey);

    return JSON.parse(decrypted);
}

/**
 * Find Castle movie ID by searching
 */
export async function findCastleMovieId(securityKey, tmdbInfo) {
    const searchTerm = tmdbInfo.year
        ? `${tmdbInfo.title} ${tmdbInfo.year}`
        : tmdbInfo.title;

    const searchResult = await searchCastle(securityKey, searchTerm);
    const data = extractDataBlock(searchResult);
    const rows = data.rows || [];

    if (rows.length === 0) {
        throw new Error('No search results found');
    }

    // Try exact match first
    for (const item of rows) {
        const itemTitle = (item.title || item.name || '').toLowerCase();
        const searchTitle = tmdbInfo.title.toLowerCase();

        if (itemTitle.includes(searchTitle) || searchTitle.includes(itemTitle)) {
            const movieId = item.id || item.redirectId || item.redirectIdStr;
            if (movieId) {
                console.log(`[Castle] Found match: ${item.title || item.name} (id: ${movieId})`);
                return movieId.toString();
            }
        }
    }

    // Fallback to first result
    const firstItem = rows[0];
    const movieId = firstItem.id || firstItem.redirectId || firstItem.redirectIdStr;

    if (movieId) {
        console.log(`[Castle] Using first result: ${firstItem.title || firstItem.name} (id: ${movieId})`);
        return movieId.toString();
    }

    throw new Error('Could not extract movie ID from search results');
}
