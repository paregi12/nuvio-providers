import cheerio from 'cheerio-without-node-native';
import { 
    fetchJson, 
    fetchText, 
    getImdbId, 
    resolveMapping, 
    getTmdbShowTitle,
    searchMalId
} from './utils.js';
import { MEGAPLAY_BASE, VIDWISH_BASE, MEGACLOUD_BASE, DEFAULT_HEADERS } from './constants.js';

// Concurrently process an API source request and extract the stream details
async function extractSources(apiUrl, referer, origin, serverName, animeTitle, episodeNum, type) {
    try {
        const json = await fetchJson(apiUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': referer,
                'Origin': origin
            }
        });

        const file = json.sources?.file;
        if (!file) return [];

        const streamTitle = `${animeTitle} - Episode ${episodeNum} (${type.toUpperCase()})`;
        const streams = [];

        // Add main stream
        streams.push({
            name: `HiAnime [${serverName}] (${type.toUpperCase()})`,
            title: streamTitle,
            url: file,
            quality: 'Auto',
            headers: {
                ...DEFAULT_HEADERS,
                'Referer': `${origin}/`,
                'Origin': origin
            },
            provider: 'hianime',
            type: 'm3u8'
        });

        // If there are subtitle tracks, include them
        if (json.tracks && json.tracks.length > 0) {
            const subtitles = json.tracks
                .filter(t => t.file && t.kind === 'captions')
                .map(t => ({
                    url: t.file,
                    name: t.label || 'English',
                    language: t.label ? t.label.slice(0, 3).toLowerCase() : 'en'
                }));
            
            streams[0].subtitles = subtitles;
        }

        return streams;
    } catch (e) {
        return [];
    }
}

// Scrape a specific dub/sub type for a MAL ID and Episode
async function scrapeType(malId, episode, type, animeTitle) {
    const streams = [];
    const megaUrl = `${MEGAPLAY_BASE}/stream/mal/${malId}/${episode}/${type}`;

    try {
        const html = await fetchText(megaUrl, {
            headers: { 'Referer': megaUrl }
        });
        const $ = cheerio.load(html);
        const player = $('div.fix-area#megaplay-player');
        if (!player.length) return [];

        const dataId = player.attr('data-id');
        const realId = player.attr('data-realid');

        const extractions = [];

        // 1. Extract from MegaPlay (if data-id exists)
        if (dataId) {
            const apiUrl = `${MEGAPLAY_BASE}/stream/getSources?id=${dataId}&id=${dataId}`;
            extractions.push(
                extractSources(apiUrl, megaUrl, MEGAPLAY_BASE, 'MegaPlay', animeTitle, episode, type)
            );
        }

        // 2. Extract from Vidwish (if real-id exists)
        if (realId) {
            const vidPage = `${VIDWISH_BASE}/stream/s-2/${realId}/${type}`;
            extractions.push((async () => {
                try {
                    const vidHtml = await fetchText(vidPage, { headers: { 'Referer': megaUrl } });
                    const $v = cheerio.load(vidHtml);
                    const vPlayer = $v('div.fix-area#megaplay-player');
                    const vDataId = vPlayer.attr('data-id');
                    if (vDataId) {
                        const apiUrl = `${VIDWISH_BASE}/stream/getSources?id=${vDataId}&id=${vDataId}`;
                        return await extractSources(apiUrl, vidPage, VIDWISH_BASE, 'Vidwish', animeTitle, episode, type);
                    }
                } catch (err) {}
                return [];
            })());
        }

        // 3. Extract from MegaCloud (if real-id exists)
        if (realId) {
            const megacloudPage = `${MEGACLOUD_BASE}/stream/s-3/${realId}/${type}`;
            extractions.push((async () => {
                try {
                    const mcHtml = await fetchText(megacloudPage, { headers: { 'Referer': megaUrl } });
                    const $m = cheerio.load(mcHtml);
                    const mPlayer = $m('div.fix-area#megaplay-player');
                    const mDataId = mPlayer.attr('data-id');
                    if (mDataId) {
                        const apiUrl = `${MEGACLOUD_BASE}/stream/getSources?id=${mDataId}&id=${mDataId}`;
                        return await extractSources(apiUrl, megacloudPage, MEGACLOUD_BASE, 'MegaCloud', animeTitle, episode, type);
                    }
                } catch (err) {}
                return [];
            })());
        }

        const results = await Promise.all(extractions);
        for (const res of results) {
            streams.push(...res);
        }
    } catch (e) {}

    return streams;
}

async function onSettings() {
    return [
        { type: "header", label: "Stream Preferences" },
        { 
            type: "select", 
            key: "subDub", 
            label: "Audio/Subtitle Preference",
            options: [
                { label: "Sub & Dub", value: "both" },
                { label: "Sub Only", value: "sub" },
                { label: "Dub Only", value: "dub" }
            ],
            defaultValue: "both"
        }
    ];
}

async function getStreams(tmdbId, mediaType = 'tv', season = 1, episode = 1) {
    try {
        let malId = null;
        let mappedEp = episode;
        let showTitle = '';

        // --- STEP 1: RESOLVE MAL ID AND MAPPED EPISODE ---
        const imdbId = await getImdbId(tmdbId, mediaType);
        showTitle = await getTmdbShowTitle(tmdbId, mediaType) || (mediaType === 'movie' ? 'Movie' : 'Anime');

        if (!imdbId) return [];

        const s = mediaType === 'movie' ? 1 : season;
        const e = mediaType === 'movie' ? 1 : episode;

        // Try Jikan first for movies (search by title)
        if (mediaType === 'movie') {
            malId = await searchMalId(showTitle, 'movie');
            mappedEp = 1;
        }

        // Fallback to Mapping API for series or if movie search failed
        if (!malId) {
            const mapping = await resolveMapping(imdbId, s, e);
            if (mapping && mapping.mal_id) {
                malId = mapping.mal_id;
                mappedEp = mediaType === 'movie' ? 1 : (mapping.mal_episode || episode);
            }
        }

        if (!malId) return [];

        // --- STEP 2: SCRAPE STREAMS (RESPECT SETTINGS) ---
        const settings = globalThis.SCRAPER_SETTINGS || {};
        const preference = settings.subDub || "both";

        let allStreams = [];
        if (preference === "both") {
            const [subStreams, dubStreams] = await Promise.all([
                scrapeType(malId, mappedEp, 'sub', showTitle),
                scrapeType(malId, mappedEp, 'dub', showTitle)
            ]);
            allStreams = [...subStreams, ...dubStreams];
        } else {
            allStreams = await scrapeType(malId, mappedEp, preference, showTitle);
        }

        // Clean duplicates
        const seen = new Set();
        return allStreams.filter(s => {
            if (seen.has(s.url)) return false;
            seen.add(s.url);
            return true;
        });

    } catch (e) {
        return [];
    }
}

module.exports = { getStreams, onSettings };
