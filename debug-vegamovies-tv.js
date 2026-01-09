const { fetchText } = require('./src/vegamovies/http.js');
const cheerio = require('cheerio-without-node-native');

async function debugPage() {
    // Fallout Season 1 page (from previous failed test log, it found Season 2, let's try to find Season 1 manually first)
    // "https://vegamovies.gt/download-fallout-2025-season-2-hindi-dd5-1/" was found.
    // I want Season 1.
    // Let's search for "Fallout Season 1"
    
    const url = "https://vegamovies.gt/download-fallout-season-1-hindi-dubbed-480p-720p-1080p/"; 
    // I am guessing the URL based on naming convention, or I will use the search result from a manual search if I could.
    // Actually, let's just use the search logic to find the URL first.
    
    console.log(`Searching for Fallout Season 1...`);
    const searchUrl = "https://vegamovies.gt/page/1/?s=Fallout%20Season%201";
    const searchHtml = await fetchText(searchUrl);
    const $s = cheerio.load(searchHtml);
    
    let targetLink = null;
    $s('article.entry').each((i, el) => {
        const t = $s(el).find('h2 > a').text();
        const l = $s(el).find('a').attr('href');
        console.log(`Search Result: ${t} -> ${l}`);
        if (t.includes("Season 1")) targetLink = l;
    });
    
    if (!targetLink) {
        console.log("Could not find Season 1 link.");
        return;
    }
    
    console.log(`Fetching ${targetLink}...`);
    const html = await fetchText(targetLink);
    const $ = cheerio.load(html);
    
    console.log("Headers (h3, h4, h5):");
    $('h3, h4, h5').each((i, el) => {
        console.log(`[${el.tagName}] ${$(el).text().trim().substring(0, 50)}...`);
        // Log next sibling if it is P
        const next = $(el).next();
        if (next.is('p')) {
            console.log(`  -> Next P contains ${next.find('a').length} links`);
            next.find('a').each((j, a) => {
                console.log(`    -> Link: ${$(a).text()} (${$(a).attr('href')})`);
            });
        }
    });
}

debugPage();
