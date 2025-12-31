/**
 * Vixsrc - Subtitle Functions
 */

import { makeRequest } from './http.js';

/**
 * Get subtitles from Wyzie API
 * @param {string} subtitleApiUrl - Subtitle API URL
 * @returns {Promise<string>} Subtitle URL or empty string
 */
export async function getSubtitles(subtitleApiUrl) {
    try {
        const response = await makeRequest(subtitleApiUrl);
        const subtitleData = await response.json();

        // Find English subtitle track (prefer ASCII/UTF-8 encoding)
        let subtitleTrack = subtitleData.find(track =>
            track.display.includes('English') && (track.encoding === 'ASCII' || track.encoding === 'UTF-8')
        );

        // Fallback to other encodings
        if (!subtitleTrack) {
            subtitleTrack = subtitleData.find(track =>
                track.display.includes('English') && track.encoding === 'CP1252'
            );
        }

        if (!subtitleTrack) {
            subtitleTrack = subtitleData.find(track =>
                track.display.includes('English') && track.encoding === 'CP1250'
            );
        }

        if (!subtitleTrack) {
            subtitleTrack = subtitleData.find(track =>
                track.display.includes('English') && track.encoding === 'CP850'
            );
        }

        const subtitles = subtitleTrack ? subtitleTrack.url : '';
        console.log(subtitles
            ? `[Vixsrc] Found subtitles: ${subtitles}`
            : '[Vixsrc] No English subtitles found'
        );

        return subtitles;
    } catch (error) {
        console.log('[Vixsrc] Subtitle fetch failed:', error.message);
        return '';
    }
}
