import { MAIN_URL, HEADERS } from './constants.js';
import cheerio from 'cheerio-without-node-native';

async function test() {
    const url = 'https://allmovieland.you/254-inception-2010-hindi.html';
    const docRes = await fetch(url, { headers: HEADERS });
    const docHtml = await docRes.text();
    
    const $ = cheerio.load(docHtml);
    const tabsContent = $('div.tabs__content script').html() || '';
    
    const playerScriptMatch = tabsContent.match(/const AwsIndStreamDomain\s*=\s*'([^']+)'/);
    const playerDomain = playerScriptMatch ? playerScriptMatch[1].replace(/\/$/, '') : null;
    
    const idMatch = tabsContent.match(/src:\s*'([^']+)'/);
    const id = idMatch ? idMatch[1] : null;

    if (playerDomain && id) {
        const embedLink = `${playerDomain}/play/${id}`;
        const embedRes = await fetch(embedLink, { headers: { ...HEADERS, Referer: url } });
        const embedHtml = await embedRes.text();
        
        const lastScript = cheerio.load(embedHtml)('body > script').last().html() || '';
        const p3Match = lastScript.match(/let\s+p3\s*=\s*(\{.*\});/);
        
        if (p3Match) {
            const json = JSON.parse(p3Match[1]);
            let fileUrl = json.file.replace(/\\\//g, '/');
            if (!fileUrl.startsWith('http')) fileUrl = `${playerDomain}${fileUrl}`;
            
            const fileRes = await fetch(fileUrl, {
                method: 'POST',
                headers: { ...HEADERS, 'X-CSRF-TOKEN': json.key, 'Referer': embedLink }
            });
            const fileText = await fileRes.text();
            
            const streams = JSON.parse(fileText.replace(/,\]/g, ']'));
            const validStreams = streams.filter(s => s && s.file);
            
            if (validStreams.length > 0) {
                const stream = validStreams[0];
                const playlistFile = stream.file.replace(/^~/, '');
                const playlistUrl = `${playerDomain}/playlist/${playlistFile}.txt`;
                
                console.log(`Testing POST request to: ${playlistUrl}`);
                const postRes = await fetch(playlistUrl, {
                    method: 'POST',
                    headers: { ...HEADERS, 'X-CSRF-TOKEN': json.key, 'Referer': embedLink }
                });
                
                console.log(`POST Status: ${postRes.status}`);
                const m3u8Text = await postRes.text();
                console.log("POST Response M3U8 Content:\n");
                console.log(m3u8Text);
            }
        }
    }
}

test();
