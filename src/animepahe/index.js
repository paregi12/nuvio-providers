import { getTmdbInfo } from './tmdb.js';
import { fetchJson, fetchText } from './http.js';
import { BASE_URL, API_URL } from './constants.js';
import { extractKwik } from './extractor.js';
import { search } from './search.js';
import { normalize, getSimilarity } from './utils.js';
import cheerio from 'cheerio-without-node-native';

/**
 * AnimePahe Provider - Resolves TMDB media to AnimePahe streams.
 */
async function getStreams(tmdbId, mediaType, season, episode, tmdbData = null) {
    try {
        const tmdb = tmdbData || await getTmdbInfo(tmdbId, mediaType);
        if (!tmdb) return [];
        
        const { title, year } = tmdb;
        const targetType = mediaType === 'movie' ? 'movie' : 'tv';
        console.log(`[AnimePahe] Processing: ${title} (${year}) [${targetType}]`);

        // 1. Expand Search with Multi-Query
        const queries = [
            title.replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim(), // Full title
            title.split(/[:\-\–\—]/)[0].trim() // Part before first separator
        ];

        let allResults = [];
        for (const q of queries) {
            if (q.length < 3) continue;
            const res = await search(q);
            allResults = [...allResults, ...res];
        }

        // 2. De-duplicate and Match
        const seenIds = new Set();
        const uniqueResults = allResults.filter(r => {
            if (seenIds.has(r.url)) return false;
            seenIds.add(r.url);
            return true;
        });

        const filteredResults = uniqueResults.filter(r => r.type === targetType);
        
        const scoredResults = filteredResults.map(r => {
            let score = getSimilarity(r.title, title);
            // Boost score if year matches exactly
            if (r.year && year && String(r.year) === String(year)) {
                score += 0.4;
            }
            return { ...r, score };
        }).sort((a, b) => b.score - a.score);

        // Strict threshold to avoid false positives
        const match = scoredResults[0];
        if (!match || match.score < 0.75) {
            console.log("[AnimePahe] No valid match found.");
            return [];
        }

        console.log(`[AnimePahe] Found match: ${match.title} (Score: ${match.score.toFixed(2)})`);
        const session = match.url;

        // 3. Find Episode Session
        const targetEp = episode || 1;
        let page = 1;
        let episodeSession = null;
        let lastPage = 1;

        while (!episodeSession && page <= lastPage) {
            const epUrl = `${API_URL}?m=release&id=${session}&sort=episode_asc&page=${page}`;
            const epData = await fetchJson(epUrl);
            lastPage = epData.last_page;
            
            const ep = epData.data.find(e => e.episode == targetEp);
            if (ep) {
                episodeSession = ep.session;
                console.log(`[AnimePahe] Resolved Episode ${targetEp}`);
            } else {
                page++;
            }
        }

        if (!episodeSession) {
            console.log(`[AnimePahe] Episode ${targetEp} not found.`);
            return [];
        }

        // 4. Resolve Stream Links
        const playUrl = `${BASE_URL}/play/${session}/${episodeSession}`;
        const playHtml = await fetchText(playUrl);
        const $ = cheerio.load(playHtml);

        const links = [];
        $('#resolutionMenu button, div#pickDownload > a').each((i, el) => {
            const $el = $(el);
            const src = $el.attr('data-src') || $el.attr('href');
            const text = $el.text();
            
            if (src && src.includes("kwik")) {
                const qualityMatch = text.match(/(\d{3,4}p)/);
                const quality = qualityMatch ? qualityMatch[1] : "Auto";
                const lang = (text.toLowerCase().includes("eng") || text.toLowerCase().includes("dub")) ? "Dub" : "Sub";
                links.push({ url: src, quality, lang });
            }
        });

        const finalStreams = [];
        for (const s of links) {
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
            } catch (e) {}
        }

        return finalStreams;

    } catch (error) {
        console.error(`[AnimePahe] getStreams error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams, search };
