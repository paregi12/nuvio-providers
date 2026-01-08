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
            
            if (lowerText.includes("fsl") || lowerText.includes("server") || lowerText.includes("original") || lowerText.includes("cloud")) {
                extractedLinks.push({
                    name: "V-Cloud",
                    title: text.trim(),
                    url: link,
                    quality: quality
                });
            } else if (lowerText.includes("pixeldrain")) {
                 extractedLinks.push({
                    name: "Pixeldrain",
                    title: text.trim(),
                    url: link,
                    quality: quality
                });
            } else if (link.endsWith(".mkv") || link.endsWith(".mp4")) {
                 extractedLinks.push({
                    name: "Direct",
                    title: text.trim(),
                    url: link,
                    quality: quality
                });
            }
        });

        return extractedLinks;
    } catch (e) {
        console.error(`[VCloud] Error: ${e.message}`);
        return [];
    }
}
