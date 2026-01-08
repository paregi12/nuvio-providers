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

        // Search - Try strict season search first
        let searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title + " Season " + season)}`;
        let searchHtml = await fetchText(searchUrl);
        let $ = cheerio.load(searchHtml);
        
        let targetLink = null;
        
        // Iterate results
        // We want to find the BEST match.
        // Priority 1: Title + "Season X"
        // Priority 2: Title only
        
        let bestMatch = null;
        
        $('article.entry').each((i, el) => {
            const itemTitle = $(el).find('h2 > a').text() || "";
            const itemLink = $(el).find('a').attr('href');
            const lowerTitle = itemTitle.toLowerCase();
            const lowerQuery = title.toLowerCase();
            
            if (lowerTitle.includes(lowerQuery)) {
                // Check for Season match
                if (mediaType !== 'movie') {
                     const seasonStr = `season ${season}`;
                     const s0SeasonStr = `season 0${season}`;
                     const sStr = `s${season}`;
                     
                     if (lowerTitle.includes(seasonStr) || lowerTitle.includes(s0SeasonStr)) {
                         // Found exact season match!
                         if (!bestMatch || (!bestMatch.title.includes(seasonStr) && !bestMatch.title.includes(s0SeasonStr))) {
                             bestMatch = { link: itemLink, title: lowerTitle, priority: 10 };
                         }
                     } else if (lowerTitle.includes("series") || lowerTitle.includes("complete")) {
                         // Generic series page, might contain all seasons
                         if (!bestMatch || bestMatch.priority < 5) {
                             bestMatch = { link: itemLink, title: lowerTitle, priority: 5 };
                         }
                     }
                } else {
                    // Movie logic
                    if (year && lowerTitle.includes(year)) {
                        bestMatch = { link: itemLink, title: lowerTitle, priority: 10 };
                    } else if (!bestMatch) {
                        bestMatch = { link: itemLink, title: lowerTitle, priority: 1 };
                    }
                }
            }
        });

        if (bestMatch) targetLink = bestMatch.link;

        // Fallback: General search if strict failed

        // Fallback: General search if strict failed
        if (!targetLink) {
             console.log(`[VegaMovies] Strict search failed, trying general search...`);
             searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title)}`;
             searchHtml = await fetchText(searchUrl);
             $ = cheerio.load(searchHtml);
             
             $('article.entry').each((i, el) => {
                if (targetLink) return;
                const itemTitle = $(el).find('h2 > a').text() || "";
                const itemLink = $(el).find('a').attr('href');
                
                if (itemTitle.toLowerCase().includes(title.toLowerCase())) {
                     if (mediaType === 'movie') {
                         if (itemTitle.includes(year)) {
                             targetLink = itemLink;
                         }
                     } else {
                         // For TV, verify season presence if possible, or take generic
                         if (itemTitle.toLowerCase().includes(`season ${season}`) || itemTitle.toLowerCase().includes(`season 0${season}`)) {
                             targetLink = itemLink;
                         }
                     }
                }
            });
        }

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
            console.log(`[VegaMovies] Processing TV Series: S${season} E${episode}`);
            
            // 1. Find the section for the specific Season
            const seasonHeaders = $page('h3, h4, h5').filter((i, el) => {
                const text = $(el).text();
                // Kotlin excludes "Zip" files
                if (text.includes("Zip")) return false;
                return text.toLowerCase().includes(`season ${season}`) || text.toLowerCase().includes(`season 0${season}`);
            });
            
            console.log(`[VegaMovies] Found ${seasonHeaders.length} season headers.`);
            
            const candidateLinks = [];
            
            seasonHeaders.each((i, header) => {
                // The links are usually in the next paragraph or list
                // We'll iterate siblings until we hit another header or find links
                let nextNode = $(header).next();
                let attempts = 0;
                
                while (nextNode.length && attempts < 5) { // Limit search depth
                    if (nextNode.is('h3, h4, h5')) break; // Stop at next header
                    
                    const links = nextNode.find('a');
                    links.each((j, link) => {
                        const href = $(link).attr('href');
                        const text = $(link).text();
                        
                        // Look for "V-Cloud", "Episode", or "Download" (UniLink in Kotlin)
                        // And exclude G-Direct for now as per Kotlin logic preference
                        if (href && (text.includes("V-Cloud") || text.includes("Episode") || text.includes("Download"))) {
                             candidateLinks.push({ text: text, link: href });
                        }
                    });
                    
                    nextNode = nextNode.next();
                    attempts++;
                }
            });
            
            console.log(`[VegaMovies] Found ${candidateLinks.length} candidate intermediate pages.`);

            for (const item of candidateLinks) {
                try {
                     console.log(`[VegaMovies] Visiting intermediate: ${item.link}`);
                     const interHtml = await fetchText(item.link);
                     const $inter = cheerio.load(interHtml);
                     
                     // Find ALL V-Cloud links on this page
                     const vcloudLinks = [];
                     $inter('p > a').each((j, el) => {
                         const href = $(el).attr('href');
                         if (href && (href.includes('vcloud') || href.includes('hubcloud'))) {
                             vcloudLinks.push(href);
                         }
                     });
                     
                     console.log(`[VegaMovies] Found ${vcloudLinks.length} V-Cloud links on page.`);

                     // Map by index: Index 0 -> Episode 1
                     const targetIndex = episode - 1;
                     
                     if (targetIndex >= 0 && targetIndex < vcloudLinks.length) {
                         const targetUrl = vcloudLinks[targetIndex];
                         console.log(`[VegaMovies] Found match for Episode ${episode} at index ${targetIndex}: ${targetUrl}`);
                         
                         const extracted = await extractVCloud(targetUrl);
                         streams.push(...extracted);
                     } else {
                         console.log(`[VegaMovies] No link found for Episode ${episode} (Index ${targetIndex}) in this list.`);
                     }

                } catch (e) {
                    console.error(`[VegaMovies] Error processing TV link: ${e.message}`);
                }
            }
        }
        
        return streams;

    } catch (error) {
        console.error(`[VegaMovies] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };