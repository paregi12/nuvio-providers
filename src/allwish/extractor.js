import cheerio from 'cheerio-without-node-native';
import { HEADERS } from './constants.js';

export async function extractMegaPlay(url) {
    const mainUrl = "https://megaplay.buzz";
    const headers = {
        "Accept": "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": mainUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0"
    };

    try {
        const res = await fetch(url, { headers });
        const html = await res.text();
        const $ = cheerio.load(html);
        const id = $("#megaplay-player").attr("data-id");

        if (!id) return [];

        const apiUrl = `${mainUrl}/stream/getSources?id=${id}&id=${id}`;
        const streamRes = await fetch(apiUrl, { headers });
        const data = await streamRes.json();

        if (data && data.sources && data.sources.file) {
            return [{
                name: "AllWish MegaPlay",
                title: "AllWish - MegaPlay",
                url: data.sources.file,
                quality: "Auto",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0",
                    "Origin": mainUrl,
                    "Referer": `${mainUrl}/`
                }
            }];
        }
    } catch (e) {
        console.log(`[AllWish Extractor] MegaPlay failed: ${e.message}`);
    }
    return [];
}
