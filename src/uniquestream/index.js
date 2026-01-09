import { getTmdbInfo } from './tmdb.js';
import { fetchJson } from './http.js';
import { API_URL } from './constants.js';

const LOCALE_MAP = {
    'en-US': 'English',
    'es-419': 'Spanish (LatAm)',
    'es-ES': 'Spanish',
    'pt-BR': 'Portuguese',
    'fr-FR': 'French',
    'de-DE': 'German',
    'it-IT': 'Italian',
    'ru-RU': 'Russian',
    'ja-JP': 'Japanese'
};

function getLangName(locale) {
    return LOCALE_MAP[locale] || locale;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        if (!season) season = 1;
        if (!episode) episode = 1;

        const tmdb = await getTmdbInfo(tmdbId, mediaType);
        if (!tmdb) return [];
        const { title, year } = tmdb;
        console.log(`[UniqueStream] Processing: ${title} (${year}) S${season}E${episode} (${mediaType})`);

        const searchUrl = `${API_URL}/search?page=1&query=${encodeURIComponent(title)}&t=all&limit=20`;
        const searchData = await fetchJson(searchUrl);
        
        const results = [
            ...(searchData.series || []),
            ...(searchData.movies || []),
            ...(searchData.episodes || [])
        ];

        if (results.length === 0) return [];

        let anime = results.find(a => a.title.toLowerCase() === title.toLowerCase());
        if (!anime) anime = results.find(a => a.title.toLowerCase().includes(title.toLowerCase()));
        if (!anime) anime = results[0];
        
        console.log(`[UniqueStream] Selected: ${anime.title} [Type: ${anime.type}]`);

        let targetEp = null;
        let endpointType = "episode";

        if (anime.type === 'movie' || anime.type === 'episode') {
            targetEp = anime;
            endpointType = anime.type;
        } else {
            const seriesUrl = `${API_URL}/series/${anime.content_id}`;
            const seriesData = await fetchJson(seriesUrl);
            if (!seriesData || !seriesData.seasons) return [];
            
            const targetSeasonStr = season.toString();
            let matchingSeasons = seriesData.seasons.filter(s => s.display_number === targetSeasonStr);
            if (matchingSeasons.length === 0 && (season === 1 || mediaType === 'movie')) {
                matchingSeasons = seriesData.seasons.filter(s => !s.display_number);
            }
            if (matchingSeasons.length === 0) return [];

            const selectedSeason = matchingSeasons[0];
            let absoluteOffset = 0;
            const processedDisplays = new Set();
            seriesData.seasons.filter(s => {
                const dn = parseInt(s.display_number);
                return !isNaN(dn) && dn < season;
            }).forEach(s => {
                if (!processedDisplays.has(s.display_number)) {
                    absoluteOffset += s.episode_count;
                    processedDisplays.add(s.display_number);
                }
            });

            const targetAbsoluteEp = absoluteOffset + episode;
            let page = Math.ceil(episode / 20);
            
            const fetchEpisodes = async (p) => {
                const u = `${API_URL}/season/${selectedSeason.content_id}/episodes?page=${p}&limit=20&order_by=asc`;
                return await fetchJson(u);
            };

            let epsData = await fetchEpisodes(page);
            const isMatch = (e) => (e.episode_number == targetAbsoluteEp || e.episode_number == episode || (mediaType === 'movie' && e.episode_number == 0));
            targetEp = epsData.find(isMatch);

            if (!targetEp) {
                if (page > 1) targetEp = (await fetchEpisodes(page - 1)).find(isMatch);
                if (!targetEp) targetEp = (await fetchEpisodes(page + 1)).find(isMatch);
            }
        }

        if (!targetEp) return [];
        
        const streams = [];
        const processedUrls = new Set();
        
        // Fetch locales
        const endpoints = ['ja-JP', 'en-US'];
        for (const locale of endpoints) {
            try {
                const mediaUrl = `${API_URL}/${endpointType}/${targetEp.content_id}/media/hls/${locale}`;
                const mediaData = await fetchJson(mediaUrl);
                processMediaData(mediaData, streams, processedUrls);
            } catch (e) {}
        }

        return streams.sort((a, b) => {
            const getScore = (s) => {
                let score = 0;
                const t = s.title.toLowerCase();
                if (t.includes('english')) score += 100;
                if (t.includes('japanese') || t.includes('raw')) score += 50;
                return score;
            };
            return getScore(b) - getScore(a);
        });

    } catch (error) {
        console.error(`[UniqueStream] Error: ${error.message}`);
        return [];
    }
}

function processMediaData(data, streams, processedUrls) {
    if (!data) return;

    const headers = {
        "Origin": "https://anime.uniquestream.net",
        "Referer": "https://anime.uniquestream.net/"
    };

    const handleHls = (hls) => {
        if (!hls) return;
        const locale = hls.locale;
        const langName = getLangName(locale);
        
        const addStream = (url, isSub, subLocale) => {
            if (!url || processedUrls.has(url)) return;
            processedUrls.add(url);

            let title = isSub ? `UniqueStream Sub (${getLangName(subLocale)})` : 
                       (locale === 'ja-JP' ? `UniqueStream Raw (${langName})` : `UniqueStream Dub (${langName})`);
            
            streams.push({
                name: "UniqueStream",
                title: `${title} [Multi-Quality]`,
                url: url,
                quality: "Auto",
                type: "hls",
                headers: headers
            });
        };

        if (hls.playlist) addStream(hls.playlist, false);
        if (hls.hard_subs) {
            hls.hard_subs.forEach(sub => addStream(sub.playlist, true, sub.locale));
        }
    };

    if (data.hls) handleHls(data.hls);
    if (data.versions && data.versions.hls) {
        data.versions.hls.forEach(handleHls);
    }
}

module.exports = { getStreams };
