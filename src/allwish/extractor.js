import cheerio from 'cheerio-without-node-native';

export async function extractMegaPlay(url) {
    const mainUrl = "https://megaplay.buzz";
    const commonHeaders = {
        "Accept": "*/*",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": mainUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0"
    };

    try {
        const res = await fetch(url, { headers: commonHeaders });
        const html = await res.text();
        const $ = cheerio.load(html);
        const id = $("#megaplay-player").attr("data-id");

        if (!id) return [];

        const apiUrl = `${mainUrl}/stream/getSources?id=${id}&id=${id}`;
        const streamRes = await fetch(apiUrl, { headers: commonHeaders });
        const data = await streamRes.json();

        if (data && data.sources && data.sources.file) {
            const masterUrl = data.sources.file;
            const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);
            
            // Extract the domain from masterUrl for headers
            const masterDomain = new URL(masterUrl).origin;

            const masterRes = await fetch(masterUrl, { 
                headers: {
                    ...commonHeaders,
                    "Referer": `${mainUrl}/`,
                    "Origin": mainUrl
                }
            });
            const masterText = await masterRes.text();
            
            // If we still get blocked, fallback to Auto
            if (masterText.includes('Cloudflare') || !masterText.includes('#EXTM3U')) {
                return [{
                    name: "AllWish MegaPlay",
                    title: "AllWish - MegaPlay Auto",
                    url: masterUrl,
                    quality: "Auto",
                    headers: {
                        "User-Agent": commonHeaders["User-Agent"],
                        "Origin": mainUrl,
                        "Referer": `${mainUrl}/`
                    }
                }];
            }

            const streams = [];
            const lines = masterText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('#EXT-X-STREAM-INF')) {
                    const resolutionMatch = lines[i].match(/RESOLUTION=(\d+x\d+)/);
                    const nameMatch = lines[i].match(/NAME="([^"]+)"/);
                    let quality = "Auto";
                    
                    if (nameMatch) {
                        quality = nameMatch[1];
                    } else if (resolutionMatch) {
                        quality = resolutionMatch[1].split('x')[1] + 'p';
                    }
                    
                    let streamUrl = "";
                    for (let j = i + 1; j < lines.length; j++) {
                        if (!lines[j].startsWith('#')) {
                            streamUrl = lines[j];
                            break;
                        }
                    }

                    if (streamUrl) {
                        if (!streamUrl.startsWith('http')) {
                            streamUrl = baseUrl + streamUrl;
                        }
                        streams.push({
                            name: "AllWish MegaPlay",
                            title: `AllWish - MegaPlay ${quality}`,
                            url: streamUrl,
                            quality: quality,
                            headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                            "Origin": "https://megaplay.buzz",
                            "Referer": "https://megaplay.buzz/"
                        }
                        });
                    }
                }
            }
            
            if (streams.length === 0) {
                streams.push({
                    name: "AllWish MegaPlay",
                    title: "AllWish - MegaPlay Auto",
                    url: masterUrl,
                    quality: "Auto",
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
                        "Origin": "https://megaplay.buzz",
                        "Referer": "https://megaplay.buzz/"
                    }
                });
            }
            
            return streams;
        }
    } catch (e) {
        console.log(`[AllWish Extractor] MegaPlay failed: ${e.message}`);
    }
    return [];
}
