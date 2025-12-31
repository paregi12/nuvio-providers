/**
 * Vixsrc Provider - Main Entry
 * 
 * Multi-file version with separate modules
 */

import { makeRequest } from './http.js';
import { getTmdbInfo } from './tmdb.js';
import { extractStreamFromPage } from './extractor.js';
import { getSubtitles } from './subtitles.js';
import { BASE_URL } from './constants.js';

/**
 * Main entry point called by Nuvio
 * @param {string} tmdbId - TMDB ID
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {number} seasonNum - Season number (for TV)
 * @param {number} episodeNum - Episode number (for TV)
 * @returns {Promise<Array>} Array of stream objects
 */
async function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    console.log(`[Vixsrc] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);

    try {
        // Step 1: Get TMDB info
        const tmdbInfo = await getTmdbInfo(tmdbId, mediaType);
        const { title, year } = tmdbInfo;
        console.log(`[Vixsrc] Title: "${title}" (${year})`);

        // Step 2: Extract stream from Vixsrc page
        const streamData = await extractStreamFromPage(mediaType, tmdbId, seasonNum, episodeNum);

        if (!streamData) {
            console.log('[Vixsrc] No stream data found');
            return [];
        }

        const { masterPlaylistUrl, subtitleApiUrl } = streamData;

        // Step 3: Get subtitles
        const subtitles = await getSubtitles(subtitleApiUrl);

        // Step 4: Return stream
        const nuvioStreams = [{
            name: "Vixsrc",
            title: "Auto Quality Stream",
            url: masterPlaylistUrl,
            quality: 'Auto',
            type: 'direct',
            headers: {
                'Referer': BASE_URL,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        }];

        console.log('[Vixsrc] Successfully processed 1 stream with Auto quality');
        return nuvioStreams;

    } catch (error) {
        console.error(`[Vixsrc] Error in getStreams: ${error.message}`);
        return [];
    }
}

// Export for Nuvio's plugin system
module.exports = { getStreams };
