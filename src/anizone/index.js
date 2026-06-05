import cheerio from 'cheerio-without-node-native';
import { fetchText, getImdbId, resolveMapping, getMalTitle } from './utils.js';
import { MAIN_URL, HEADERS } from './constants.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        let animeTitle = "";
        let mappedEp = episode;

        if (mediaType === 'tv') {
            const imdbId = await getImdbId(tmdbId, mediaType);
            if (!imdbId) return [];

            const mapping = await resolveMapping(imdbId, season, episode);
            if (!mapping || !mapping.mal_id) return [];

            mappedEp = mapping.mal_episode || episode;
            animeTitle = await getMalTitle(mapping.mal_id);
        } else {
            const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
            const tmdbRes = await fetch(tmdbUrl);
            const tmdbData = await tmdbRes.json();
            animeTitle = tmdbData.title || tmdbData.original_title;
            mappedEp = 1;
        }

        if (!animeTitle) return [];

        // 1. Search AniZone
        const searchUrl = `/anime?search=${encodeURIComponent(animeTitle)}`;
        const searchHtml = await fetchText(searchUrl);
        const $search = cheerio.load(searchHtml);
        
        let animeSlug = null;
        
        $search('main a').each((i, el) => {
            const href = $search(el).attr('href');
            if (href && (href.startsWith('https://anizone.to/anime/') || href.startsWith('/anime/')) && !animeSlug) {
                const parts = href.split('/');
                animeSlug = parts[parts.length - 1] || parts[parts.length - 2];
            }
        });

        if (!animeSlug) return [];

        // 2. Go to episode page
        const episodeUrl = `/anime/${animeSlug}/${mappedEp}`;
        const episodeHtml = await fetchText(episodeUrl);

        // 3. Extract Stream URL and Subtitles
        const streams = [];
        const $epPage = cheerio.load(episodeHtml);

        // Extract Stream URL from media-player element or fallback to regex
        let masterUrl = $epPage('media-player').attr('src');
        if (!masterUrl) {
            const matches = episodeHtml.match(/https:\/\/[^"']+\/master\.m3u8/);
            if (matches) {
                masterUrl = matches[0];
            }
        }

        // Extract subtitles from track elements
        const subtitles = [];
        $epPage('track').each((i, el) => {
            const src = $epPage(el).attr('src');
            const kind = $epPage(el).attr('kind');
            if (src && (kind === 'subtitles' || kind === 'captions' || src.endsWith('.ass') || src.endsWith('.vtt'))) {
                subtitles.push({
                    url: src,
                    name: $epPage(el).attr('label') || 'English',
                    language: $epPage(el).attr('srclang') || 'en'
                });
            }
        });

        // Determine format (Sub/Dub) from button texts
        let format = "Sub";
        $epPage('button').each((i, el) => {
            const text = $epPage(el).text();
            if (text.includes('Audio:')) {
                const hasJapanese = text.includes('Japanese');
                const hasEnglish = text.includes('English');
                if (hasEnglish && !hasJapanese) format = "Dub";
                else if (hasEnglish && hasJapanese) format = "Sub & Dub";
            }
        });

        if (format === "Sub") {
            $epPage('button[wire\\:click^="setVideo"]').each((i, el) => {
                const btnText = $epPage(el).text();
                const hasJapanese = btnText.includes('Japanese');
                const hasEnglish = btnText.includes('English');
                if (hasEnglish && !hasJapanese) format = "Dub";
                else if (hasEnglish && hasJapanese) format = "Sub & Dub";
            });
        }

        if (masterUrl) {
            streams.push({
                name: "AniZone",
                title: `${animeTitle} - Episode ${mappedEp} [${format}]`,
                url: masterUrl,
                quality: "Multi",
                headers: HEADERS,
                subtitles: subtitles
            });
        }

        return streams;

    } catch (error) {
        return [];
    }
}

module.exports = { getStreams };
