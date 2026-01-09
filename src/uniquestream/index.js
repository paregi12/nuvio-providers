import { getTmdbInfo } from './tmdb.js';
import { fetchJson, fetchText } from './http.js';
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

async function resolveHlsVariants(masterUrl, headers) {
    try {
        console.log(`[UniqueStream] Resolving variants for: ${masterUrl}`);
        const content = await fetchText(masterUrl, { headers });
        const lines = content.split('\n');
        const variants = [];
        let currentInfo = null;

        const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf('/') + 1);

        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('#EXT-X-STREAM-INF:')) {
                const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
                currentInfo = {
                    resolution: resolutionMatch ? resolutionMatch[1] : "Unknown"
                };
            } else if (line && !line.startsWith('#') && currentInfo) {
                const fullUrl = line.startsWith('http') ? line : baseUrl + line;
                variants.push({
                    url: fullUrl,
                    quality: currentInfo.resolution !== "Unknown" ? currentInfo.resolution.split('x')[1] + 'p' : "Auto"
                });
                currentInfo = null;
            }
        }
        return variants;
    } catch (e) {
        console.error(`[UniqueStream] Failed to resolve variants: ${e.message}`);
        return [];
    }
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
            ...(searchData.episodes || [])
        ];

        if (results.length === 0) {
            console.log("[UniqueStream] No results found.");
            return [];
        }

        // 3. Match Series/Movie/Episode
        let anime = results.find(a => a.title.toLowerCase() === title.toLowerCase());
        if (!anime) anime = results.find(a => a.title.toLowerCase().includes(title.toLowerCase()));
        if (!anime) anime = results[0];
        
        console.log(`[UniqueStream] Selected: ${anime.title} (${anime.content_id}) [Type: ${anime.type}]`);

        let targetEp = null;
        let endpointType = "episode";
        let audioLocales = ["ja-JP", "en-US"];

        if (anime.type === 'movie' || anime.type === 'episode') {
            targetEp = anime;
            endpointType = anime.type;
        } else {
            const seriesUrl = `${API_URL}/series/${anime.content_id}`;
            const seriesData = await fetchJson(seriesUrl);

            if (!seriesData || !seriesData.seasons) {
                 console.log("[UniqueStream] No seasons found.");
                 return [];
            }
            
            audioLocales = seriesData.audio_locales || ["ja-JP", "en-US"];
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

            let page = Math.ceil(episode / 20);
            let limit = 20;

            const fetchEpisodes = async (p) => {
                const u = `${API_URL}/season/${selectedSeason.content_id}/episodes?page=${p}&limit=${limit}&order_by=asc`;
                return await fetchJson(u);
            };

            let epsData = await fetchEpisodes(page);
            const isMatch = (e) => (
                e.episode_number == targetAbsoluteEp || 
                e.episode_number == episode || 
                (mediaType === 'movie' && e.episode_number == 0)
            );

            targetEp = epsData.find(isMatch);

            if (!targetEp) {
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
        
        for (const locale of endpoints) {
            try {
                const mediaUrl = `${API_URL}/${endpointType}/${targetEp.content_id}/media/hls/${locale}`;
                const mediaData = await fetchJson(mediaUrl);
                await processMediaData(mediaData, streams, processedUrls);
            } catch (e) {
                // Ignore failures
            }
        }

        return streams;

    } catch (error) {
        console.error(`[UniqueStream] Error: ${error.message}`);
        return [];
    }
}

async function processMediaData(data, streams, processedUrls) {
    if (!data) return;

    const headers = {
        "Origin": "https://anime.uniquestream.net",
        "Referer": "https://anime.uniquestream.net/"
    };

    const handleHls = async (hls) => {
        if (!hls) return;
        const locale = hls.locale;
        const langName = getLangName(locale);
        
        // 1. Resolve Master Playlist into Variants
        if (hls.playlist && hls.playlist.includes('master.m3u8')) {
            if (!processedUrls.has(hls.playlist)) {
                processedUrls.add(hls.playlist);
                const variants = await resolveHlsVariants(hls.playlist, headers);
                if (variants.length > 0) {
                    variants.forEach(v => {
                        let title = `UniqueStream Dub (${langName}) [${v.quality}]`;
                        if (locale === 'ja-JP') title = `UniqueStream Raw (${langName}) [${v.quality}]`;
                        
                        streams.push({
                            name: "UniqueStream",
                            title: title,
                            url: v.url,
                            quality: v.quality,
                            type: "hls",
                            headers: headers
                        });
                    });
                } else {
                    // Fallback to master if resolution failed
                    streams.push({
                        name: "UniqueStream",
                        title: `UniqueStream (${langName}) [Master]`,
                        url: hls.playlist,
                        quality: "Auto",
                        type: "hls",
                        headers: headers
                    });
                }
            }
        }
        
        // 2. Handle Hard Subs
        if (hls.hard_subs) {
            for (const sub of hls.hard_subs) {
                if (sub.playlist && !processedUrls.has(sub.playlist)) {
                    processedUrls.add(sub.playlist);
                    
                    if (sub.playlist.includes('master.m3u8')) {
                        const variants = await resolveHlsVariants(sub.playlist, headers);
                        if (variants.length > 0) {
                            variants.forEach(v => {
                                streams.push({
                                    name: "UniqueStream",
                                    title: `UniqueStream Sub (${getLangName(sub.locale)}) [${v.quality}]`,
                                    url: v.url,
                                    quality: v.quality,
                                    type: "hls",
                                    headers: headers
                                });
                            });
                        } else {
                            streams.push({
                                name: "UniqueStream",
                                title: `UniqueStream Sub (${getLangName(sub.locale)}) [Master]`,
                                url: sub.playlist,
                                quality: "Auto",
                                type: "hls",
                                headers: headers
                            });
                        }
                    } else {
                        streams.push({
                            name: "UniqueStream",
                            title: `UniqueStream Sub (${getLangName(sub.locale)})`,
                            url: sub.playlist,
                            quality: "Auto",
                            type: "hls",
                            headers: headers
                        });
                    }
                }
            }
        }
    };

    if (data.hls) await handleHls(data.hls);
    if (data.versions && data.versions.hls) {
        for (const vHls of data.versions.hls) {
            await handleHls(vHls);
        }
    }
}

module.exports = { getStreams };
