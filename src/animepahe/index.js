import cheerio from 'cheerio-without-node-native';
import { fetchJson, fetchText, searchAnime, extractQuality, getImdbId, resolveMapping, getMalTitle } from './utils.js';
import { extractKwik } from './extractors.js';
import { MAIN_URL } from './constants.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        let animeSession = null;
        let animeTitle = "";
        let mappedEp = episode;

        // 1. Resolve Anime Identity via High-Fidelity Mapping
        const imdbId = await getImdbId(tmdbId, mediaType);
        let targetMalId = null;

        if (imdbId) {
            const mapping = await resolveMapping(imdbId, season, episode);
            if (mapping && mapping.mal_id) {
                targetMalId = mapping.mal_id;
                mappedEp = mapping.mal_episode || episode;
                // Fetch the official MAL title for exact search matching
                animeTitle = await getMalTitle(targetMalId);
            }
        }

        // 2. Fallback to TMDB for identity if no mapping or Jikan failed
        if (!animeTitle) {
            const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
            const tmdbRes = await fetch(tmdbUrl);
            const tmdbData = await tmdbRes.json();
            animeTitle = tmdbData.name || tmdbData.title;
            mappedEp = mediaType === 'movie' ? 1 : episode;
        }

        if (!animeTitle) return [];

        // 3. Search AnimePahe using the resolved title
        const searchResults = await searchAnime(animeTitle);
        if (!searchResults.data || searchResults.data.length === 0) return [];
        
        // Verification: Ensure the first result actually matches our title
        // This prevents non-anime media (like Hollywood movies) from showing random anime results
        const firstResult = searchResults.data[0];
        const resultTitle = firstResult.title.toLowerCase();
        const searchTitle = animeTitle.toLowerCase();

        const isMatch = resultTitle.includes(searchTitle) || 
                        searchTitle.includes(resultTitle) ||
                        // Handle cases where Jikan title might be slightly different
                        (targetMalId && resultTitle.length > 3); 

        if (!isMatch) {
            return []; // Title is too different, likely not an anime
        }

        animeSession = firstResult.session;

        // 4. Smart Episode Resolution (Math-based Offset)
        // Fetch first page to determine starting numbering
        const firstPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=1`;
        const firstPageData = await fetchJson(firstPageUrl);
        if (!firstPageData.data || firstPageData.data.length === 0) return [];

        const paheEpStart = Math.floor(firstPageData.data[0].episode);
        const perPage = firstPageData.per_page || 30;

        // Formula: Adjust target based on AnimePahe's starting episode
        // e.g. If Pahe starts at 88 and we want Ep 1, target is 88.
        const targetPaheEp = (paheEpStart - 1) + mappedEp;

        // Calculate Target Page based on relative index (mappedEp)
        const targetPage = Math.ceil(mappedEp / perPage) || 1;
        const targetPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=${targetPage}`;
        const targetPageData = await fetchJson(targetPageUrl);

        let episodeSession = null;
        if (targetPageData && targetPageData.data) {
            const foundEp = targetPageData.data.find(e => Math.floor(e.episode) == targetPaheEp);
            if (foundEp) {
                episodeSession = foundEp.session;
            }
        }

        // Fallback: If not found on calculated page, check first page (handles most absolute cases)
        if (!episodeSession && targetPage !== 1) {
            const fallbackEp = firstPageData.data.find(e => Math.floor(e.episode) == targetPaheEp);
            if (fallbackEp) episodeSession = fallbackEp.session;
        }

        if (!episodeSession) return [];

        // 5. Extraction
        const playUrl = `/play/${animeSession}/${episodeSession}`;
        const playHtml = await fetchText(playUrl);
        const $ = cheerio.load(playHtml);

        const streams = [];
        const promises = [];
        $('#resolutionMenu button').each((i, el) => {
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
                                title: `${animeTitle} - Episode ${mappedEp}`,
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
        const qualityOrder = { "1080p": 3, "720p": 2, "360p": 1 };
        return streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));

    } catch (error) {
        console.error(`[AnimePahe] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
