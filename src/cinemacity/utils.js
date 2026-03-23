import { MAIN_URL, HEADERS, TMDB_API_KEY } from './constants.js';

// Safe atob polyfill for restricted environments
export const atob = (str) => {
    try {
        if (typeof global !== 'undefined' && typeof global.atob === 'function') return global.atob(str);
        if (typeof window !== 'undefined' && typeof window.atob === 'function') return window.atob(str);
        if (typeof self !== 'undefined' && typeof self.atob === 'function') return self.atob(str);
        
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';
        str = String(str).replace(/[=]+$/, '');
        if (str.length % 4 === 1) return '';
        
        for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
            buffer = chars.indexOf(buffer);
        }
        return output;
    } catch (e) {
        return '';
    }
};

export async function fetchText(url, options = {}) {
    try {
        // Use global fetch (polyfilled by Nuvio)
        const response = await fetch(url, {
            headers: HEADERS,
            skipSizeCheck: true, // Tell Nuvio not to block this request
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
    const low = url.toLowerCase();
    if (low.includes("2160p") || low.includes("4k")) return "4K";
    if (low.includes("1080p")) return "1080p";
    if (low.includes("720p")) return "720p";
    if (low.includes("480p")) return "480p";
    if (low.includes("360p")) return "360p";
    return "HD";
}
