/**
 * 4KHDHub Provider - Search Functions
 */

const cheerio = require('cheerio-without-node-native');
import { BASE_URL } from './constants.js';
import { fetchText } from './http.js';
import { levenshteinDistance } from './utils.js';

/**
 * Search for content page URL
 */
export async function fetchPageUrl(name, year, isSeries) {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(name + ' ' + year)}`;
    const html = await fetchText(searchUrl);

    if (!html) return null;

    const $ = cheerio.load(html);
    const targetType = isSeries ? 'Series' : 'Movies';

    const matchingCards = $('.movie-card')
        .filter((_, el) => {
            const hasFormat = $(el).find(`.movie-card-format:contains("${targetType}")`).length > 0;
            return hasFormat;
        })
        .filter((_, el) => {
            const metaText = $(el).find('.movie-card-meta').text();
            const movieCardYear = parseInt(metaText);
            return !isNaN(movieCardYear) && Math.abs(movieCardYear - year) <= 1;
        })
        .filter((_, el) => {
            const movieCardTitle = $(el).find('.movie-card-title')
                .text()
                .replace(/\[.*?]/g, '')
                .trim();
            return levenshteinDistance(movieCardTitle.toLowerCase(), name.toLowerCase()) < 5;
        })
        .map((_, el) => {
            let href = $(el).attr('href');
            if (href && !href.startsWith('http')) {
                href = BASE_URL + (href.startsWith('/') ? '' : '/') + href;
            }
            return href;
        })
        .get();

    return matchingCards.length > 0 ? matchingCards[0] : null;
}
