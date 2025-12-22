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
const KITSU_BASE_URL = 'https://kitsu.io/api/edge';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        if (mediaType === 'movie') episodeNum = 1;

        // 1. TMDB -> Title & Original Title
        const meta = await fetchTMDB(tmdbId, mediaType);
        console.log(`[AnimePahe] TMDB Title: "${meta.title}", Original: "${meta.originalTitle}"`);

        // 2. Build Title List (TMDB + Kitsu)
        let titles = [meta.title];
        if (meta.originalTitle) titles.push(meta.originalTitle);

        try {
            const kitsuTitles = await getKitsuTitles(meta.title);
            titles = [...titles, ...kitsuTitles];
        } catch (e) {
            console.log(`[AnimePahe] Kitsu lookup failed: ${e.message}`);
        }

        // Deduplicate
        titles = [...new Set(titles.filter(t => t))];
        console.log(`[AnimePahe] Search Candidates: ${JSON.stringify(titles)}`);

        // 3. Search AnimePahe (Iterate until found)
        let anime = null;
        for (const title of titles) {
            try {
                const results = await searchAnime(title);
                if (results.length > 0) {
                    const exact = results.find(s => s.title.toLowerCase() === title.toLowerCase());
                    anime = exact || results[0];
                    console.log(`[AnimePahe] Found match with "${title}": ${anime.title}`);
                    break;
                }
            } catch (e) {
                console.log(`[AnimePahe] Search error for "${title}": ${e.message}`);
            }
        }

        if (!anime) throw new Error(`No anime found after searching candidates.`);

        // 4. Construct Media Title for Nuvio
        const mediaTitle = `${meta.title}${mediaType === 'tv' ? ` S${String(seasonNum).padStart(2, '0')}E${String(episodeNum).padStart(2, '0')}` : ''}`;

        // 5. Get Release ID
        const releaseId = await getReleaseId(anime.session);
        console.log(`[AnimePahe] Release ID: ${releaseId}`);

        // 6. Find Episode Session
        const epSession = await getEpisodeSession(releaseId, episodeNum);
        if (!epSession) throw new Error("Episode not found");

        console.log(`[AnimePahe] Episode Session: ${epSession}`);

        // 7. Extract Streams
        const streams = await extractStreams(releaseId, epSession, mediaTitle);
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
        originalTitle: type === 'movie' ? data.original_title : data.original_name,
        year: (type === 'movie' ? data.release_date : data.first_air_date)?.split('-')[0]
    };
}

// --- Kitsu Helpers ---

async function getKitsuTitles(query) {
    const url = `${KITSU_BASE_URL}/anime?filter[text]=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
        headers: {
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
        }
    });
    if (!res.ok) return [];
    
    const json = await res.json();
    if (!json.data || json.data.length === 0) return [];

    const titles = [];
    // Only take the best few results to avoid spamming
    const entries = json.data.slice(0, 2); 

    for (const entry of entries) {
        const attrs = entry.attributes || {};
        if (attrs.titles) {
            if (attrs.titles.en) titles.push(attrs.titles.en);
            if (attrs.titles.en_jp) titles.push(attrs.titles.en_jp); // Romaji
            if (attrs.titles.ja_jp) titles.push(attrs.titles.ja_jp);
        }
        if (attrs.canonicalTitle) titles.push(attrs.canonicalTitle);
    }
    return titles;
}

// --- AnimePahe API ---

async function searchAnime(query) {
    // console.log(`[AnimePahe] Searching for: ${query}`);
    const url = `${BASE_URL}/api?m=search&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { 
        headers: { 
            'Cookie': HEADERS.Cookie,
            'User-Agent': HEADERS['User-Agent']
        } 
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
}

async function getReleaseId(session) {
    const path = session.includes("-") ? `/anime/${session}` : `/a/${session}`;
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, { 
        headers: { 
            'Cookie': HEADERS.Cookie,
            'User-Agent': HEADERS['User-Agent']
        } 
    });
    const html = await res.text();
    
    const $ = cheerio.load(html);
    const ogUrl = $("head > meta[property='og:url']").attr("content");
    if (!ogUrl) return session; 
    
    return ogUrl.split("/").pop();
}

async function getEpisodeSession(releaseId, targetEp) {
    const url = `${BASE_URL}/api?m=release&id=${releaseId}&sort=episode_asc&page=1`;
    const res = await fetch(url, { 
        headers: { 
            'Cookie': HEADERS.Cookie,
            'User-Agent': HEADERS['User-Agent']
        } 
    });
    const json = await res.json();
    
    let match = json.data.find(e => e.episode == targetEp);
    if (match) return match.session;
    
    if (json.last_page > 1) {
        const perPage = json.per_page || 30;
        const targetPage = Math.ceil(targetEp / perPage);
        
        if (targetPage > 1 && targetPage <= json.last_page) {
             const pUrl = `${BASE_URL}/api?m=release&id=${releaseId}&sort=episode_asc&page=${targetPage}`;
             const pRes = await fetch(pUrl, { 
                headers: { 
                    'Cookie': HEADERS.Cookie,
                    'User-Agent': HEADERS['User-Agent']
                } 
            });
             const pJson = await pRes.json();
             match = pJson.data.find(e => e.episode == targetEp);
             if (match) return match.session;
        }
    }
    return null;
}

async function extractStreams(releaseId, episodeSession, mediaTitle) {
    const url = `${BASE_URL}/play/${releaseId}/${episodeSession}`;
    const res = await fetch(url, { 
        headers: { 
            'Cookie': HEADERS.Cookie,
            'User-Agent': HEADERS['User-Agent']
        } 
    });
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
            promises.push(resolveKwik(src, quality, mediaTitle));
        }
    });
    
    const results = await Promise.all(promises);
    return results.filter(s => s !== null);
}

async function resolveKwik(url, quality, mediaTitle) {
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
                const decoded = eval(scriptMatch[1]);
                const linkMatch = decoded.match(/source='(.+?)'/);
                if (linkMatch && linkMatch[1]) {
                     return {
                        name: `AnimePahe - ${quality}`,
                        title: mediaTitle,
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
