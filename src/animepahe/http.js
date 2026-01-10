import { HEADERS } from './constants.js';

export async function fetchText(url, options = {}) {
    console.log(`[AnimePahe] Fetching: ${url}`);
    const response = await fetch(url, {
        headers: {
            ...HEADERS,
            ...options.headers
        },
        ...options
    });

    if (!response.ok) {
        throw new Error(`HTTP error ${response.status} for ${url}`);
    }

    return await response.text();
}

export async function fetchJson(url, options = {}) {
    const raw = await fetchText(url, options);
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error(`[AnimePahe] Failed to parse JSON from ${url}:`, raw.substring(0, 100));
        throw e;
    }
}
