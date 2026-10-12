import cheerio from 'cheerio-without-node-native';
import { ANILIST_URL, CINEMETA_URL } from './constants.js';
import { absolutize, fetchJson, fetchText } from './client.js';
import { toHomeItem } from './home.js';

export async function searchAnimeApi(query, page = 1, limit = 36) {
    const offset = (page - 1) * limit;
    return await fetchJson(`/api/v1/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&sort=popularity_desc`);
}

export async function fetchAnimeDetails(slug) {
    return await fetchJson(`/api/v1/anime/${slug}`);
}

export async function fetchAnimeEpisodes(slug, limit = 2000) {
    return await fetchJson(`/api/v1/anime/${slug}/episodes?limit=${limit}`);
}

export async function fetchAnimeRecommendations(slug) {
    try {
        const data = await fetchJson(`/api/v1/anime/${slug}/recommendations`);
        return data.recommendations || data.data || [];
    } catch (_) {
        return [];
    }
}

export async function fetchThumbnails(anilistId) {
    if (!anilistId) return null;
    try {
        const data = await fetchJson(`/api/thumbnails/${anilistId}`);
        return data.thumbnails || null;
    } catch (_) {
        return null;
    }
}

export async function getAnilistMediaInfo(alId) {
    if (!alId) return { title: "", year: null };
    const query = 'query($id:Int){Media(id:$id,type:ANIME){title{english romaji}startDate{year}}}';
    try {
        const json = await fetchJson(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { id: parseInt(alId, 10) } })
        });
        const media = json.data?.Media;
        if (media) {
            return {
                title: media.title?.english || media.title?.romaji || "",
                year: media.startDate?.year || null
            };
        }
    } catch (_) {}
    return { title: "", year: null };
}

export async function getSyncInfo(id, mediaType, season, episode) {
    const isImdb = typeof id === 'string' && id.indexOf('tt') === 0;

    const getCinemetaInfo = async (imdbId) => {
        const type = (mediaType === 'movie') ? 'movie' : 'series';
        const url = `${CINEMETA_URL}/${type}/${imdbId}.json`;
        try {
            const data = await fetchJson(url);
            const meta = data.meta;
            if (!meta) throw new Error('No Cinemeta metadata');
            if (mediaType === 'movie') return { date: meta.released ? meta.released.split('T')[0] : null, title: meta.name, dayIndex: 1 };
            
            const videos = meta.videos || [];
            const target = videos.find(v => v.season == season && v.episode == episode);
            if (!target || !target.released) return { date: null, title: meta.name, episodeTitle: null, dayIndex: 1 };

            const targetDate = target.released.split('T')[0];
            const dayIndex = videos.filter(v => v.season == season && v.released && v.released.split('T')[0] === targetDate && parseInt(v.episode) < parseInt(episode)).length + 1;

            return { date: targetDate, title: meta.name, episodeTitle: target.name || null, dayIndex };
        } catch (e) {
            return { date: null, title: null, dayIndex: 1 };
        }
    };

    if (isImdb) {
        const info = await getCinemetaInfo(id);
        if (info.date) return { imdbId: id, releaseDate: info.date, title: info.title, episodeTitle: info.episodeTitle, dayIndex: info.dayIndex, episode };
        throw new Error('Could not find release date on Cinemeta');
    }

    throw new Error(`Unsupported ID format: ${id}`);
}

export async function resolveByDate(releaseDateStr, showTitle, originalEpisode, episodeTitle, dayIndex) {
    if (!releaseDateStr || !/^\d{4}-\d{2}-\d{2}/.test(releaseDateStr)) return null;

    const query = 'query($search:String){Page(perPage:20){media(search:$search,type:ANIME){id type format title{romaji english}startDate{year month day}endDate{year month day}episodes streamingEpisodes{title}}}}';
    
    try {
        const json = await fetchJson(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { search: showTitle } })
        });

        const candidates = json.data?.Page?.media || [];
        if (candidates.length === 0) return null;

        const targetDate = new Date(releaseDateStr);

        for (const anime of candidates) {
            const s = anime.startDate;
            const startStr = (s.year && s.month && s.day) ? `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}` : null;
            if (!startStr) continue;

            const startDate = new Date(startStr);
            const diffDays = Math.ceil(Math.abs(targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            let isMatch = false;
            if (anime.format === 'MOVIE' || anime.format === 'SPECIAL' || anime.episodes === 1) {
                if (diffDays <= 2) isMatch = true;
            } else {
                const startLimit = new Date(startDate);
                startLimit.setDate(startLimit.getDate() - 2);
                if (targetDate >= startLimit) {
                    if (anime.endDate && anime.endDate.year) {
                        const endDate = new Date(anime.endDate.year, (anime.endDate.month || 12) - 1, (anime.endDate.day || 31));
                        endDate.setDate(endDate.getDate() + 2);
                        if (targetDate <= endDate) isMatch = true;
                    } else {
                        isMatch = true;
                    }
                }
            }

            if (isMatch) {
                const isTV = anime.format !== 'MOVIE' && anime.format !== 'SPECIAL' && anime.episodes !== 1;
                let episodeNum = (isTV && originalEpisode) ? originalEpisode : (dayIndex || 1);
                
                const episodes = anime.streamingEpisodes || [];
                if (episodes.length > 1 && episodeTitle) {
                    const cleanTarget = episodeTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
                    for (let j = 0; j < episodes.length; j++) {
                        const cleanAl = (episodes[j].title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (cleanAl && (cleanAl.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(cleanAl) !== -1)) {
                            episodeNum = j + 1;
                            break;
                        }
                    }
                }
                return { alId: anime.id, episode: episodeNum, title: anime.title.english || anime.title.romaji };
            }
        }
    } catch (e) {
        console.error(`[AniList] Search error: ${e.message}`);
    }
    return null;
}

function normalizeTitle(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function scoreCandidate(title, query, year, targetAnilistId, candidateAnilistId) {
    if (targetAnilistId && candidateAnilistId && String(targetAnilistId) === String(candidateAnilistId)) {
        return 1000;
    }

    const a = normalizeTitle(title);
    const b = normalizeTitle(query);
    if (!a || !b) return 0;
    let score = 0;
    if (a === b) score += 100;
    if (a.includes(b) || b.includes(a)) score += 50;
    const words = b.split(/\s+/).filter(Boolean);
    for (const word of words) if (a.includes(word)) score += 4;
    if (year && String(title).includes(String(year))) score += 10;
    return score;
}

function extractAnilistId(item) {
    const direct = item && (item.anilist_id || item.anilistId);
    if (direct) return String(direct);

    const imageUrls = [
        item?.cover_image?.extra_large,
        item?.cover_image?.large,
        item?.cover_image?.medium,
        item?.banner_image
    ].filter(Boolean);

    for (const url of imageUrls) {
        const match = String(url).match(/\/b?x?(\d+)-|\/(\d+)[-.]/);
        if (match) return match[1] || match[2];
    }
    return null;
}

function collectSlugsFromHtml(html) {
    const $ = cheerio.load(html);
    const results = [];
    $("a[href]").each((_, el) => {
        const href = $(el).attr("href") || "";
        const match = href.match(/\/(?:anime|watch)\/([^?#]+)/);
        if (match) {
            results.push({
                slug: match[1],
                title: $(el).text().trim()
            });
        }
    });
    return results;
}

export async function searchReanimeAnime(query, year, targetAnilistId = null) {
    const endpoints = [
        `/api/v1/search?q=${encodeURIComponent(query)}&limit=36&sort=popularity_desc`,
        `/api/search?q=${encodeURIComponent(query)}`,
        `/api/anime/search?q=${encodeURIComponent(query)}`,
        `/search?q=${encodeURIComponent(query)}`
    ];

    const candidates = [];
    for (const endpoint of endpoints) {
        try {
            const text = await fetchText(endpoint);
            if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
                const json = JSON.parse(text);
                const list = json.results || json.data || json.anime || (Array.isArray(json) ? json : []);
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        const slug = item.anime_id || item.slug || item.id || item.url;
                        if (slug) {
                            const cleanSlug = String(slug);
                            const alId = extractAnilistId(item);
                            candidates.push({
                                slug: cleanSlug,
                                title: item.title?.english || item.title?.romaji || item.title || item.name || cleanSlug,
                                anilistId: alId,
                                score: scoreCandidate(item.title?.english || item.title?.romaji || item.title || item.name || cleanSlug, query, year, targetAnilistId, alId)
                            });
                        }
                    });
                }
            } else {
                const htmlResults = collectSlugsFromHtml(text);
                htmlResults.forEach(c => {
                    c.score = scoreCandidate(c.title, query, year, targetAnilistId, null);
                    candidates.push(c);
                });
            }
        } catch (_) {}
        if (candidates.some(c => c.score >= 1000)) break;
        if (candidates.length > 0 && !targetAnilistId) break;
    }

    const unique = [];
    const seen = new Set();
    for (const candidate of candidates) {
        if (!candidate.slug || seen.has(candidate.slug)) continue;
        seen.add(candidate.slug);
        unique.push(candidate);
    }

    unique.sort((a, b) => b.score - a.score);
    return unique.length > 0 ? unique[0] : null;
}

export async function searchReanimeSlug(query, year) {
    const anime = await searchReanimeAnime(query, year);
    return anime ? anime.slug : null;
}

export async function search(query, page = 1) {
    try {
        if (!query || !query.trim()) return [];
        const res = await searchAnimeApi(query.trim(), page, 36);
        const list = res.results || res.data || [];
        return list.map(toHomeItem).filter(Boolean);
    } catch (_) {
        return [];
    }
}

export async function getAnimeInfo(contentId) {
    try {
        if (!contentId) return null;
        let slug = String(contentId).replace(/^reanime:/, '');

        if (slug.startsWith('anilist:')) {
            const targetId = slug.split(':')[1];
            const alInfo = await getAnilistMediaInfo(targetId);
            const candidate = await searchReanimeAnime(alInfo.title, null, targetId);
            if (candidate && candidate.slug) {
                slug = candidate.slug;
            } else {
                return null;
            }
        }

        const details = await fetchAnimeDetails(slug);
        if (!details || !details.anime_id) return null;

        const anilistId = details.anilist_id;

        const [episodesRes, thumbnailsRes, recsRes] = await Promise.allSettled([
            fetchAnimeEpisodes(slug, 2000),
            anilistId ? fetchThumbnails(anilistId) : Promise.resolve(null),
            fetchAnimeRecommendations(slug)
        ]);

        const rawEpisodes = episodesRes.status === "fulfilled" && episodesRes.value ? (episodesRes.value.data || []) : [];
        const thumbnails = thumbnailsRes.status === "fulfilled" ? thumbnailsRes.value : null;
        const recommendations = recsRes.status === "fulfilled" && recsRes.value ? recsRes.value : [];

        const subCount = details.subbed != null ? details.subbed : null;
        const dubCount = details.dubbed != null ? details.dubbed : null;

        const episodes = rawEpisodes.map(ep => {
            const epNum = Math.floor(ep.episode_number || 1);
            const epNumStr = String(epNum);
            const episodeId = ep.episodeId || `ep-${epNum}`;
            const episodeKey = String(episodeId).replace(/^ep-/, '');
            const titleStr = ep.title || (ep.title_romanji || `Episode ${epNum}`);
            const hasSub = (subCount == null) || (epNum <= subCount);
            const hasDub = dubCount != null ? (epNum <= dubCount) : false;

            return {
                id: episodeId,
                episodeUrl: absolutize(`/watch/${slug}?ep=${encodeURIComponent(episodeKey)}`),
                episode: epNum,
                season: 1,
                title: ep.is_recap ? `${titleStr} [Recap]` : titleStr,
                thumbnail: (thumbnails && thumbnails[epNumStr]) || ep.thumbnail || null,
                overview: ep.description || null,
                isFiller: Boolean(ep.is_filler),
                isSub: hasSub,
                isDub: hasDub
            };
        });

        const related = recommendations.map(toHomeItem).filter(Boolean);
        const rawFormat = (details.format || details.type || "").toLowerCase();
        const detectedType = rawFormat || (episodes.length === 1 ? "movie" : "tv");

        return {
            id: details.anime_id || slug,
            title: details.title?.english || details.title?.romaji || details.title?.native || slug,
            poster: details.cover_image?.extra_large || details.cover_image?.large || details.cover_image?.medium || null,
            banner: details.banner_image || null,
            description: details.description || null,
            type: detectedType,
            format: rawFormat || detectedType,
            totalEpisodes: (episodes.length > 0 ? episodes.length : null) || subCount,
            subEpisodes: subCount,
            dubEpisodes: dubCount,
            ageRating: details.rating || null,
            status: details.status || null,
            genres: details.genres || [],
            year: details.season_year ? String(details.season_year) : null,
            episodes: episodes,
            related: related
        };
    } catch (_) {
        return null;
    }
}
