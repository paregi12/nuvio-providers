const { fetchText } = require('./src/vegamovies/http.js');
const cheerio = require('cheerio-without-node-native');

async function checkGDirect() {
    const url = "https://nexdrive.pro/genxfm784776360666/"; // G-Direct link
    console.log(`Fetching ${url}...`);
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    
    // Check for V-Cloud or other links inside
    console.log("Links found:");
    $('a').each((i, el) => {
        console.log(`-> ${$(el).text()} (${$(el).attr('href')})`);
    });
}

checkGDirect();
