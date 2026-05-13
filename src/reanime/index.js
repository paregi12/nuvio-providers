import { extractFlixCloud } from './flixcloud.js';
import { getFlixEmbeds, getTmdbInfo, searchReanimeAnime } from './reanime.js';

async function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
    try {
        const episodeNumber = mediaType === "tv" ? Number(episode || 1) : 1;
        const tmdb = await getTmdbInfo(tmdbId, mediaType);
        if (!tmdb.title) return [];

        const anime = await searchReanimeAnime(tmdb.title, tmdb.year);
        if (!anime || !anime.slug) return [];

        const languages = ["sub", "dub"];
        const streams = [];
        for (const language of languages) {
            const { watchUrl, embeds } = await getFlixEmbeds(anime.slug, episodeNumber, language, anime.anilistId);
            for (let i = 0; i < embeds.length; i++) {
                try {
                    const extracted = await extractFlixCloud(embeds[i], watchUrl);
                    const streamTitle = mediaType === 'movie' 
                        ? `${tmdb.title} (${language.toUpperCase()})`
                        : `${tmdb.title} - Episode ${episodeNumber} (${language.toUpperCase()})`;

                    streams.push({
                        name: `Reanime ${language.toUpperCase()} HD-${i + 1}`,
                        title: streamTitle,
                        url: extracted.url,
                        quality: "Auto",
                        headers: extracted.headers,
                        provider: "reanime",
                        type: "m3u8"
                    });
                } catch (error) {
                    console.warn(`[Reanime] FlixCloud extraction failed: ${error.message}`);
                }
            }
        }

        const seen = new Set();
        return streams.filter(stream => {
            if (!stream.url || seen.has(stream.url)) return false;
            seen.add(stream.url);
            return true;
        });
    } catch (error) {
        console.error(`[Reanime] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
