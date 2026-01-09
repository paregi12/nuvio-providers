import { request } from './http.js';
import { getMetadata } from './tmdb.js';
import { extractStreamUrls } from './extractor.js';

async function search(query) {
    try {
        const response = await request('get', `/content/v2/discover/search?q=${encodeURIComponent(query)}&type=series,movie&limit=20`);
        const data = response.data;
        
        if (!data.data || data.data.length === 0) return [];
        
        // Crunchyroll search returns categories
        const results = data.data.flatMap(cat => cat.items || []);
        
        return results.map(item => ({
            name: "Crunchyroll",
            title: item.title,
            url: item.id,
            poster: item.images?.poster_tall?.[0]?.[0]?.source,
            type: item.type === 'series' ? 'tv' : 'movie'
        }));
    } catch (error) {
        console.error('[Crunchyroll] Search error:', error.message);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const meta = await getMetadata(tmdbId, mediaType);
        if (!meta) return [];

        console.log(`[Crunchyroll] Searching for: ${meta.title} (${meta.year})`);
        const searchResults = await search(meta.title);
        
        // Find best match
        const match = searchResults.find(r => 
            r.title.toLowerCase().includes(meta.title.toLowerCase())
        );

        if (!match) {
            console.log('[Crunchyroll] No matching series found.');
            return [];
        }

        console.log(`[Crunchyroll] Found match: ${match.title} (${match.url})`);

        if (mediaType === 'tv' || mediaType === 'series') {
            // 1. Get seasons
            const seasonsResponse = await request('get', `/content/v2/cms/seasons/${match.url}`);
            const seasons = seasonsResponse.data.data || [];
            
            // Find matching season
            const season = seasons.find(s => s.season_number === parseInt(seasonNum)) || seasons[0];
            if (!season) return [];

            // 2. Get episodes
            const episodesResponse = await request('get', `/content/v2/cms/episodes/${season.id}`);
            const episodes = episodesResponse.data.data || [];
            
            const episode = episodes.find(e => e.episode_number === parseInt(episodeNum));
            if (!episode) return [];

            console.log(`[Crunchyroll] Found episode: ${episode.title} (${episode.id})`);
            return await extractStreamUrls(episode.id);
        } else {
            // Movie logic
            return await extractStreamUrls(match.url);
        }
    } catch (error) {
        console.error('[Crunchyroll] getStreams error:', error.message);
        return [];
    }
}

module.exports = { getStreams, search };
