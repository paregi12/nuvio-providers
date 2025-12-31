/**
 * Castle Provider - Main Entry
 */

import { PLAYBACK_HEADERS } from './constants.js';
import { extractDataBlock } from './http.js';
import { getTMDBDetails } from './tmdb.js';
import {
    getSecurityKey,
    getDetails,
    getVideo2,
    getVideoV1,
    findCastleMovieId
} from './api.js';
import { getQualityValue, formatSize, resolutionToQuality } from './utils.js';

/**
 * Process video response and extract streams
 */
function processVideoResponse(videoData, mediaInfo, seasonNum, episodeNum, resolution, languageInfo) {
    const streams = [];
    const data = extractDataBlock(videoData);

    const videoUrl = data.videoUrl;
    if (!videoUrl) {
        console.log('[Castle] No videoUrl found in response');
        return streams;
    }

    // Create media title
    let mediaTitle = mediaInfo.title || 'Unknown';
    if (mediaInfo.year) {
        mediaTitle += ` (${mediaInfo.year})`;
    }
    if (seasonNum && episodeNum) {
        mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}`;
    }

    const quality = resolutionToQuality(resolution);

    // Handle multiple quality videos
    if (data.videos && Array.isArray(data.videos)) {
        for (const video of data.videos) {
            let videoQuality = video.resolutionDescription || video.resolution || quality;
            videoQuality = videoQuality.replace(/^(SD|HD|FHD)\s+/i, '');

            const streamName = languageInfo
                ? `Castle ${languageInfo} - ${videoQuality}`
                : `Castle - ${videoQuality}`;

            streams.push({
                name: streamName,
                title: mediaTitle,
                url: video.url || videoUrl,
                quality: videoQuality,
                size: formatSize(video.size),
                headers: PLAYBACK_HEADERS,
                provider: 'castle'
            });
        }
    } else {
        const streamName = languageInfo
            ? `Castle ${languageInfo} - ${quality}`
            : `Castle - ${quality}`;

        streams.push({
            name: streamName,
            title: mediaTitle,
            url: videoUrl,
            quality,
            size: formatSize(data.size),
            headers: PLAYBACK_HEADERS,
            provider: 'castle'
        });
    }

    return streams;
}

/**
 * Main entry point called by Nuvio
 */
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log(`[Castle] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`);

    try {
        // Step 1: Get TMDB details
        const tmdbInfo = await getTMDBDetails(tmdbId, mediaType);
        console.log(`[Castle] TMDB Info: "${tmdbInfo.title}" (${tmdbInfo.year || 'N/A'})`);

        // Step 2: Get security key
        const securityKey = await getSecurityKey();

        // Step 3: Find Castle movie ID
        const movieId = await findCastleMovieId(securityKey, tmdbInfo);

        // Step 4: Get details
        let details = await getDetails(securityKey, movieId);
        let currentMovieId = movieId;

        // Step 5: Handle TV seasons
        if (mediaType === 'tv' && seasonNum && episodeNum) {
            const data = extractDataBlock(details);
            const seasons = data.seasons || [];
            const season = seasons.find(s => s.number === seasonNum);

            if (season && season.movieId && season.movieId !== movieId) {
                console.log(`[Castle] Fetching season ${seasonNum} details...`);
                details = await getDetails(securityKey, season.movieId.toString());
                currentMovieId = season.movieId.toString();
            }
        }

        // Step 6: Find episode ID
        const detailsData = extractDataBlock(details);
        const episodes = detailsData.episodes || [];

        let episodeId = null;
        if (mediaType === 'tv' && seasonNum && episodeNum) {
            const episode = episodes.find(e => e.number === episodeNum);
            if (episode && episode.id) {
                episodeId = episode.id.toString();
            }
        } else if (episodes.length > 0) {
            episodeId = episodes[0].id.toString();
        }

        if (!episodeId) {
            throw new Error('Could not find episode ID');
        }

        // Step 7: Get language tracks
        const episode = episodes.find(e => e.id.toString() === episodeId);
        const tracks = (episode && episode.tracks) || [];

        // Step 8: Fetch all language streams
        const resolution = 2; // Default 720p
        const allStreams = [];

        for (const track of tracks) {
            const langName = track.languageName || track.abbreviate || 'Unknown';

            if (track.existIndividualVideo && track.languageId) {
                try {
                    console.log(`[Castle] Fetching ${langName} (languageId: ${track.languageId})`);
                    const videoData = await getVideoV1(securityKey, currentMovieId, episodeId, track.languageId, resolution);
                    const langStreams = processVideoResponse(videoData, tmdbInfo, seasonNum, episodeNum, resolution, `[${langName}]`);

                    if (langStreams.length > 0) {
                        console.log(`[Castle] ✅ ${langName}: Found ${langStreams.length} streams`);
                        allStreams.push(...langStreams);
                    }
                } catch (error) {
                    console.log(`[Castle] ⚠️ ${langName}: Failed - ${error.message}`);
                }
            }
        }

        // Fallback to shared stream if no individual videos
        if (allStreams.length === 0) {
            console.log('[Castle] Falling back to shared stream (v2)');
            const videoData = await getVideo2(securityKey, currentMovieId, episodeId, resolution);
            const sharedStreams = processVideoResponse(videoData, tmdbInfo, seasonNum, episodeNum, resolution, '[Shared]');
            allStreams.push(...sharedStreams);
        }

        // Sort by quality (highest first)
        allStreams.sort((a, b) => getQualityValue(b.quality) - getQualityValue(a.quality));

        console.log(`[Castle] Total streams found: ${allStreams.length}`);
        return allStreams;

    } catch (error) {
        console.error(`[Castle] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
