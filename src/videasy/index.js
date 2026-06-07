// src/videasy/index.js
import { VIDEASY_API_BASE, REQUEST_HEADERS, SERVERS } from './constants.js';
import { fetchMediaDetails, decryptVideoEasy, formatStreamsForNuvio } from './utils.js';

async function fetchFromServer(serverName, serverConfig, mediaType, doubleEncodedTitle, year, tmdbId, imdbId, seasonNum, episodeNum) {
    // Skip movie-only servers for TV shows
    if (mediaType === 'tv' && serverConfig.moviesOnly) {
        return [];
    }

    // Build URL query parameters
    const params = {
        title: doubleEncodedTitle,
        mediaType: mediaType,
        year: year,
        tmdbId: tmdbId,
        imdbId: imdbId || ''
    };

    if (mediaType === 'tv' && seasonNum && episodeNum) {
        params.seasonId = seasonNum;
        params.episodeId = episodeNum;
    }

    const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    const url = `${VIDEASY_API_BASE}/${serverConfig.path}/sources-with-title?${queryString}`;
    console.log(`[VideoEasy] Querying server ${serverName}: ${url}`);

    try {
        const res = await fetch(url, { headers: REQUEST_HEADERS });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const encryptedData = await res.text();
        if (!encryptedData || encryptedData.trim() === '') {
            throw new Error('Empty response');
        }

        const decryptedData = await decryptVideoEasy(encryptedData, tmdbId);
        if (!decryptedData) return [];

        const streams = formatStreamsForNuvio(decryptedData, serverName, serverConfig, { title: doubleEncodedTitle, year });
        console.log(`[VideoEasy] ✅ Found ${streams.length} stream(s) from ${serverName}`);
        return streams;
    } catch (e) {
        console.warn(`[VideoEasy] ❌ Error from ${serverName}: ${e.message}`);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, seasonNum = null, episodeNum = null) {
    console.log(`[VideoEasy] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`);

    try {
        const mediaDetails = await fetchMediaDetails(tmdbId, mediaType);
        if (!mediaDetails) {
            console.error('[VideoEasy] Failed to fetch media details from TMDB.');
            return [];
        }

        console.log(`[VideoEasy] Media Details: "${mediaDetails.title}" (${mediaDetails.year})`);

        // Double encode the title as required by Videasy API
        const doubleEncodedTitle = encodeURIComponent(encodeURIComponent(mediaDetails.title));

        const serverPromises = Object.keys(SERVERS).map(serverName => {
            const serverConfig = SERVERS[serverName];
            return fetchFromServer(
                serverName,
                serverConfig,
                mediaType,
                doubleEncodedTitle,
                mediaDetails.year,
                tmdbId,
                mediaDetails.imdbId,
                seasonNum,
                episodeNum
            );
        });

        const results = await Promise.all(serverPromises);
        const allStreams = [];
        results.forEach(streams => {
            allStreams.push(...streams);
        });

        // Deduplicate streams by URL
        const uniqueStreams = [];
        const seenUrls = new Set();
        allStreams.forEach(stream => {
            if (!seenUrls.has(stream.url)) {
                seenUrls.add(stream.url);
                uniqueStreams.push(stream);
            }
        });

        // Sort streams by quality (highest first)
        const getQualityValue = (quality) => {
            const q = quality.toLowerCase().replace(/p$/, '');
            if (q === '4k' || q === '2160') return 2160;
            if (q === '1440') return 1440;
            if (q === '1080') return 1080;
            if (q === '720') return 720;
            if (q === '480') return 480;
            if (q === '360') return 360;
            if (q === '240') return 240;
            if (q === 'adaptive' || q === 'auto') return 4000;
            if (q === 'unknown') return 0;
            
            const parsed = parseInt(q);
            return isNaN(parsed) ? 1 : parsed;
        };

        uniqueStreams.sort((a, b) => getQualityValue(b.quality) - getQualityValue(a.quality));

        console.log(`[VideoEasy] Total unique streams found: ${uniqueStreams.length}`);
        return uniqueStreams;
    } catch (e) {
        console.error(`[VideoEasy] Error in getStreams: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
