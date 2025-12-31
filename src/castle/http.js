/**
 * Castle Provider - HTTP Utilities
 */

import { API_HEADERS } from './constants.js';

/**
 * Make HTTP request with default headers
 */
export async function makeRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: { ...API_HEADERS, ...options.headers },
            body: options.body
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
    } catch (error) {
        console.error(`[Castle] Request failed for ${url}: ${error.message}`);
        throw error;
    }
}

/**
 * Extract cipher from response (JSON wrapper or raw base64)
 */
export async function extractCipherFromResponse(response) {
    const text = await response.text();
    const trimmed = text.trim();

    if (!trimmed) {
        throw new Error('Empty response');
    }

    // Try to parse as JSON first
    try {
        const json = JSON.parse(trimmed);
        if (json && json.data && typeof json.data === 'string') {
            return json.data.trim();
        }
    } catch (e) {
        // Not JSON, assume raw base64
    }

    return trimmed;
}

/**
 * Extract data block from API response
 */
export function extractDataBlock(obj) {
    if (obj && obj.data && typeof obj.data === 'object') {
        return obj.data;
    }
    return obj || {};
}
