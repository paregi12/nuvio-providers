/**
 * Vidlink Provider - HTTP Utilities
 */

import { VIDLINK_HEADERS } from './constants.js';

/**
 * Make HTTP request with default headers
 */
export async function makeRequest(url, options = {}) {
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
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
        console.error(`[Vidlink] Request failed for ${url}: ${error.message}`);
        throw error;
    }
}
