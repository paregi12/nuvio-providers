import cheerio from 'cheerio-without-node-native';
import { HEADERS } from './constants.js';
import { getMainUrl, loadExtractor } from './utils.js';

async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    console.log(`[MoviesDrive] Querying streams for TMDB: ${tmdbId}, Type: ${mediaType}`);
    
    // 1. Get IMDB ID from TMDB
    const tmdbApiKey = "1865f43a0549ca50d341dd9ab8b29f49";
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${tmdbApiKey}&append_to_response=external_ids`;
    const tmdbRes = await fetch(tmdbUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Connection': 'keep-alive'
        } 
    });
    const tmdbData = await tmdbRes.json();
    const imdbId = tmdbData.external_ids?.imdb_id;
    
    if (!imdbId) {
        console.error("[MoviesDrive] Failed to get IMDB ID");
        return [];
    }

    const mainUrl = await getMainUrl();
    const searchUrl = `${mainUrl}/search.php?q=${imdbId}`;
    
    try {
        console.log(`[MoviesDrive] Searching at: ${searchUrl}`);
        const searchRes = await fetch(searchUrl, { headers: HEADERS });
        if (!searchRes.ok) {
            console.error(`[MoviesDrive] Search request failed: ${searchRes.status}`);
            return [];
        }
        const searchData = await searchRes.json();
        
        if (!searchData.hits || searchData.hits.length === 0) {
            console.log("[MoviesDrive] No hits found");
            return [];
        }

        const match = searchData.hits
            .map(h => h.document)
            .find(d => d.imdb_id === imdbId);
            
        if (!match) {
            console.log("[MoviesDrive] No exact IMDB match found");
            return [];
        }

        const permalink = match.permalink;
        const href = permalink.startsWith("http") ? permalink : `${mainUrl}${permalink}`;
        
        const pageRes = await fetch(href, { headers: HEADERS });
        const pageHtml = await pageRes.text();
        const $ = cheerio.load(pageHtml);
        
        const allLinks = [];
        
        if (mediaType === 'movie') {
            const downloadLinks = $("h5 > a").map((i, el) => $(el).attr("href")).get();
            for (const dLink of [...new Set(downloadLinks)]) {
                const extracted = await extractMdrive(dLink);
                for (const server of extracted) {
                    const streams = await loadExtractor(server, href);
                    allLinks.push(...streams.map(s => ({
                        ...s,
                        title: `${tmdbData.title || tmdbData.name} - ${s.name} [${s.quality}p]`,
                        provider: "moviesdrive"
                    })));
                }
            }
        } else {
            // TV Series
            const stag = `Season ${seasonNum}`;
            const sep = `Ep${String(episodeNum).padStart(2, '0')}|Ep${episodeNum}`;
            const entries = $("h5").filter((i, el) => new RegExp(stag, "i").test($(el).text()));
            
            for (const entry of entries.get()) {
                const nextHref = $(entry).next().find("a").attr("href");
                if (nextHref) {
                    const epPageRes = await fetch(nextHref, { headers: HEADERS });
                    const epPageHtml = await epPageRes.text();
                    const $ep = cheerio.load(epPageHtml);
                    
                    const epEntries = $ep("h5").filter((i, el) => new RegExp(sep, "i").test($ep(el).text()));
                    for (const epEntry of epEntries.get()) {
                        const link1 = $ep(epEntry).next().find("a").attr("href");
                        const link2 = $ep(epEntry).next().next().find("a").attr("href");
                        const epLinks = [link1, link2].filter(l => !!l);
                        
                        for (const epLink of epLinks) {
                            const streams = await loadExtractor(epLink, nextHref);
                            allLinks.push(...streams.map(s => ({
                                ...s,
                                title: `${tmdbData.title || tmdbData.name} S${seasonNum}E${episodeNum} - ${s.name} [${s.quality}p]`,
                                provider: "moviesdrive"
                            })));
                        }
                    }
                }
            }
        }
        
        return allLinks;
    } catch (e) {
        console.error("[MoviesDrive] Error:", e.message);
        return [];
    }
}

async function extractMdrive(url) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
        const html = await res.text();
        
        if (url.includes("search-recover.php")) {
            const qMatch = html.match(/const Q_INITIAL\s*=\s*"([^"]+)"/);
            const tokenMatch = html.match(/const FROM_AC_TOKEN\s*=\s*"([^"]+)"/);
            
            if (qMatch && tokenMatch) {
                const apiBase = url.split('?')[0];
                const searchParams = new URLSearchParams({
                    api: 'search',
                    q: qMatch[1],
                    page: '1',
                    from_ac: tokenMatch[1]
                });
                
                const apiRes = await fetch(`${apiBase}?${searchParams.toString()}`, { 
                    headers: { ...HEADERS, 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
                });
                const data = await apiRes.json();
                if (data.hits) {
                    return data.hits.map(h => h.url).filter(u => !!u);
                }
            }
        }

        const $ = cheerio.load(html);
        const regex = /hubcloud|gdflix|gdlink/i;
        
        return $("a[href]")
            .map((i, el) => $(el).attr("href"))
            .get()
            .filter(href => regex.test(href));
    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
