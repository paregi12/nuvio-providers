/**
 * Vixsrc - Stream Extractor
 */

import { BASE_URL } from './constants.js';
import { makeRequest } from './http.js';

/**
 * Extract stream URL from Vixsrc page
 * @param {string} contentType - 'movie' or 'tv'
 * @param {string} contentId - TMDB ID
 * @param {number} seasonNum - Season number (for TV)
 * @param {number} episodeNum - Episode number (for TV)
 * @returns {Promise<Object|null>} Stream data or null
 */
export async function extractStreamFromPage(contentType, contentId, seasonNum, episodeNum) {
    let vixsrcUrl;
    let subtitleApiUrl;

    if (contentType === 'movie') {
        vixsrcUrl = `${BASE_URL}/movie/${contentId}`;
        subtitleApiUrl = `https://sub.wyzie.ru/search?id=${contentId}`;
    } else {
        vixsrcUrl = `${BASE_URL}/tv/${contentId}/${seasonNum}/${episodeNum}`;
        subtitleApiUrl = `https://sub.wyzie.ru/search?id=${contentId}&season=${seasonNum}&episode=${episodeNum}`;
    }

    console.log(`[Vixsrc] Fetching: ${vixsrcUrl}`);

    const response = await makeRequest(vixsrcUrl, {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    });

    const html = await response.text();
    console.log(`[Vixsrc] HTML length: ${html.length} characters`);

    let masterPlaylistUrl = null;

    // Method 1: Look for window.masterPlaylist (primary method)
    if (html.includes('window.masterPlaylist')) {
        console.log('[Vixsrc] Found window.masterPlaylist');

        const urlMatch = html.match(/url:\s*['"]([^'"]+)['"]/);
        const tokenMatch = html.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
        const expiresMatch = html.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/);

        if (urlMatch && tokenMatch && expiresMatch) {
            const baseUrl = urlMatch[1];
            const token = tokenMatch[1];
            const expires = expiresMatch[1];

            console.log('[Vixsrc] Extracted tokens:');
            console.log(`  - Base URL: ${baseUrl}`);
            console.log(`  - Token: ${token.substring(0, 20)}...`);
            console.log(`  - Expires: ${expires}`);

            // Construct the master playlist URL
            if (baseUrl.includes('?b=1')) {
                masterPlaylistUrl = `${baseUrl}&token=${token}&expires=${expires}&h=1&lang=en`;
            } else {
                masterPlaylistUrl = `${baseUrl}?token=${token}&expires=${expires}&h=1&lang=en`;
            }

            console.log(`[Vixsrc] Constructed master playlist URL: ${masterPlaylistUrl}`);
        }
    }

    // Method 2: Look for direct .m3u8 URLs
    if (!masterPlaylistUrl) {
        const m3u8Match = html.match(/(https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)/);
        if (m3u8Match) {
            masterPlaylistUrl = m3u8Match[1];
            console.log('[Vixsrc] Found direct .m3u8 URL:', masterPlaylistUrl);
        }
    }

    // Method 3: Look for stream URLs in script tags
    if (!masterPlaylistUrl) {
        const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
        if (scriptMatches) {
            for (const script of scriptMatches) {
                const streamMatch = script.match(/['"]?(https?:\/\/[^'"\s]+(?:\.m3u8|playlist)[^'"\s]*)/);
                if (streamMatch) {
                    masterPlaylistUrl = streamMatch[1];
                    console.log('[Vixsrc] Found stream in script:', masterPlaylistUrl);
                    break;
                }
            }
        }
    }

    if (!masterPlaylistUrl) {
        console.log('[Vixsrc] No master playlist URL found');
        return null;
    }

    return { masterPlaylistUrl, subtitleApiUrl };
}

/**
 * Parse M3U8 playlist to extract quality streams
 * @param {string} content - M3U8 content
 * @param {string} baseUrl - Base URL for resolving relative paths
 * @returns {Object} Parsed streams and audio tracks
 */
export function parseM3U8Playlist(content, baseUrl) {
    const streams = [];
    const audioTracks = [];
    const lines = content.split('\n');

    let currentStream = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Parse video streams
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
            const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
            const nameMatch = line.match(/NAME="([^"]+)"/) || line.match(/NAME=([^,]+)/);

            if (bandwidthMatch) {
                currentStream = {
                    bandwidth: parseInt(bandwidthMatch[1]),
                    resolution: resolutionMatch ? resolutionMatch[1] : 'Unknown',
                    quality: nameMatch ? nameMatch[1] : getQualityFromResolution(resolutionMatch ? resolutionMatch[1] : 'Unknown'),
                    url: ''
                };
            }
        }
        // Parse audio tracks
        else if (line.startsWith('#EXT-X-MEDIA:')) {
            const typeMatch = line.match(/TYPE=([^,]+)/);
            const nameMatch = line.match(/NAME="([^"]+)"/);
            const groupIdMatch = line.match(/GROUP-ID="([^"]+)"/);
            const languageMatch = line.match(/LANGUAGE="([^"]+)"/);
            const uriMatch = line.match(/URI="([^"]+)"/);

            if (typeMatch && typeMatch[1] === 'AUDIO') {
                const audioTrack = {
                    type: 'audio',
                    name: nameMatch ? nameMatch[1] : 'Unknown Audio',
                    groupId: groupIdMatch ? groupIdMatch[1] : 'unknown',
                    language: languageMatch ? languageMatch[1] : 'unknown',
                    url: uriMatch ? resolveUrl(uriMatch[1], baseUrl) : null
                };
                audioTracks.push(audioTrack);
            }
        }
        // Handle URLs for video streams
        else if (line.startsWith('http') && currentStream) {
            currentStream.url = line;
            streams.push(currentStream);
            currentStream = null;
        }
    }

    return { streams, audioTracks };
}

/**
 * Get quality label from resolution
 */
function getQualityFromResolution(resolution) {
    if (resolution.includes('1920x1080') || resolution.includes('1080')) {
        return '1080p';
    } else if (resolution.includes('1280x720') || resolution.includes('720')) {
        return '720p';
    } else if (resolution.includes('854x480') || resolution.includes('640x480') || resolution.includes('480')) {
        return '480p';
    } else if (resolution.includes('640x360') || resolution.includes('360')) {
        return '360p';
    }
    return resolution;
}

/**
 * Resolve relative URL to absolute
 */
function resolveUrl(url, baseUrl) {
    if (url.startsWith('http')) {
        return url;
    }

    const baseUrlObj = new URL(baseUrl);
    if (url.startsWith('/')) {
        return `${baseUrlObj.protocol}//${baseUrlObj.host}${url}`;
    } else {
        const basePath = baseUrlObj.pathname.substring(0, baseUrlObj.pathname.lastIndexOf('/') + 1);
        return `${baseUrlObj.protocol}//${baseUrlObj.host}${basePath}${url}`;
    }
}
