import { request } from './http.js';
import { getMetadata } from './tmdb.js';
import { extractStreams } from './extractors/index.js';
import { search } from './search.js';
import { normalize, isMatch } from './utils.js';
import { BASE_URL, ALT_URLS } from './constants.js';

async function getStreams(tmdbId, mediaType, season, episode, tmdbData = null) {
    const meta = tmdbData || await getMetadata(tmdbId, mediaType);
    if (!meta) return [];

    console.log(`[Kuudere] Searching for: ${meta.title} (${meta.year})`);
    
    const targetType = mediaType === 'movie' ? 'movie' : 'tv';
    const allDomains = [BASE_URL, ...ALT_URLS];
    
    // 1. Expand Search with Multi-Query
    const queries = [
        meta.title.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim(),
        meta.title.split(/[:\-\–\—]/)[0].trim()
    ];

    let match = null;
    let successfulDomain = BASE_URL;

    // Try domains one by one until a match is found
    for (const domain of allDomains) {
        try {
            let allResults = [];
            for (const q of queries) {
                if (q.length < 3) continue;
                const res = await search(q, domain);
                allResults = [...allResults, ...res];
            }

            // De-duplicate and Match
            const seenIds = new Set();
            const filteredResults = allResults.filter(r => {
                if (seenIds.has(r.url)) return false;
                seenIds.add(r.url);
                return r.type === targetType;
            });

            // Matching Logic
            if (!match && targetType === 'tv' && season && parseInt(season) > 1) {
                const seasonTitle = normalize(`${meta.title} Season ${season}`);
                match = filteredResults.find(r => normalize(r.title) === seasonTitle || normalize(r.title).includes(seasonTitle));
            }

            if (!match) {
                match = filteredResults.find(r => 
                    isMatch(r.title, meta.title) && 
                    (String(r.year) === String(meta.year) || !r.year)
                );
            }

            if (!match) {
                match = filteredResults.find(r => isMatch(r.title, meta.title));
            }

            if (match) {
                successfulDomain = domain;
                console.log(`[Kuudere] Match found on ${domain}: ${match.title}`);
                break;
            }
        } catch (e) {
            continue;
        }
    }

    if (!match) {
        console.log('[Kuudere] No matching anime found on any domain.');
        return [];
    }

    try {
        const watchResponse = await request('get', `/api/watch/${match.url}/${episode || 1}`, { baseURL: successfulDomain });
        const watchData = watchResponse.data;

        if (!watchData.episode_links || watchData.episode_links.length === 0) {
            return [];
        }

        return await extractStreams(watchData.episode_links);
    } catch (error) {
        return [];
    }
}

module.exports = { getStreams, search };
