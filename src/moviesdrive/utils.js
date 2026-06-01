import cheerio from 'cheerio-without-node-native';
import { HEADERS, DOMAINS_URL } from './constants.js';

let cachedMainUrl = "";

export async function getMainUrl() {
    if (cachedMainUrl) return cachedMainUrl;
    try {
        const response = await fetch(DOMAINS_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const data = await response.json();
        cachedMainUrl = data.moviesdrive || "https://new3.moviesdrives.my";
        return cachedMainUrl;
    } catch (e) {
        return "https://new3.moviesdrives.my";
    }
}

export function atob(str) {
    if (typeof global.atob === 'function') return global.atob(str);
    return Buffer.from(str, 'base64').toString('binary');
}

export async function hubCloudExtractor(url, referer) {
    try {
        let currentUrl = url.replace("hubcloud.ink", "hubcloud.dad");
        const pageResponse = await fetch(currentUrl, { headers: { ...HEADERS, Referer: referer } });
        let pageData = await pageResponse.text();
        let finalUrl = currentUrl;
        
        if (!currentUrl.includes("hubcloud.php")) {
            let nextHref = "";
            const $first = cheerio.load(pageData);
            const downloadBtn = $first("#download");
            if (downloadBtn.length) {
                nextHref = downloadBtn.attr("href");
            } else {
                const scriptUrlMatch = pageData.match(/var url = '([^']*)'/);
                if (scriptUrlMatch) nextHref = scriptUrlMatch[1];
            }

            if (nextHref) {
                if (!nextHref.startsWith("http")) {
                    const urlObj = new URL(currentUrl);
                    nextHref = `${urlObj.protocol}//${urlObj.hostname}/${nextHref.replace(/^\//, "")}`;
                }
                finalUrl = nextHref;
                const secondResponse = await fetch(finalUrl, { headers: { ...HEADERS, Referer: currentUrl } });
                pageData = await secondResponse.text();
            }
        }
        
        const $ = cheerio.load(pageData);
        const size = $("i#size").text().trim();
        const header = $("div.card-header").text().trim();
        const qualityStr = header.match(/(\d{3,4})[pP]/)?.[1];
        const quality = qualityStr ? parseInt(qualityStr) : 1080;
        
        const links = [];
        const elements = $("a.btn").get();
        for (const element of elements) {
            const link = $(element).attr("href");
            const text = $(element).text().toLowerCase();
            
            if (text.includes("download file") || text.includes("fsl server") || text.includes("s3 server") || text.includes("fslv2") || text.includes("mega server") || (link && link.includes("r2.dev"))) {
                let label = "HubCloud";
                if (link && link.includes("r2.dev")) label = "Direct R2";
                else if (link && link.includes("workers.dev")) label = "ZipDisk Server";
                else if (text.includes("fsl server")) label = "HubCloud - FSL";
                else if (text.includes("s3 server")) label = "HubCloud - S3";
                else if (text.includes("fslv2")) label = "HubCloud - FSLv2";
                else if (text.includes("mega server")) label = "HubCloud - Mega";
                
                links.push({ name: label, quality, url: link, size });
            }
        }
        return links;
    } catch (e) { return []; }
}

export async function loadExtractor(url, referer) {
    try {
        const hostname = new URL(url).hostname;
        if (hostname.includes("hubcloud")) return await hubCloudExtractor(url, referer);
        if (hostname.includes("gdflix") || hostname.includes("gdlink")) return [{ name: "Google Drive", quality: 1080, url }];
        return [];
    } catch (e) { return []; }
}
