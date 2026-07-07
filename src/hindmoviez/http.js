export const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://hindmovie.icu/"
};

export async function fetchText(url, options = {}) {
    console.log(`[Hindmoviez] Fetching: ${url}`);
    const response = await fetch(url, { 
        ...options,
        headers: { ...HEADERS, ...options.headers },
        cfKiller: true 
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
}

export async function fetchJson(url, options = {}) {
    console.log(`[Hindmoviez] Fetching JSON: ${url}`);
    const response = await fetch(url, { 
        ...options,
        headers: { ...HEADERS, ...options.headers },
        cfKiller: true 
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}
