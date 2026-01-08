import cheerio from 'cheerio-without-node-native';
import { fetchText } from './http.js';
import { BASE_URL } from './constants.js';

export async function searchProvider(title, year, mediaType, season) {
    // 1. Try strict season search first
    let query = mediaType === 'movie' ? `${title} ${year}` : `${title} Season ${season}`;
    let searchUrl = `${BASE_URL}/page/1/?s=${encodeURIComponent(query)}`;
    let searchHtml = await fetchText(searchUrl);
    let $ = cheerio.load(searchHtml);
    
    let targetLink = findMatch($, title, year, mediaType, season);
    
    // 2. Fallback to general search if strict failed
    if (!targetLink) {
         console.log(`[VegaMovies] Strict search failed, trying general search...`);
         searchUrl = `${BASE_URL}/page/1/?s=${encodeURIComponent(title)}`;
         searchHtml = await fetchText(searchUrl);
         $ = cheerio.load(searchHtml);
         targetLink = findMatch($, title, year, mediaType, season);
    }

    return targetLink;
}

function findMatch($, title, year, mediaType, season) {
    let bestMatch = null;
    const lowerQuery = title.toLowerCase();

    $('article.entry').each((i, el) => {
        const itemTitle = $(el).find('h2 > a').text() || "";
        const itemLink = $(el).find('a').attr('href');
        const lowerTitle = itemTitle.toLowerCase();
        
        if (lowerTitle.includes(lowerQuery)) {
            if (mediaType !== 'movie') {
                 const seasonStr = `season ${season}`;
                 const s0SeasonStr = `season 0${season}`;
                 
                 if (lowerTitle.includes(seasonStr) || lowerTitle.includes(s0SeasonStr)) {
                     if (!bestMatch || (!bestMatch.title.includes(seasonStr) && !bestMatch.title.includes(s0SeasonStr))) {
                         bestMatch = { link: itemLink, title: lowerTitle, priority: 10 };
                     }
                 } else if (lowerTitle.includes("series") || lowerTitle.includes("complete")) {
                     if (!bestMatch || bestMatch.priority < 5) {
                         bestMatch = { link: itemLink, title: lowerTitle, priority: 5 };
                     }
                 }
            } else {
                if (year && lowerTitle.includes(year)) {
                    bestMatch = { link: itemLink, title: lowerTitle, priority: 10 };
                } else if (!bestMatch) {
                    bestMatch = { link: itemLink, title: lowerTitle, priority: 1 };
                }
            }
        }
    });

    return bestMatch?.link;
}
