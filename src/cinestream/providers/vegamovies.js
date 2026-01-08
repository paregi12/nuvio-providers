const cheerio = require('cheerio-without-node-native');
const { fetchText, fetchJson } = require('../http');
const { extractVCloud } = require('../extractors/vcloud');

const URLS_JSON = "https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json";

async function getBaseUrl() {
    try {
        const data = await fetchJson(URLS_JSON);
        return data.vegamovies || "https://m.vegamovies.cricket";
    } catch (e) {
        return "https://m.vegamovies.cricket";
    }
}

async function getVegaMoviesStreams(tmdbId, mediaType, season, episode, meta) {
    try {
        const baseUrl = await getBaseUrl();
        
        if (!meta) return [];
        
        const title = meta.title || meta.name;
        const year = (meta.release_date || meta.first_air_date || "").substring(0, 4);
        
        console.log(`[CineStream:VegaMovies] Searching for: ${title} (${year})`);

        // Search
        const searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title)}`;
        const searchHtml = await fetchText(searchUrl);
        const $ = cheerio.load(searchHtml);
        
        let targetLink = null;
        
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
                     targetLink = itemLink;
                 }
            }
        });

        if (!targetLink) return [];

        console.log(`[CineStream:VegaMovies] Found page: ${targetLink}`);
        const pageHtml = await fetchText(targetLink);
        const $page = cheerio.load(pageHtml);
        
        const streams = [];
        
        if (mediaType === 'movie') {
            const downloadLinks = [];
            $page('p > a, h3 > a, h4 > a').each((i, el) => {
                const link = $(el).attr('href');
                const text = $(el).text();
                
                if (link && (text.includes("Download") || text.includes("V-Cloud") || text.includes("480p") || text.includes("720p") || text.includes("1080p"))) {
                    if (link.startsWith("http")) {
                        downloadLinks.push({
                            text: text,
                            link: link
                        });
                    }
                }
            });

            for (const item of downloadLinks) {
                try {
                     const isCloud = item.link.includes("vcloud") || item.link.includes("hubcloud") || item.link.includes("cloud");
                     
                     if (isCloud) {
                          const extracted = await extractVCloud(item.link);
                          streams.push(...extracted);
                     } else {
                         const interHtml = await fetchText(item.link);
                         const $inter = cheerio.load(interHtml);
                         
                         const cloudLinks = [];
                         $inter('a').each((j, el2) => {
                             const sourceLink = $inter(el2).attr('href');
                             const sourceText = $inter(el2).text() || "";
                             
                             if (sourceLink && (
                                 sourceText.includes("V-Cloud") || 
                                 sourceLink.includes('vcloud') || 
                                 sourceLink.includes('hubcloud')
                             )) {
                                 cloudLinks.push(sourceLink);
                             }
                         });

                         for (const cl of cloudLinks) {
                             const extracted = await extractVCloud(cl);
                             streams.push(...extracted);
                         }
                     }
                } catch (e) {}
            }
        }
        
        return streams.map(s => ({...s, name: "VegaMovies"}));

    } catch (error) {
        console.error(`[VegaMovies] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getVegaMoviesStreams };
