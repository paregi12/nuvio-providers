/**
 * Vidlink Provider - Response Processing
 */

import { VIDLINK_HEADERS } from './constants.js';

/**
 * Extract quality from stream data
 */
export function extractQuality(streamData) {
    if (!streamData) return 'Unknown';

    const qualityFields = ['quality', 'resolution', 'label', 'name'];

    for (const field of qualityFields) {
        if (streamData[field]) {
            const quality = streamData[field].toString().toLowerCase();

            if (quality.includes('2160') || quality.includes('4k')) return '4K';
            if (quality.includes('1440') || quality.includes('2k')) return '1440p';
            if (quality.includes('1080') || quality.includes('fhd')) return '1080p';
            if (quality.includes('720') || quality.includes('hd')) return '720p';
            if (quality.includes('480') || quality.includes('sd')) return '480p';
            if (quality.includes('360')) return '360p';
            if (quality.includes('240')) return '240p';

            const match = quality.match(/(\d{3,4})[pP]?/);
            if (match) {
                const resolution = parseInt(match[1]);
                if (resolution >= 2160) return '4K';
                if (resolution >= 1440) return '1440p';
                if (resolution >= 1080) return '1080p';
                if (resolution >= 720) return '720p';
                if (resolution >= 480) return '480p';
                if (resolution >= 360) return '360p';
                return '240p';
            }
        }
    }

    return 'Unknown';
}

/**
 * Create stream title based on media info
 */
function createStreamTitle(mediaInfo) {
    if (mediaInfo.mediaType === 'tv' && mediaInfo.season && mediaInfo.episode) {
        return `${mediaInfo.title} S${String(mediaInfo.season).padStart(2, '0')}E${String(mediaInfo.episode).padStart(2, '0')}`;
    }
    return mediaInfo.year ? `${mediaInfo.title} (${mediaInfo.year})` : mediaInfo.title;
}

/**
 * Process Vidlink API response
 */
export function processVidlinkResponse(data, mediaInfo) {
    const streams = [];

    try {
        console.log(`[Vidlink] Processing response data`);
        const streamTitle = createStreamTitle(mediaInfo);

        // Handle stream.qualities format
        if (data.stream && data.stream.qualities) {
            console.log(`[Vidlink] Processing qualities from stream object`);

            Object.entries(data.stream.qualities).forEach(([qualityKey, qualityData]) => {
                if (qualityData.url) {
                    const quality = extractQuality({ quality: qualityKey });
                    streams.push({
                        name: `Vidlink - ${quality}`,
                        title: streamTitle,
                        url: qualityData.url,
                        quality,
                        size: 'Unknown',
                        headers: VIDLINK_HEADERS,
                        provider: 'vidlink'
                    });
                }
            });

            // Handle playlist URL (HLS streams)
            if (data.stream.playlist) {
                streams.push({
                    _isPlaylist: true,
                    url: data.stream.playlist,
                    mediaInfo: { ...mediaInfo, title: streamTitle }
                });
            }
        }
        // Handle playlist-only responses
        else if (data.stream && data.stream.playlist && !data.stream.qualities) {
            console.log(`[Vidlink] Processing playlist-only response`);
            streams.push({
                _isPlaylist: true,
                url: data.stream.playlist,
                mediaInfo: { ...mediaInfo, title: streamTitle }
            });
        }
        // Handle single stream URL
        else if (data.url) {
            const quality = extractQuality(data);
            streams.push({
                name: `Vidlink - ${quality}`,
                title: streamTitle,
                url: data.url,
                quality,
                size: 'Unknown',
                headers: VIDLINK_HEADERS,
                provider: 'vidlink'
            });
        }
        // Handle streams array
        else if (data.streams && Array.isArray(data.streams)) {
            data.streams.forEach((stream, index) => {
                if (stream.url) {
                    const quality = extractQuality(stream);
                    streams.push({
                        name: `Vidlink Stream ${index + 1} - ${quality}`,
                        title: streamTitle,
                        url: stream.url,
                        quality,
                        size: stream.size || 'Unknown',
                        headers: VIDLINK_HEADERS,
                        provider: 'vidlink'
                    });
                }
            });
        }
        // Handle links array
        else if (data.links && Array.isArray(data.links)) {
            data.links.forEach((link, index) => {
                if (link.url) {
                    const quality = extractQuality(link);
                    streams.push({
                        name: `Vidlink Link ${index + 1} - ${quality}`,
                        title: streamTitle,
                        url: link.url,
                        quality,
                        size: link.size || 'Unknown',
                        headers: VIDLINK_HEADERS,
                        provider: 'vidlink'
                    });
                }
            });
        }
        // Fallback: find any URL in object
        else if (typeof data === 'object') {
            const findUrls = (obj) => {
                for (const [key, value] of Object.entries(obj)) {
                    if (typeof value === 'string' && (value.startsWith('http') || value.includes('.m3u8'))) {
                        // Skip subtitle files
                        if (value.includes('.srt') || value.includes('.vtt') ||
                            value.includes('subtitle') || value.includes('captions') ||
                            key.toLowerCase().includes('subtitle') || key.toLowerCase().includes('caption')) {
                            continue;
                        }

                        const quality = extractQuality({ [key]: value });
                        streams.push({
                            name: `Vidlink ${key} - ${quality}`,
                            title: streamTitle,
                            url: value,
                            quality,
                            size: 'Unknown',
                            headers: VIDLINK_HEADERS,
                            provider: 'vidlink'
                        });
                    } else if (typeof value === 'object' && value !== null) {
                        if (!key.toLowerCase().includes('caption') && !key.toLowerCase().includes('subtitle')) {
                            findUrls(value);
                        }
                    }
                }
            };

            findUrls(data);
        }

        console.log(`[Vidlink] Extracted ${streams.length} streams from response`);

    } catch (error) {
        console.error(`[Vidlink] Error processing response: ${error.message}`);
    }

    return streams;
}
