/**
 * AnimePahe Scraper for Nuvio
 * Ported from CloudStream (AnimePahe.kt) & User Fixes
 */

const cheerio = require('cheerio-without-node-native');

const BASE_URL = "https://animepahe.si";
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Cookie': '__ddg1_=;__ddg2_=;',
    'Referer': "https://kwik.cx" 
};
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        if (mediaType === 'movie') episodeNum = 1;

        // 1. TMDB -> Title
        const meta = await fetchTMDB(tmdbId, mediaType);
        console.log(`[AnimePahe] Searching for: ${meta.title}`);

        // 2. Search
        const searchResults = await searchAnime(meta.title);
        if (!searchResults.length) throw new Error("No anime found");

        const anime = searchResults.find(s => s.title.toLowerCase() === meta.title.toLowerCase()) || searchResults[0];
        console.log(`[AnimePahe] Found anime: ${anime.title} (Session: ${anime.session})`);

        // 3. Get Release ID (User's fix: fetch page to get ID from og:url)
        const releaseId = await getReleaseId(anime.session);
        console.log(`[AnimePahe] Release ID: ${releaseId}`);

        // 4. Find Episode Session
        const epSession = await getEpisodeSession(releaseId, episodeNum);
        if (!epSession) throw new Error("Episode not found");

        console.log(`[AnimePahe] Episode Session: ${epSession}`);

        // 5. Extract Streams
        const streams = await extractStreams(releaseId, epSession);
        return streams;

    } catch (e) {
        console.error(`[AnimePahe] Error: ${e.message}`);
        return [];
    }
}

async function fetchTMDB(id, type) {
    const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return {
        title: type === 'movie' ? data.title : data.name,
        year: (type === 'movie' ? data.release_date : data.first_air_date)?.split('-')[0]
    };
}

async function searchAnime(query) {
    const url = `${BASE_URL}/api?m=search&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Cookie: HEADERS.Cookie } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
}

async function getReleaseId(session) {
    // User's fix: fetch the anime page to get the true ID used for releases
    const path = session.includes("-") ? `/anime/${session}` : `/a/${session}`;
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, { headers: { Cookie: HEADERS.Cookie } });
    const html = await res.text();
    
    const $ = cheerio.load(html);
    const ogUrl = $("head > meta[property='og:url']").attr("content");
    if (!ogUrl) return session; // Fallback
    
    return ogUrl.split("/").pop();
}

async function getEpisodeSession(releaseId, targetEp) {
    // We use smart pagination to find the episode without fetching all pages
    const url = `${BASE_URL}/api?m=release&id=${releaseId}&sort=episode_asc&page=1`;
    const res = await fetch(url, { headers: { Cookie: HEADERS.Cookie } });
    const json = await res.json();
    
    let match = json.data.find(e => e.episode == targetEp);
    if (match) return match.session;
    
    if (json.last_page > 1) {
        const perPage = json.per_page || 30; // 30 is default
        const targetPage = Math.ceil(targetEp / perPage);
        
        if (targetPage > 1 && targetPage <= json.last_page) {
             const pUrl = `${BASE_URL}/api?m=release&id=${releaseId}&sort=episode_asc&page=${targetPage}`;
             const pRes = await fetch(pUrl, { headers: { Cookie: HEADERS.Cookie } });
             const pJson = await pRes.json();
             match = pJson.data.find(e => e.episode == targetEp);
             if (match) return match.session;
        }
    }
    return null;
}

async function extractStreams(releaseId, episodeSession) {
    const url = `${BASE_URL}/play/${releaseId}/${episodeSession}`;
    const res = await fetch(url, { headers: { Cookie: HEADERS.Cookie } });
    const html = await res.text();
    
    const regex = /https:\/\/kwik\.cx\/e\/\w+/g;
    if (!html.match(regex)) throw new Error("Failed to fetch episode server.");
    
    const $ = cheerio.load(html);
    
    const buttons = $("button[data-src]");
    const promises = [];
    
    buttons.each((i, el) => {
        const src = $(el).attr("data-src");
        const fansub = $(el).attr("data-fansub");
        const resolution = $(el).attr("data-resolution");
        const audio = $(el).attr("data-audio");
        
        let quality = `${resolution}p - ${fansub}`;
        if (audio === 'eng') quality += " (Dub)";
        else quality += " (Sub)";
        
        if (src) {
            promises.push(resolveKwik(src, quality));
        }
    });
    
    const results = await Promise.all(promises);
    return results.filter(s => s !== null);
}

async function resolveKwik(url, quality) {
    try {
        const res = await fetch(url, { 
            headers: { 
                "Referer": "https://kwik.cx",
                "User-Agent": HEADERS['User-Agent'] 
            } 
        });
        const html = await res.text();
        
        const scripts = html.match(/eval\(f.+?\}\)\)/g);
        if (!scripts) return null;
        
        for (const script of scripts) {
            const scriptMatch = script.match(/eval(.+)/);
            if (!scriptMatch || !scriptMatch[1]) continue;
            
            try {
                // Execute the unpacking code
                const decoded = eval(scriptMatch[1]);
                const linkMatch = decoded.match(/source='(.+?)'/);
                if (linkMatch && linkMatch[1]) {
                     return {
                        name: `AnimePahe - ${quality}`,
                        title: `AnimePahe - ${quality}`,
                        url: linkMatch[1],
                        quality: quality,
                        headers: {
                            "Referer": "https://kwik.cx",
                            "User-Agent": HEADERS['User-Agent']
                        },
                        provider: "animepahe"
                     };
                }
            } catch (e) {
                console.error("Failed to eval kwik script", e);
            }
        }
    } catch (e) {
        console.error("Failed to fetch kwik", e);
    }
    return null;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
