/**
 * 4KHDHub Provider - Main Entry
 */

const cheerio = require('cheerio-without-node-native');
import { fetchText } from './http.js';
import { getTmdbDetails } from './tmdb.js';
import { fetchPageUrl } from './search.js';
import { extractSourceResults, extractHubCloud, formatBytes } from './extractor.js';

/**
 * Main entry point called by Nuvio
 */
async function getStreams(tmdbId, type, season, episode) {
    const tmdbDetails = await getTmdbDetails(tmdbId, type);
    if (!tmdbDetails) return [];

    const { title, year } = tmdbDetails;
    console.log(`[4KHDHub] Search: ${title} (${year})`);

    const isSeries = type === 'series' || type === 'tv';
    const pageUrl = await fetchPageUrl(title, year, isSeries);

    if (!pageUrl) {
        console.log('[4KHDHub] Page not found');
        return [];
    }
    console.log(`[4KHDHub] Found page: ${pageUrl}`);

    const html = await fetchText(pageUrl);
    if (!html) return [];

    const $ = cheerio.load(html);
    const itemsToProcess = [];

    if (isSeries && season && episode) {
        // Find specific season and episode
        const seasonStr = 'S' + String(season).padStart(2, '0');
        const episodeStr = 'Episode-' + String(episode).padStart(2, '0');

        $('.episode-item').each((_, el) => {
            if ($('.episode-title', el).text().includes(seasonStr)) {
                const downloadItems = $('.episode-download-item', el)
                    .filter((_, item) => $(item).text().includes(episodeStr));

                downloadItems.each((_, item) => {
                    itemsToProcess.push(item);
                });
            }
        });
    } else {
        // Movies
        $('.download-item').each((_, el) => {
            itemsToProcess.push(el);
        });
    }

    console.log(`[4KHDHub] Processing ${itemsToProcess.length} items`);

    const streamPromises = itemsToProcess.map(async (item) => {
        try {
            const sourceResult = await extractSourceResults($, item);

            if (sourceResult && sourceResult.url) {
                console.log(`[4KHDHub] Extracting from HubCloud: ${sourceResult.url}`);
                const extractedLinks = await extractHubCloud(sourceResult.url, sourceResult.meta);

                return extractedLinks.map(link => ({
                    name: `4KHDHub - ${link.source}${sourceResult.meta.height ? ` ${sourceResult.meta.height}p` : ''}`,
                    title: `${link.meta.title}\n${formatBytes(link.meta.bytes || 0)}`,
                    url: link.url,
                    quality: sourceResult.meta.height ? `${sourceResult.meta.height}p` : undefined,
                    behaviorHints: {
                        bingeGroup: `4khdhub-${link.source}`
                    }
                }));
            }
            return [];
        } catch (err) {
            console.log(`[4KHDHub] Item processing error: ${err.message}`);
            return [];
        }
    });

    const results = await Promise.all(streamPromises);

    // Flatten results
    return results.reduce((acc, val) => acc.concat(val), []);
}

module.exports = { getStreams };
