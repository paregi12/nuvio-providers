import { DEFAULT_HEADERS, TMDB_API_KEY } from './constants.js';

export async function fetchText(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            ...DEFAULT_HEADERS,
            ...options.headers
        },
        ...options
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} on ${url}`);
    return await response.text();
}

export async function fetchJson(url, options = {}) {
    const text = await fetchText(url, options);
    return JSON.parse(text);
}

export async function getImdbId(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
        const data = await fetchJson(url);
        return data.imdb_id || null;
    } catch (e) {
        return null;
    }
}

export async function getTmdbShowTitle(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const data = await fetchJson(url);
        return data.name || data.title || data.original_title || null;
    } catch (e) {
        return null;
    }
}

export async function resolveMapping(imdbId, season, episode) {
    try {
        const url = `https://id-mapping-api-malid.hf.space/api/resolve?id=${imdbId}&s=${season}&e=${episode}`;
        const data = await fetchJson(url);
        if (data.error) return null;
        return data;
    } catch (e) {
        return null;
    }
}

export async function searchMalId(title, mediaType) {
    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&type=${type}&limit=1`;
        const data = await fetchJson(url);
        if (data.data && data.data.length > 0) {
            return data.data[0].mal_id;
        }
        return null;
    } catch (e) {
        return null;
    }
}
