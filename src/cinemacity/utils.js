import { MAIN_URL, HEADERS, TMDB_API_KEY } from './constants.js';

export async function fetchText(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: HEADERS,
            ...options
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} on ${url}`);
        return await response.text();
    } catch (e) {
        console.error(`[fetchText] Failed to fetch ${url}: ${e.message}`);
        throw e;
    }
}

export async function search(query) {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `${MAIN_URL}/index.php?do=search&subaction=search&search_start=0&full_search=0&story=${encodedQuery}`;
    return await fetchText(searchUrl);
}

export async function getImdbIdFromPage(html) {
    // Ported from: Regex("tt\\d+").find(it)?.value in Cinemacity.kt
    const imdbMatch = html.match(/tt\d+/);
    return imdbMatch ? imdbMatch[0] : null;
}

export async function getMediaDetails(tmdbId, mediaType) {
    const type = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
}

export function cleanTitle(title) {
    return title.replace(/\(\d{4}\)/, '').trim();
}

export function extractQuality(url) {
    if (url.includes("2160p") || url.includes("4K")) return "4K";
    if (url.includes("1080p")) return "1080p";
    if (url.includes("720p")) return "720p";
    if (url.includes("480p")) return "480p";
    if (url.includes("360p")) return "360p";
    return "HD";
}
