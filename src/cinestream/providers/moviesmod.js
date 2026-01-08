const cheerio = require('cheerio-without-node-native');
const { fetchText, fetchJson } = require('../http');
const { extractVCloud } = require('../extractors/vcloud');

const URLS_JSON = "https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json";

async function getBaseUrl() {
    try {
        const data = await fetchJson(URLS_JSON);
        return data.moviesmod || "https://moviesmod.plus";
    } catch (e) {
        return "https://moviesmod.plus";
    }
}

async function getMoviesModStreams(tmdbId, mediaType, season, episode, meta) {
    try {
        const baseUrl = await getBaseUrl();
        if (!meta) return [];
        
        const title = meta.title || meta.name;
        const year = (meta.release_date || meta.first_air_date || "").substring(0, 4);
        
        console.log(`[CineStream:MoviesMod] Searching for: ${title} (${year})`);

        const searchUrl = `${baseUrl}/search/${encodeURIComponent(title)}/page/1`;
        const searchHtml = await fetchText(searchUrl);
        const $ = cheerio.load(searchHtml);
        
        let targetLink = null;
        
        $('div.post-cards > article').each((i, el) => {
            if (targetLink) return;
            const itemTitle = $(el).find('a').attr('title') || "";
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

        const pageHtml = await fetchText(targetLink);
        const $page = cheerio.load(pageHtml);
        const streams = [];
        
        if (mediaType === 'movie') {
            const downloadLinks = [];
            $page('a').each((i, el) => {
                const cls = $(el).attr('class') || "";
                const text = $(el).text() || "";
                let link = $(el).attr('href');
                
                if (!link) return;

                if (cls.includes('maxbutton-download-links') || 
                    cls.includes('maxbutton-g-drive') || 
                    cls.includes('maxbutton-af-download') ||
                    (cls.includes('maxbutton') && text.toLowerCase().includes('download'))) {
                    
                     if (link.includes("url=")) {
                        const base64Part = link.split("url=")[1];
                        try {
                             if (typeof atob === 'function') {
                                 link = atob(base64Part);
                             } else {
                                 link = Buffer.from(base64Part, 'base64').toString('utf-8');
                             }
                        } catch (e) {}
                    }
                    
                    if (link.startsWith("http")) {
                        downloadLinks.push({
                            text: text.trim() || "Download",
                            link: link
                        });
                    }
                }
            });

            for (const item of downloadLinks) {
                try {
                    const prePageHtml = await fetchText(item.link);
                    const $pre = cheerio.load(prePageHtml);
                    
                    const cloudLinks = [];
                    $pre('a').each((j, el2) => {
                        const sourceLink = $pre(el2).attr('href');
                        const sourceText = $pre(el2).text() || "";
                        
                        if (sourceLink && (
                            sourceText.includes("V-Cloud") || 
                            sourceText.includes("Download") ||
                            sourceLink.includes('vcloud') || 
                            sourceLink.includes('hubcloud') ||
                            sourceLink.includes('links.modpro.blog')
                        )) {
                            cloudLinks.push(sourceLink);
                        }
                    });

                    for (const cl of cloudLinks) {
                        if (cl.includes("vcloud") || cl.includes("hubcloud")) {
                             const extracted = await extractVCloud(cl);
                             streams.push(...extracted);
                        } else if (cl.endsWith('.mp4') || cl.endsWith('.mkv')) {
                             streams.push({
                                name: "MoviesMod (Direct)",
                                title: item.text.trim(),
                                url: cl,
                                quality: item.text
                            });
                        }
                    }
                } catch (e) {}
            }
        }
        
        return streams.map(s => ({...s, name: "MoviesMod"}));

    } catch (error) {
        console.error(`[MoviesMod] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getMoviesModStreams };
