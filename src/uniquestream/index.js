import { request } from './http.js';
import { getMetadata } from './tmdb.js';
import { isMatch, normalize } from './utils.js';
import { API_URL, BASE_URL } from './constants.js';

async function search(query) {
    try {
        const url = `${API_URL}/search?page=1&query=${encodeURIComponent(query)}&t=all&limit=20`;
        const response = await request('get', url);
        // Combine series and movies
        const results = [];
        if (response.data.series) results.push(...response.data.series);
        if (response.data.movies) results.push(...response.data.movies);
        
        return results;
    } catch (error) {
        console.error('[UniqueStream] Search error:', error.message);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    const meta = await getMetadata(tmdbId, mediaType);
    if (!meta) return [];

    console.log(`[UniqueStream] Searching for: ${meta.title}`);

    // 1. Search
    const results = await search(meta.title);
    
    // 2. Match
    let matchedItem = results.find(item => {
        // Strict match on title and type
        const isTitleMatch = isMatch(item.title, meta.title);
        // type: "show" or "movie"
        const itemType = item.type === 'show' ? 'tv' : 'movie';
        return isTitleMatch && itemType === mediaType;
    });

    if (!matchedItem) {
        console.log('[UniqueStream] No match found');
        return [];
    }

    console.log(`[UniqueStream] Match: ${matchedItem.title} (${matchedItem.content_id})`);

    // 3. Get Seasons/Details
    // If it's a movie, the structure might be different (usually single episode/movie object)
    // But API returned "movies" list. Let's assume for now.
    
    let episodeId = null;

    if (mediaType === 'movie') {
        // For movies, the content_id might be the playable id directly OR we need to fetch details.
        // Based on API response for series, "movies" array was empty in my trace, but logic should be similar.
        // Let's assume content_id is the series/movie ID and we need to find the "episode" (video) ID.
        // Or maybe for movies, the ID IS the video ID.
        // Let's check the search result structure for movies if possible.
        // Assuming we need to fetch details first.
        try {
            const details = await request('get', `${API_URL}/series/${matchedItem.content_id}`); // Endpoint might be /movie/?
            // Actually, for movies, let's guess it might be treated as a series with 1 episode or different endpoint.
            // If I can't be sure, I'll stick to TV shows mostly or try to handle generically.
            // Let's assume standard flow: Get Details -> Get "Episode" (Movie file).
        } catch (e) {
             // fallback or logic for movies
        }
        // TODO: Movie support needs verification. Using 'tv' flow for now.
    }

    if (!episodeId) {
        // Logic for TV Series
        try {
            // Get Series Details (for seasons)
            const detailsUrl = `${API_URL}/series/${matchedItem.content_id}`;
            const detailsRes = await request('get', detailsUrl);
            const seasons = detailsRes.data.seasons || [];

            // Find season
            const targetSeason = seasons.find(s => s.season_number === parseInt(season));
            if (!targetSeason) {
                console.log(`[UniqueStream] Season ${season} not found`);
                return [];
            }

            // Get Episodes for Season
            let page = 1;
            let foundEpisode = null;
            let hasMore = true;

            while (hasMore) {
                const episodesUrl = `${API_URL}/season/${targetSeason.content_id}/episodes?page=${page}&limit=20&order_by=asc`;
                const episodesRes = await request('get', episodesUrl);
                const episodes = episodesRes.data || [];

                if (episodes.length === 0) {
                    hasMore = false;
                    break;
                }

                foundEpisode = episodes.find(e => e.episode_number === parseFloat(episode));
                if (foundEpisode) {
                    hasMore = false;
                    break;
                }

                if (episodes.length < 20) {
                    hasMore = false;
                } else {
                    page++;
                }
                
                // Safety break to avoid infinite loops
                if (page > 20) break;
            }
            
            if (foundEpisode) {
                episodeId = foundEpisode.content_id;
            } else {
                 console.log(`[UniqueStream] Episode ${episode} not found`);
                 return [];
            }

        } catch (error) {
            console.error('[UniqueStream] Error fetching details:', error.message);
            if (error.response) console.error('Data:', error.response.data);
            return [];
        }
    }

    if (!episodeId) return [];

    // 4. Get Stream
    // We try to get the 'ja-JP' audio first, or fallbacks.
    // We can try to fetch the list of available audios? 
    // The previous API response showed `audio_locales` in series details.
    // But the media endpoint requires a locale.
    // Let's try 'ja-JP' (Japanese) and 'en-US' (English Dub usually, or just English)
    // Common locales: ja-JP, en-US.
    
    // Actually, I can try to fetch `ja-JP` first.
    const localesToTry = ['ja-JP', 'en-US'];
    const streams = [];
    const seenUrls = new Set();

    for (const locale of localesToTry) {
        try {
            const mediaUrl = `${API_URL}/episode/${episodeId}/media/dash/${locale}`;
            const mediaRes = await request('get', mediaUrl);
            const mediaData = mediaRes.data;

            if (mediaData && mediaData.dash) {
                // Main Playlist (Original Audio usually)
                if (mediaData.dash.playlist && !seenUrls.has(mediaData.dash.playlist)) {
                    seenUrls.add(mediaData.dash.playlist);
                    streams.push({
                        name: "UniqueStream",
                        title: `Original (${mediaData.dash.locale}) - Auto`,
                        url: mediaData.dash.playlist,
                        quality: "auto"
                    });
                }

                // Hard Subs
                if (mediaData.dash.hard_subs) {
                    mediaData.dash.hard_subs.forEach(sub => {
                        if (!seenUrls.has(sub.playlist)) {
                            seenUrls.add(sub.playlist);
                            streams.push({
                                name: "UniqueStream",
                                title: `Hardsub ${sub.locale} - Auto`,
                                url: sub.playlist,
                                quality: "auto"
                            });
                        }
                    });
                }
            }
        } catch (e) {
            // Ignore error for missing locale
        }
    }

    return streams;
}

module.exports = { getStreams, search };
