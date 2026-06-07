// src/vidrock/index.js
import { VIDROCK_BASE_URL, WORKING_HEADERS, PLAYBACK_HEADERS } from './constants.js';
import { 
    encryptVidrock, 
    fetchTmdbDetails, 
    extractQuality, 
    needsHeaders, 
    parseAstraPlaylist 
} from './utils.js';

async function getStreams(tmdbId, mediaType, seasonNum = null, episodeNum = null) {
    console.log(`[Vidrock] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`);
    
    try {
        // 1. Get TMDB info
        const mediaInfo = await fetchTmdbDetails(tmdbId, mediaType);
        if (!mediaInfo) {
            console.error('[Vidrock] Failed to fetch TMDB details.');
            return [];
        }
        
        console.log(`[Vidrock] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || 'N/A'})`);

        // 2. Build Item ID for encryption
        let itemId;
        if (mediaType === 'tv' && seasonNum && episodeNum) {
            itemId = `${tmdbId}_${seasonNum}_${episodeNum}`;
        } else {
            itemId = tmdbId.toString();
        }

        // 3. Encrypt ID
        const encryptedId = encryptVidrock(itemId);
        
        // 4. Construct API query URL
        const apiUrl = `${VIDROCK_BASE_URL}/api/${mediaType}/${encryptedId}`;
        console.log(`[Vidrock] Querying URL: ${apiUrl}`);

        // 5. Fetch stream mapping
        const response = await fetch(apiUrl, {
            headers: WORKING_HEADERS
        });
        
        if (!response.ok) {
            console.error(`[Vidrock] Request failed with HTTP ${response.status}`);
            return [];
        }

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error(`[Vidrock] Invalid JSON response: ${responseText.substring(0, 100)}`);
            return [];
        }

        console.log(`[Vidrock] Processing API response...`);
        const streams = [];
        const astraPromises = [];

        if (data && typeof data === 'object') {
            // Check for API level error
            if (data.error) {
                console.error(`[Vidrock] API error returned: ${data.error}`);
                return [];
            }

            // Iterate over each server key
            for (const serverName of Object.keys(data)) {
                const source = data[serverName];
                if (!source || !source.url) continue;

                const videoUrl = source.url;

                // If Astra server, parse JSON playlist
                if (serverName === 'Astra' && videoUrl.includes('/playlist/')) {
                    astraPromises.push(parseAstraPlaylist(videoUrl, serverName, mediaInfo, seasonNum, episodeNum));
                    continue;
                }

                // Normal stream extraction
                let quality = extractQuality(videoUrl);
                const languageInfo = source.language ? ` [${source.language}]` : '';

                // Build title
                let mediaTitle = mediaInfo.title || 'Unknown';
                if (mediaInfo.year) {
                    mediaTitle += ` (${mediaInfo.year})`;
                }
                if (seasonNum && episodeNum) {
                    mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}`;
                }

                const streamHeaders = PLAYBACK_HEADERS;

                streams.push({
                    name: `Vidrock ${serverName}${languageInfo} - ${quality}`,
                    title: mediaTitle,
                    url: videoUrl,
                    quality: quality,
                    size: 'Unknown',
                    headers: streamHeaders,
                    provider: 'vidrock'
                });
            }
        }

        // Wait for all Astra playlist streams to resolve
        if (astraPromises.length > 0) {
            const astraResults = await Promise.all(astraPromises);
            astraResults.forEach(subList => {
                streams.push(...subList);
            });
        }

        // 6. Deduplicate by URL
        const uniqueStreams = [];
        const seenUrls = new Set();
        streams.forEach(stream => {
            if (!seenUrls.has(stream.url)) {
                seenUrls.add(stream.url);
                uniqueStreams.push(stream);
            }
        });

        // 7. Sort by quality (highest first)
        const getQualityValue = (quality) => {
            const q = quality.toLowerCase().replace(/p$/, '');
            if (q === '4k' || q === '2160') return 2160;
            if (q === '1440') return 1440;
            if (q === '1080') return 1080;
            if (q === '720') return 720;
            if (q === '480') return 480;
            if (q === '360') return 360;
            if (q === '240') return 240;
            if (q === 'unknown') return 0;
            
            const parsed = parseInt(q);
            return isNaN(parsed) ? 1 : parsed;
        };

        uniqueStreams.sort((a, b) => getQualityValue(b.quality) - getQualityValue(a.quality));

        console.log(`[Vidrock] Total streams found: ${uniqueStreams.length}`);
        return uniqueStreams;

    } catch (error) {
        console.error(`[Vidrock] Error in getStreams: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
