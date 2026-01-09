const { fetchText } = require('./src/vegamovies/http.js');
const cheerio = require('cheerio-without-node-native');

async function checkVCloud() {
    const url = "https://nexdrive.pro/genxfm784776360667/"; 
    console.log(`Fetching ${url}...`);
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    
    console.log("Links found:");
    $('a').each((i, el) => {
        console.log(`-> ${$(el).text()} (${$(el).attr('href')})`);
    });
}

checkVCloud();
