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

        // Find server names and audio info from buttons in the modal
        const serverInfos = [];
        $epPage('button[wire\\:click^="setVideo"]').each((i, el) => {
            const $btn = $epPage(el);
            const serverName = $btn.find('div.text-lg').text().trim() || 'Unknown';
            const btnText = $btn.text();
            
            let format = "Sub";
            const hasJapanese = btnText.includes('Japanese');
            const hasEnglish = btnText.includes('English');
            
            if (hasEnglish && !hasJapanese) format = "Dub";
            else if (hasEnglish && hasJapanese) format = "Sub & Dub";
            
            serverInfos.push({ name: serverName, format: format });
        });

        const m3u8Matches = [...new Set(episodeHtml.match(/https:\/\/[^"']+\/master\.m3u8/g) || [])];
        
        m3u8Matches.forEach((masterUrl, index) => {
            const info = serverInfos[index] || { name: `Server ${index + 1}`, format: "Sub" };
            
            const subtitles = [];
            const assMatches = episodeHtml.matchAll(/id="vds-ass-subtitles-([^"]+)"[^>]+label="([^"]+)"[^>]+srclang="([^"]+)"/g);
            for (const match of assMatches) {
                subtitles.push({
                    url: match[1],
                    name: match[2],
                    language: match[3]
                });
            }

            streams.push({
                name: `AniZone [${info.name}]`,
                title: `${animeTitle} - Episode ${mappedEp} [${info.format}]`,
                url: masterUrl,
                quality: "Multi",
                headers: HEADERS,
                subtitles: subtitles
            });
        });

        return streams;

    } catch (error) {
        return [];
    }
}

module.exports = { getStreams };
