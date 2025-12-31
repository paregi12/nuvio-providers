/**
 * UHDMovies Provider - Main Entry
 * 
 * This file is the entry point that exports getStreams.
 * It can import from other files in this folder.
 */

import { searchByTitle, searchByImdbId } from './search.js';
import { extractHubCloud, extractGDrive } from './extractor.js';
import { parseQuality, cleanTitle } from './utils.js';

const cheerio = require('cheerio-without-node-native');

/**
 * Main entry point called by Nuvio
 * @param {string} tmdbId - TMDB ID
 * @param {string} mediaType - 'movie' or 'tv'
 * @param {number} season - Season number (for TV)
 * @param {number} episode - Episode number (for TV)
 * @returns {Promise<Array>} Array of stream objects
 */
async function getStreams(tmdbId, mediaType, season, episode) {
    console.log(`[UHDMovies] Searching for ${mediaType} ${tmdbId}`);

    const streams = [];

    try {
        // Step 1: Search for the content
        const searchResults = await searchByImdbId(tmdbId, mediaType);

        if (!searchResults || searchResults.length === 0) {
            console.log('[UHDMovies] No results found');
            return [];
        }

        // Step 2: Get the page and find download links
        for (const result of searchResults) {
            const links = await getDownloadLinks(result.url, mediaType, season, episode);

            // Step 3: Extract each link
            for (const link of links) {
                try {
                    let extracted;

                    if (link.url.includes('hubcloud') || link.url.includes('hubcdn')) {
                        extracted = await extractHubCloud(link.url);
                    } else if (link.url.includes('drive.google')) {
                        extracted = await extractGDrive(link.url);
                    }

                    if (extracted) {
                        streams.push({
                            title: `UHDMovies ${link.quality}`,
                            url: extracted.url,
                            quality: link.quality,
                            size: link.size,
                            headers: extracted.headers
                        });
                    }
                } catch (e) {
                    console.error(`[UHDMovies] Failed to extract ${link.url}:`, e.message);
                }
            }
        }
    } catch (error) {
        console.error('[UHDMovies] Error:', error.message);
    }

    return streams;
}

async function getDownloadLinks(pageUrl, mediaType, season, episode) {
    // Implementation using imported utilities
    const response = await fetch(pageUrl);
    const html = await response.text();
    const $ = cheerio.load(html);

    const links = [];

    // Parse download links from page
    $('a[href*="hubcloud"], a[href*="hubcdn"]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text();
        const quality = parseQuality(text);

        links.push({
            url: href,
            quality: quality,
            size: extractSize(text)
        });
    });

    return links;
}

function extractSize(text) {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
    return match ? `${match[1]} ${match[2].toUpperCase()}` : null;
}

// Export for Nuvio's plugin system
module.exports = { getStreams };
