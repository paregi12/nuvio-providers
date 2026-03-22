import cheerio from 'cheerio-without-node-native';
import { fetchJson, fetchText, searchAnime, extractQuality, getImdbId, resolveMapping } from './utils.js';
import { extractKwik } from './extractors.js';
import { MAIN_URL } from './constants.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        let animeSession = null;
        let animeTitle = "Anime";
        let targetEpNum = episode;

        // 1. Resolve Anime Identity
        if (mediaType === 'tv') {
            // For TV Series: Use High-Fidelity MAL Mapping
            const imdbId = await getImdbId(tmdbId, mediaType);
            if (imdbId) {
                const mapping = await resolveMapping(imdbId, season, episode);
                if (mapping && mapping.mal_id) {
                    const malId = mapping.mal_id;
                    targetEpNum = mapping.mal_episode || episode;
                    animeTitle = mapping.anime_title || "Anime";

                    // Resolve session via /a/{mal_id}
                    const malUrl = `https://animepahe.si/a/${malId}`;
                    const malPageHtml = await fetchText(malUrl);
                    const sessionMatch = malPageHtml.match(/\/anime\/([a-z0-9-]+)/);
                    if (sessionMatch) {
                        animeSession = sessionMatch[1];
                    }
                }
            }
        }

        // 2. Fallback for Movies or Failed Mapping
        if (!animeSession) {
            // Get title from TMDB
            const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
            const tmdbRes = await fetch(tmdbUrl);
            const tmdbData = await tmdbRes.json();
            animeTitle = tmdbData.name || tmdbData.title;
            targetEpNum = mediaType === 'movie' ? 1 : episode;

            if (!animeTitle) return [];

            // Search by Title
            const searchResults = await searchAnime(animeTitle);
            if (!searchResults.data || searchResults.data.length === 0) {
                return [];
            }

            // Find best match
            const bestMatch = searchResults.data.find(a => 
                a.title.toLowerCase().includes(animeTitle.toLowerCase()) || 
                animeTitle.toLowerCase().includes(a.title.toLowerCase())
            ) || searchResults.data[0];

            animeSession = bestMatch.session;
        }

        if (!animeSession) return [];

        // 3. Get Episode List to find the target episode session
        let episodeSession = null;
        let page = 1;
        let lastPage = 1;

        do {
            const epListUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=${page}`;
            const epListData = await fetchJson(epListUrl);
            
            lastPage = epListData.last_page;
            const foundEp = epListData.data.find(e => e.episode == targetEpNum);
            
            if (foundEp) {
                episodeSession = foundEp.session;
                break;
            }
            page++;
        } while (page <= lastPage);

        if (!episodeSession) return [];

        // 4. Load the play page
        const playUrl = `/play/${animeSession}/${episodeSession}`;
        const playHtml = await fetchText(playUrl);
        const $ = cheerio.load(playHtml);

        const streams = [];
        const promises = [];
        
        const buttons = $('#resolutionMenu button');

        // 5. Extract streams from #resolutionMenu
        buttons.each((i, el) => {
            const $btn = $(el);
            const kwikUrl = $btn.attr('data-src');
            const btnText = $btn.text();
            const quality = extractQuality(btnText);
            const type = btnText.toLowerCase().includes('eng') ? 'Dub' : 'Sub';

            if (kwikUrl && kwikUrl.includes('kwik')) {
                promises.push(
                    extractKwik(kwikUrl).then(res => {
                        if (res) {
                            streams.push({
                                name: `AnimePahe (${quality} ${type})`,
                                title: `${animeTitle} - Episode ${targetEpNum}`,
                                url: res.url,
                                quality: quality,
                                headers: res.headers
                            });
                        }
                    })
                );
            }
        });

        await Promise.all(promises);

        // Sort streams by quality descending (1080p > 720p > 360p)
        const qualityOrder = { "1080p": 3, "720p": 2, "360p": 1 };
        return streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));

    } catch (error) {
        console.error(`[AnimePahe] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
