import cheerio from 'cheerio-without-node-native';
import { HEADERS, DOMAINS_URL, FALLBACK_DOMAIN, TMDB_BASE_URL, TMDB_API_KEY } from './constants.js';

let cachedDomain = "";

export async function getMainUrl() {
    if (cachedDomain) return cachedDomain;
    try {
        const response = await fetch(DOMAINS_URL);
        const data = await response.json();
        cachedDomain = data.moviesmod || FALLBACK_DOMAIN;
        return cachedDomain;
    } catch (e) {
        return FALLBACK_DOMAIN;
    }
}

export function getBaseUrl(url) {
    try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}`;
    } catch (e) {
        return "";
    }
}

export function fixUrl(url, domain) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return `https:${url}`;
    if (url.startsWith("/")) return domain + url;
    return `${domain}/${url}`;
}

export async function bypassHrefli(url) {
    const host = getBaseUrl(url);
    try {
        const res1 = await fetch(url, { headers: HEADERS });
        const html1 = await res1.text();
        const $1 = cheerio.load(html1);
        const formUrl1 = $1("form#landing").attr("action");
        const formData1 = {};
        $1("form#landing input").each((_, el) => {
            formData1[$1(el).attr("name")] = $1(el).attr("value") || "";
        });

        const res2 = await fetch(formUrl1, {
            method: "POST",
            headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData1).toString()
        });
        const html2 = await res2.text();
        const $2 = cheerio.load(html2);
        const formUrl2 = $2("form#landing").attr("action");
        const formData2 = {};
        $2("form#landing input").each((_, el) => {
            formData2[$2(el).attr("name")] = $2(el).attr("value") || "";
        });

        const res3 = await fetch(formUrl2, {
            method: "POST",
            headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(formData2).toString()
        });
        const html3 = await res3.text();
        const $3 = cheerio.load(html3);
        const script = $3("script:contains(?go=)").html() || "";
        const skTokenMatch = script.match(/\?go=([^"]+)/);
        if (!skTokenMatch) return null;
        const skToken = skTokenMatch[1];
        const wpHttp2 = formData2["_wp_http2"] || "";

        const res4 = await fetch(`${host}?go=${skToken}`, {
            headers: { ...HEADERS, "Cookie": `${skToken}=${wpHttp2}` }
        });
        const html4 = await res4.text();
        const $4 = cheerio.load(html4);
        const metaRefresh = $4('meta[http-equiv="refresh"]').attr("content") || "";
        const driveUrlMatch = metaRefresh.match(/url=(.+)/);
        if (!driveUrlMatch) return null;
        const driveUrl = driveUrlMatch[1];

        const res5 = await fetch(driveUrl, { headers: HEADERS });
        const html5 = await res5.text();
        const pathMatch = html5.match(/replace\("([^"]+)"\)/);
        if (!pathMatch || pathMatch[1] === "/404") return null;
        return fixUrl(pathMatch[1], getBaseUrl(driveUrl));
    } catch (e) {
        return null;
    }
}

export async function fetchTmdbDetails(tmdbId, mediaType) {
    try {
        const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
        const res = await fetch(url, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            } 
        });
        const data = await res.json();
        return {
            title: mediaType === 'movie' ? (data.title || data.original_title) : (data.name || data.original_name),
            year: (data.release_date || data.first_air_date || "").substring(0, 4),
            imdbId: data.external_ids?.imdb_id
        };
    } catch (e) {
        return null;
    }
}

export function getIndexQuality(str) {
    if (!str) return "Unknown";
    const match = str.match(/(\d{3,4})[pP]/);
    if (match) return match[1] + "p";
    if (str.toUpperCase().includes("4K") || str.toUpperCase().includes("UHD")) return "2160p";
    return "Unknown";
}

export async function extractVideoSeed(finallink) {
    try {
        const urlObj = new URL(finallink);
        const host = urlObj.host || "video-seed.xyz";
        const token = finallink.split("?url=")[1];
        if (!token) return null;

        const res = await fetch(`https://${host}/api`, {
            method: "POST",
            headers: {
                ...HEADERS,
                "Content-Type": "application/x-www-form-urlencoded",
                "x-token": host,
                "Referer": finallink
            },
            body: `keys=${encodeURIComponent(token)}`
        });
        const text = await res.text();
        const urlMatch = text.match(/url":"([^"]+)"/);
        return urlMatch ? urlMatch[1].replace(/\\\//g, "/") : null;
    } catch (e) {
        return null;
    }
}

export async function extractDriveseedPage(url) {
    const streams = [];
    try {
        let pageUrl = url;
        if (url.includes("r?key=")) {
            const res = await fetch(url, { headers: HEADERS });
            const html = await res.text();
            const redirectMatch = html.match(/replace\("([^"]+)"\)/);
            if (redirectMatch) {
                pageUrl = getBaseUrl(url) + redirectMatch[1];
            }
        }
        
        const res = await fetch(pageUrl, { headers: HEADERS });
        const html = await res.text();
        const $ = cheerio.load(html);
        const baseDomain = getBaseUrl(pageUrl);

        const qualityText = $("li.list-group-item").first().text() || "";
        const size = $("li:nth-child(3)").text().replace("Size : ", "").trim();
        const quality = getIndexQuality(qualityText);

        const elements = $("div.text-center > a").get();
        for (const el of elements) {
            const text = $(el).text().toLowerCase();
            const href = $(el).attr("href");
            if (!href) continue;

            if (text.includes("instant download")) {
                const instantRes = await fetch(href, { headers: HEADERS, redirect: "follow" });
                if (instantRes.url && instantRes.url.includes("url=")) {
                    streams.push({ name: "Driveseed Instant", url: instantRes.url.split("url=")[1], quality, size });
                }
            } else if (text.includes("resume cloud")) {
                const cloudRes = await fetch(baseDomain + href, { headers: HEADERS });
                const cloudHtml = await cloudRes.text();
                const link = cheerio.load(cloudHtml)("a.btn-success").first().attr("href");
                if (link) streams.push({ name: "Driveseed Cloud", url: link, quality, size });
            } else if (text.includes("cloud download")) {
                streams.push({ name: "Driveseed Cloud", url: href, quality, size });
            }
        }
    } catch (e) {}
    return streams;
}
