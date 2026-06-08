// src/vidrock/utils.js
import CryptoJS from 'crypto-js';
import { TMDB_BASE_URL, TMDB_API_KEY, PASSPHRASE, PLAYBACK_HEADERS, USER_AGENT } from './constants.js';

// Local AES-CBC Encryption
export function encryptVidrock(text) {
    const key = CryptoJS.enc.Utf8.parse(PASSPHRASE);
    const iv = CryptoJS.enc.Utf8.parse(PASSPHRASE.substring(0, 16));
    const encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString()
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Fetch TMDB Details helper
export async function fetchTmdbDetails(tmdbId, mediaType) {
    try {
        const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
        const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'application/json'
            }
        });
        if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
        const data = await res.json();
        return {
            title: mediaType === 'tv' ? data.name : data.title,
            year: (mediaType === 'tv' ? data.first_air_date : data.release_date || '').substring(0, 4),
            imdbId: data.external_ids?.imdb_id || null
        };
    } catch (e) {
        console.error(`[Vidrock] TMDB Fetch Error: ${e.message}`);
        return null;
    }
}

// Quality resolver from URL strings
export function extractQuality(url) {
    if (!url) return 'Unknown';
    
    const qualityPatterns = [
        /(\d{3,4})p/i,
        /(\d{3,4})k/i,
        /quality[_-]?(\d{3,4})/i,
        /res[_-]?(\d{3,4})/i,
        /(\d{3,4})x\d{3,4}/i,
    ];

    for (const pattern of qualityPatterns) {
        const match = url.match(pattern);
        if (match) {
            const qualityNum = parseInt(match[1]);
            if (qualityNum >= 240 && qualityNum <= 4320) {
                return `${qualityNum}p`;
            }
        }
    }

    if (url.includes('1080') || url.includes('1920')) return '1080p';
    if (url.includes('720') || url.includes('1280')) return '720p';
    if (url.includes('480') || url.includes('854')) return '480p';
    if (url.includes('360') || url.includes('640')) return '360p';
    if (url.includes('240') || url.includes('426')) return '240p';

    return 'Unknown';
}

// Header check for playback streaming
export function needsHeaders(serverName, url) {
    if (serverName === 'Astra') return true;
    if (serverName === 'Atlas' && url.includes('hls1.vdrk.site')) return true;
    if (serverName === 'Luna' && url.includes('cdn.niggaflix.xyz')) return true;
    if (url.includes('cdn.vidrock.store') || url.includes('proxy.vidrock.store')) return true;
    return false;
}

// Parse Astra JSON playlists
export async function parseAstraPlaylist(playlistUrl, serverName, mediaInfo, seasonNum, episodeNum) {
    try {
        console.log(`[Vidrock] Fetching Astra playlist: ${playlistUrl}`);
        const res = await fetch(playlistUrl, {
            headers: PLAYBACK_HEADERS
        });
        if (!res.ok) return [];
        const data = await res.json();
        const streams = [];

        if (Array.isArray(data)) {
            data.forEach(item => {
                if (item.url && item.resolution) {
                    const quality = `${item.resolution}p`;
                    let mediaTitle = mediaInfo.title || 'Unknown';
                    if (mediaInfo.year) {
                        mediaTitle += ` (${mediaInfo.year})`;
                    }
                    if (seasonNum && episodeNum) {
                        mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}`;
                    }

                    streams.push({
                        name: `Vidrock [${serverName}] - ${quality}`,
                        title: mediaTitle,
                        url: item.url,
                        quality: quality,
                        size: 'Unknown',
                        headers: PLAYBACK_HEADERS,
                        provider: 'vidrock'
                    });
                }
            });
        }
        return streams;
    } catch (e) {
        console.error(`[Vidrock] Astra playlist parse error: ${e.message}`);
        return [];
    }
}
