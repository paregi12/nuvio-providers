const { fetchText } = require('./src/vegamovies/http.js');
const cheerio = require('cheerio-without-node-native');

async function debugPage() {
    const url = "https://vegamovies.gt/download-fallout-2024-season-1-hindi-dubbed-480p-720p-1080p-web-dl/"; 
    console.log(`Fetching ${url}...`);
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    
    console.log("Headers (h3, h4, h5) and following links:");
    $('h3, h4, h5').each((i, el) => {
        const text = $(el).text().trim();
        // Only log headers that look relevant
        if (text.includes("Season") || text.includes("Episode") || text.includes("Download")) {
            console.log(`[HEADER] ${text}`);
            let next = $(el).next();
            let depth = 0;
            while(next.length && !next.is('h3, h4, h5') && depth < 3) {
                const links = next.find('a');
                if (links.length > 0) {
                    console.log(`  [BLOCK] Found ${links.length} links:`);
                    links.each((j, a) => {
                        console.log(`    -> "${$(a).text()}" (${$(a).attr('href')})`);
                    });
                }
                next = next.next();
                depth++;
            }
        }
    });
}

debugPage();
