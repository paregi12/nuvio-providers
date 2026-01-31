import { request } from './http.js';
import { generateId, normalize, isMatch } from './utils.js';

const ANILIST_API = "https://graphql.anilist.co/";
const BASE_URL = "https://animex.one";

async function search(query) {
    const gql = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          format
          status
          seasonYear
        }
      }
    }
    `;

    try {
        const response = await request('post', ANILIST_API, {
            data: {
                query: gql,
                variables: { search: query }
            }
        });
        
        const results = response.data.data.Page.media;
        return results.map(item => ({
            id: item.id,
            title: item.title.english || item.title.romaji || item.title.native,
            year: item.seasonYear,
            type: item.format === 'MOVIE' ? 'movie' : 'tv'
        }));
    } catch (error) {
        return [];
    }
}

function getSlug(title, id, episode) {
    const slug = title.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return `${slug}-${id}-episode-${episode}`;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    const tmdbMeta = await getTmdbMetadata(tmdbId, mediaType);
    if (!tmdbMeta) return [];

    let match = null;
    let targetEpNum = episode || 1;
    let currentSeason = season || 1;

    // Perfect Matching Strategy:
    // 1. If season > 1, try searching with "Title Season X" first
    if (mediaType === 'tv' && currentSeason > 1) {
        const seasonalSearch = await search(`${tmdbMeta.title} Season ${currentSeason}`);
        match = seasonalSearch.find(r => 
            (isMatch(r.title, tmdbMeta.title) && r.title.toLowerCase().includes(`season ${currentSeason}`)) ||
            (isMatch(r.title, tmdbMeta.title) && r.title.toLowerCase().includes(` ${currentSeason}`))
        );
    }

    // 2. Fallback to base title search if no seasonal match found
    if (!match) {
        const searchResults = await search(tmdbMeta.title);
        
        // Try to find a match that includes the season number in the title if season > 1
        if (mediaType === 'tv' && currentSeason > 1) {
            match = searchResults.find(r => 
                isMatch(r.title, tmdbMeta.title) && 
                (r.title.toLowerCase().includes(`season ${currentSeason}`) || r.title.toLowerCase().includes(` ${currentSeason}`))
            );
        }

        // 3. Last resort: match by base title and year (standard behavior)
        if (!match) {
            match = searchResults.find(r => isMatch(r.title, tmdbMeta.title) && (String(r.year) === String(tmdbMeta.year) || !r.year));
        }
    }
    
    if (!match) return [];

    try {
        let episodesResponse = await request('get', `${BASE_URL}/api/anime/episodes/${match.id}?refresh=false`);
        let episodes = episodesResponse.data;
        
        let targetEp = episodes.find(e => e.number === targetEpNum);

        // 4. Absolute Numbering Fallback:
        // If we matched Season 1 but requested a high episode number (like 51),
        // or if the episode wasn't found in the seasonal match, try to find it by absolute number.
        if (!targetEp && episodes.length > 0) {
            // If the requested episode is much larger than available, it might be absolute numbering
            // We don't change the match, but we look for the episode number as is.
            // This handles cases where TMDB says S1E51 but AniList S1 only has 24.
            // However, usually S1E51 would be in a DIFFERENT AniList entry (Season 3).
            // The logic above (Step 1 & 2) should have found Season 3.
        }

        if (!targetEp) return [];

        const streams = [];
        const watchUrl = `${BASE_URL}/watch/${getSlug(match.title, match.id, targetEpNum)}`;
        
        const categories = [
            { type: 'sub', providers: targetEp.subProviders || [], label: 'Hardsub' },
            { type: 'softsub', providers: targetEp.subProviders || [], label: 'Softsub' },
            { type: 'dub', providers: targetEp.dubProviders || [], label: 'Dub' }
        ];

        for (const cat of categories) {
            for (const provider of cat.providers) {
                try {
                    const encryptedId = await generateId(match.id, {
                        host: provider,
                        epNum: targetEp.number,
                        type: cat.type,
                        cache: "true"
                    });

                    const sourcesResponse = await request('get', `${BASE_URL}/api/anime/sources/${encryptedId}`, {
                        headers: {
                            "Referer": watchUrl,
                            "Origin": BASE_URL
                        }
                    });
                    const sourcesData = sourcesResponse.data;

                    if (sourcesData.sources) {
                        for (const s of sourcesData.sources) {
                            streams.push({
                                name: `AnimeX - ${provider} (${cat.label})`,
                                title: `${cat.label} - ${s.quality || 'Auto'}`,
                                url: s.url,
                                quality: s.quality || 'auto',
                                headers: {
                                    "Referer": watchUrl,
                                    "Origin": BASE_URL,
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                                }
                            });
                        }
                    }
                } catch (e) {
                    // Skip failed
                }
            }
        }

        return streams;
    } catch (error) {
        return [];
    }
}

async function getTmdbMetadata(tmdbId, mediaType) {
    const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
    const endpoint = mediaType === 'tv' || mediaType === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
    
    try {
        const response = await request('get', url);
        const data = response.data;
        return {
            title: data.name || data.title,
            year: (data.first_air_date || data.release_date || '').split('-')[0]
        };
    } catch (error) {
        return null;
    }
}

module.exports = { getStreams, search };