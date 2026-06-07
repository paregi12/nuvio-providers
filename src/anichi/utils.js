// src/anichi/utils.js
import { BASE_URL } from './constants.js';

// Allanime hex decryption utility (XOR 56)
export function decrypthex(inputStr) {
    const hexString = inputStr.includes('-') ? inputStr.substring(inputStr.lastIndexOf('-') + 1) : inputStr;
    const bytes = [];
    for (let i = 0; i < hexString.length; i += 2) {
        bytes.push(parseInt(hexString.substring(i, i + 2), 16) ^ 56);
    }
    return String.fromCharCode(...bytes);
}

// Fix clock links pathing
export function fixUrlPath(link) {
    if (link.includes(".json?")) {
        return BASE_URL + link;
    } else {
        const urlObj = new URL(link, BASE_URL);
        return BASE_URL + urlObj.pathname + ".json?" + urlObj.search.substring(1);
    }
}

// Fetch IMDb ID helper
export async function getImdbId(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}/external_ids?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data.imdb_id || null;
    } catch (e) {
        return null;
    }
}

// Resolve TMDB to MAL/AniList mapping
export async function resolveMapping(imdbId, season, episode) {
    try {
        const url = `https://id-mapping-api-malid.hf.space/api/resolve?id=${imdbId}&s=${season}&e=${episode}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

// Fetch official MAL Title
export async function getMalTitle(malId) {
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.data?.title || null;
    } catch (e) {
        return null;
    }
}

// Extract stream quality from URL
export function extractQuality(url) {
    if (!url) return 'Unknown';
    const qualityPatterns = [
        /(\d{3,4})p/i,
        /quality[_-]?(\d{3,4})/i,
        /res[_-]?(\d{3,4})/i
    ];
    for (const pattern of qualityPatterns) {
        const match = url.match(pattern);
        if (match) {
            const qualityNum = parseInt(match[1]);
            if (qualityNum >= 240 && qualityNum <= 4320) {
                return `${qualityNum}p`;
            }
        }
    }
    if (url.includes('1080')) return '1080p';
    if (url.includes('720')) return '720p';
    if (url.includes('480')) return '480p';
    if (url.includes('360')) return '360p';
    return 'Unknown';
}
