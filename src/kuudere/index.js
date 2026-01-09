import { request } from './http.js';
import { getMetadata } from './tmdb.js';
import { extractStreams } from './extractor.js';

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

function normalize(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w\s]/g, "").trim();
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

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        const meta = await getMetadata(tmdbId, mediaType);
        if (!meta) return [];

        const targetTitle = normalize(meta.title);
        const targetYear = meta.year;
        console.log(`[Kuudere] Searching for: ${meta.title} (${meta.year})`);
        
        const searchResults = await search(meta.title.replace(/[^\x00-\x7F]/g, ""));
        
        // Match title AND year for accuracy
        let match = searchResults.find(r => 
            normalize(r.title) === targetTitle && (String(r.year) === String(targetYear) || !r.year)
        );

        // Fallback to title only
        if (!match) {
            match = searchResults.find(r => normalize(r.title) === targetTitle);
        }

        // Fallback to fuzzy match
        if (!match) {
            match = searchResults.find(r => normalize(r.title).includes(targetTitle));
        }

        if (!match) {
            console.log('[Kuudere] No matching anime found.');
            return [];
        }

        console.log(`[Kuudere] Found match: ${match.title} (${match.url})`);

        const watchResponse = await request('get', `/api/watch/${match.url}/${episode}`);
        const watchData = watchResponse.data;

        if (!watchData.episode_links || watchData.episode_links.length === 0) {
            console.log('[Kuudere] No stream links found for this episode.');
            return [];
        }

        return await extractStreams(watchData.episode_links);
    } catch (error) {
        console.error('[Kuudere] getStreams error:', error.message);
        return [];
    }
}

module.exports = { getStreams, search, extractStreams };