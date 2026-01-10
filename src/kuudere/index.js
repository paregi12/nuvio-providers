import { request } from './http.js';
import { getMetadata } from './tmdb.js';
import { extractStreams } from './extractors/index.js';
import { search } from './search.js';
import { normalize, isMatch } from './utils.js';

async function getStreams(tmdbId, mediaType, season, episode, tmdbData = null) {
    try {
        const meta = tmdbData || await getMetadata(tmdbId, mediaType);
        if (!meta) return [];

        console.log(`[Kuudere] Searching for: ${meta.title} (${meta.year})`);
        
        // Clean query: remove non-ascii characters for search
        const targetType = mediaType === 'movie' ? 'movie' : 'tv';

        // Multi-query search
        const queries = [
            meta.title.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim(), // Full title
            meta.title.split(/[:\-\–\—]/)[0].trim() // Part before first separator
        ];

        let allResults = [];
        for (const q of queries) {
            if (q.length < 3) continue;
            const res = await search(q);
            allResults = [...allResults, ...res];
        }

        // De-duplicate results
        const uniqueResults = [];
        const seenIds = new Set();
        for (const r of allResults) {
            if (!seenIds.has(r.url)) {
                seenIds.add(r.url);
                uniqueResults.push(r);
            }
        }
        
        const filteredResults = uniqueResults.filter(r => r.type === targetType);
        
        let match = null;

        // 1. Season Specific Matching (TV only)
        if (targetType === 'tv' && season && parseInt(season) > 1) {
            const seasonTitle = normalize(`${meta.title} Season ${season}`);
            match = filteredResults.find(r => normalize(r.title) === seasonTitle);
            if (!match) {
                match = filteredResults.find(r => normalize(r.title).includes(seasonTitle));
            }
        }

        // 2. Standard Matching (Title + Year)
        if (!match) {
            match = filteredResults.find(r => 
                isMatch(r.title, meta.title) && 
                (String(r.year) === String(meta.year) || !r.year)
            );
        }

        // 3. Fallback: Title Only
        if (!match) {
            match = filteredResults.find(r => isMatch(r.title, meta.title));
        }

        if (!match) {
            console.log('[Kuudere] No matching anime found.');
            return [];
        }

        console.log(`[Kuudere] Found match: ${match.title} (${match.url})`);

        const watchResponse = await request('get', `/api/watch/${match.url}/${episode || 1}`);
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

module.exports = { getStreams, search };
