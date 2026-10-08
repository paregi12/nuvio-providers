import { MAIN_URL, PROXY_URL, HEADERS } from './constants.js';

export async function fetchText(url, options = {}) {
    const { useProxy = false, ...fetchOptions } = options;
    
    // Read preferred domain from user settings if available
    const settings = globalThis.SCRAPER_SETTINGS || {};
    const domain = settings.domain || MAIN_URL;
    
    const finalUrl = url.startsWith('http') ? url : `${domain}${url}`;
    const targetUrl = useProxy ? `${PROXY_URL}${encodeURIComponent(finalUrl)}` : finalUrl;
    const isAnimePaheUrl = finalUrl.includes('animepahe.');

    const response = await fetch(targetUrl, {
        headers: {
            ...HEADERS,
            "Referer": `${domain}/`,
            ...fetchOptions.headers
        },
        cfKiller: isAnimePaheUrl, // Only activate native bypass for AnimePahe domains
        skipSizeCheck: true,      // Critical for Nuvio not to block large pages
        ...fetchOptions
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} on ${finalUrl}`);
    return await response.text();
}

export async function fetchJson(url, options = {}) {
    const text = await fetchText(url, options);
    return JSON.parse(text);
}

export async function getCinemetaTitle(imdbId, mediaType) {
    try {
        const type = mediaType === 'tv' ? 'series' : 'movie';
        const res = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`);
        if (!res.ok) return null;
        const data = await res.json();
        return data?.meta?.name || null;
    } catch (_) {
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

export async function searchAnime(query) {
    const url = `/api?m=search&l=8&q=${encodeURIComponent(query)}`;
    return await fetchJson(url);
}

export function extractQuality(text) {
    const match = text.match(/(\d{3,4}p)/);
    return match ? match[1] : "720p";
}
