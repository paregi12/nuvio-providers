import { getTmdbInfo } from './tmdb.js';
import { fetchJson, fetchText } from './http.js';
import { BASE_URL, API_URL } from './constants.js';
import { extractKwik } from './extractor.js';
import cheerio from 'cheerio-without-node-native';

async function getStreams(tmdbId, mediaType, season, episode, tmdbData = null) {
    try {
        // Default to S1 E1 for movies or missing info
        if (!season) season = 1;
        if (!episode) episode = 1;

        // 1. Get Title from TMDB
        const tmdb = tmdbData || await getTmdbInfo(tmdbId, mediaType);
        if (!tmdb) return [];
        
        const { title, year } = tmdb;
        console.log(`[AnimePahe] Processing: ${title} (${year}) S${season}E${episode}`);

        // 2. Search AnimePahe
        const searchUrl = `${API_URL}?m=search&l=8&q=${encodeURIComponent(title)}`;
        const searchData = await fetchJson(searchUrl);
        
        if (!searchData || !searchData.data || searchData.data.length === 0) {
            console.log("[AnimePahe] No search results found.");
            return [];
        }

        // 3. Find Best Match
        // Filter by year if available, or just take the first exact-ish match
        let anime = searchData.data.find(a => a.title.toLowerCase() === title.toLowerCase());
        if (!anime && year) {
            anime = searchData.data.find(a => a.year == year);
        }
        if (!anime) anime = searchData.data[0];

        console.log(`[AnimePahe] Selected Anime: ${anime.title} (Session: ${anime.session})`);
        const session = anime.session;

        // 4. Find Episode Session
        // We need to paginate through episodes to find the correct number
        // API: ?m=release&id=SESSION&sort=episode_asc&page=1
        let page = 1;
        let episodeSession = null;
        let lastPage = 1;

        while (!episodeSession && page <= lastPage) {
            const epUrl = `${API_URL}?m=release&id=${session}&sort=episode_asc&page=${page}`;
            const epData = await fetchJson(epUrl);
            
            lastPage = epData.last_page;
            
            const targetEp = epData.data.find(e => e.episode == episode);
            if (targetEp) {
                episodeSession = targetEp.session;
                console.log(`[AnimePahe] Found Episode ${episode} (Session: ${episodeSession})`);
            } else {
                page++;
            }
        }

        if (!episodeSession) {
            console.log(`[AnimePahe] Episode ${episode} not found.`);
            return [];
        }

        // 5. Get Stream Page
        const playUrl = `${BASE_URL}/play/${session}/${episodeSession}`;
        const playHtml = await fetchText(playUrl);
        const $ = cheerio.load(playHtml);

        const streams = [];

        // 6. Extract Links
        // Look for #resolutionMenu button[data-src]
        $('#resolutionMenu button').each((i, el) => {
            const src = $(el).attr('data-src');
            const text = $(el).text();
            
            // Extract Quality and Language (Sub/Dub)
            // Format: "Kwik · 720p (eng)" or similar
            const qualityMatch = text.match(/(\d{3,4}p)/);
            const quality = qualityMatch ? qualityMatch[1] : "Unknown";
            const isDub = text.toLowerCase().includes("eng") || text.toLowerCase().includes("dub");
            const lang = isDub ? "Dub" : "Sub";

            if (src && src.includes("kwik")) {
                streams.push({
                    url: src,
                    quality: quality,
                    lang: lang,
                    type: "kwik"
                });
            }
        });

        // Also check #pickDownload which might contain Pahe links
        $('div#pickDownload > a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text();
            
            // Format: "720p (eng)"
            const qualityMatch = text.match(/(\d{3,4}p)/);
            const quality = qualityMatch ? qualityMatch[1] : "Unknown";
            const isDub = text.toLowerCase().includes("eng") || text.toLowerCase().includes("dub");
            const lang = isDub ? "Dub" : "Sub";

            if (href) {
                // Determine type
                if (href.includes("kwik")) {
                    streams.push({
                        url: href,
                        quality: quality,
                        lang: lang,
                        type: "kwik"
                    });
                } else {
                    // Direct or other
                    streams.push({
                        url: href,
                        quality: quality,
                        lang: lang,
                        type: "pahe"
                    });
                }
            }
        });

        // 7. Resolve Kwik Links
        const finalStreams = [];
        for (const s of streams) {
            try {
                const directUrl = await extractKwik(s.url);
                if (directUrl) {
                    finalStreams.push({
                        name: `AnimePahe ${s.lang}`,
                        title: `AnimePahe ${s.quality} ${s.lang}`,
                        url: directUrl,
                        quality: s.quality
                    });
                }
            } catch (e) {
                console.error(`[AnimePahe] Failed to extract Kwik: ${e.message}`);
            }
        }

        return finalStreams;

    } catch (error) {
        console.error(`[AnimePahe] Error: ${error.message}`);
        return [];
    }
}

async function search(query) {
    try {
        const searchUrl = `${API_URL}?m=search&l=8&q=${encodeURIComponent(query)}`;
        const searchData = await fetchJson(searchUrl);
        
        if (!searchData || !searchData.data || searchData.data.length === 0) {
            return [];
        }

        return searchData.data.map(anime => ({
            name: "AnimePahe",
            title: anime.title,
            url: anime.session, // Use session as unique identifier/URL
            poster: anime.poster,
            year: anime.year,
            type: anime.type.toLowerCase().includes('movie') ? 'movie' : 'tv'
        }));
    } catch (error) {
        console.error(`[AnimePahe] Search error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams, search };
