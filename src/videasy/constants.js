// src/videasy/constants.js
export const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const VIDEASY_API_BASE = "https://api.videasy.net";
export const DEC_API_URL = "https://enc-dec.app/api/dec-videasy";

export const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export const REQUEST_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "*/*",
    "Origin": "https://www.cineby.sc",
    "Referer": "https://www.cineby.sc/",
    "Connection": "keep-alive"
};

export const PLAYBACK_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "*/*",
    "Origin": "https://www.cineby.sc",
    "Referer": "https://www.cineby.sc/"
};

export const SERVERS = {
    'Neon': {
        path: 'myflixerzupcloud',
        language: 'Original'
    },
    'Sage': {
        path: '1movies',
        language: 'Original'
    },
    'Cypher': {
        path: 'moviebox',
        language: 'Original'
    },
    'Reyna': {
        path: 'primewire',
        language: 'Original'
    },
    'Breach': {
        path: 'm4uhd',
        language: 'Original'
    },
    'Vyse': {
        path: 'hdmovie',
        language: 'Original'
    },
    'Yoru': {
        path: 'cdn',
        language: 'Original',
        moviesOnly: true
    },
    'Ghost': {
        path: 'primesrcme',
        language: 'Original'
    },
    'Astra': {
        path: 'visioncine',
        language: 'Portuguese'
    },
    'Phoenix': {
        path: 'overflix',
        language: 'Portuguese'
    },
    'Raze': {
        path: 'superflix',
        language: 'Portuguese'
    },
    'Gekko': {
        path: 'cuevana',
        language: 'Spanish'
    },
    'Viper': {
        path: 'lamovie',
        language: 'Original'
    },
    'MbFlix': {
        path: 'mb-flix',
        language: 'Original'
    }
};
