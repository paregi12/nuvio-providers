import { getFlixEmbeds, getTmdbInfo, searchReanimeAnime, getSyncInfo, resolveByDate } from './reanime.js';
import { extractFlixCloud } from './flixcloud.js';

async function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
    try {
        if (mediaType !== 'tv' && mediaType !== 'movie') return [];

        let alId = null;
        let episodeNumber = mediaType === "tv" ? Number(episode || 1) : 1;
        let searchTitle = "";
        let searchYear = null;

        // Step 1: Resolve Metadata + Verified AniList ID (AnimeKai Logic)
        if (typeof tmdbId === 'string' && tmdbId.indexOf('anilist:') === 0) {
            alId = tmdbId.split(':')[1];
            // We don't have a title for search, we'll need to fetch it from AniList or TMDB
            const tmdb = await getTmdbInfo(alId, mediaType); // Fallback: try using alId as tmdbId if possible or just get info
            searchTitle = tmdb.title;
            searchYear = tmdb.year;
        } else {
            console.log(`[Reanime] Resolving sync info for TMDB ${tmdbId}...`);
            const syncInfo = await getSyncInfo(tmdbId, mediaType, season, episodeNumber);
            searchTitle = syncInfo.title;
            
            const syncResult = await resolveByDate(syncInfo.releaseDate, syncInfo.title, episodeNumber, syncInfo.episodeTitle, syncInfo.dayIndex);
            if (syncResult && syncResult.alId) {
                alId = String(syncResult.alId);
                episodeNumber = syncResult.episode;
                searchTitle = syncResult.title;
                console.log(`[Reanime] Verified AniList ID: ${alId}, Episode: ${episodeNumber}`);
            } else {
                console.warn(`[Reanime] Could not verify AniList ID via air-date. Falling back to basic search.`);
                const tmdb = await getTmdbInfo(tmdbId, mediaType);
                searchTitle = tmdb.title;
                searchYear = tmdb.year;
            }
        }

        // Step 2: Search Reanime with verified info
        const anime = await searchReanimeAnime(searchTitle, searchYear, alId);
        if (!anime || !anime.slug) return [];

        const languages = ["sub", "dub"];
        const streams = [];

        for (const language of languages) {
            const { watchUrl, embeds } = await getFlixEmbeds(anime.slug, episodeNumber, language, alId || anime.anilistId);
            for (let i = 0; i < embeds.length; i++) {
                try {
                    console.log(`[Reanime] Extracting locally: ${embeds[i]}`);
                    const extracted = await extractFlixCloud(embeds[i], watchUrl);
                    
                    console.log(`[Reanime] Successfully extracted: ${extracted.url}`);
                    const streamTitle = mediaType === 'movie' 
                        ? `${searchTitle} (${language.toUpperCase()})`
                        : `${searchTitle} - Episode ${episodeNumber} (${language.toUpperCase()})`;

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
                    console.warn(`[Reanime] Local extraction failed: ${error.message}`);
                }
            }
        }

        // Add Debug Header stream
        streams.push({
            name: "DEBUG: Check Headers",
            title: "Header Spy (Webhook)",
            url: "https://webhook.site/862f6368-b7b0-4c43-a773-783e3e6a3539/spy",
            quality: "DEBUG",
            headers: {
                "Referer": "https://flixcloud.cc/",
                "Origin": "https://flixcloud.cc"
            },
            provider: "reanime",
            type: "mp4" // Change to mp4 to avoid m3u8 validation
        });

        const seen = new Set();
        return streams.filter(stream => {
            if (!stream.url || seen.has(stream.url)) return false;
            seen.add(stream.url);
            return true;
        });
    } catch (error) {
        console.error(`[Reanime] Error: ${error.message}`);
        if (error.stack) console.error(error.stack);
        return [];
    }
}

module.exports = { getStreams };
