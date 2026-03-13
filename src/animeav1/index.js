import cheerio from 'cheerio-without-node-native';
import { MAIN_URL, HEADERS } from './constants.js';
import { getTMDBDetails, findBestTitleMatch, cleanJsToJson } from './utils.js';
import { extractZilla, extractVidStack } from './extractor.js';

export async function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
    console.log(`[Animeav1] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    
    try {
        const mediaInfo = await getTMDBDetails(tmdbId, mediaType);
        const query = mediaInfo.title;
        console.log(`[Animeav1] TMDB Info: "${query}" (${mediaInfo.year || "N/A"})`);
        
        const searchUrl = `${MAIN_URL}/catalogo?search=${encodeURIComponent(query)}`;
        const res = await fetch(searchUrl, { headers: HEADERS });
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const searchResults = [];
        $("article").each((i, el) => {
            const title = $(el).find("h3").text().trim();
            const href = $(el).find("a").attr("href");
            if (title && href) {
                searchResults.push({ 
                    title, 
                    url: href.startsWith('http') ? href : MAIN_URL + href 
                });
            }
        });

        if (searchResults.length === 0) {
            console.log("[Animeav1] No search results found.");
            return [];
        }

        const bestMatch = findBestTitleMatch(mediaInfo, searchResults) || searchResults[0];
        console.log(`[Animeav1] Selected: "${bestMatch.title}" (${bestMatch.url})`);

        const docRes = await fetch(bestMatch.url, { headers: HEADERS });
        const docHtml = await docRes.text();
        
        // Extract slug and total episodes for TV series
        let epUrl = bestMatch.url;
        if (mediaType === "tv") {
            const regex = /media:\{.*?episodesCount:(\d+).*?slug:"(.*?)"/s;
            const match = docHtml.match(regex);
            if (match) {
                const slug = match[2];
                const epNum = episode || 1;
                epUrl = `${MAIN_URL}/media/${slug}/${epNum}`;
            } else {
                console.log("[Animeav1] Could not extract media slug/episodes.");
                // Try fallback to search for /media/ in links
                const doc$ = cheerio.load(docHtml);
                const firstEp = doc$("div.grid > article a").first().attr("href");
                if (firstEp) {
                    epUrl = firstEp.startsWith('http') ? firstEp : MAIN_URL + firstEp;
                }
            }
        }

        console.log(`[Animeav1] Fetching episode page: ${epUrl}`);
        const epRes = await fetch(epUrl, { headers: HEADERS });
        const epHtml = await epRes.text();
        
        const embedsPattern = /embeds:\s*(\{([^}]*\{[^}]*\})*[^}]*\})/s;
        const embedsMatch = epHtml.match(embedsPattern);
        
        if (!embedsMatch) {
            console.log("[Animeav1] No embeds found in script.");
            return [];
        }

        const embedsJsonStr = cleanJsToJson(embedsMatch[1]);
        const embeds = JSON.parse(embedsJsonStr);
        
        const streams = [];
        const allEmbeds = [
            ...(embeds.SUB || []).map(e => ({ ...e, type: 'SUB' })),
            ...(embeds.DUB || []).map(e => ({ ...e, type: 'DUB' }))
        ];

        for (const embed of allEmbeds) {
            try {
                const server = embed.server;
                const url = embed.url;
                
                if (url.includes('zilla-networks.com')) {
                    const extracted = await extractZilla(url, epUrl);
                    extracted.forEach(s => streams.push({ ...s, title: `${s.title} [${embed.type}:${server}]`, provider: "animeav1" }));
                } else {
                    const extracted = await extractVidStack(url, epUrl);
                    extracted.forEach(s => streams.push({ ...s, title: `${s.title} [${embed.type}:${server}]`, provider: "animeav1" }));
                }
            } catch (e) {
                console.log(`[Animeav1] Failed to process embed: ${e.message}`);
            }
        }

        return streams;

    } catch (error) {
        console.error(`[Animeav1] Error: ${error.message}`);
        return [];
    }
}
