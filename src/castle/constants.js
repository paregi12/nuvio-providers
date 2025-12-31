/**
 * Castle Provider - Constants
 */

// TMDB API
export const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Castle API
export const CASTLE_BASE = 'https://api.fstcy.com';
export const PKG = 'com.external.castle';
export const CHANNEL = 'IndiaA';
export const CLIENT = '1';
export const LANG = 'en-US';
export const SUFFIX = 'T!BgJB';

// API Headers
export const API_HEADERS = {
    'User-Agent': 'okhttp/4.9.3',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'Keep-Alive',
    'Referer': CASTLE_BASE
};

// Playback Headers
export const PLAYBACK_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'identity',
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};
