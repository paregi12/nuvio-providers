import { PLATFORM_MAP, TMDB_API_KEY } from './constants.js';
import { resolveApiUrl, buildNewTvHeaders } from './utils.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        const settings = globalThis.SCRAPER_SETTINGS || {};
        const preferred = settings.preferredPlatform || "all";

        const tmdbType = mediaType === 'tv' ? 'tv' : 'movie';
        const tmdbResp = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}`, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });
        const tmdbData = await tmdbResp.json();
        const title = mediaType === 'tv' ? tmdbData.name : tmdbData.title;

        if (!title) throw new Error("Could not fetch title from TMDB");

        let platforms = ['netflix', 'primevideo', 'hotstar', 'disney'];
        if (preferred !== 'all') {
            platforms = [preferred, ...platforms.filter(p => p !== preferred)];
        }

        for (const platformKey of platforms) {
            try {
                let streams = [];
                if (platformKey === 'netflix') {
                    streams = await fetchFromNetflixDirect(tmdbId, mediaType, season, episode, title);
                }
                if (!streams || streams.length === 0) {
                    streams = await fetchFromPlatform(platformKey, title, mediaType, season, episode);
                }
                if (streams && streams.length > 0) return streams;
            } catch (e) {
                // Try next platform
            }
        }

        return [];
    } catch (error) {
        return [];
    }
}

async function fetchFromNetflixDirect(tmdbId, mediaType, season, episode, title) {
    try {
        const apiUrl = mediaType === 'tv'
            ? `https://net27.cc/api/embed-tmdb/${tmdbId}?type=tv&s=${season}&e=${episode}`
            : `https://net27.cc/api/embed-tmdb/${tmdbId}`;

        const response = await fetch(apiUrl, {
            headers: {
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://net27.cc/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
            }
        });
        if (!response.ok) return null;

        const data = await response.json();
        if (data.ok !== true) return null;

        const playbackHeaders = {
            "Referer": "https://videodownloader.site/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
        };

        const formattedSubtitles = (data.captions || []).map(caption => {
            let url = caption.url;
            if (url.startsWith('/')) {
                url = `https://net27.cc${url}`;
            }
            return {
                url: url,
                language: caption.lang || 'en',
                name: caption.name || 'English',
                headers: playbackHeaders
            };
        });

        const streams = [];
        if (data.streams && data.streams.length > 0) {
            data.streams.forEach(stream => {
                streams.push({
                    name: `NetMirror (Netflix) - ${stream.resolution}p`,
                    title: `${title}`,
                    url: stream.url,
                    quality: `${stream.resolution}p`,
                    headers: playbackHeaders,
                    subtitles: formattedSubtitles,
                    provider: "netmirror"
                });
            });
        } else if (data.mp4) {
            streams.push({
                name: `NetMirror (Netflix) - Auto`,
                title: `${title}`,
                url: data.mp4,
                quality: `Auto`,
                headers: playbackHeaders,
                subtitles: formattedSubtitles,
                provider: "netmirror"
            });
        }

        return streams;
    } catch (e) {
        console.error("[NetMirror] Direct API error:", e.message);
        return null;
    }
}

async function fetchFromPlatform(platformKey, title, mediaType, season, episode) {
    const platform = PLATFORM_MAP[platformKey];
    const apiBase = await resolveApiUrl();

    const searchUrl = `${apiBase}/newtv/search.php?s=${encodeURIComponent(title)}`;
    const searchResp = await fetch(searchUrl, {
        headers: buildNewTvHeaders(platform.ott)
    });
    const searchData = await searchResp.json();

    if (!searchData.searchResult || searchData.searchResult.length === 0) return null;

    const result = searchData.searchResult[0];
    const contentId = result.id;

    const postUrl = `${apiBase}/newtv/post.php?id=${contentId}`;
    const postResp = await fetch(postUrl, {
        headers: buildNewTvHeaders(platform.ott, { Lastep: "", Usertoken: "" })
    });
    const postData = await postResp.json();

    let targetId = contentId;
    if (mediaType === 'tv') {
        const episodes = await getAllEpisodes(contentId, postData, platform, apiBase);
        const targetEp = episodes.find(ep => ep && ep.s === season && ep.ep === episode);

        if (targetEp) {
            targetId = targetEp.id;
        } else {
            return null;
        }
    } else {
        const isSeries = postData.type === 't' || (postData.episodes && postData.episodes.filter(e => e !== null).length > 0);
        if (isSeries) return null;
        targetId = postData.main_id || contentId;
    }

    const playerUrl = `${apiBase}/newtv/player.php?id=${targetId}`;
    const playerResp = await fetch(playerUrl, {
        headers: buildNewTvHeaders(platform.ott, { 'Usertoken': '' })
    });
    const response = await playerResp.json();

    if (response.status === 'ok' && response.video_link) {
        return [{
            name: `NetMirror (${platformKey.charAt(0).toUpperCase() + platformKey.slice(1)})`,
            title: `${title}`,
            url: response.video_link,
            quality: 'Auto',
            headers: { 
                Referer: response.referer || apiBase
            }
        }];
    }

    return null;
}

async function getAllEpisodes(contentId, postData, platform, apiBase) {
    const episodes = [];
    const selectedSeasonIdx = postData.season ? postData.season.findIndex(s => s.selected === true) : -1;
    const selectedSeasonId = selectedSeasonIdx >= 0 ? postData.season[selectedSeasonIdx].id : postData.nextPageSeason;
    const selectedSeasonNumber = selectedSeasonIdx >= 0 ? (selectedSeasonIdx + 1) : null;

    if (postData.episodes) {
        postData.episodes.filter(e => e !== null).forEach(ep => {
            const epNum = ep.ep ? parseInt(ep.ep) : (ep.epNum ? parseInt(ep.epNum.replace('E', '')) : null);
            const sNum = selectedSeasonNumber || (ep.sNum ? parseInt(ep.sNum.replace('S', '')) : null);
            episodes.push({
                id: ep.id,
                s: sNum,
                ep: epNum
            });
        });
    }

    if (postData.nextPageShow === 1 && selectedSeasonId) {
        const more = await fetchEpisodesPage(contentId, selectedSeasonId, 2, selectedSeasonNumber, platform, apiBase);
        episodes.push(...more);
    }

    if (postData.season) {
        for (let index = 0; index < postData.season.length; index++) {
            const season = postData.season[index];
            if (season.id !== selectedSeasonId && season.id) {
                const more = await fetchEpisodesPage(contentId, season.id, 1, index + 1, platform, apiBase);
                episodes.push(...more);
            }
        }
    }

    return episodes;
}

async function fetchEpisodesPage(contentId, seasonId, page, seasonNumber, platform, apiBase) {
    const episodes = [];
    let pg = page;
    while (true) {
        const url = `${apiBase}/newtv/episodes.php?id=${seasonId}&page=${pg}`;
        const resp = await fetch(url, {
            headers: buildNewTvHeaders(platform.ott)
        });
        const data = await resp.json();
        if (data.episodes) {
            data.episodes.filter(e => e !== null).forEach(ep => {
                const epNum = ep.ep ? parseInt(ep.ep) : (ep.epNum ? parseInt(ep.epNum.replace('E', '')) : null);
                const sNum = seasonNumber || (ep.sNum ? parseInt(ep.sNum.replace('S', '')) : null);
                episodes.push({
                    id: ep.id,
                    s: sNum,
                    ep: epNum
                });
            });
        }
        if (data.nextPageShow !== 1) break;
        pg++;
    }
    return episodes;
}

async function onSettings() {
    return [
        { type: "header", label: "Source Selection" },
        {
            type: "select",
            key: "preferredPlatform",
            label: "Preferred Streaming Source",
            description: "Select which platform to try first. If content isn't found, others will be searched as fallback.",
            options: [
                { label: "All Sources (Ordered)", value: "all" },
                { label: "Netflix", value: "netflix" },
                { label: "Prime Video", value: "primevideo" },
                { label: "Hotstar / Disney+", value: "hotstar" }
            ],
            defaultValue: "all"
        },
        { type: "header", label: "Advanced" },
        {
            type: "toggle",
            key: "forceHd",
            label: "Force HD Quality",
            description: "Attempts to force the player into HD mode when possible.",
            defaultValue: true
        }
    ];
}

module.exports = { getStreams, onSettings };
