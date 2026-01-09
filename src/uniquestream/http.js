export const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://anime.uniquestream.net/',
    'Origin': 'https://anime.uniquestream.net'
};

export async function fetchText(url, options = {}) {
    console.log(`[UniqueStream] Fetching: ${url}`);
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
        console.error(`[UniqueStream] Failed to parse JSON from ${url}:`, raw.substring(0, 100));
        throw e;
    }
}
