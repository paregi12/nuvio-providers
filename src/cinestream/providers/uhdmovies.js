const cheerio = require('cheerio-without-node-native');
const { fetchText, fetchJson } = require('../http');
const { extractVCloud } = require('../extractors/vcloud'); // Assuming it might use VCloud or similar

const URLS_JSON = "https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json";

async function getBaseUrl() {
    try {
        const data = await fetchJson(URLS_JSON);
        return data.uhdmovies || "https://uhdmovies.fun";
    } catch (e) {
        return "https://uhdmovies.fun";
    }
}

async function getUHDMoviesStreams(tmdbId, mediaType, season, episode, meta) {
    try {
        const baseUrl = await getBaseUrl();
        if (!meta) return [];
        
        const title = meta.title || meta.name;
        const year = (meta.release_date || meta.first_air_date || "").substring(0, 4);
        
        console.log(`[CineStream:UHDMovies] Searching for: ${title} (${year})`);

        const searchUrl = `${baseUrl}/search/${encodeURIComponent(title + " " + year)}`;
        const searchHtml = await fetchText(searchUrl);
        const $ = cheerio.load(searchHtml);
        
        let targetLink = $('article div.entry-image a').first().attr('href');

        if (!targetLink) {
             // Try simpler search
             const searchUrl2 = `${baseUrl}/search/${encodeURIComponent(title)}`;
             const searchHtml2 = await fetchText(searchUrl2);
             const $2 = cheerio.load(searchHtml2);
             targetLink = $2('article div.entry-image a').first().attr('href');
        }

        if (!targetLink) return [];

        console.log(`[CineStream:UHDMovies] Found page: ${targetLink}`);
        const pageHtml = await fetchText(targetLink);
        const $page = cheerio.load(pageHtml);
        const streams = [];
        
        if (mediaType === 'movie') {
            // Logic for Movie
            // CSX: "div.entry-content p:matches($year)" -> "a:matches((?i)(Download))"
            // We'll just look for all Download links in entry-content
            const downloadLinks = [];
            $page('div.entry-content a').each((i, el) => {
                const text = $(el).text();
                let link = $(el).attr('href');
                
                if (text.includes("Download") || text.includes("480p") || text.includes("720p") || text.includes("1080p") || text.includes("2160p")) {
                    if (link) {
                        // Bypass href.li
                        if (link.includes("href.li")) {
                            link = link.substring(link.indexOf("?") + 1);
                        }
                        
                        downloadLinks.push({
                            text: text,
                            link: link
                        });
                    }
                }
            });

            for (const item of downloadLinks) {
                try {
                    // UHDMovies links often lead to a DriveLeech or similar
                    // For now, we only support V-Cloud or direct files.
                    // If it's DriveLeech, we might need a specific extractor.
                    // But we can check if it redirects to VCloud.
                    
                    if (item.link.includes('vcloud') || item.link.includes('hubcloud')) {
                         const extracted = await extractVCloud(item.link);
                         streams.push(...extracted);
                    } else if (item.link.endsWith('.mp4') || item.link.endsWith('.mkv')) {
                         streams.push({
                            name: "UHDMovies (Direct)",
                            title: item.text.trim(),
                            url: item.link,
                            quality: item.text
                        });
                    }
                } catch (e) {}
            }
        }
        
        return streams.map(s => ({...s, name: "UHDMovies"}));

    } catch (error) {
        console.error(`[UHDMovies] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getUHDMoviesStreams };
