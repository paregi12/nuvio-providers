import axios from 'axios';

/**
 * Fetches external IDs (MAL, AniList) for a TMDB ID from the ARM API.
 */
export async function getExternalIds(tmdbId) {
    try {
        const response = await axios.get(`https://arm.haglund.dev/api/v2/themoviedb?id=${tmdbId}`, {
            timeout: 5000
        });
        
        if (Array.isArray(response.data) && response.data.length > 0) {
            return response.data[0];
        }
    } catch (error) {
        console.error('[Kuudere] ARM API error:', error.message);
    }
    return null;
}
