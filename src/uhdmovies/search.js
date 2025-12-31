/**
 * UHDMovies - Search Functions
 */

const DOMAIN = 'https://uhdmovies.rip';
const TMDB_API = 'https://api.themoviedb.org/3';

/**
 * Search by IMDB ID (converts from TMDB first)
 */
export async function searchByImdbId(tmdbId, mediaType) {
    // Get IMDB ID from TMDB
    const endpoint = mediaType === 'movie'
        ? `${TMDB_API}/movie/${tmdbId}/external_ids`
        : `${TMDB_API}/tv/${tmdbId}/external_ids`;

    const response = await fetch(endpoint);
    const data = await response.json();
    const imdbId = data.imdb_id;

    if (!imdbId) {
        console.log('[UHDMovies] No IMDB ID found');
        return [];
    }

    // Search UHDMovies with IMDB ID
    const searchUrl = `${DOMAIN}/?s=${imdbId}`;
    const searchResponse = await fetch(searchUrl);
    const html = await searchResponse.text();

    return parseSearchResults(html);
}

/**
 * Search by title string
 */
export async function searchByTitle(title, year) {
    const query = encodeURIComponent(`${title} ${year || ''}`);
    const searchUrl = `${DOMAIN}/?s=${query}`;

    const response = await fetch(searchUrl);
    const html = await response.text();

    return parseSearchResults(html);
}

function parseSearchResults(html) {
    const cheerio = require('cheerio-without-node-native');
    const $ = cheerio.load(html);

    const results = [];

    $('.post-title a, .entry-title a').each((_, el) => {
        results.push({
            title: $(el).text().trim(),
            url: $(el).attr('href')
        });
    });

    return results;
}
