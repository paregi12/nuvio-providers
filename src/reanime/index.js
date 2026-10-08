import {
    getBaseUrl,
    getFlixEmbeds,
    getTmdbInfo,
    searchReanimeAnime,
    getSyncInfo,
    resolveByDate,
    fetchPopular,
    fetchLatestAired,
    fetchTopRated,
    searchAnimeApi,
    fetchAnimeDetails,
    fetchAnimeEpisodes,
    fetchAnimeRecommendations,
    fetchThumbnails,
    fetchFlixServers,
    getAnilistMediaInfo,
    toHomeItem
} from './reanime.js';
import { extractFlixCloud } from './flixcloud.js';

async function getStreams(contentId, mediaType = "tv", season = null, episode = null) {
    try {
        if (mediaType !== 'tv' && mediaType !== 'movie') return [];

        let alId = null;
        let episodeNumber = mediaType === "tv" ? Number(episode || 1) : 1;
        let searchTitle = "";
        let animeSlug = null;

        const isDirectSlug = typeof contentId === 'string' &&
            !/^\d+$/.test(contentId) &&
            !contentId.startsWith('tt') &&
            !contentId.startsWith('anilist:') &&
            !contentId.startsWith('tmdb:');

        if (isDirectSlug) {
            const cleanSlug = contentId.replace(/^reanime:/, '');
            try {
                const details = await fetchAnimeDetails(cleanSlug);
                if (details && details.anime_id) {
                    animeSlug = details.anime_id;
                    alId = details.anilist_id ? String(details.anilist_id) : null;
                    searchTitle = details.title?.english || details.title?.romaji || animeSlug;
                }
            } catch (_) {}
        }

        if (!animeSlug) {
            if (typeof contentId === 'string' && contentId.startsWith('anilist:')) {
                alId = contentId.split(':')[1];
                const alInfo = await getAnilistMediaInfo(alId);
                searchTitle = alInfo.title;
            } else {
                const tmdbId = String(contentId).replace(/^tmdb:/, '');
                const syncInfo = await getSyncInfo(tmdbId, mediaType, season, episodeNumber);
                searchTitle = syncInfo.title;

                const syncResult = await resolveByDate(syncInfo.releaseDate, syncInfo.title, episodeNumber, syncInfo.episodeTitle, syncInfo.dayIndex);
                if (syncResult && syncResult.alId) {
                    alId = String(syncResult.alId);
                    episodeNumber = syncResult.episode;
                    searchTitle = syncResult.title;
                } else {
                    const tmdb = await getTmdbInfo(tmdbId, mediaType);
                    searchTitle = tmdb.title;
                }
            }

            const anime = await searchReanimeAnime(searchTitle, null, alId);
            if (!anime || !anime.slug) return [];
            animeSlug = anime.slug;
            if (!alId && anime.anilistId) alId = String(anime.anilistId);
        }

        const streams = [];
        const watchUrl = `${getBaseUrl()}/watch/${animeSlug}?ep=${episodeNumber}`;

        if (alId) {
            const servers = await fetchFlixServers(alId, episodeNumber, animeSlug);
            for (const server of servers) {
                if (!server.dataLink) continue;
                try {
                    const extracted = await extractFlixCloud(server.dataLink, watchUrl);
                    if (extracted && extracted.url) {
                        const lang = (server.dataType || 'sub').toUpperCase();
                        const sName = server.serverName || 'HD-1';
                        const softsubStr = server.softsub ? ' [Softsub]' : '';
                        const streamTitle = mediaType === 'movie'
                            ? `${searchTitle} (${lang})`
                            : `${searchTitle} - Episode ${episodeNumber} (${lang})`;

                        streams.push({
                            name: `Reanime [${lang}] ${sName}${softsubStr}`,
                            title: streamTitle,
                            url: extracted.url,
                            quality: "Auto",
                            server: `${sName}${softsubStr}`,
                            headers: extracted.headers,
                            provider: "reanime",
                            type: "m3u8",
                            subtitles: extracted.subtitles
                        });
                    }
                } catch (_) {}
            }
        }

        if (streams.length === 0) {
            const languages = ["sub", "dub"];
            for (const language of languages) {
                const { watchUrl: wUrl, embeds } = await getFlixEmbeds(animeSlug, episodeNumber, language, alId);
                for (let i = 0; i < embeds.length; i++) {
                    try {
                        const extracted = await extractFlixCloud(embeds[i], wUrl);
                        if (extracted && extracted.url) {
                            const streamTitle = mediaType === 'movie'
                                ? `${searchTitle} (${language.toUpperCase()})`
                                : `${searchTitle} - Episode ${episodeNumber} (${language.toUpperCase()})`;

                            streams.push({
                                name: `Reanime ${language.toUpperCase()} HD-${i + 1}`,
                                title: streamTitle,
                                url: extracted.url,
                                quality: "Auto",
                                server: `HD-${i + 1}`,
                                headers: extracted.headers,
                                provider: "reanime",
                                type: "m3u8",
                                subtitles: extracted.subtitles
                            });
                        }
                    } catch (_) {}
                }
            }
        }

        const seen = new Set();
        return streams.filter(s => {
            if (!s.url || seen.has(s.url)) return false;
            seen.add(s.url);
            return true;
        });
    } catch (_) {
        return [];
    }
}

async function getHome() {
    try {
        const [latestRes, popularRes, topRatedRes] = await Promise.allSettled([
            fetchLatestAired(24, "sub"),
            fetchPopular(24, 1),
            fetchTopRated(24, 1)
        ]);

        const sections = [];

        if (latestRes.status === "fulfilled" && latestRes.value) {
            const list = latestRes.value.data || latestRes.value.results || [];
            const items = list.map(toHomeItem).filter(Boolean);
            if (items.length > 0) {
                sections.push({
                    title: "Latest Episodes",
                    items
                });
            }
        }

        if (popularRes.status === "fulfilled" && popularRes.value) {
            const list = popularRes.value.results || popularRes.value.data || [];
            const items = list.map(toHomeItem).filter(Boolean);
            if (items.length > 0) {
                sections.push({
                    title: "Popular Anime",
                    items
                });
            }
        }

        if (topRatedRes.status === "fulfilled" && topRatedRes.value) {
            const list = topRatedRes.value.results || topRatedRes.value.data || [];
            const items = list.map(toHomeItem).filter(Boolean);
            if (items.length > 0) {
                sections.push({
                    title: "Top Rated",
                    items
                });
            }
        }

        return sections;
    } catch (_) {
        return [];
    }
}

async function search(query, page = 1) {
    try {
        if (!query || !query.trim()) return [];
        const res = await searchAnimeApi(query.trim(), page, 36);
        const list = res.results || res.data || [];
        return list.map(toHomeItem).filter(Boolean);
    } catch (_) {
        return [];
    }
}

async function getAnimeInfo(contentId) {
    try {
        if (!contentId) return null;
        let slug = String(contentId).replace(/^reanime:/, '');

        if (slug.startsWith('anilist:') || /^\d+$/.test(slug)) {
            const isAl = slug.startsWith('anilist:');
            const targetId = isAl ? slug.split(':')[1] : slug;
            let title = "";
            let alId = isAl ? targetId : null;
            if (isAl) {
                const alInfo = await getAnilistMediaInfo(targetId);
                title = alInfo.title;
            } else {
                const tmdb = await getTmdbInfo(targetId, "tv");
                title = tmdb.title;
            }
            const candidate = await searchReanimeAnime(title, null, alId);
            if (candidate && candidate.slug) {
                slug = candidate.slug;
            } else {
                return null;
            }
        }

        const details = await fetchAnimeDetails(slug);
        if (!details || !details.anime_id) return null;

        const anilistId = details.anilist_id;

        const [episodesRes, thumbnailsRes, recsRes] = await Promise.allSettled([
            fetchAnimeEpisodes(slug, 2000),
            anilistId ? fetchThumbnails(anilistId) : Promise.resolve(null),
            fetchAnimeRecommendations(slug)
        ]);

        const rawEpisodes = episodesRes.status === "fulfilled" && episodesRes.value ? (episodesRes.value.data || []) : [];
        const thumbnails = thumbnailsRes.status === "fulfilled" ? thumbnailsRes.value : null;
        const recommendations = recsRes.status === "fulfilled" && recsRes.value ? recsRes.value : [];

        const subCount = details.subbed != null ? details.subbed : null;
        const dubCount = details.dubbed != null ? details.dubbed : null;

        const episodes = rawEpisodes.map(ep => {
            const epNum = Math.floor(ep.episode_number || 1);
            const epNumStr = String(epNum);
            const titleStr = ep.title || (ep.title_romanji || `Episode ${epNum}`);
            const hasSub = (subCount == null) || (epNum <= subCount);
            const hasDub = dubCount != null ? (epNum <= dubCount) : false;

            return {
                id: ep.episodeId || `ep-${epNum}`,
                episode: epNum,
                season: 1,
                title: ep.is_recap ? `${titleStr} [Recap]` : titleStr,
                thumbnail: (thumbnails && thumbnails[epNumStr]) || ep.thumbnail || null,
                overview: ep.description || null,
                isFiller: Boolean(ep.is_filler),
                isSub: hasSub,
                isDub: hasDub
            };
        });

        const related = recommendations.map(toHomeItem).filter(Boolean);

        return {
            id: details.anime_id || slug,
            title: details.title?.english || details.title?.romaji || details.title?.native || slug,
            poster: details.cover_image?.extra_large || details.cover_image?.large || details.cover_image?.medium || null,
            banner: details.banner_image || null,
            description: details.description || null,
            totalEpisodes: (episodes.length > 0 ? episodes.length : null) || subCount,
            subEpisodes: subCount,
            dubEpisodes: dubCount,
            ageRating: details.rating || null,
            status: details.status || null,
            genres: details.genres || [],
            year: details.season_year ? String(details.season_year) : null,
            episodes: episodes,
            related: related
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
            description: "Reanime operates across multiple domains. Choose the one currently working for you.",
            options: [
                { label: "reanime.to", value: "https://reanime.to" },
                { label: "reanime.cz", value: "https://reanime.cz" },
                { label: "reanime.wtf", value: "https://reanime.wtf" }
            ],
            defaultValue: "https://reanime.to"
        }
    ];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getStreams,
        getAnimeInfo,
        getDetails: getAnimeInfo,
        getHome,
        getMainPage: getHome,
        search,
        searchAnime: search,
        onSettings
    };
} else {
    global.getStreams = getStreams;
    global.getAnimeInfo = getAnimeInfo;
    global.getDetails = getAnimeInfo;
    global.getHome = getHome;
    global.getMainPage = getHome;
    global.search = search;
    global.searchAnime = search;
    global.onSettings = onSettings;
}
