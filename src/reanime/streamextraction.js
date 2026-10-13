import { getBaseUrl, absolutize, fetchText, fetchJson } from './client.js';
import { fetchAnimeDetails } from './metadata.js';

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const FLIX_SEGMENT_MASK_FALLBACK = [157, 42, 241, 71, 179, 142, 92, 112, 166, 25, 228, 59, 216, 98, 15, 197];

function getUrlOrigin(url) {
    if (!url) return "";
    const match = url.match(/^(https?:\/\/[^\/]+)/);
    return match ? match[1] : "";
}

function normalizeFlixEmbedUrl(url) {
    let finalUrl = url.startsWith("http") ? url : `https://flixcloud.cc${url.startsWith("/") ? "" : "/"}${url}`;
    finalUrl = finalUrl.replace(/[?&]v=[^&]+/, "").replace(/[?&]kuudere_ts=[^&]+/, "");
    const separator = finalUrl.includes("?") ? "&" : "?";
    return `${finalUrl}${separator}v=1&autoPlay=true&skI=false&skO=false&kuudere_ts=${Date.now()}`;
}

async function extractFlixSegmentMask(html, embedOrigin) {
    const scriptPath = html.match(/href=["']([^"']*hls\.js[^"']*)/i)?.[1];
    if (!scriptPath) return null;

    try {
        const scriptUrl = new URL(scriptPath, `${embedOrigin}/`).toString();
        const script = await fetchText(scriptUrl, {
            headers: { "Referer": `${embedOrigin}/` }
        });
        const values = script.match(/for\(var f=\[(\d{1,3}(?:,\d{1,3}){15})\]/)?.[1];
        if (!values) return null;
        const mask = values.split(",").map(Number);
        return mask.length === 16 && mask.every(value => value >= 0 && value <= 255) ? mask : null;
    } catch (_) {
        return null;
    }
}

function createNuvioFlixProxyUrl(streamUrl, wPayload, segmentMask, origin) {
    const profile = {
        version: 1,
        mode: "hls",
        url: streamUrl,
        origin,
        headers: { "Referer": `${origin}/`, "User-Agent": USER_AGENT },
        resolverHeaders: {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            "Origin": "https://enc-dec.app",
            "Referer": "https://enc-dec.app/"
        },
        manifest: {
            resolverUrl: "https://enc-dec.app/api/parse-flixcloud?url={url}&w_payload={w_payload}",
            resolverInitialOnly: true,
            inheritQueryParameter: "token"
        },
        templateValues: { w_payload: wPayload },
        segment: { stripImageHeader: true, xorMask: segmentMask }
    };
    return `nuvio-proxy://play?config=${encodeURIComponent(JSON.stringify(profile))}`;
}

function extractBalancedObject(source, startIdx) {
    const start = source.indexOf("{", startIdx);
    if (start < 0) return null;
    let depth = 0, quote = null, escape = false;
    for (let i = start; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
            if (escape) escape = false;
            else if (ch === "\\") escape = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
        } else if (ch === "{") {
            depth++;
        } else if (ch === "}") {
            depth--;
            if (depth === 0) return source.substring(start, i + 1);
        }
    }
    return null;
}

function parseSsrData(html) {
    const match = html.match(/type:\s*"data",\s*data:\s*(\{.*?\})\s*,\s*uses:/);
    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch (_) {}
    }

    const marker = "obfuscation_seed";
    const markerIdx = html.indexOf(marker);
    if (markerIdx >= 0) {
        let dataIdx = html.lastIndexOf("{", markerIdx);
        while (dataIdx >= 0) {
            const obj = extractBalancedObject(html, dataIdx);
            if (obj && obj.includes(marker)) {
                try {
                    const jsonText = obj
                        .replace(/([{,])\s*([A-Za-z_$][A-Za-z0-9_$]*|[0-9a-f]{4,}(?:_[0-9a-f]{4,})?)\s*:/g, '$1"$2":')
                        .replace(/,\s*([}\]])/g, "$1");
                    const parsed = JSON.parse(jsonText);
                    return parsed.data || parsed;
                } catch (_) {}
            }
            dataIdx = html.lastIndexOf("{", dataIdx - 1);
        }
    }
    throw new Error("FlixCloud SSR data not found");
}

export async function extractFlixCloud(embedUrl) {
    const pageUrl = normalizeFlixEmbedUrl(embedUrl);
    const origin = getUrlOrigin(pageUrl) || "https://flixcloud.cc";

    const response = await fetch(pageUrl, {
        headers: {
            "User-Agent": USER_AGENT,
            "Referer": "https://flixcloud.cc/"
        },
        cfKiller: true,
        skipSizeCheck: true
    });

    if (!response.ok) {
        throw new Error(`FlixCloud embed HTTP ${response.status}`);
    }

    const html = await response.text();
    const data = parseSsrData(html);
    const segmentMask = (await extractFlixSegmentMask(html, origin)) || FLIX_SEGMENT_MASK_FALLBACK;

    // Strip auxiliary fields so decryption server receives clean payload
    const cleanedData = { ...data };
    delete cleanedData.subtitles;
    delete cleanedData.intro_chapter;
    delete cleanedData.outro_chapter;

    const resolveResponse = await fetch("https://enc-dec.app/api/dec-flixcloud?type=token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT
        },
        body: JSON.stringify({ data: cleanedData })
    });

    if (!resolveResponse.ok) {
        throw new Error(`Resolve API HTTP ${resolveResponse.status}`);
    }

    const resolveJson = await resolveResponse.json();
    const result = resolveJson.result || resolveJson;
    const token = result.token || (result.context && result.context.token);
    const context = result.context || result;

    if (!token) {
        throw new Error("Missing token in FlixCloud resolve response");
    }

    const tokenResponse = await fetch(`${origin}/api/m3u8/${token}`, {
        headers: {
            "User-Agent": USER_AGENT,
            "Referer": "https://flixcloud.cc/"
        },
        cfKiller: true,
        skipSizeCheck: true
    });

    if (!tokenResponse.ok) {
        throw new Error(`FlixCloud token authorization HTTP ${tokenResponse.status}`);
    }

    const tokenJson = await tokenResponse.json();

    const decryptResponse = await fetch("https://enc-dec.app/api/dec-flixcloud?type=stream", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT
        },
        body: JSON.stringify({
            data: {
                context,
                stream_response: tokenJson
            }
        })
    });

    if (!decryptResponse.ok) {
        throw new Error(`Decrypt API HTTP ${decryptResponse.status}`);
    }

    const decryptJson = await decryptResponse.json();
    const streamResult = decryptJson.result || {};
    const stream = streamResult.stream || streamResult.url || decryptJson.result;
    const wPayload = streamResult.context?.w_payload || context?.w_payload;

    if (!stream || typeof stream !== "string") {
        throw new Error("Decrypt API did not return a valid stream URL");
    }

    let cleanStreamUrl = stream.replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
    if (wPayload && segmentMask) {
        cleanStreamUrl = createNuvioFlixProxyUrl(cleanStreamUrl, wPayload, segmentMask, origin);
    } else if (wPayload) {
        throw new Error("Could not find FlixCloud segment key");
    }

    let thumbnailsUrl = null;
    const subtitles = (data.subtitles || data.tracks || []).map(s => {
        if (s.kind === "thumbnails" || s.kind === "thumbnail") {
            thumbnailsUrl = s.url || s.file || "";
            return null;
        }
        const language = s.language || s.lang || s.label || "Unknown";
        return {
            url: s.url || s.file || "",
            language,
            name: s.name || s.label || language,
            kind: "subtitles",
            headers: {
                "Referer": `${origin}/`,
                "User-Agent": USER_AGENT
            }
        };
    }).filter(Boolean).filter(s => Boolean(s.url));

    const parseChapter = (chapter) => {
        if (!chapter) return null;
        if (Array.isArray(chapter) && chapter.length >= 2) {
            const start = Number(chapter[0]);
            const end = Number(chapter[1]);
            return (!isNaN(start) && !isNaN(end) && end > 0) ? { start, end } : null;
        }
        if (typeof chapter === 'object') {
            const start = Number(chapter.start !== undefined ? chapter.start : chapter[0]);
            const end = Number(chapter.end !== undefined ? chapter.end : chapter[1]);
            return (!isNaN(start) && !isNaN(end) && end > 0) ? { start, end } : null;
        }
        return null;
    };
    const intro = parseChapter(data.intro_chapter || data.intro || (data.skip && data.skip.intro));
    const outro = parseChapter(data.outro_chapter || data.outro || (data.skip && data.skip.outro));
    const thumbnails = thumbnailsUrl || data.thumbnails || data.thumbnail || undefined;

    return {
        url: cleanStreamUrl,
        videoId: data.video_id,
        title: data.video_title,
        subtitles,
        intro: intro || undefined,
        outro: outro || undefined,
        thumbnails: thumbnails,
        headers: {
            "Referer": "https://flixcloud.cc/",
            "User-Agent": USER_AGENT
        }
    };
}

export async function fetchFlixServers(anilistId, episodeNumber, slug, malId = null, tmdbId = null, tmdbSeason = 1) {
    const referer = slug ? `${getBaseUrl()}/watch/${slug}?ep=${episodeNumber}` : `${getBaseUrl()}/home`;
    const params = new URLSearchParams();
    if (malId) params.set("mal", String(malId));
    if (!anilistId && tmdbId) {
        params.set("tmdb", String(tmdbId));
        params.set("season", String(tmdbSeason || 1));
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    try {
        const json = await fetchJson(`/api/flix/${anilistId || 0}/${episodeNumber}${query}`, {
            headers: {
                "Referer": referer
            }
        });
        if (json && json.success && Array.isArray(json.servers)) {
            return json.servers;
        }
    } catch (_) {}
    return [];
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
            const json = await fetchJson(endpoint, {
                headers: {
                    "Referer": `${getBaseUrl()}/watch/${slug}?ep=${episodeNumber}`
                }
            });
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

export async function getStreams(episodeUrl) {
    try {
        if (typeof episodeUrl !== 'string' || !episodeUrl.trim()) return [];
        const parsedUrl = new URL(episodeUrl, `${getBaseUrl()}/`);
        const episodePath = parsedUrl.pathname.match(/\/watch\/([^/]+)/);
        const animeSlug = episodePath ? decodeURIComponent(episodePath[1]) : null;
        const episodeNumber = parsedUrl.searchParams.get("ep");
        if (!animeSlug || !episodeNumber) return [];

        const details = await fetchAnimeDetails(animeSlug);
        if (!details || !details.anime_id) return [];
        const alId = details.anilist_id ? String(details.anilist_id) : null;
        const searchTitle = details.title?.english || details.title?.romaji || details.title?.native || animeSlug;
        const isMovie = /movie|film/i.test(String(details.format || details.type || ""));

        const streams = [];

        if (alId || details.mal_id || details.themoviedb_id) {
            const servers = await fetchFlixServers(alId, episodeNumber, animeSlug, details.mal_id, details.themoviedb_id);
            for (const server of servers) {
                if (!server.dataLink) continue;
                try {
                    const extracted = await extractFlixCloud(server.dataLink);
                    if (extracted && extracted.url) {
                        const lang = (server.dataType || 'sub').toUpperCase();
                        const sName = server.serverName || 'HD-1';
                        const isDub = lang === 'DUB';
                        const isSoft = Boolean(server.softsub);
                        const format = isDub ? 'dub' : (isSoft ? 'softsub' : 'hardsub');
                        const softsubStr = isSoft ? ' [Softsub]' : '';
                        const streamTitle = isMovie
                            ? `${searchTitle} (${lang})`
                            : `${searchTitle} - Episode ${episodeNumber} (${lang})`;

                        streams.push({
                            name: `Reanime [${lang}] ${sName}${softsubStr}`,
                            title: streamTitle,
                            url: extracted.url,
                            quality: "Auto",
                            server: `${sName}${softsubStr}`,
                            format: format,
                            headers: extracted.headers,
                            provider: "reanime",
                            type: "m3u8",
                            subtitles: extracted.subtitles,
                            intro: extracted.intro,
                            outro: extracted.outro,
                            thumbnails: extracted.thumbnails
                        });
                    }
                } catch (_) {}
            }
        }

        if (streams.length === 0) {
            const languages = ["sub", "dub"];
            for (const language of languages) {
                const { embeds } = await getFlixEmbeds(animeSlug, episodeNumber, language, alId);
                for (let i = 0; i < embeds.length; i++) {
                    try {
                        const extracted = await extractFlixCloud(embeds[i]);
                        if (extracted && extracted.url) {
                            const streamTitle = isMovie
                                ? `${searchTitle} (${language.toUpperCase()})`
                                : `${searchTitle} - Episode ${episodeNumber} (${language.toUpperCase()})`;
                            const isDub = language === 'dub';
                            const hasSubs = Array.isArray(extracted.subtitles) && extracted.subtitles.length > 0;
                            const format = isDub ? 'dub' : (hasSubs ? 'softsub' : 'hardsub');

                            streams.push({
                                name: `Reanime ${language.toUpperCase()} HD-${i + 1}`,
                                title: streamTitle,
                                url: extracted.url,
                                quality: "Auto",
                                server: `HD-${i + 1}`,
                                format: format,
                                headers: extracted.headers,
                                provider: "reanime",
                                type: "m3u8",
                                subtitles: extracted.subtitles,
                                intro: extracted.intro,
                                outro: extracted.outro,
                                thumbnails: extracted.thumbnails
                            });
                        }
                    } catch (_) {}
                }
            }
        }

        const seen = new Set();
        return streams.filter(s => {
            if (!s.url || seen.has(s.url)) return false;
            seen.add(s.url);
            return true;
        });
    } catch (_) {
        return [];
    }
}
