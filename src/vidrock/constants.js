// src/vidrock/constants.js
export const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const VIDROCK_BASE_URL = "https://vidrock.ru";
export const PASSPHRASE = "x7k9mPqT2rWvY8zA5bC3nF6hJ2lK4mN9";
export const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

export const WORKING_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://vidrock.ru/",
    "Origin": "https://vidrock.ru"
};

export const PLAYBACK_HEADERS = {
    "User-Agent": USER_AGENT,
    "Referer": "https://vidrock.ru/",
    "Origin": "https://vidrock.ru"
};
