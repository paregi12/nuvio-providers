// src/vidking/constants.js
export const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const WINGS_API_BASE = "https://api.wingsdatabase.com";

export const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const REQUEST_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "*/*",
    "Origin": "https://www.vidking.net",
    "Referer": "https://www.vidking.net/",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
};

export const SERVERS = {
    'Hydrogen': { path: 'cdn/sources-with-title' },
    'Titanium': { path: 'tejo/sources-with-title' },
    'Oxygen': { path: 'neon2/sources-with-title' },
    'Lithium': { path: 'downloader2/sources-with-title' },
    'Helium': { path: '1movies/sources-with-title' }
};
