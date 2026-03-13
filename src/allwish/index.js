import cheerio from 'cheerio-without-node-native';
import { MAIN_URL, HEADERS, XML_HEADERS } from './constants.js';
import { getTMDBDetails, generateEpisodeVrf, findBestTitleMatch } from './utils.js';
import { extractMegaPlay } from './extractor.js';

async function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
    if (mediaType !== "tv" && mediaType !== "movie") return [];
    
    console.log(`[AllWish] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    
    try {
        const mediaInfo = await getTMDBDetails(tmdbId, mediaType);
        const query = mediaInfo.title;
        console.log(`[AllWish] TMDB Info: "${query}" (${mediaInfo.year || "N/A"})`);
        
        const searchUrl = `${MAIN_URL}/filter?keyword=${encodeURIComponent(query)}&page=1`;
        const res = await fetch(searchUrl, { headers: HEADERS });
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const searchResults = [];
        $("div.item").each((i, el) => {
            const title = $(el).find("div.name > a").text().trim();
            const href = $(el).find("div.name > a").attr("href");
            if (title && href) {
                searchResults.push({ 
                    title, 
                    url: href.startsWith('http') ? href : MAIN_URL + href 
                });
            }
        });

        if (searchResults.length === 0) {
            console.log("[AllWish] No search results found.");
            return [];
        }

        const bestMatch = findBestTitleMatch(mediaInfo, searchResults) || searchResults[0];
        console.log(`[AllWish] Selected: "${bestMatch.title}" (${bestMatch.url})`);

        const docRes = await fetch(bestMatch.url, { headers: HEADERS });
        const docHtml = await docRes.text();
        const doc$ = cheerio.load(docHtml);
        
        const id = doc$("main > div.container").attr("data-id");
        if (!id) {
            console.log("[AllWish] Anime ID not found on page.");
            return [];
        }

        const vrf = generateEpisodeVrf(id);
        const epUrl = `${MAIN_URL}/ajax/episode/list/${id}?vrf=${vrf}`;
        const epRes = await fetch(epUrl, { headers: XML_HEADERS });
        const epData = await epRes.json();

        if (epData.status !== 200 || !epData.result) {
            console.log("[AllWish] Failed to load episodes or invalid VRF.");
            return [];
        }

        const ep$ = cheerio.load(epData.result);
        let targetEpId = null;

        // If it's a movie, typically we want the episode with data-slug="1"
        const targetEpNum = (mediaType === 'movie') ? "1" : (episode ? episode.toString() : "1");

        ep$("div.range > div > a").each((i, el) => {
            const epId = ep$(el).attr("data-ids");
            const epNum = ep$(el).attr("data-slug");
            if (epNum === targetEpNum) {
                targetEpId = epId;
                return false; // Break loop
            }
        });

        if (!targetEpId) {
            console.log(`[AllWish] Episode ${targetEpNum} not found.`);
            return [];
        }

        const serverUrl = `${MAIN_URL}/ajax/server/list?servers=${targetEpId}`;
        const serverRes = await fetch(serverUrl, { headers: XML_HEADERS });
        const serverData = await serverRes.json();

        if (serverData.status !== 200 || !serverData.result) {
             console.log("[AllWish] Failed to get server list.");
             return [];
        }

        const server$ = cheerio.load(serverData.result);
        const dataIds = [];
        
        server$("div.server-type").each((i, section) => {
            server$(section).find("div.server-list > div.server").each((j, server) => {
                const dataId = server$(server).attr("data-link-id");
                if (dataId) dataIds.push(dataId);
            });
        });

        const streams = [];

        await Promise.all(dataIds.map(async (dataId) => {
             try {
                 const linkUrl = `${MAIN_URL}/ajax/server?get=${dataId}`;
                 const linkRes = await fetch(linkUrl, { headers: XML_HEADERS });
                 const linkData = await linkRes.json();

                 if (linkData.status === 200 && linkData.result && linkData.result.url) {
                     const realUrl = linkData.result.url;
                     
                     if (realUrl.includes('megaplay.buzz')) {
                         const extracted = await extractMegaPlay(realUrl);
                         extracted.forEach(stream => {
                             streams.push({
                                 ...stream,
                                 provider: "allwish"
                             });
                         });
                     } else {
                         // Fallback/other extractors can be added here
                         console.log(`[AllWish] Unhandled extractor URL: ${realUrl}`);
                     }
                 }
             } catch (e) {
                 console.log(`[AllWish] Failed to process server ${dataId}: ${e.message}`);
             }
        }));

        return streams;

    } catch (error) {
        console.error(`[AllWish] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
