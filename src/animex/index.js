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

    const searchResults = await search(tmdbMeta.title);
    const match = searchResults.find(r => isMatch(r.title, tmdbMeta.title) && (String(r.year) === String(tmdbMeta.year) || !r.year));
    
    if (!match) return [];

    try {
        const episodesResponse = await request('get', `${BASE_URL}/api/anime/episodes/${match.id}?refresh=false`);
        const episodes = episodesResponse.data;
        
        const targetEpNum = episode || 1;
        const targetEp = episodes.find(e => e.number === targetEpNum);
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