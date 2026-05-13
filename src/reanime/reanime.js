import cheerio from 'cheerio-without-node-native';
import { HEADERS, REANIME_BASE, TMDB_API_KEY } from './constants.js';

function absolutize(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${REANIME_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function fetchText(url, options = {}) {
    const finalUrl = absolutize(url);
    const response = await fetch(finalUrl, {
        ...options,
        headers: {
            ...HEADERS,
            ...(options.headers || {})
        }
    });
    if (!response.ok) throw new Error(`Reanime HTTP ${response.status}: ${finalUrl}`);
    return await response.text();
}

async function fetchJson(url, options = {}) {
    const text = await fetchText(url, {
        ...options,
        headers: {
            "Accept": "application/json",
            ...(options.headers || {})
        }
    });
    return JSON.parse(text);
}

export async function getTmdbInfo(tmdbId, mediaType) {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
    const data = await res.json();
    return {
        title: data.name || data.title || data.original_name || data.original_title || "",
        year: ((data.first_air_date || data.release_date || "").match(/\d{4}/) || [null])[0],
        imdbId: data.external_ids && data.external_ids.imdb_id
    };
}

function normalizeTitle(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function scoreCandidate(title, query, year) {
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

export async function searchReanimeAnime(query, year) {
    const endpoints = [
        `/search?keyword=${encodeURIComponent(query)}`,
        `/search?q=${encodeURIComponent(query)}`,
        `/api/search?q=${encodeURIComponent(query)}`,
        `/api/anime/search?q=${encodeURIComponent(query)}`,
        `/api/search/anime?q=${encodeURIComponent(query)}`
    ];

    const candidates = [];
    for (const endpoint of endpoints) {
        try {
            const text = await fetchText(endpoint);
            if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
                const json = JSON.parse(text);
                const list = json.data || json.results || json.anime || json;
                if (Array.isArray(list)) {
                    list.forEach(item => {
                        const slug = item.anime_id || item.slug || item.id || item.url;
                        const cleanSlug = String(slug || "").match(/\/(?:anime|watch)\/([^?#]+)/)?.[1] || slug;
                        if (cleanSlug) {
                            candidates.push({
                                slug: cleanSlug,
                                title: item.title?.english || item.title?.romaji || item.title || item.name || cleanSlug,
                                anilistId: extractAnilistId(item)
                            });
                        }
                    });
                }
            } else {
                candidates.push(...collectSlugsFromHtml(text));
            }
        } catch (_) {}
        if (candidates.length > 0) break;
    }

    const unique = [];
    const seen = new Set();
    for (const candidate of candidates) {
        if (!candidate.slug || seen.has(candidate.slug)) continue;
        seen.add(candidate.slug);
        candidate.score = scoreCandidate(candidate.title || candidate.slug, query, year);
        unique.push(candidate);
    }

    unique.sort((a, b) => b.score - a.score);
    
    if (unique.length > 0) {
        console.log(`[Reanime] Search for "${query}" found ${unique.length} candidates. Top: "${unique[0].title}" (Score: ${unique[0].score})`);
        // unique.slice(0, 5).forEach(c => console.log(`  - ${c.title} (${c.slug}) Score: ${c.score}`));
    }
    
    return unique.length > 0 ? unique[0] : null;
}

export async function searchReanimeSlug(query, year) {
    const anime = await searchReanimeAnime(query, year);
    return anime ? anime.slug : null;
}

function extractDirectFlixUrls(html) {
    const urls = [];
    const patterns = [
        /https?:\/\/flixcloud\.cc\/e\/[A-Za-z0-9_-]+[^"'\\\s<]*/g,
        /["'](\/e\/[A-Za-z0-9_-]+[^"']*)["']/g,
        /(?:url|embed|src)\s*:\s*["']([^"']*\/e\/[A-Za-z0-9_-]+[^"']*)["']/g
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html))) {
            const value = match[1] || match[0];
            if (value.includes("/e/")) urls.push(value.replace(/\\u0026/g, "&"));
        }
    }
    return [...new Set(urls)];
}

async function fetchEpisodeSourcesApi(slug, episodeNumber, language, anilistId) {
    const endpoints = [
        anilistId ? `/api/flix/${anilistId}/${episodeNumber}` : null,
        `/api/sources/${slug}/${episodeNumber}?lang=${language}`,
        `/api/episode/sources/${slug}/${episodeNumber}?lang=${language}`,
        `/api/anime/${slug}/episodes/${episodeNumber}/sources?lang=${language}`,
        `/api/watch/${slug}?ep=${episodeNumber}&lang=${language}`
    ].filter(Boolean);

    for (const endpoint of endpoints) {
        try {
            const json = await fetchJson(endpoint);
            if (Array.isArray(json.servers)) {
                const urls = json.servers
                    .filter(server => !language || server.dataType === language)
                    .map(server => server.dataLink)
                    .filter(Boolean);
                if (urls.length > 0) return [...new Set(urls)];
            }

            const text = JSON.stringify(json);
            const urls = extractDirectFlixUrls(text);
            if (urls.length > 0) return urls;
        } catch (_) {}
    }
    return [];
}

export async function getFlixEmbeds(slug, episodeNumber, language, anilistId) {
    const watchPath = `/watch/${slug}?ep=${episodeNumber}&lang=${language}`;
    const html = await fetchText(watchPath);
    const direct = extractDirectFlixUrls(html);
    if (direct.length > 0) return { watchUrl: absolutize(watchPath), embeds: direct };

    const apiUrls = await fetchEpisodeSourcesApi(slug, episodeNumber, language, anilistId);
    return { watchUrl: absolutize(watchPath), embeds: apiUrls };
}
