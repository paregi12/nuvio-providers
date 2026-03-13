import { ANICHI_API, HASHES, HEADERS, ANICHI_ENDPOINT } from './constants.js';
import { getTMDBDetails, findBestTitleMatch, decryptHex, fixUrlPath } from './utils.js';

async function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
    console.log(`[Anichi] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    
    try {
        const mediaInfo = await getTMDBDetails(tmdbId, mediaType);
        const query = mediaInfo.title;
        console.log(`[Anichi] TMDB Info: "${query}" (${mediaInfo.year || "N/A"})`);
        
        const searchVariables = {
            search: { query: query },
            limit: 26,
            page: 1,
            translationType: "sub",
            countryOrigin: "ALL"
        };
        
        const searchUrl = `${ANICHI_API}?variables=${encodeURIComponent(JSON.stringify(searchVariables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASHES.mainPage } }))}`;
        
        const res = await fetch(searchUrl, { headers: HEADERS });
        const resData = await res.json();
        
        const edges = resData?.data?.shows?.edges || [];
        const searchResults = edges.map(edge => ({
            id: edge._id,
            title: edge.name || edge.englishName || edge.nativeName,
            year: edge.airedStart?.year
        }));

        const bestMatch = findBestTitleMatch(mediaInfo, searchResults) || searchResults[0];
        if (!bestMatch) return [];

        console.log(`[Anichi] Selected: "${bestMatch.title}" (ID: ${bestMatch.id})`);

        const dubStatus = "sub"; // Default to sub for now
        const epStr = (mediaType === "movie" ? "1" : (episode ? episode.toString() : "1"));
        
        const epVariables = {
            showId: bestMatch.id,
            translationType: dubStatus,
            episodeString: epStr
        };
        
        const epUrl = `${ANICHI_API}?variables=${encodeURIComponent(JSON.stringify(epVariables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASHES.server } }))}`;
        
        const epRes = await fetch(epUrl, { headers: HEADERS });
        const epData = await epRes.json();
        const sources = epData?.data?.episode?.sourceUrls || [];

        const streams = [];

        for (const source of sources) {
            try {
                let link = source.sourceUrl;
                if (!link) continue;

                if (link.startsWith("--")) {
                    link = decryptHex(link);
                }
                
                if (link.includes("clock.json")) {
                   const clockRes = await fetch(link, { headers: HEADERS });
                   const clockData = await clockRes.json();
                   (clockData.links || []).forEach(item => {
                       streams.push({
                           name: "Anichi (AllAnime)",
                           title: `Anichi - ${source.sourceName} [${item.resolutionStr}]`,
                           url: item.link,
                           quality: item.resolutionStr,
                           headers: { ...HEADERS, Referer: ANICHI_ENDPOINT },
                           provider: "anichi"
                       });
                   });
                } else if (link.startsWith("http")) {
                    const fixedLink = fixUrlPath(link);
                    // For direct m3u8 or internal player links
                    // Simplified: adding as a stream if it looks like one
                    if (fixedLink.includes(".m3u8") || fixedLink.includes(".mp4")) {
                        streams.push({
                            name: "Anichi (AllAnime)",
                            title: `Anichi - ${source.sourceName}`,
                            url: fixedLink,
                            quality: "Auto",
                            headers: { ...HEADERS, Referer: ANICHI_ENDPOINT },
                            provider: "anichi"
                        });
                    }
                }
            } catch (e) {
                console.log(`[Anichi] Error processing source: ${e.message}`);
            }
        }

        return streams;

    } catch (error) {
        console.error(`[Anichi] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
