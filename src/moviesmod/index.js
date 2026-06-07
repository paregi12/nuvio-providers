import cheerio from 'cheerio-without-node-native';
import { HEADERS } from './constants.js';
import { getMainUrl, fetchTmdbDetails, bypassHrefli, extractDriveseedPage, getIndexQuality } from './utils.js';

async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    console.log(`[MoviesMod] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);
    
    const details = await fetchTmdbDetails(tmdbId, mediaType);
    if (!details) return [];

    const mainUrl = await getMainUrl();
    console.log(`[MoviesMod] Main URL: ${mainUrl}`);
    const query = details.imdbId ? details.imdbId : details.title;
    const searchUrl = mediaType === 'movie' 
        ? `${mainUrl.replace(/\/$/, '')}/search/${encodeURIComponent(query)}`
        : `${mainUrl.replace(/\/$/, '')}/search/${encodeURIComponent(query)} ${seasonNum}`;
    
    try {
        console.log(`[MoviesMod] Searching at: ${searchUrl}`);
        const searchRes = await fetch(searchUrl, { headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
        const searchHtml = await searchRes.text();
        const $search = cheerio.load(searchHtml);
        
        let targetUrl = $search("#content_box article > a").first().attr("href");

        if (!targetUrl) {
            console.log("[MoviesMod] No search result found");
            return [];
        }

        const pageRes = await fetch(targetUrl, { headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
        const pageHtml = await pageRes.text();
        const $ = cheerio.load(pageHtml);
        
        const allStreams = [];
        const contentBox = $(".thecontent");

        const hTag = mediaType === 'movie' ? "h4" : "h3";
        const aTag = mediaType === 'movie' ? "Download" : "Episode";
        const sTag = mediaType === 'movie' ? "" : `(S0${seasonNum}|Season ${seasonNum})`;
        const qualityRegex = new RegExp(`${sTag}.*(480p|720p|1080p|2160p)`, "i");

        const entries = contentBox.find(hTag).filter((i, el) => {
            const text = $(el).text();
            return qualityRegex.test(text) && !text.includes("MoviesMod");
        });

        for (const entry of entries.get()) {
            const quality = getIndexQuality($(entry).text());
            const linkEl = $(entry).nextAll("p, div").find(`a:contains('${aTag}')`).first();
            const nextHref = linkEl.attr("href");
            
            if (nextHref) {
                const streams = await processModLink(nextHref, targetUrl, quality);
                allStreams.push(...streams);
            }
        }
        
        return allStreams;
    } catch (e) {
        console.error("[MoviesMod] Error:", e.message);
        return [];
    }
}

async function processModLink(url, referer, quality) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, Referer: referer } });
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const links = [];
        $('a[href*="driveseed.org"], a[href*="tech.unblockedgames.world"]').each((i, el) => {
            links.push($(el).attr("href"));
        });

        const results = [];
        for (const link of [...new Set(links)]) {
            let finalLink = link;
            if (link.includes("unblockedgames")) {
                finalLink = await bypassHrefli(link);
            }
            
            if (finalLink && finalLink.includes("driveseed")) {
                const streams = await extractDriveseedPage(finalLink);
                results.push(...streams.map(s => ({
                    ...s,
                    name: `MoviesMod [${s.name}]`,
                    title: `MoviesMod - ${s.quality} ${s.size ? `[${s.size}]` : ""}`,
                    quality: s.quality || quality,
                    provider: "moviesmod"
                })));
            }
        }
        return results;
    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
