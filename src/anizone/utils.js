import { MAIN_URL, HEADERS } from './constants.js';

export async function fetchText(url, options = {}) {
    const finalUrl = url.startsWith('http') ? url : `${MAIN_URL}${url}`;
    try {
        const response = await fetch(finalUrl, {
            headers: HEADERS,
            ...options
        });
        if (!response.ok) return "";
        return await response.text();
    } catch (e) {
        return "";
    }
}

export async function getImdbId(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}/external_ids?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) return null;
        const data = await res.json();
        return data.imdb_id;
    } catch (e) {
        return null;
    }
}

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

export async function getMalTitle(malId) {
    try {
        const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.data.title;
    } catch (e) {
        return null;
    }
}
