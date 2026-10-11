import { HEADERS, REANIME_BASE } from './constants.js';

export function getBaseUrl() {
    const settings = (typeof globalThis !== 'undefined' && globalThis.SCRAPER_SETTINGS) || {};
    return settings.domain || REANIME_BASE;
}

export function absolutize(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${getBaseUrl()}${cleanPath}`;
}

export async function fetchText(url, options = {}) {
    const finalUrl = absolutize(url);
    const domain = getBaseUrl();
    const isReanime = finalUrl.includes('reanime.');
    const response = await fetch(finalUrl, {
        ...options,
        headers: {
            ...HEADERS,
            ...(isReanime ? { "Referer": `${domain}/` } : {}),
            ...(options.headers || {})
        },
        cfKiller: isReanime,
        skipSizeCheck: true
    });
    if (!response.ok) {
        throw new Error(`Reanime HTTP ${response.status}: ${finalUrl}`);
    }
    return await response.text();
}

export async function fetchJson(url, options = {}) {
    const text = await fetchText(url, {
        ...options,
        headers: {
            "Accept": "application/json, text/plain, */*",
            ...(options.headers || {})
        }
    });
    return JSON.parse(text);
}
