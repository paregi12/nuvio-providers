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

        // 1. Get Info
        const tmdb = await getTmdbInfo(tmdbId, mediaType);
        if (!tmdb) return [];
        const { title, year } = tmdb;
        console.log(`[UniqueStream] Processing: ${title} (${year}) S${season}E${episode} (${mediaType})`);

        // 2. Search
        const searchUrl = `${API_URL}/search?page=1&query=${encodeURIComponent(title)}&t=all&limit=20`;
        const searchData = await fetchJson(searchUrl);
        
        const results = [
            ...(searchData.series || []),
            ...(searchData.movies || []),
            ...(searchData.episodes || []) // Some movies are listed as episodes
        ];

        if (results.length === 0) {
            console.log("[UniqueStream] No results found.");
            return [];
        }

        // 3. Match Series/Movie/Episode
        // Prioritize exact title matches
        let anime = results.find(a => a.title.toLowerCase() === title.toLowerCase());
        if (!anime) anime = results.find(a => a.title.toLowerCase().includes(title.toLowerCase()));
        if (!anime) anime = results[0];
        
        console.log(`[UniqueStream] Selected: ${anime.title} (${anime.content_id}) [Type: ${anime.type}]`);

        let targetEp = null;
        let endpointType = "episode";
        let audioLocales = ["ja-JP", "en-US"];

        if (anime.type === 'movie' || anime.type === 'episode') {
            // Direct content
            targetEp = anime;
            endpointType = anime.type;
        } else {
            // It's a show (series)
            
            // 4. Get Details
            const seriesUrl = `${API_URL}/series/${anime.content_id}`;
            const seriesData = await fetchJson(seriesUrl);

            if (!seriesData || !seriesData.seasons) {
                 console.log("[UniqueStream] No seasons found.");
                 return [];
            }
            
            audioLocales = seriesData.audio_locales || ["ja-JP", "en-US"];
            
            // 5. Match Season
            const targetSeasonStr = season.toString();
            let matchingSeasons = seriesData.seasons.filter(s => s.display_number === targetSeasonStr);
            
            if (matchingSeasons.length === 0 && (season === 1 || mediaType === 'movie')) {
                matchingSeasons = seriesData.seasons.filter(s => !s.display_number);
            }

            if (matchingSeasons.length === 0) {
                console.log(`[UniqueStream] Season ${season} not found.`);
                return [];
            }

            const selectedSeason = matchingSeasons[0];
            console.log(`[UniqueStream] Selected Season: ${selectedSeason.title} (${selectedSeason.content_id})`);

            // Offset calculation
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
            console.log(`[UniqueStream] Target Absolute Ep: ${targetAbsoluteEp} (Relative: ${episode})`);

            // 6. Get Episodes
            let page = Math.ceil(episode / 20);
            let limit = 20;

            const fetchEpisodes = async (p) => {
                const u = `${API_URL}/season/${selectedSeason.content_id}/episodes?page=${p}&limit=${limit}&order_by=asc`;
                return await fetchJson(u);
            };

            let epsData = await fetchEpisodes(page);
            
            // 7. Find Episode
            const isMatch = (e) => (
                e.episode_number == targetAbsoluteEp || 
                e.episode_number == episode || 
                (mediaType === 'movie' && e.episode_number == 0)
            );

            targetEp = epsData.find(isMatch);

            if (!targetEp) {
                console.log("[UniqueStream] Episode not found on estimated page. scanning adjacent...");
                if (page > 1) {
                    const prevData = await fetchEpisodes(page - 1);
                    targetEp = prevData.find(isMatch);
                }
                if (!targetEp) {
                    const nextData = await fetchEpisodes(page + 1);
                    targetEp = nextData.find(isMatch);
                }
            }
            
            if (targetEp) {
                 console.log(`[UniqueStream] Found Episode: ${targetEp.title} (${targetEp.content_id})`);
            }
        }

        if (!targetEp) {
             console.log(`[UniqueStream] Content not found.`);
             return [];
        }
        
        // 8. Get Streams
        const streams = [];
        const processedUrls = new Set();
        const endpoints = new Set(audioLocales);
        endpoints.add('ja-JP');
        endpoints.add('en-US');
        
        const promises = Array.from(endpoints).map(async (locale) => {
            try {
                const mediaUrl = `${API_URL}/${endpointType}/${targetEp.content_id}/media/hls/${locale}`;
                const mediaData = await fetchJson(mediaUrl);
                processMediaData(mediaData, streams, processedUrls);
            } catch (e) {
                // Ignore
            }
        });
        
        await Promise.all(promises);

        return streams;

    } catch (error) {
        console.error(`[UniqueStream] Error: ${error.message}`);
        return [];
    }
}

function processMediaData(data, streams, processedUrls) {
    if (!data) return;

    const processHlsObj = (hls) => {
        if (!hls) return;
        const headers = {
            "Origin": "https://anime.uniquestream.net",
            "Referer": "https://anime.uniquestream.net/"
        };
        const locale = hls.locale;
        
        if (hls.playlist && !processedUrls.has(hls.playlist)) {
            processedUrls.add(hls.playlist);
            let title = `UniqueStream Dub (${getLangName(locale)})`;
            if (locale === 'ja-JP') title = `UniqueStream Raw (${getLangName(locale)})`;
            
            streams.push({
                name: "UniqueStream",
                title: title,
                url: hls.playlist,
                quality: "Auto",
                type: "hls",
                headers: headers
            });
        }
        
        if (hls.hard_subs) {
            hls.hard_subs.forEach(sub => {
                if (sub.playlist && !processedUrls.has(sub.playlist)) {
                    processedUrls.add(sub.playlist);
                    streams.push({
                        name: "UniqueStream",
                        title: `UniqueStream Sub (${getLangName(sub.locale)})`,
                        url: sub.playlist,
                        quality: "Auto",
                        type: "hls",
                        headers: headers
                    });
                }
            });
        }
    };

    if (data.hls) processHlsObj(data.hls);
    if (data.versions && data.versions.hls) {
        data.versions.hls.forEach(processHlsObj);
    }
}

module.exports = { getStreams };