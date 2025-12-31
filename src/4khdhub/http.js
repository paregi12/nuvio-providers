/**
 * 4KHDHub Provider - HTTP Utilities
 */

import { USER_AGENT } from './constants.js';

/**
 * Fetch text content from URL
 */
export async function fetchText(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                ...options.headers
            }
        });
        return await response.text();
    } catch (err) {
        console.log(`[4KHDHub] Request failed for ${url}: ${err.message}`);
        return null;
    }
}
