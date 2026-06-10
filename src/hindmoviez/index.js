import { extractStreams } from './extractor.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        console.log(`[Hindmoviez] Fetching streams for ${mediaType} ${tmdbId}`);
        const streams = await extractStreams(tmdbId, mediaType, season, episode);
        
        const seen = new Set();
        return streams.filter(s => {
            if (!s.url || seen.has(s.url)) return false;
            seen.add(s.url);
            return true;
        });
    } catch (e) {
        console.error(`[Hindmoviez] getStreams failed: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
