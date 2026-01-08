import cheerio from 'cheerio-without-node-native';
import { fetchText } from './http.js';

/**
 * Extract direct links from a V-Cloud (or similar) URL
 */
export async function extractVCloud(url) {
    console.log(`[VCloud] Extracting: ${url}`);
    try {
        let finalUrl = url;
        let html = await fetchText(url);
        let $ = cheerio.load(html);
        
        if (url.includes("api/index.php")) {
            const redirect = $('div.main h4 a').attr('href');
            if (redirect) {
                finalUrl = redirect;
                html = await fetchText(finalUrl);
                $ = cheerio.load(html);
            }
        }

        const scriptContent = $('script:contains("var url =")').html();
        let nextUrl = null;
        if (scriptContent) {
            const match = scriptContent.match(/var url = '([^']+)'/);
            if (match) nextUrl = match[1];
        }

        if (!nextUrl) {
            console.log("[VCloud] Could not find redirect URL in script.");
            return [];
        }

        console.log(`[VCloud] Following redirect: ${nextUrl}`);
        const finalHtml = await fetchText(nextUrl);
        const $final = cheerio.load(finalHtml);
        
        const extractedLinks = [];
        const quality = $final('div.card-header').text().trim() || "Unknown";

        $final('div.card-body h2 a.btn').each((i, el) => {
            const link = $(el).attr('href');
            const text = $(el).text();
            const lowerText = text.toLowerCase();

            // Extract Quality
            const qualityMatch = text.match(/(\d{3,4}p)/);
            const res = qualityMatch ? qualityMatch[1] : (quality.match(/(\d{3,4}p)/) ? quality.match(/(\d{3,4}p)/)[1] : "Unknown");

            // Extract Server Name
            // Expected format: "Download [Server Name] (Filename)"
            let serverName = "Server";
            const serverMatch = text.match(/\[(.*?)\]/);
            if (serverMatch) {
                serverName = serverMatch[1].replace("Server", "").replace(":", "").trim();
            } else if (lowerText.includes("pixeldrain")) {
                serverName = "Pixeldrain";
            } else if (lowerText.includes("fsl")) {
                serverName = "FSL";
            } else if (lowerText.includes("10gbps")) {
                serverName = "10Gbps";
            }
            
            if (serverName === "") serverName = "Server";

            const cleanTitle = `VegaMovies ${res} [${serverName}]`;
            
            if (lowerText.includes("fsl") || lowerText.includes("server") || lowerText.includes("original") || lowerText.includes("cloud") || lowerText.includes("pixeldrain") || link.endsWith(".mkv") || link.endsWith(".mp4")) {
                extractedLinks.push({
                    name: `VegaMovies ${serverName}`,
                    title: cleanTitle,
                    url: link,
                    quality: res
                });
            }
        });

        return extractedLinks;
    } catch (e) {
        console.error(`[VCloud] Error: ${e.message}`);
        return [];
    }
}
