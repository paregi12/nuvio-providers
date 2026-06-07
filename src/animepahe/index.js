import cheerio from 'cheerio-without-node-native';
import { fetchJson, fetchText, searchAnime, extractQuality, getImdbId, resolveMapping, getMalTitle } from './utils.js';
import { extractKwik, extractPahe } from './extractors.js';
import { MAIN_URL } from './constants.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        let animeSession = null;
        let animeTitle = "";
        let mappedEp = episode;
        let targetMalId = null;

        if (mediaType === 'tv') {
            // --- SERIES STRATEGY: ID-BASED WITH VERIFICATION ---
            const imdbId = await getImdbId(tmdbId, mediaType);
            if (!imdbId) return [];

            const mapping = await resolveMapping(imdbId, season, episode);
            if (!mapping || !mapping.mal_id) return [];

            targetMalId = mapping.mal_id;
            mappedEp = mapping.mal_episode || episode;
            animeTitle = await getMalTitle(targetMalId); // Official MAL Title

            if (!animeTitle) return [];

            const searchResults = await searchAnime(animeTitle);
            if (searchResults.data && searchResults.data.length > 0) {
                // VERIFY each candidate by checking for the MAL ID on its page
                // We check first 3 candidates for efficiency (usually first is correct)
                for (let i = 0; i < Math.min(searchResults.data.length, 3); i++) {
                    const item = searchResults.data[i];
                    const pageHtml = await fetchText(`/anime/${item.session}`);
                    if (pageHtml.includes(`myanimelist.net/anime/${targetMalId}`)) {
                        animeSession = item.session;
                        break;
                    }
                }
            }
        } else {
            // --- MOVIE STRATEGY: PERFECT TITLE MATCH ---
            const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
            const tmdbRes = await fetch(tmdbUrl);
            const tmdbData = await tmdbRes.json();
            animeTitle = tmdbData.title || tmdbData.original_title;
            mappedEp = 1;

            if (!animeTitle) return [];

            const searchResults = await searchAnime(animeTitle);
            if (searchResults.data && searchResults.data.length > 0) {
                const firstResult = searchResults.data[0];
                if (firstResult.title.toLowerCase() === animeTitle.toLowerCase()) {
                    animeSession = firstResult.session;
                }
            }
        }

        if (!animeSession) return [];

        // --- COMMON LOGIC: Smart Episode Resolution ---
        const firstPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=1`;
        const firstPageData = await fetchJson(firstPageUrl);
        if (!firstPageData.data || firstPageData.data.length === 0) return [];

        const paheEpStart = Math.floor(firstPageData.data[0].episode);
        const perPage = firstPageData.per_page || 30;
        const targetPaheEp = (paheEpStart - 1) + mappedEp;

        const targetPage = Math.ceil(mappedEp / perPage) || 1;
        const targetPageUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=${targetPage}`;
        const targetPageData = await fetchJson(targetPageUrl);

        let episodeSession = null;
        if (targetPageData && targetPageData.data) {
            const foundEp = targetPageData.data.find(e => Math.floor(e.episode) == targetPaheEp);
            if (foundEp) episodeSession = foundEp.session;
        }

        if (!episodeSession && targetPage !== 1) {
            const fallbackEp = firstPageData.data.find(e => Math.floor(e.episode) == targetPaheEp);
            if (fallbackEp) episodeSession = fallbackEp.session;
        }

        if (!episodeSession) return [];

        // --- EXTRACTION ---
        const playUrl = `/play/${animeSession}/${episodeSession}`;
        const playHtml = await fetchText(playUrl);
        const $ = cheerio.load(playHtml);

        const streams = [];
        const promises = [];

        // 1. Extract from resolutionMenu (Kwik m3u8 and direct mp4 streams)
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
                            if (res.m3u8) {
                                streams.push({
                                    name: `AnimePahe [HLS] (${quality} ${type})`,
                                    title: `${animeTitle} - Episode ${mappedEp}`,
                                    url: res.m3u8,
                                    quality: quality,
                                    headers: res.headers
                                });
                            }
                            if (res.mp4) {
                                streams.push({
                                    name: `AnimePahe [MP4] (${quality} ${type})`,
                                    title: `${animeTitle} - Episode ${mappedEp}`,
                                    url: res.mp4,
                                    quality: quality,
                                    headers: {
                                        ...res.headers,
                                        "Referer": kwikUrl
                                    }
                                });
                            }
                        }
                    }).catch(() => {})
                );
            }
        });

        // 2. Extract from pickDownload links (Pahe/win direct mp4 downloads)
        $('div#pickDownload a').each((i, el) => {
            const $link = $(el);
            const paheUrl = $link.attr('href');
            const linkText = $link.text();
            const quality = extractQuality(linkText);
            const type = $link.find('span').text().toLowerCase().includes('eng') ? 'Dub' : 'Sub';

            if (paheUrl && (paheUrl.includes('pahe.win') || paheUrl.includes('pahe.me') || paheUrl.includes('pahe.li') || paheUrl.includes('kwik'))) {
                promises.push(
                    extractPahe(paheUrl).then(res => {
                        if (res && res.url) {
                            streams.push({
                                name: `AnimePahe [Direct] (${quality} ${type})`,
                                title: `${animeTitle} - Episode ${mappedEp}`,
                                url: res.url,
                                quality: quality,
                                headers: res.headers
                            });
                        }
                    }).catch(() => {})
                );
            }
        });

        await Promise.all(promises);
        const qualityOrder = { "1080p": 3, "720p": 2, "360p": 1 };
        return streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));

    } catch (error) {
        return [];
    }
}

async function onSettings() {
    return [
        { type: "header", label: "Domain Selection" },
        {
            type: "select",
            key: "domain",
            label: "Preferred Domain",
            description: "AnimePahe frequently rotates domains. Choose the one currently working for you.",
            options: [
                { label: "animepahe.com", value: "https://animepahe.com" },
                { label: "animepahe.org", value: "https://animepahe.org" },
                { label: "animepahe.pw", value: "https://animepahe.pw" }
            ],
            defaultValue: "https://animepahe.com"
        }
    ];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams, onSettings };
} else {
    global.getStreams = getStreams;
    global.onSettings = onSettings;
}


