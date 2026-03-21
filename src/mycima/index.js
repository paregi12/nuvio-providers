import cheerio from 'cheerio-without-node-native';
import { HEADERS, MAIN_URL } from './constants.js';
import { 
    getTMDBDetails, findBestTitleMatch, getImageURL, atob 
} from './utils.js';
import { loadExtractor } from './extractors.js';

async function search(query) {
    const url = `${MAIN_URL}/filtering/?keywords=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) return [];
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    return $("div.GridItem").map((i, el) => {
        const $el = $(el);
        const link = $el.find("div.Thumb--GridItem a");
        const title = $el.find("div.Thumb--GridItem strong").text().trim();
        const url = link.attr("href");
        const poster = getImageURL($el.find("span.BG--GridItem").attr("data-lazy-style"));
        const yearMatch = $el.find("span.year").text().match(/\d+/);
        const year = yearMatch ? parseInt(yearMatch[0]) : null;
        
        return { title, url, poster, year };
    }).get();
}

async function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
    try {
        const mediaInfo = await getTMDBDetails(tmdbId, mediaType);
        const searchResults = await search(mediaInfo.title);
        if (searchResults.length === 0) return [];
        
        const bestMatch = findBestTitleMatch(mediaInfo, searchResults, mediaType, season);
        const selectedMedia = bestMatch || searchResults[0];
        
        const response = await fetch(selectedMedia.url, { headers: HEADERS });
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let finalPageUrl = selectedMedia.url;
        
        if (mediaType === "tv") {
            let postId = "";
            $("script").each((i, el) => {
                const scriptData = $(el).html() || "";
                const match = scriptData.match(/post_id:\s*'(\d+)'/);
                if (match) postId = match[1];
            });
            
            if (postId) {
                const seasonElements = $("div.SeasonsList ul li a[data-season]");
                let seasonId = "";
                
                seasonElements.each((i, el) => {
                    const $el = $(el);
                    const sText = $el.text();
                    const sNumMatch = sText.match(/\d+/);
                    const sNum = sNumMatch ? parseInt(sNumMatch[0]) : (i + 1);
                    if (sNum === season) {
                        seasonId = $el.attr("data-season");
                    }
                });
                
                if (!seasonId && seasonElements.length > 0) {
                    seasonId = seasonElements.first().attr("data-season");
                }
                
                if (seasonId) {
                    const ajaxUrl = `${MAIN_URL}/wp-content/themes/mycima/Ajaxt/Single/Episodes.php`;
                    const formData = new URLSearchParams();
                    formData.append("season", seasonId);
                    formData.append("post_id", postId);
                    
                    const ajaxResponse = await fetch(ajaxUrl, {
                        method: "POST",
                        headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
                        body: formData.toString()
                    });
                    
                    const ajaxHtml = await ajaxResponse.text();
                    const $ep = cheerio.load(ajaxHtml);
                    const episodesList = $ep("a");
                    
                    episodesList.each((i, el) => {
                        const $el = $(el);
                        const epTitle = $el.find(".EpisodeTitle").text().trim() || $el.text().trim();
                        const epNumMatch = epTitle.match(/\d+/);
                        const epNum = epNumMatch ? parseInt(epNumMatch[0]) : (i + 1);
                        
                        if (epNum === episode) {
                            finalPageUrl = $el.attr("href");
                        }
                    });
                }
            }
        }
        
        const finalResponse = await fetch(finalPageUrl, { headers: HEADERS });
        const finalHtml = await finalResponse.text();
        const $final = cheerio.load(finalHtml);
        
        const streams = [];
        const generalQuality = $final("div.Quality a").text().trim() || "Unknown";
        
        // 1. Extract from "Downloads" list
        const downloadLinks = $final("div.Download--Wecima--Single a");
        for (const el of downloadLinks.get()) {
            const $el = $(el);
            const url = $el.attr("href");
            const serverName = $el.find("quality").text().trim() || "Unknown";
            const resText = $el.find("resolution").text().trim();
            const qualityMatch = resText.match(/\d+p/i) || generalQuality.match(/\d+p/i);
            const quality = qualityMatch ? qualityMatch[0] : "Unknown";
            
            if (url && url.startsWith("http")) {
                if (url.includes(".mp4") || url.includes(".m3u8")) {
                    streams.push({
                        name: `MyCima ${serverName}`,
                        title: `Server ${serverName} (${quality})`,
                        url: url,
                        quality: quality,
                        headers: HEADERS,
                        provider: "mycima"
                    });
                } else {
                    const extracted = await loadExtractor(url);
                    extracted.forEach(s => {
                        streams.push({
                            ...s,
                            name: `MyCima ${serverName} (${s.source})`,
                            title: `Extracted ${s.source} (${s.quality === "Unknown" ? quality : s.quality})`,
                            provider: "mycima"
                        });
                    });
                }
            }
        }
        
        // 2. Extract from "Watch" list
        const watchItems = $final("ul#watch li");
        for (const item of watchItems.get()) {
            const encodedUrl = $final(item).attr("data-watch");
            const serverName = $final(item).text().trim() || "Server";
            
            if (encodedUrl && encodedUrl.includes("/play/")) {
                const base64String = encodedUrl.substring(encodedUrl.indexOf("/play/") + 6).replace(/\/$/, "");
                try {
                    let decodedUrl = atob(base64String);
                    if (decodedUrl && !decodedUrl.startsWith("http")) {
                        if (decodedUrl.startsWith("//")) decodedUrl = "https:" + decodedUrl;
                        else if (decodedUrl.startsWith("/")) decodedUrl = MAIN_URL + decodedUrl;
                    }

                    if (decodedUrl && decodedUrl.startsWith("http")) {
                        const extracted = await loadExtractor(decodedUrl);
                        if (extracted.length > 0) {
                            extracted.forEach(s => {
                                streams.push({
                                    ...s,
                                    name: `MyCima ${serverName} (${s.source})`,
                                    title: `Watch ${serverName} (${s.quality === "Unknown" ? generalQuality : s.quality})`,
                                    provider: "mycima"
                                });
                            });
                        }
                        // NO FALLBACK - Discard if extraction failed
                    }
                } catch (e) {}
            }
        }
        
        return streams;
    } catch (error) {
        return [];
    }
}

module.exports = { getStreams };
