import { MAIN_URL, XML_HEADERS, HEADERS } from './constants.js';
import { generateEpisodeVrf } from './utils.js';
import { extractMegaPlay } from './extractor.js';
import cheerio from 'cheerio-without-node-native';

async function test() {
    console.log("Searching for 'Naruto'...");
    const query = "Naruto";
    const searchUrl = `${MAIN_URL}/filter?keyword=${encodeURIComponent(query)}&page=1`;
    
    const res = await fetch(searchUrl, { headers: HEADERS });
    const html = await res.text();
    const $ = cheerio.load(html);
    
    const results = [];
    $("div.item").each((i, el) => {
        const title = $(el).find("div.name > a").text().trim();
        const href = $(el).find("div.name > a").attr("href");
        if (title && href) {
            results.push({ title, url: href.startsWith('http') ? href : MAIN_URL + href });
        }
    });

    console.log("Search Results:", results.slice(0, 3));

    if (results.length > 0) {
        const anime = results[0];
        console.log(`\nFetching details for ${anime.title}...`);
        
        const docRes = await fetch(anime.url, { headers: HEADERS });
        const docHtml = await docRes.text();
        const doc$ = cheerio.load(docHtml);
        
        const id = doc$("main > div.container").attr("data-id");
        console.log(`Anime ID: ${id}`);
        
        if (id) {
            const vrf = generateEpisodeVrf(id);
            console.log(`Generated VRF: ${vrf}`);
            
            const epUrl = `${MAIN_URL}/ajax/episode/list/${id}?vrf=${vrf}`;
            console.log(`Fetching Episodes: ${epUrl}`);
            const epRes = await fetch(epUrl, { headers: XML_HEADERS });
            const epData = await epRes.json();
            
            if (epData.status === 200 && epData.result) {
                const ep$ = cheerio.load(epData.result);
                const episodes = [];
                
                ep$("div.range > div > a").each((i, el) => {
                    const epId = ep$(el).attr("data-ids");
                    const epNum = ep$(el).attr("data-slug");
                    const title = ep$(el).attr("title");
                    if (epId && epNum) {
                        episodes.push({ epId, epNum, title });
                    }
                });
                
                console.log(`Found ${episodes.length} episodes. First episode:`, episodes[0]);
                
                if (episodes.length > 0) {
                    const targetEp = episodes[0];
                    console.log(`\nFetching Server list for episode ${targetEp.epNum} (ID: ${targetEp.epId})`);
                    
                    const serverUrl = `${MAIN_URL}/ajax/server/list?servers=${targetEp.epId}`;
                    const serverRes = await fetch(serverUrl, { headers: XML_HEADERS });
                    const serverData = await serverRes.json();
                    
                    if (serverData.status === 200 && serverData.result) {
                        const server$ = cheerio.load(serverData.result);
                        let targetDataId = null;
                        
                        server$("div.server-type").each((i, section) => {
                            server$(section).find("div.server-list > div.server").each((j, server) => {
                                const srvName = server$(server).find("div > span").text().trim();
                                const dataId = server$(server).attr("data-link-id");
                                console.log(`Server found: ${srvName} (ID: ${dataId})`);
                                if (!targetDataId) targetDataId = dataId; // Pick first server
                            });
                        });
                        
                        if (targetDataId) {
                            console.log(`\nFetching stream link for server ID: ${targetDataId}`);
                            const linkUrl = `${MAIN_URL}/ajax/server?get=${targetDataId}`;
                            const linkRes = await fetch(linkUrl, { headers: XML_HEADERS });
                            const linkData = await linkRes.json();
                            
                            if (linkData.status === 200 && linkData.result && linkData.result.url) {
                                const realUrl = linkData.result.url;
                                console.log(`Real URL: ${realUrl}`);
                                
                                if (realUrl.includes('megaplay.buzz')) {
                                    console.log('Extracting MegaPlay...');
                                    const streams = await extractMegaPlay(realUrl);
                                    console.log('Streams found:', streams);
                                } else {
                                    console.log('Unknown extractor for URL:', realUrl);
                                }
                            }
                        }
                    }
                }
            } else {
                console.log("Failed to fetch episodes or invalid VRF.");
            }
        }
    }
}

test();
