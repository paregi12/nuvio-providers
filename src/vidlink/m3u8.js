/**
 * Vidlink Provider - M3U8 Parsing
 */

import { VIDLINK_HEADERS } from './constants.js';
import { makeRequest } from './http.js';

/**
 * Resolve relative URL against base URL
 */
export function resolveUrl(url, baseUrl) {
    if (url.startsWith('http')) {
        return url;
    }
    try {
        return new URL(url, baseUrl).toString();
    } catch (error) {
        console.error(`[Vidlink] Could not resolve URL: ${url} against ${baseUrl}`);
        return url;
    }
}

/**
 * Determine quality from resolution
 */
export function getQualityFromResolution(resolution) {
    if (!resolution) return 'Auto';

    const [, height] = resolution.split('x').map(Number);

    if (height >= 2160) return '4K';
    if (height >= 1440) return '1440p';
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    if (height >= 360) return '360p';
    return '240p';
}

/**
 * Parse M3U8 content and extract quality streams
 */
export function parseM3U8(content, baseUrl) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const streams = [];
    let currentStream = null;

    for (const line of lines) {
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            currentStream = { bandwidth: null, resolution: null, url: null };

            const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
            if (bandwidthMatch) {
                currentStream.bandwidth = parseInt(bandwidthMatch[1]);
            }

            const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
            if (resolutionMatch) {
                currentStream.resolution = resolutionMatch[1];
            }
        } else if (currentStream && !line.startsWith('#')) {
            currentStream.url = resolveUrl(line, baseUrl);
            streams.push(currentStream);
            currentStream = null;
        }
    }

    return streams;
}

/**
 * Fetch and parse M3U8 playlist
 */
export async function fetchAndParseM3U8(playlistUrl, mediaInfo) {
    console.log(`[Vidlink] Fetching M3U8 playlist: ${playlistUrl.substring(0, 80)}...`);

    try {
        const response = await makeRequest(playlistUrl, { headers: VIDLINK_HEADERS });
        const m3u8Content = await response.text();

        console.log(`[Vidlink] Parsing M3U8 content`);
        const parsedStreams = parseM3U8(m3u8Content, playlistUrl);

        if (parsedStreams.length === 0) {
            console.log('[Vidlink] No quality variants found, returning master playlist');
            return [{
                name: 'Vidlink - Auto',
                title: mediaInfo.title,
                url: playlistUrl,
                quality: 'Auto',
                size: 'Unknown',
                headers: VIDLINK_HEADERS,
                provider: 'vidlink'
            }];
        }

        console.log(`[Vidlink] Found ${parsedStreams.length} quality variants`);

        return parsedStreams.map(stream => {
            const quality = getQualityFromResolution(stream.resolution);
            return {
                name: `Vidlink - ${quality}`,
                title: mediaInfo.title,
                url: stream.url,
                quality,
                size: 'Unknown',
                headers: VIDLINK_HEADERS,
                provider: 'vidlink'
            };
        });
    } catch (error) {
        console.error(`[Vidlink] Error fetching/parsing M3U8: ${error.message}`);
        return [{
            name: 'Vidlink - Auto',
            title: mediaInfo.title,
            url: playlistUrl,
            quality: 'Auto',
            size: 'Unknown',
            headers: VIDLINK_HEADERS,
            provider: 'vidlink'
        }];
    }
}
