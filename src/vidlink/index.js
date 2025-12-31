/**
 * Vidlink Provider - Main Entry
 */

import { VIDLINK_API, VIDLINK_HEADERS } from './constants.js';
import { makeRequest } from './http.js';
import { getTmdbInfo, encryptTmdbId } from './tmdb.js';
import { fetchAndParseM3U8 } from './m3u8.js';
import { processVidlinkResponse } from './processor.js';

// Quality order for sorting
const QUALITY_ORDER = {
    '4K': 5, '1440p': 4, '1080p': 3, '720p': 2, '480p': 1,
    '360p': 0, '240p': -1, 'Auto': -2, 'Unknown': -3
};

/**
 * Main entry point called by Nuvio
 */
async function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    console.log(`[Vidlink] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`);

    try {
        // Step 1: Get TMDB info
        const { title, year } = await getTmdbInfo(tmdbId, mediaType);

        // Step 2: Encrypt TMDB ID
        const encryptedId = await encryptTmdbId(tmdbId);

        // Step 3: Build Vidlink API URL
        let vidlinkUrl;
        if (mediaType === 'tv' && seasonNum && episodeNum) {
            vidlinkUrl = `${VIDLINK_API}/tv/${encryptedId}/${seasonNum}/${episodeNum}`;
        } else {
            vidlinkUrl = `${VIDLINK_API}/movie/${encryptedId}`;
        }

        console.log(`[Vidlink] Requesting: ${vidlinkUrl}`);

        // Step 4: Fetch stream data
        const response = await makeRequest(vidlinkUrl, { headers: VIDLINK_HEADERS });
        const data = await response.json();

        console.log(`[Vidlink] Received response from Vidlink API`);

        // Step 5: Process the response
        const mediaInfo = {
            title,
            year,
            mediaType,
            season: seasonNum,
            episode: episodeNum
        };

        const streams = processVidlinkResponse(data, mediaInfo);

        if (streams.length === 0) {
            console.log('[Vidlink] No streams found in response');
            return [];
        }

        // Step 6: Process playlist streams if any
        const playlistStreams = streams.filter(s => s._isPlaylist);
        const directStreams = streams.filter(s => !s._isPlaylist);

        if (playlistStreams.length > 0) {
            console.log(`[Vidlink] Processing ${playlistStreams.length} M3U8 playlists`);

            const playlistPromises = playlistStreams.map(ps =>
                fetchAndParseM3U8(ps.url, ps.mediaInfo)
            );

            const parsedStreamArrays = await Promise.all(playlistPromises);
            const allStreams = directStreams.concat(...parsedStreamArrays);

            // Sort by quality
            allStreams.sort((a, b) => (QUALITY_ORDER[b.quality] || -3) - (QUALITY_ORDER[a.quality] || -3));

            console.log(`[Vidlink] Successfully processed ${allStreams.length} total streams`);
            return allStreams;
        } else {
            // Sort direct streams
            directStreams.sort((a, b) => (QUALITY_ORDER[b.quality] || -3) - (QUALITY_ORDER[a.quality] || -3));

            console.log(`[Vidlink] Successfully processed ${directStreams.length} streams`);
            return directStreams;
        }
    } catch (error) {
        console.error(`[Vidlink] Error in getStreams: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
