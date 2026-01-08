const cheerio = require('cheerio-without-node-native');
const { fetchText, fetchJson } = require('./http');
const { extractVCloud } = require('./extractor');

const URLS_JSON = "https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json";
const TMDB_API_KEY = "1a7373301961d03f97f853a876dd1212"; 

async function getBaseUrl() {
    try {
        const data = await fetchJson(URLS_JSON);
        return data.vegamovies || "https://m.vegamovies.cricket";
    } catch (e) {
        console.error("[VegaMovies] Failed to fetch base URL, using default.", e);
        return "https://m.vegamovies.cricket";
    }
}

async function getMetadata(tmdbId, mediaType) {
    try {
        const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        return await fetchJson(url);
    } catch (e) {
        console.error("[VegaMovies] Failed to fetch metadata", e);
        return null;
    }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        const baseUrl = await getBaseUrl();
        const meta = await getMetadata(tmdbId, mediaType);
        
        if (!meta) return [];
        
        const title = meta.title || meta.name;
        const year = (meta.release_date || meta.first_air_date || "").substring(0, 4);
        
        console.log(`[VegaMovies] Searching for: ${title} (${year})`);

        // Search
        const searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title)}`;
        const searchHtml = await fetchText(searchUrl);
        const $ = cheerio.load(searchHtml);
        
        let targetLink = null;
        
        // Iterate results
        $('article.entry').each((i, el) => {
            if (targetLink) return;
            
            const itemTitle = $(el).find('h2 > a').text() || "";
            const itemLink = $(el).find('a').attr('href');
            
            // Simple fuzzy match
            if (itemTitle.toLowerCase().includes(title.toLowerCase())) {
                 if (mediaType === 'movie') {
                     if (itemTitle.includes(year)) {
                         targetLink = itemLink;
                     }
                 } else {
                     targetLink = itemLink;
                 }
            }
        });

        if (!targetLink) {
            console.log("[VegaMovies] No results found.");
            return [];
        }

        console.log(`[VegaMovies] Found page: ${targetLink}`);
        
        // Load Movie/Show Page
        const pageHtml = await fetchText(targetLink);
        const $page = cheerio.load(pageHtml);
        
        const streams = [];
        
        if (mediaType === 'movie') {
            // Logic for Movie
            // VegaMovies structure: p > a:has(button) OR simply p > a containing "Download" or "V-Cloud"
            // The Kotlin code looked for: document.select("p > a:has(button)")
            
            const downloadLinks = [];
            $page('p > a, h3 > a, h4 > a').each((i, el) => {
                const link = $(el).attr('href');
                const text = $(el).text();
                
                // Heuristic to find relevant download links
                if (link && (text.includes("Download") || text.includes("V-Cloud") || text.includes("480p") || text.includes("720p") || text.includes("1080p"))) {
                    console.log(`[VegaMovies] Found candidate: ${text.trim()} -> ${link}`);
                    // Check if it's a valid link (not just an anchor)
                    if (link.startsWith("http")) {
                        downloadLinks.push({
                            text: text,
                            link: link
                        });
                    }
                }
            });

            console.log(`[VegaMovies] Found ${downloadLinks.length} potential links.`);

            // Follow links
            for (const item of downloadLinks) {
                try {
                     // Check if it's a V-Cloud link directly
                     const isCloud = item.link.includes("vcloud") || item.link.includes("hubcloud") || item.link.includes("cloud");
                     
                     if (isCloud) {
                          const extracted = await extractVCloud(item.link);
                          streams.push(...extracted);
                     } else {
                         // Assume it's an intermediate page (like nexdrive.pro, vegamovies.cricket, etc.)
                         // CSX follows all these links.
                         console.log(`[VegaMovies] Visiting intermediate: ${item.link}`);
                         const interHtml = await fetchText(item.link);
                         const $inter = cheerio.load(interHtml);
                         
                         // Find all potential cloud links
                         const cloudLinks = [];
                         $inter('a').each((j, el2) => {
                             const sourceLink = $inter(el2).attr('href');
                             const sourceText = $inter(el2).text() || "";
                             
                             // Check for V-Cloud text or URL pattern
                             // CSX looks for text "V-Cloud".
                             if (sourceLink && (
                                 sourceText.includes("V-Cloud") || 
                                 sourceLink.includes('vcloud') || 
                                 sourceLink.includes('hubcloud')
                             )) {
                                 cloudLinks.push(sourceLink);
                             }
                         });

                         for (const cl of cloudLinks) {
                             console.log(`[VegaMovies] Found Cloud link: ${cl}`);
                             const extracted = await extractVCloud(cl);
                             streams.push(...extracted);
                         }
                     }
                } catch (e) {
                    // console.error(e);
                }
            }

        } else {
            // Logic for TV
            console.log("[VegaMovies] TV Series support is WIP");
        }
        
        return streams;

    } catch (error) {
        console.error(`[VegaMovies] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };