/**
 * Vixsrc - HTTP Utilities
 */

import { USER_AGENT } from './constants.js';

/**
 * Make HTTP request with default headers
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function makeRequest(url, options = {}) {
    const defaultHeaders = {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: defaultHeaders,
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    } catch (error) {
        console.error(`[Vixsrc] Request failed for ${url}: ${error.message}`);
        throw error;
    }
}
