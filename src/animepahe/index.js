import cheerio from 'cheerio-without-node-native';
import { fetchJson, fetchText, searchAnime, extractQuality, getCinemetaTitle, resolveMapping, getMalTitle } from './utils.js';
import { extractKwik, extractPahe } from './extractors.js';
import { MAIN_URL } from './constants.js';

async function getStreams(episodeUrl) {
    try {
        if (typeof episodeUrl !== 'string' || !episodeUrl.trim()) return [];
        const parsedUrl = new URL(episodeUrl, MAIN_URL);
        const playPath = parsedUrl.pathname.match(/\/play\/([^/]+)\/([^/]+)/);
        if (!playPath) return [];

        const animeSession = playPath[1];
        const episodeSession = playPath[2];
        const playUrl = `${parsedUrl.pathname}${parsedUrl.search}`;
        const playHtml = await fetchText(playUrl);
        const $ = cheerio.load(playHtml);
        const animeTitle = $('title').first().text().replace(/\s*[-|].*$/, '').trim() || 'AnimePahe';
        const mappedEp = Number(parsedUrl.searchParams.get('ep')) || 1;

        const streams = [];
        const promises = [];

        // 1. Extract from resolutionMenu (Kwik m3u8 and direct mp4 streams)
        $('#resolutionMenu button').each((i, el) => {
            const $btn = $(el);
            const kwikUrl = $btn.attr('data-src');
            const btnText = $btn.text();
            const quality = extractQuality(btnText);
            const isDub = btnText.toLowerCase().includes('eng');
            const type = isDub ? 'Dub' : 'Sub';
            const format = isDub ? 'dub' : 'hardsub';

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
                                    server: "Kwik",
                                    format: format,
                                    headers: res.headers
                                });
                            }
                            if (res.mp4) {
                                streams.push({
                                    name: `AnimePahe [MP4] (${quality} ${type})`,
                                    title: `${animeTitle} - Episode ${mappedEp}`,
                                    url: res.mp4,
                                    quality: quality,
                                    server: "Kwik",
                                    format: format,
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
            const isDub = $link.find('span').text().toLowerCase().includes('eng');
            const type = isDub ? 'Dub' : 'Sub';
            const format = isDub ? 'dub' : 'hardsub';

            if (paheUrl && (paheUrl.includes('pahe.win') || paheUrl.includes('pahe.me') || paheUrl.includes('pahe.li') || paheUrl.includes('kwik'))) {
                promises.push(
                    extractPahe(paheUrl).then(res => {
                        if (res && res.url) {
                            streams.push({
                                name: `AnimePahe [Direct] (${quality} ${type})`,
                                title: `${animeTitle} - Episode ${mappedEp}`,
                                url: res.url,
                                quality: quality,
                                server: "Pahe",
                                format: format,
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

async function getAnimeInfo(contentId) {
    try {
        let queryTitle = '';
        let targetMalId = null;
        const id = String(contentId || '').trim();

        if (/^tt\d+$/.test(id)) {
            queryTitle = await getCinemetaTitle(id, 'tv') || '';
            const mapping = await resolveMapping(id, 1, 1);
            targetMalId = mapping?.mal_id || null;
            if (!queryTitle && targetMalId) queryTitle = await getMalTitle(targetMalId) || '';
        } else if (/^(?:anilist:)?\d+$/.test(id)) {
            const anilistId = Number(id.replace(/^anilist:/, ''));
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'query($id:Int){Media(id:$id,type:ANIME){idMal title{english romaji native} format episodes description coverImage{large} bannerImage genres status{description}}}',
                    variables: { id: anilistId }
                })
            });
            if (!response.ok) return null;
            const media = (await response.json())?.data?.Media;
            if (!media) return null;
            targetMalId = media.idMal || null;
            queryTitle = media.title?.english || media.title?.romaji || media.title?.native || '';
        } else if (/^(?:mal:)?\d+$/.test(id)) {
            targetMalId = id.replace(/^mal:/, '');
            queryTitle = await getMalTitle(targetMalId) || '';
        } else {
            queryTitle = id;
        }

        if (!queryTitle) return null;
        const searchResult = await searchAnime(queryTitle);
        const candidates = searchResult?.data || [];
        if (candidates.length === 0) return null;

        let selected = null;
        const normalizedQuery = queryTitle.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        for (const candidate of candidates.slice(0, 5)) {
            const pageHtml = await fetchText(`/anime/${candidate.session}`);
            const matchesMalId = targetMalId && pageHtml.includes(`myanimelist.net/anime/${targetMalId}`);
            const normalizedTitle = String(candidate.title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            if (matchesMalId || (!targetMalId && normalizedTitle === normalizedQuery)) {
                selected = { ...candidate, pageHtml };
                break;
            }
        }
        if (!selected && targetMalId) return null;
        if (!selected) {
            const first = candidates[0];
            selected = { ...first, pageHtml: await fetchText(`/anime/${first.session}`) };
        }

        const $ = cheerio.load(selected.pageHtml);
        const firstPage = await fetchJson(`/api?m=release&id=${selected.session}&sort=episode_asc&page=1`);
        const lastPage = Math.min(Number(firstPage.last_page) || 1, 30);
        const pages = await Promise.all(Array.from({ length: lastPage }, (_, index) =>
            index === 0
                ? Promise.resolve(firstPage)
                : fetchJson(`/api?m=release&id=${selected.session}&sort=episode_asc&page=${index + 1}`).catch(() => null)
        ));
        const releases = pages.flatMap(page => page?.data || []);
        const episodes = releases.map(release => {
            const number = Math.floor(Number(release.episode) || 1);
            return {
                id: `${selected.session}:${release.session}`,
                episodeUrl: `${globalThis.SCRAPER_SETTINGS?.domain || MAIN_URL}/play/${selected.session}/${release.session}`,
                episode: number,
                season: 1,
                title: release.title || `Episode ${number}`,
                thumbnail: release.snapshot || null,
                isSub: true,
                isDub: false
            };
        });
        if (episodes.length === 0) return null;

        const image = $('[property="og:image"]').attr('content') || $('.anime-poster img').attr('src') || null;
        const description = $('[property="og:description"]').attr('content') || $('.anime-synopsis').text().trim() || null;
        const title = selected.title || queryTitle;
        return {
            id: String(selected.session),
            title,
            poster: image,
            description,
            type: episodes.length === 1 ? 'movie' : 'tv',
            format: episodes.length === 1 ? 'movie' : 'tv',
            totalEpisodes: episodes.length || null,
            subEpisodes: episodes.length || null,
            dubEpisodes: 0,
            episodes
        };
    } catch (_) {
        return null;
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
    module.exports = { getStreams, getAnimeInfo, getDetails: getAnimeInfo, onSettings };
} else {
    global.getStreams = getStreams;
    global.getAnimeInfo = getAnimeInfo;
    global.getDetails = getAnimeInfo;
    global.onSettings = onSettings;
}


