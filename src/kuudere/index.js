import { request } from './http.js';
import { getMetadata } from './tmdb.js';
import { extractStreams } from './extractors/index.js';
import { normalize, getSimilarity } from './utils.js';
import { getExternalIds } from './arm.js';

function parseSvelteData(data) {
    if (!data || !data.nodes) return [];
    
    const animeNode = data.nodes.find(n => n && n.data && n.data.some(item => item && item.animeData));
    if (!animeNode) return [];

    const dataArray = animeNode.data;
    const meta = dataArray.find(item => item && item.animeData);
    const animeIndices = dataArray[dataArray.indexOf(meta) + 1];
    
    const animeList = [];
    
    if (Array.isArray(animeIndices)) {
        for (const idx of animeIndices) {
            const item = dataArray[idx];
            if (item && typeof item === 'object') {
                const anime = {};
                for (const [key, val] of Object.entries(item)) {
                    if (typeof val === 'number' && dataArray[val] !== undefined) {
                        anime[key] = dataArray[val];
                    } else {
                        anime[key] = val;
                    }
                }
                
                animeList.push({
                    id: anime.id,
                    title: anime.english || anime.title || anime.romaji || anime.native,
                    poster: anime.cover || anime.coverImage,
                    year: anime.year,
                    type: String(anime.type).toLowerCase().includes('movie') ? 'movie' : 'tv'
                });
            }
        }
    }

    return animeList;
}

async function search(query) {
    try {
        const response = await request('get', `/search/__data.json?keyword=${encodeURIComponent(query)}`);
        let results = parseSvelteData(response.data);

        if (results.length === 0) {
            const quickResponse = await request('get', `/api/search?q=${encodeURIComponent(query)}`);
            if (quickResponse.data && quickResponse.data.results) {
                results = quickResponse.data.results.map(item => ({
                    title: item.title,
                    id: item.id,
                    poster: item.coverImage,
                    type: item.details.toLowerCase().includes('movie') ? 'movie' : 'tv'
                }));
            }
        }
        
        return results.map(item => ({
            name: "Kuudere",
            title: item.title,
            url: item.id,
            poster: item.poster,
            year: item.year,
            type: item.type
        }));
    } catch (error) {
        console.error('[Kuudere] Search error:', error.message);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, season, episode, tmdbData = null) {
    try {
        const meta = tmdbData || await getMetadata(tmdbId, mediaType);
        if (!meta) return [];

        console.log(`[Kuudere] Searching for: ${meta.title} (${meta.year}) [${mediaType}]`);
        
        const armData = await getExternalIds(tmdbId);
        const anilistId = armData?.anilist;

        const targetType = mediaType === 'movie' ? 'movie' : 'tv';

        // Multi-query search to expand the search results pool
        const queries = [
            meta.title.replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim(), // Full title
            meta.title.split(/[:\-\–\—]/)[0].trim() // Part before first separator (colon, hyphen, etc.)
        ];

        let allResults = [];
        for (const q of queries) {
            if (q.length < 3) continue;
            const res = await search(q);
            allResults = [...allResults, ...res];
        }

        // De-duplicate results by ID
        const uniqueResults = [];
        const seenIds = new Set();
        for (const r of allResults) {
            if (!seenIds.has(r.url)) {
                seenIds.add(r.url);
                uniqueResults.push(r);
            }
        }
        
        // Filter search results by type immediately
        const filteredResults = uniqueResults.filter(r => r.type === targetType);
        
        if (filteredResults.length === 0) {
            console.log(`[Kuudere] No search results matching type: ${targetType}`);
            return [];
        }

        let match = null;

        // 1. Try AniList ID-based matching (High Priority)
        if (anilistId) {
            match = filteredResults.find(r => r.poster && r.poster.includes(`bx${anilistId}`));
            if (match) console.log(`[Kuudere] Exact AniList match: ${anilistId}`);
        }

        // 2. Season Specific Matching (TV only)
        if (!match && targetType === 'tv' && season && parseInt(season) > 1) {
            const seasonTitle = `${meta.title} Season ${season}`;
            const scoredResults = filteredResults.map(r => ({
                ...r,
                score: getSimilarity(r.title, seasonTitle)
            })).sort((a, b) => b.score - a.score);

            if (scoredResults.length > 0 && scoredResults[0].score > 0.6) {
                match = scoredResults[0];
            }
        }

        // 3. Similarity Matching
        if (!match) {
            const scoredResults = filteredResults.map(r => {
                let score = getSimilarity(r.title, meta.title);
                if (r.year && meta.year && String(r.year) === String(meta.year)) {
                    score += 0.4;
                }
                return { ...r, score };
            }).sort((a, b) => b.score - a.score);

            // Using a strict threshold to avoid false positives
            if (scoredResults.length > 0 && scoredResults[0].score > 0.75) {
                match = scoredResults[0];
            }
        }

        if (!match) {
            console.log('[Kuudere] No matching anime found.');
            return [];
        }

        console.log(`[Kuudere] Found match: ${match.title} (Type: ${match.type}, Score: ${match.score ? match.score.toFixed(2) : 'ID'})`);

        const watchResponse = await request('get', `/api/watch/${match.url}/${episode}`);
        const watchData = watchResponse.data;

        if (!watchData.episode_links || watchData.episode_links.length === 0) {
            console.log('[Kuudere] No stream links found for this episode.');
            return [];
        }

        return await extractStreams(watchData.episode_links);
    } catch (error) {
        // console.error('[Kuudere] getStreams error:', error.message);
        return [];
    }
}

module.exports = { getStreams, search, extractStreams };