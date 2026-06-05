import cheerio from 'cheerio-without-node-native';
import { fetchText, getImdbId, resolveMapping, getMalTitle } from './utils.js';
import { MAIN_URL, HEADERS } from './constants.js';

function extractCardInfo($, el) {
    const href = $(el).find('a[href*="/anime/"]').first().attr('href');
    if (!href) return null;
    
    const parts = href.split('/');
    const slug = parts[parts.length - 1] || parts[parts.length - 2];
    
    const xData = $(el).attr('x-data') || '';
    
    const defaultTitleMatch = xData.match(/window\.getTitle\(this\.anmTitles,\s*'([^']+)'\)/);
    const defaultTitle = defaultTitleMatch ? defaultTitleMatch[1] : '';
    
    const titles = new Set();
    if (defaultTitle) titles.add(defaultTitle);
    
    const jsonMatch = xData.match(/JSON\.parse\('([^']+)'\)/);
    if (jsonMatch) {
        try {
            const jsonStr = jsonMatch[1].replace(/\\\\/g, '\\')
                                         .replace(/\\u([0-9a-fA-F]{4})/g, (m, grp) => String.fromCharCode(parseInt(grp, 16)))
                                         .replace(/\\'/g, "'");
            const parsed = JSON.parse(jsonStr);
            Object.values(parsed).forEach(t => {
                if (t) titles.add(t);
            });
        } catch (e) {
            // ignore
        }
    }
    
    return {
        slug,
        titles: Array.from(titles)
    };
}

function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function getSeasonRegexes(season) {
    if (season === 1) {
        return {
            mustNot: [/season\s*[2-9]/i, /[\s\-][iI]{2,}/, /\s+[2-9]nd/i, /\s+[2-9]rd/i, /\s+[2-9]th/i, /\s+ii/i, /\s+iii/i, /\s+iv/i, /\s+v/i]
        };
    }
    const patterns = [];
    if (season === 2) {
        patterns.push(/season\s*2/i, /2nd\s*season/i, /[\s\-]ii\b/i, /\b2\b/);
    } else if (season === 3) {
        patterns.push(/season\s*3/i, /3rd\s*season/i, /[\s\-]iii\b/i, /\b3\b/);
    } else if (season === 4) {
        patterns.push(/season\s*4/i, /4th\s*season/i, /[\s\-]iv\b/i, /\b4\b/);
    } else {
        patterns.push(new RegExp(`season\\s*${season}`, 'i'), new RegExp(`\\b${season}\\b`));
    }
    return { must: patterns };
}

function matchCard(cards, jikanTitle, baseTitle, season) {
    const normalizedJikan = normalize(jikanTitle);
    const normalizedJikanNoSub = normalize(jikanTitle.split(':')[0]);
    const normalizedBase = normalize(baseTitle);

    // Level 1: Match Jikan title exactly (normalized)
    for (const card of cards) {
        for (const title of card.titles) {
            const normTitle = normalize(title);
            const normTitleNoSub = normalize(title.split(':')[0]);
            if (normTitle === normalizedJikan || normTitleNoSub === normalizedJikanNoSub) {
                return card.slug;
            }
        }
    }

    // Level 2: Heuristic matching using baseTitle and season indicator
    const seasonRules = getSeasonRegexes(season);
    for (const card of cards) {
        let matchesBase = false;
        for (const title of card.titles) {
            if (normalize(title).includes(normalizedBase)) {
                matchesBase = true;
                break;
            }
        }
        if (!matchesBase) continue;

        let seasonMatches = false;
        if (season === 1) {
            let hasOtherSeason = false;
            for (const title of card.titles) {
                if (seasonRules.mustNot.some(regex => regex.test(title))) {
                    hasOtherSeason = true;
                    break;
                }
            }
            if (!hasOtherSeason) seasonMatches = true;
        } else {
            for (const title of card.titles) {
                if (seasonRules.must.some(regex => regex.test(title))) {
                    seasonMatches = true;
                    break;
                }
            }
        }

        if (seasonMatches) return card.slug;
    }

    return null;
}

function matchMovieCard(cards, targetTitle) {
    const normTarget = normalize(targetTitle);
    for (const card of cards) {
        for (const title of card.titles) {
            if (normalize(title) === normTarget) return card.slug;
        }
    }
    for (const card of cards) {
        for (const title of card.titles) {
            if (normalize(title).includes(normTarget) || normTarget.includes(normalize(title))) return card.slug;
        }
    }
    return cards[0].slug;
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        let animeTitle = "";
        let mappedEp = episode;
        let mapping = null;

        if (mediaType === 'tv') {
            const imdbId = await getImdbId(tmdbId, mediaType);
            if (!imdbId) return [];

            mapping = await resolveMapping(imdbId, season, episode);
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

        // Determine Search Query
        let searchQuery = animeTitle;
        if (mediaType === 'tv' && mapping) {
            searchQuery = mapping.anime_title || animeTitle.split(':')[0].trim();
        } else {
            searchQuery = animeTitle.split(':')[0].trim();
        }

        // 1. Search AniZone
        const searchUrl = `/anime?search=${encodeURIComponent(searchQuery)}`;
        const searchHtml = await fetchText(searchUrl);
        if (!searchHtml) return [];
        
        const $search = cheerio.load(searchHtml);
        
        // Extract all cards
        const cards = [];
        $search('[x-data*="anmTitles"]').each((i, el) => {
            const info = extractCardInfo($search, el);
            if (info) cards.push(info);
        });

        let animeSlug = null;
        if (cards.length > 0) {
            if (mediaType === 'tv') {
                animeSlug = matchCard(cards, animeTitle, (mapping && mapping.anime_title) || animeTitle, season);
            } else {
                animeSlug = matchMovieCard(cards, animeTitle);
            }
        }

        // Fallback to the old logic if cards couldn't be parsed or matched
        if (!animeSlug) {
            $search('main a').each((i, el) => {
                const href = $search(el).attr('href');
                if (href && (href.startsWith('https://anizone.to/anime/') || href.startsWith('/anime/')) && !animeSlug) {
                    const parts = href.split('/');
                    animeSlug = parts[parts.length - 1] || parts[parts.length - 2];
                }
            });
        }

        if (!animeSlug) return [];

        // 2. Go to episode page
        const episodeUrl = `/anime/${animeSlug}/${mappedEp}`;
        const episodeHtml = await fetchText(episodeUrl);
        if (!episodeHtml) return [];

        // 3. Extract Stream URL and Subtitles
        const streams = [];
        const $epPage = cheerio.load(episodeHtml);

        let masterUrl = $epPage('media-player').attr('src');
        if (!masterUrl) {
            const matches = episodeHtml.match(/https:\/\/[^"']+\/master\.m3u8/);
            if (matches) {
                masterUrl = matches[0];
            }
        }

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
