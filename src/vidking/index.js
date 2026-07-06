// src/vidking/index.js
import { WINGS_API_BASE, REQUEST_HEADERS, SERVERS } from './constants.js';
import { fetchMediaDetails, decryptWingsDatabase, formatStreamsForNuvio } from './utils.js';

async function fetchFromWingsServer(serverName, serverConfig, mediaType, tmdbId, mediaDetails, seed, seasonNum, episodeNum) {
    const params = {
        title: mediaDetails.title,
        mediaType: mediaType,
        year: String(mediaDetails.year),
        episodeId: String(episodeNum || 1),
        seasonId: String(seasonNum || 1),
        tmdbId: String(tmdbId),
        imdbId: mediaDetails.imdbId || '',
        enc: '2',
        seed: seed
    };

    const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    const url = `${WINGS_API_BASE}/${serverConfig.path}?${queryString}`;
    console.log(`[VidKing] Querying server ${serverName}: ${url}`);

    try {
        const res = await fetch(url, { headers: REQUEST_HEADERS });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const encryptedData = await res.text();
        if (!encryptedData || encryptedData.trim() === '') {
            throw new Error('Empty response');
        }

        const decryptedData = decryptWingsDatabase(encryptedData, seed, Number(tmdbId));
        if (!decryptedData) return [];

        const streams = formatStreamsForNuvio(decryptedData, serverName, mediaDetails);
        console.log(`[VidKing] ✅ Found ${streams.length} stream(s) from ${serverName}`);
        return streams;
    } catch (e) {
        console.warn(`[VidKing] ❌ Error from ${serverName}: ${e.message}`);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, seasonNum = null, episodeNum = null) {
    console.log(`[VidKing] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`);

    try {
        const mediaDetails = await fetchMediaDetails(tmdbId, mediaType);
        if (!mediaDetails) {
            console.error('[VidKing] Failed to fetch media details from TMDB.');
            return [];
        }

        console.log(`[VidKing] Media Details: "${mediaDetails.title}" (${mediaDetails.year})`);

        // Fetch seed
        const seedUrl = `${WINGS_API_BASE}/seed?mediaId=${tmdbId}`;
        console.log(`[VidKing] Fetching seed from: ${seedUrl}`);
        const seedRes = await fetch(seedUrl, { headers: REQUEST_HEADERS });
        if (!seedRes.ok) throw new Error(`Seed HTTP ${seedRes.status}`);
        const seedJson = await seedRes.json();
        const seed = seedJson.seed;
        if (!seed) throw new Error("No seed returned from API");
        console.log(`[VidKing] Seed successfully retrieved: ${seed}`);

        const serverPromises = Object.keys(SERVERS).map(serverName => {
            const serverConfig = SERVERS[serverName];
            return fetchFromWingsServer(
                serverName,
                serverConfig,
                mediaType,
                tmdbId,
                mediaDetails,
                seed,
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

        console.log(`[VidKing] Total unique streams found: ${uniqueStreams.length}`);
        return uniqueStreams;
    } catch (e) {
        console.error(`[VidKing] Error in getStreams: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
