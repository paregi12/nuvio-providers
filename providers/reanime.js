/**
 * reanime - Built from src/reanime/
 * Generated: 2026-10-08T17:46:42.195Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/reanime/reanime.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/reanime/constants.js
var REANIME_BASE = "https://reanime.to";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var ANILIST_URL = "https://graphql.anilist.co";
var ARM_BASE = "https://arm.haglund.dev/api/v2";
var CINEMETA_URL = "https://v3-cinemeta.strem.io/meta";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "Accept-Language": "en-US,en;q=0.9"
};
var FLIX_HEADERS = __spreadProps(__spreadValues({}, HEADERS), {
  "Referer": REANIME_BASE + "/"
});

// src/reanime/reanime.js
function getBaseUrl() {
  const settings = typeof globalThis !== "undefined" && globalThis.SCRAPER_SETTINGS || {};
  return settings.domain || REANIME_BASE;
}
function absolutize(path) {
  if (!path)
    return "";
  if (path.startsWith("http"))
    return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBaseUrl()}${cleanPath}`;
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const finalUrl = absolutize(url);
    const domain = getBaseUrl();
    const isReanime = finalUrl.includes("reanime.");
    const response = yield fetch(finalUrl, __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues(__spreadValues(__spreadValues({}, HEADERS), isReanime ? { "Referer": `${domain}/` } : {}), options.headers || {}),
      cfKiller: isReanime,
      skipSizeCheck: true
    }));
    if (!response.ok) {
      throw new Error(`Reanime HTTP ${response.status}: ${finalUrl}`);
    }
    return yield response.text();
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const text = yield fetchText(url, __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues({
        "Accept": "application/json, text/plain, */*"
      }, options.headers || {})
    }));
    return JSON.parse(text);
  });
}
function toHomeItem(item) {
  if (!item)
    return null;
  const id = item.anime_id || item.slug || item.id;
  if (!id)
    return null;
  let title = "";
  if (typeof item.title === "object" && item.title !== null) {
    title = item.title.english || item.title.romaji || item.title.native || "";
  } else if (typeof item.title === "string") {
    title = item.title;
  } else if (item.name) {
    title = item.name;
  }
  if (!title)
    title = String(id);
  let poster = null;
  if (item.cover_image) {
    poster = item.cover_image.extra_large || item.cover_image.large || item.cover_image.medium || null;
  } else if (item.image) {
    poster = item.image;
  } else if (item.poster) {
    poster = item.poster;
  }
  const banner = item.banner_image || item.banner || null;
  const description = item.description || null;
  const rating = item.average_score ? (item.average_score / 10).toFixed(1) : item.score ? String(item.score) : null;
  const year = item.season_year ? String(item.season_year) : item.year ? String(item.year) : null;
  const episodes = item.episodes != null ? Number(item.episodes) : item.totalEpisodes != null ? Number(item.totalEpisodes) : null;
  const subEpisodes = item.subbed != null ? Number(item.subbed) : null;
  const dubEpisodes = item.dubbed != null ? Number(item.dubbed) : null;
  return {
    id: String(id),
    title,
    poster,
    banner,
    description,
    rating,
    year,
    episodes,
    subEpisodes,
    dubEpisodes
  };
}
function fetchPopular(limit = 24, page = 1) {
  return __async(this, null, function* () {
    const offset = (page - 1) * limit;
    return yield fetchJson(`/api/v1/search?sort=popularity_desc&limit=${limit}&offset=${offset}`);
  });
}
function fetchLatestAired(limit = 24, lang = "sub") {
  return __async(this, null, function* () {
    return yield fetchJson(`/api/v1/home/latest-aired?limit=${limit}&lang=${lang}`);
  });
}
function fetchTopRated(limit = 24, page = 1) {
  return __async(this, null, function* () {
    const offset = (page - 1) * limit;
    return yield fetchJson(`/api/v1/search?sort=score_desc&limit=${limit}&offset=${offset}`);
  });
}
function searchAnimeApi(query, page = 1, limit = 36) {
  return __async(this, null, function* () {
    const offset = (page - 1) * limit;
    return yield fetchJson(`/api/v1/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&sort=popularity_desc`);
  });
}
function fetchAnimeDetails(slug) {
  return __async(this, null, function* () {
    return yield fetchJson(`/api/v1/anime/${slug}`);
  });
}
function fetchAnimeEpisodes(slug, limit = 2e3) {
  return __async(this, null, function* () {
    return yield fetchJson(`/api/v1/anime/${slug}/episodes?limit=${limit}`);
  });
}
function fetchAnimeRecommendations(slug) {
  return __async(this, null, function* () {
    try {
      const data = yield fetchJson(`/api/v1/anime/${slug}/recommendations`);
      return data.recommendations || data.data || [];
    } catch (_) {
      return [];
    }
  });
}
function fetchThumbnails(anilistId) {
  return __async(this, null, function* () {
    if (!anilistId)
      return null;
    try {
      const data = yield fetchJson(`/api/thumbnails/${anilistId}`);
      return data.thumbnails || null;
    } catch (_) {
      return null;
    }
  });
}
function fetchFlixServers(anilistId, episodeNumber, slug) {
  return __async(this, null, function* () {
    const referer = slug ? `${getBaseUrl()}/watch/${slug}?ep=${episodeNumber}` : `${getBaseUrl()}/home`;
    try {
      const json = yield fetchJson(`/api/flix/${anilistId}/${episodeNumber}`, {
        headers: {
          "Referer": referer
        }
      });
      if (json && json.success && Array.isArray(json.servers)) {
        return json.servers;
      }
    } catch (_) {
    }
    return [];
  });
}
function getAnilistMediaInfo(alId) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    if (!alId)
      return { title: "", year: null };
    const query = "query($id:Int){Media(id:$id,type:ANIME){title{english romaji}startDate{year}}}";
    try {
      const json = yield fetchJson(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { id: parseInt(alId, 10) } })
      });
      const media = (_a = json.data) == null ? void 0 : _a.Media;
      if (media) {
        return {
          title: ((_b = media.title) == null ? void 0 : _b.english) || ((_c = media.title) == null ? void 0 : _c.romaji) || "",
          year: ((_d = media.startDate) == null ? void 0 : _d.year) || null
        };
      }
    } catch (_) {
    }
    return { title: "", year: null };
  });
}
function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    try {
      const data = yield fetchJson(url);
      return {
        title: data.name || data.title || data.original_name || data.original_title || "",
        year: ((data.first_air_date || data.release_date || "").match(/\d{4}/) || [null])[0],
        imdbId: data.external_ids && data.external_ids.imdb_id
      };
    } catch (e) {
      return { title: "", year: null, imdbId: null };
    }
  });
}
function getSyncInfo(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    const isImdb = typeof id === "string" && id.indexOf("tt") === 0;
    const getCinemetaInfo = (imdbId2) => __async(this, null, function* () {
      const type = mediaType === "movie" ? "movie" : "series";
      const url = `${CINEMETA_URL}/${type}/${imdbId2}.json`;
      try {
        const data = yield fetchJson(url);
        const meta = data.meta;
        if (!meta)
          throw new Error("No Cinemata metadata");
        if (mediaType === "movie")
          return { date: meta.released ? meta.released.split("T")[0] : null, title: meta.name, dayIndex: 1 };
        const videos = meta.videos || [];
        const target = videos.find((v) => v.season == season && v.episode == episode);
        if (!target || !target.released)
          return { date: null, title: null, dayIndex: 1 };
        const targetDate = target.released.split("T")[0];
        const dayIndex = videos.filter((v) => v.season == season && v.released && v.released.split("T")[0] === targetDate && parseInt(v.episode) < parseInt(episode)).length + 1;
        return { date: targetDate, title: target.name || null, dayIndex };
      } catch (e) {
        return { date: null, title: null, dayIndex: 1 };
      }
    });
    if (isImdb) {
      const info = yield getCinemetaInfo(id);
      if (info.date)
        return { imdbId: id, releaseDate: info.date, episodeTitle: info.title, dayIndex: info.dayIndex, episode };
      throw new Error("Could not find release date on Cinemata");
    }
    const tmdbBase = `https://api.themoviedb.org/3/${mediaType === "movie" ? "movie" : "tv"}/${id}`;
    const [details, base] = yield Promise.all([
      fetchJson(tmdbBase + (mediaType === "movie" ? "" : "/external_ids") + `?api_key=${TMDB_API_KEY}`),
      fetchJson(tmdbBase + `?api_key=${TMDB_API_KEY}`)
    ]);
    let imdbId = details.imdb_id || null;
    const title = base.name || base.title || null;
    if (!imdbId) {
      try {
        const armData = yield fetchJson(`${ARM_BASE}/themoviedb?id=${id}`);
        imdbId = Array.isArray(armData) && armData.length > 0 ? armData[0].imdb : null;
      } catch (e) {
      }
    }
    if (!imdbId)
      throw new Error(`No IMDb ID found for TMDB ${id}`);
    const cMeta = yield getCinemetaInfo(imdbId);
    let finalDate = cMeta.date;
    if (mediaType === "movie" && base.release_date)
      finalDate = base.release_date;
    if (!finalDate)
      throw new Error(`Could not find release date for ID ${imdbId}`);
    return {
      imdbId,
      tmdbId: id,
      releaseDate: finalDate,
      title,
      episodeTitle: cMeta.title,
      dayIndex: cMeta.dayIndex,
      episode
    };
  });
}
function resolveByDate(releaseDateStr, showTitle, originalEpisode, episodeTitle, dayIndex) {
  return __async(this, null, function* () {
    var _a, _b;
    if (!releaseDateStr || !/^\d{4}-\d{2}-\d{2}/.test(releaseDateStr))
      return null;
    const query = "query($search:String){Page(perPage:20){media(search:$search,type:ANIME){id type format title{romaji english}startDate{year month day}endDate{year month day}episodes streamingEpisodes{title}}}}";
    try {
      const json = yield fetchJson(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { search: showTitle } })
      });
      const candidates = ((_b = (_a = json.data) == null ? void 0 : _a.Page) == null ? void 0 : _b.media) || [];
      if (candidates.length === 0)
        return null;
      const targetDate = new Date(releaseDateStr);
      for (const anime of candidates) {
        const s = anime.startDate;
        const startStr = s.year && s.month && s.day ? `${s.year}-${String(s.month).padStart(2, "0")}-${String(s.day).padStart(2, "0")}` : null;
        if (!startStr)
          continue;
        const startDate = new Date(startStr);
        const diffDays = Math.ceil(Math.abs(targetDate.getTime() - startDate.getTime()) / (1e3 * 60 * 60 * 24));
        let isMatch = false;
        if (anime.format === "MOVIE" || anime.format === "SPECIAL" || anime.episodes === 1) {
          if (diffDays <= 2)
            isMatch = true;
        } else {
          const startLimit = new Date(startDate);
          startLimit.setDate(startLimit.getDate() - 2);
          if (targetDate >= startLimit) {
            if (anime.endDate && anime.endDate.year) {
              const endDate = new Date(anime.endDate.year, (anime.endDate.month || 12) - 1, anime.endDate.day || 31);
              endDate.setDate(endDate.getDate() + 2);
              if (targetDate <= endDate)
                isMatch = true;
            } else {
              isMatch = true;
            }
          }
        }
        if (isMatch) {
          const isTV = anime.format !== "MOVIE" && anime.format !== "SPECIAL" && anime.episodes !== 1;
          let episodeNum = isTV && originalEpisode ? originalEpisode : dayIndex || 1;
          const episodes = anime.streamingEpisodes || [];
          if (episodes.length > 1 && episodeTitle) {
            const cleanTarget = episodeTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
            for (let j = 0; j < episodes.length; j++) {
              const cleanAl = (episodes[j].title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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
  });
}
function normalizeTitle(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function scoreCandidate(title, query, year, targetAnilistId, candidateAnilistId) {
  if (targetAnilistId && candidateAnilistId && String(targetAnilistId) === String(candidateAnilistId)) {
    return 1e3;
  }
  const a = normalizeTitle(title);
  const b = normalizeTitle(query);
  if (!a || !b)
    return 0;
  let score = 0;
  if (a === b)
    score += 100;
  if (a.includes(b) || b.includes(a))
    score += 50;
  const words = b.split(/\s+/).filter(Boolean);
  for (const word of words)
    if (a.includes(word))
      score += 4;
  if (year && String(title).includes(String(year)))
    score += 10;
  return score;
}
function extractAnilistId(item) {
  var _a, _b, _c;
  const direct = item && (item.anilist_id || item.anilistId);
  if (direct)
    return String(direct);
  const imageUrls = [
    (_a = item == null ? void 0 : item.cover_image) == null ? void 0 : _a.extra_large,
    (_b = item == null ? void 0 : item.cover_image) == null ? void 0 : _b.large,
    (_c = item == null ? void 0 : item.cover_image) == null ? void 0 : _c.medium,
    item == null ? void 0 : item.banner_image
  ].filter(Boolean);
  for (const url of imageUrls) {
    const match = String(url).match(/\/b?x?(\d+)-|\/(\d+)[-.]/);
    if (match)
      return match[1] || match[2];
  }
  return null;
}
function collectSlugsFromHtml(html) {
  const $ = import_cheerio_without_node_native.default.load(html);
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
function searchReanimeAnime(query, year, targetAnilistId = null) {
  return __async(this, null, function* () {
    const endpoints = [
      `/api/v1/search?q=${encodeURIComponent(query)}&limit=36&sort=popularity_desc`,
      `/api/search?q=${encodeURIComponent(query)}`,
      `/api/anime/search?q=${encodeURIComponent(query)}`,
      `/search?q=${encodeURIComponent(query)}`
    ];
    const candidates = [];
    for (const endpoint of endpoints) {
      try {
        const text = yield fetchText(endpoint);
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          const json = JSON.parse(text);
          const list = json.results || json.data || json.anime || (Array.isArray(json) ? json : []);
          if (Array.isArray(list)) {
            list.forEach((item) => {
              var _a, _b, _c, _d;
              const slug = item.anime_id || item.slug || item.id || item.url;
              if (slug) {
                const cleanSlug = String(slug);
                const alId = extractAnilistId(item);
                candidates.push({
                  slug: cleanSlug,
                  title: ((_a = item.title) == null ? void 0 : _a.english) || ((_b = item.title) == null ? void 0 : _b.romaji) || item.title || item.name || cleanSlug,
                  anilistId: alId,
                  score: scoreCandidate(((_c = item.title) == null ? void 0 : _c.english) || ((_d = item.title) == null ? void 0 : _d.romaji) || item.title || item.name || cleanSlug, query, year, targetAnilistId, alId)
                });
              }
            });
          }
        } else {
          const htmlResults = collectSlugsFromHtml(text);
          htmlResults.forEach((c) => {
            c.score = scoreCandidate(c.title, query, year, targetAnilistId, null);
            candidates.push(c);
          });
        }
      } catch (_) {
      }
      if (candidates.some((c) => c.score >= 1e3))
        break;
      if (candidates.length > 0 && !targetAnilistId)
        break;
    }
    const unique = [];
    const seen = /* @__PURE__ */ new Set();
    for (const candidate of candidates) {
      if (!candidate.slug || seen.has(candidate.slug))
        continue;
      seen.add(candidate.slug);
      unique.push(candidate);
    }
    unique.sort((a, b) => b.score - a.score);
    if (unique.length > 0) {
      console.log(`[Reanime] Search for "${query}" found ${unique.length} candidates. Top: "${unique[0].title}" (Score: ${unique[0].score}, AL: ${unique[0].anilistId})`);
    }
    return unique.length > 0 ? unique[0] : null;
  });
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
    while (match = pattern.exec(html)) {
      const value = match[1] || match[0];
      if (value.includes("/e/"))
        urls.push(value.replace(/\\u0026/g, "&"));
    }
  }
  return [...new Set(urls)];
}
function fetchEpisodeSourcesApi(slug, episodeNumber, language, anilistId) {
  return __async(this, null, function* () {
    const endpoints = [
      anilistId ? `/api/flix/${anilistId}/${episodeNumber}` : null,
      `/api/sources/${slug}/${episodeNumber}?lang=${language}`,
      `/api/episode/sources/${slug}/${episodeNumber}?lang=${language}`,
      `/api/anime/${slug}/episodes/${episodeNumber}/sources?lang=${language}`,
      `/api/watch/${slug}?ep=${episodeNumber}&lang=${language}`
    ].filter(Boolean);
    for (const endpoint of endpoints) {
      try {
        const json = yield fetchJson(endpoint, {
          headers: {
            "Referer": `${getBaseUrl()}/watch/${slug}?ep=${episodeNumber}`
          }
        });
        if (Array.isArray(json.servers)) {
          const urls2 = json.servers.filter((server) => !language || server.dataType === language).map((server) => server.dataLink).filter(Boolean);
          if (urls2.length > 0)
            return [...new Set(urls2)];
        }
        const text = JSON.stringify(json);
        const urls = extractDirectFlixUrls(text);
        if (urls.length > 0)
          return urls;
      } catch (_) {
      }
    }
    return [];
  });
}
function getFlixEmbeds(slug, episodeNumber, language, anilistId) {
  return __async(this, null, function* () {
    const watchPath = `/watch/${slug}?ep=${episodeNumber}&lang=${language}`;
    const html = yield fetchText(watchPath);
    const direct = extractDirectFlixUrls(html);
    if (direct.length > 0)
      return { watchUrl: absolutize(watchPath), embeds: direct };
    const apiUrls = yield fetchEpisodeSourcesApi(slug, episodeNumber, language, anilistId);
    return { watchUrl: absolutize(watchPath), embeds: apiUrls };
  });
}

// src/reanime/flixcloud.js
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function getUrlOrigin(url) {
  if (!url)
    return "";
  const match = url.match(/^(https?:\/\/[^\/]+)/);
  return match ? match[1] : "";
}
function safeAtob(str) {
  if (typeof atob === "function")
    return atob(str);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  str = String(str).replace(/=+$/, "");
  for (let bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}
function parseBytes(val) {
  if (!val)
    return new Uint8Array(0);
  if (/^[0-9a-f]+$/i.test(val) && val.length % 2 === 0) {
    const out = new Uint8Array(val.length / 2);
    for (let i = 0; i < val.length; i += 2) {
      out[i / 2] = parseInt(val.substring(i, i + 2), 16);
    }
    return out;
  }
  try {
    const bin = safeAtob(val);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
      out[i] = bin.charCodeAt(i);
    return out;
  } catch (e) {
    return new Uint8Array(0);
  }
}
function extractFlixCloud(embedUrl, referer) {
  return __async(this, null, function* () {
    const pageUrl = normalizeFlixEmbedUrl(embedUrl, referer);
    const origin = getUrlOrigin(pageUrl);
    const response = yield fetch(pageUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": "https://flixcloud.cc/"
      },
      cfKiller: true,
      skipSizeCheck: true
    });
    if (!response.ok)
      throw new Error(`FlixCloud embed HTTP ${response.status}`);
    const html = yield response.text();
    const data = parseSsrData(html);
    try {
      console.log("[FlixCloud] Trying remote decryption priority...");
      const remoteStream = yield decryptFlixCloudRemote(data, origin);
      const cleanStreamUrl2 = remoteStream.replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
      return {
        url: cleanStreamUrl2,
        videoId: data.video_id,
        title: data.video_title,
        subtitles: data.subtitles || [],
        headers: {
          "Referer": "https://flixcloud.cc/",
          "User-Agent": USER_AGENT
        }
      };
    } catch (remoteError) {
      console.warn(`[FlixCloud] Remote decryption failed: ${remoteError.message}. Falling back to local WASM...`);
    }
    const seed = data.obfuscation_seed;
    const obfuscated = data.obfuscated_crypto_data;
    const wPayload = data.w_payload;
    if (!seed || !obfuscated || !wPayload) {
      throw new Error("FlixCloud crypto payload missing");
    }
    const fields = yield deriveFieldMap(seed);
    const cryptoParts = extractObfuscatedCryptoData(obfuscated, fields);
    const frag2Val = data[fields.keyFrag2Field];
    const tokenRef = data[fields.tokenField];
    if (!frag2Val || !tokenRef) {
      throw new Error("FlixCloud token fields missing");
    }
    const tokenResponse = yield fetch(`${origin}/api/m3u8/${tokenRef}`, {
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": "https://flixcloud.cc/"
      },
      cfKiller: true,
      skipSizeCheck: true
    });
    if (!tokenResponse.ok)
      throw new Error(`FlixCloud token HTTP ${tokenResponse.status}`);
    const tokenJson = yield tokenResponse.json();
    const videoKey = (yield sha256Hex(tokenRef + "vid")).substring(0, 10);
    const keyKey = (yield sha256Hex(tokenRef + "key")).substring(0, 10);
    const encryptedUrlB64 = tokenJson[videoKey];
    const tokenKeyVal = tokenJson[keyKey];
    if (!encryptedUrlB64 || !tokenKeyVal) {
      throw new Error("FlixCloud token response incomplete");
    }
    const wasmKey = yield _runInterpretedWasmTransform(
      wPayload,
      parseBytes(cryptoParts.frag1B64),
      parseBytes(frag2Val),
      parseBytes(tokenKeyVal),
      parseInt(seed.substring(0, 8), 16)
    );
    const streamUrl = yield decryptAesCbcUrl(wasmKey, cryptoParts.ivB64, encryptedUrlB64, seed);
    const cleanStreamUrl = streamUrl.replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
    return {
      url: cleanStreamUrl,
      videoId: data.video_id,
      title: data.video_title,
      subtitles: data.subtitles || [],
      headers: {
        "Referer": "https://flixcloud.cc/",
        "User-Agent": USER_AGENT
      }
    };
  });
}
function normalizeFlixEmbedUrl(url, referer) {
  let finalUrl = url.startsWith("http") ? url : `https://flixcloud.cc${url.startsWith("/") ? "" : "/"}${url}`;
  finalUrl = finalUrl.replace(/[?&]v=[^&]+/, "").replace(/[?&]kuudere_ts=[^&]+/, "");
  const separator = finalUrl.includes("?") ? "&" : "?";
  return `${finalUrl}${separator}v=1&autoPlay=true&skI=false&skO=false&kuudere_ts=${Date.now()}`;
}
function extractBalancedObject(source, startIdx) {
  const start = source.indexOf("{", startIdx);
  if (start < 0)
    return null;
  let depth = 0, quote = null, escape = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escape)
        escape = false;
      else if (ch === "\\")
        escape = true;
      else if (ch === quote)
        quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0)
        return source.substring(start, i + 1);
    }
  }
  return null;
}
function parseSsrData(html) {
  const marker = "obfuscation_seed";
  const markerIdx = html.indexOf(marker);
  if (markerIdx < 0)
    throw new Error("FlixCloud SSR data marker not found");
  let dataIdx = html.lastIndexOf("{", markerIdx);
  while (dataIdx >= 0) {
    const obj = extractBalancedObject(html, dataIdx);
    if (obj && obj.includes(marker)) {
      try {
        const jsonText = obj.replace(/([{,])\s*([A-Za-z_$][A-Za-z0-9_$]*|[0-9a-f]{4,}(?:_[0-9a-f]{4,})?)\s*:/g, '$1"$2":').replace(/,\s*([}\]])/g, "$1");
        const parsed = JSON.parse(jsonText);
        return parsed.data || parsed;
      } catch (e) {
      }
    }
    dataIdx = html.lastIndexOf("{", dataIdx - 1);
  }
  throw new Error("Failed to extract valid SSR data object");
}
function deriveFieldMap(seed) {
  return __async(this, null, function* () {
    let first = seed;
    for (let i = 0; i < 3; i++)
      first = yield sha256Hex(first + String(i));
    let second = first;
    for (let i = 0; i < 3; i++)
      second = yield sha256Hex(second + String(i));
    const fields = {
      keyField: `kf_${first.substring(8, 16)}`,
      ivField: `ivf_${first.substring(16, 24)}`,
      containerName: `cd_${first.substring(24, 32)}`,
      arrayName: `ad_${first.substring(32, 40)}`,
      objectName: `od_${first.substring(40, 48)}`,
      tokenField: `${first.substring(48, 64)}_${first.substring(56, 64)}`,
      keyFrag2Field: `${second.substring(0, 16)}_${second.substring(16, 24)}`
    };
    return fields;
  });
}
function extractObfuscatedCryptoData(data, fields) {
  var _a;
  const container = data[fields.containerName];
  const arr = container == null ? void 0 : container[fields.arrayName];
  const obj = (_a = arr == null ? void 0 : arr[0]) == null ? void 0 : _a[fields.objectName];
  if (!obj)
    throw new Error("Invalid FlixCloud crypto data structure");
  return { frag1B64: obj[fields.keyField], ivB64: obj[fields.ivField] };
}
function _runInterpretedWasmTransform(payloadB64, frag1, frag2, tokenKey, seedInt) {
  return __async(this, null, function* () {
    const wasmBytes = parseBytes(payloadB64);
    const bodies = _wasmFunctionBodies(wasmBytes);
    const len = frag1.length;
    const memory = new Uint8Array(4096 + len * 4);
    const p1 = 1e3, p2 = p1 + len, p3 = p2 + len, out = p3 + len;
    memory.set(frag1, p1);
    memory.set(frag2, p2);
    memory.set(tokenKey, p3);
    const ok = _executeWasmBody(bodies[1], [p1, p2, p3, out, len], [seedInt], memory);
    if (!ok)
      throw new Error("WASM execution failed");
    return memory.subarray(out, out + len);
  });
}
function _wasmFunctionBodies(bytes) {
  const bodies = [];
  let cursor = 8;
  const readUleb = () => {
    let res = 0, shift = 0;
    while (cursor < bytes.length) {
      const b = bytes[cursor++];
      res |= (b & 127) << shift;
      if ((b & 128) === 0)
        break;
      shift += 7;
    }
    return res;
  };
  while (cursor < bytes.length) {
    const id = bytes[cursor++];
    const size = readUleb();
    const end = cursor + size;
    if (id === 10) {
      const count = readUleb();
      for (let i = 0; i < count; i++) {
        const bSize = readUleb();
        bodies.push(bytes.subarray(cursor, cursor + bSize));
        cursor += bSize;
      }
      break;
    }
    cursor = end;
  }
  return bodies;
}
function _executeWasmBody(body, params, globals, memory) {
  let pc = 0;
  const readUleb = () => {
    let res = 0, shift = 0;
    while (pc < body.length) {
      const b = body[pc++];
      res |= (b & 127) << shift;
      if ((b & 128) === 0)
        break;
      shift += 7;
    }
    return res;
  };
  const readSleb = () => {
    let res = 0, shift = 0, b = 0;
    do {
      b = body[pc++];
      res |= (b & 127) << shift;
      shift += 7;
    } while ((b & 128) !== 0);
    if (shift < 32 && (b & 64) !== 0)
      res |= ~0 << shift;
    return res | 0;
  };
  const locals = params.slice();
  const lCount = readUleb();
  for (let i = 0; i < lCount; i++) {
    const c = readUleb();
    pc++;
    for (let j = 0; j < c; j++)
      locals.push(0);
  }
  const blockEnds = _wasmBlockEnds(body, pc);
  const stack = [], cStack = [];
  let steps = 0;
  const branch = (depth) => {
    const idx = cStack.length - 1 - depth;
    if (idx < 0)
      return false;
    const frame = cStack[idx];
    if (frame.isLoop) {
      cStack.length = idx + 1;
      pc = frame.startPc;
    } else {
      cStack.length = idx;
      pc = frame.endPc + 1;
    }
    return true;
  };
  while (pc < body.length && steps++ < 1e6) {
    const opPc = pc, op = body[pc++];
    switch (op) {
      case 2:
      case 3:
        pc++;
        cStack.push({ isLoop: op === 3, startPc: pc, endPc: blockEnds.get(opPc) });
        break;
      case 11:
        if (cStack.length === 0)
          return true;
        cStack.pop();
        break;
      case 12:
        if (!branch(readUleb()))
          return false;
        break;
      case 13: {
        const d = readUleb();
        if (stack.pop() !== 0)
          branch(d);
        break;
      }
      case 32:
        stack.push(locals[readUleb()] | 0);
        break;
      case 33:
        locals[readUleb()] = stack.pop() || 0;
        break;
      case 35:
        stack.push(globals[readUleb()] | 0);
        break;
      case 65:
        stack.push(readSleb());
        break;
      case 45: {
        readUleb();
        const off = readUleb();
        const addr = (stack.pop() || 0) + off;
        stack.push(memory[addr] || 0);
        break;
      }
      case 58: {
        readUleb();
        const off = readUleb();
        const val = stack.pop() || 0;
        const addr = (stack.pop() || 0) + off;
        memory[addr] = val & 255;
        break;
      }
      case 69:
        stack.push((stack.pop() || 0) === 0 ? 1 : 0);
        break;
      case 79: {
        const r = (stack.pop() || 0) >>> 0, l = (stack.pop() || 0) >>> 0;
        stack.push(l >= r ? 1 : 0);
        break;
      }
      case 106: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(l + r | 0);
        break;
      }
      case 107: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(l - r | 0);
        break;
      }
      case 108: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(Math.imul(l, r));
        break;
      }
      case 113: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(l & r);
        break;
      }
      case 114: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(l | r);
        break;
      }
      case 115: {
        const r = stack.pop() || 0, l = stack.pop() || 0;
        stack.push(l ^ r);
        break;
      }
      case 116: {
        const s = (stack.pop() || 0) & 31, v = stack.pop() || 0;
        stack.push(v << s);
        break;
      }
      case 118: {
        const s = (stack.pop() || 0) & 31, v = stack.pop() || 0;
        stack.push(v >>> s);
        break;
      }
    }
  }
  return true;
}
function _wasmBlockEnds(body, start) {
  const ends = /* @__PURE__ */ new Map(), stack = [];
  let pc = start;
  const readUleb = () => {
    while (pc < body.length && (body[pc++] & 128) !== 0) {
    }
  };
  while (pc < body.length) {
    const opPc = pc, op = body[pc++];
    switch (op) {
      case 2:
      case 3:
        pc++;
        stack.push(opPc);
        break;
      case 11:
        if (stack.length > 0)
          ends.set(stack.pop(), opPc);
        break;
      case 12:
      case 13:
      case 32:
      case 33:
      case 35:
      case 65:
        readUleb();
        break;
      case 45:
      case 58:
        readUleb();
        readUleb();
        break;
    }
  }
  return ends;
}
function uint8ArrayToWordArray(arr) {
  const CryptoJS = require("crypto-js");
  const words = [];
  for (let i = 0; i < arr.length; i++) {
    words[i >>> 2] |= (arr[i] & 255) << 24 - i % 4 * 8;
  }
  return CryptoJS.lib.WordArray.create(words, arr.length);
}
function decryptAesCbcUrl(rawKey, ivVal, cipherB64, seed) {
  return __async(this, null, function* () {
    let CryptoJS = null;
    try {
      CryptoJS = require("crypto-js");
    } catch (e) {
    }
    if (CryptoJS && CryptoJS.AES && typeof CryptoJS.AES.decrypt === "function") {
      try {
        const salt = CryptoJS.enc.Utf8.parse(seed);
        const passphrase = uint8ArrayToWordArray(rawKey);
        const iv = uint8ArrayToWordArray(parseBytes(ivVal));
        const derivedKey = CryptoJS.PBKDF2(passphrase, salt, { keySize: 256 / 32, iterations: 1e3, hasher: CryptoJS.algo.SHA256 });
        const keyBytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          keyBytes[i] = derivedKey.words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
        }
        for (let i = 0; i < 32; i++) {
          keyBytes[i] ^= seed.charCodeAt(i % seed.length);
        }
        const finalKey = CryptoJS.SHA256(uint8ArrayToWordArray(keyBytes));
        const decrypted = CryptoJS.AES.decrypt(cipherB64, finalKey, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
        const result = decrypted.toString(CryptoJS.enc.Utf8);
        if (result)
          return result.trim();
      } catch (e) {
        console.warn("[FlixCloud] Local decryption failed, trying remote...");
      }
    }
    console.log("[FlixCloud] Using remote decryption helper...");
    try {
      const response = yield fetch("https://id-mapping-api-nuvio-extraction-api.hf.space/decrypt/flixcloud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawKey: uint8ArrayToBase64(rawKey),
          ivVal,
          cipherText: cipherB64,
          seed
        })
      });
      if (!response.ok)
        throw new Error(`Remote decrypt HTTP ${response.status}`);
      const { decrypted } = yield response.json();
      if (!decrypted)
        throw new Error("Remote decrypt returned empty result");
      return decrypted.trim();
    } catch (error) {
      throw new Error(`Decryption failed (Local: Unsupported, Remote: ${error.message})`);
    }
  });
}
function uint8ArrayToBase64(arr) {
  let bin = "";
  for (let i = 0; i < arr.length; i++)
    bin += String.fromCharCode(arr[i]);
  if (typeof btoa === "function")
    return btoa(bin);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let i = 0; i < bin.length; i += 3) {
    let a = bin.charCodeAt(i), b = bin.charCodeAt(i + 1), c = bin.charCodeAt(i + 2);
    output += chars[a >> 2];
    output += chars[(a & 3) << 4 | b >> 4];
    output += chars[isNaN(b) ? 64 : (b & 15) << 2 | c >> 6];
    output += chars[isNaN(b) || isNaN(c) ? 64 : c & 63];
  }
  return output;
}
function sha256Hex(text) {
  return __async(this, null, function* () {
    const CryptoJS = require("crypto-js");
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
  });
}
function decryptFlixCloudRemote(data, origin) {
  return __async(this, null, function* () {
    var _a, _b;
    const resolveResponse = yield fetch("https://enc-dec.app/api/dec-flixcloud?type=token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify({ data })
    });
    if (!resolveResponse.ok)
      throw new Error(`Resolve API HTTP ${resolveResponse.status}`);
    const resolveJson = yield resolveResponse.json();
    const result = resolveJson.result || resolveJson;
    const token = result.token || result.context && result.context.token;
    const context = result.context || result;
    if (!token) {
      throw new Error("Could not find token in resolve API response");
    }
    const tokenResponse = yield fetch(`${origin}/api/m3u8/${token}`, {
      headers: {
        "User-Agent": USER_AGENT,
        "Referer": "https://flixcloud.cc/"
      },
      cfKiller: true,
      skipSizeCheck: true
    });
    if (!tokenResponse.ok)
      throw new Error(`FlixCloud token authorization HTTP ${tokenResponse.status}`);
    const tokenJson = yield tokenResponse.json();
    const decryptResponse = yield fetch("https://enc-dec.app/api/dec-flixcloud?type=stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT
      },
      body: JSON.stringify({
        data: {
          context,
          stream_response: tokenJson,
          token_response: tokenJson
        }
      })
    });
    if (!decryptResponse.ok)
      throw new Error(`Decrypt API HTTP ${decryptResponse.status}`);
    const decryptJson = yield decryptResponse.json();
    const stream = ((_a = decryptJson.result) == null ? void 0 : _a.stream) || ((_b = decryptJson.result) == null ? void 0 : _b.url) || decryptJson.result;
    if (!stream || typeof stream !== "string") {
      throw new Error("Decrypt API did not return a valid stream URL");
    }
    return stream;
  });
}

// src/reanime/index.js
function getStreams(contentId, mediaType = "tv", season = null, episode = null) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      if (mediaType !== "tv" && mediaType !== "movie")
        return [];
      let alId = null;
      let episodeNumber = mediaType === "tv" ? Number(episode || 1) : 1;
      let searchTitle = "";
      let animeSlug = null;
      const isDirectSlug = typeof contentId === "string" && !/^\d+$/.test(contentId) && !contentId.startsWith("tt") && !contentId.startsWith("anilist:") && !contentId.startsWith("tmdb:");
      if (isDirectSlug) {
        const cleanSlug = contentId.replace(/^reanime:/, "");
        try {
          const details = yield fetchAnimeDetails(cleanSlug);
          if (details && details.anime_id) {
            animeSlug = details.anime_id;
            alId = details.anilist_id ? String(details.anilist_id) : null;
            searchTitle = ((_a = details.title) == null ? void 0 : _a.english) || ((_b = details.title) == null ? void 0 : _b.romaji) || animeSlug;
          }
        } catch (_) {
        }
      }
      if (!animeSlug) {
        if (typeof contentId === "string" && contentId.startsWith("anilist:")) {
          alId = contentId.split(":")[1];
          const alInfo = yield getAnilistMediaInfo(alId);
          searchTitle = alInfo.title;
        } else {
          const tmdbId = String(contentId).replace(/^tmdb:/, "");
          const syncInfo = yield getSyncInfo(tmdbId, mediaType, season, episodeNumber);
          searchTitle = syncInfo.title;
          const syncResult = yield resolveByDate(syncInfo.releaseDate, syncInfo.title, episodeNumber, syncInfo.episodeTitle, syncInfo.dayIndex);
          if (syncResult && syncResult.alId) {
            alId = String(syncResult.alId);
            episodeNumber = syncResult.episode;
            searchTitle = syncResult.title;
          } else {
            const tmdb = yield getTmdbInfo(tmdbId, mediaType);
            searchTitle = tmdb.title;
          }
        }
        const anime = yield searchReanimeAnime(searchTitle, null, alId);
        if (!anime || !anime.slug)
          return [];
        animeSlug = anime.slug;
        if (!alId && anime.anilistId)
          alId = String(anime.anilistId);
      }
      const streams = [];
      const watchUrl = `${getBaseUrl()}/watch/${animeSlug}?ep=${episodeNumber}`;
      if (alId) {
        const servers = yield fetchFlixServers(alId, episodeNumber, animeSlug);
        for (const server of servers) {
          if (!server.dataLink)
            continue;
          try {
            const extracted = yield extractFlixCloud(server.dataLink, watchUrl);
            if (extracted && extracted.url) {
              const lang = (server.dataType || "sub").toUpperCase();
              const sName = server.serverName || "HD-1";
              const softsubStr = server.softsub ? " [Softsub]" : "";
              const streamTitle = mediaType === "movie" ? `${searchTitle} (${lang})` : `${searchTitle} - Episode ${episodeNumber} (${lang})`;
              streams.push({
                name: `Reanime [${lang}] ${sName}${softsubStr}`,
                title: streamTitle,
                url: extracted.url,
                quality: "Auto",
                server: `${sName}${softsubStr}`,
                headers: extracted.headers,
                provider: "reanime",
                type: "m3u8",
                subtitles: extracted.subtitles
              });
            }
          } catch (_) {
          }
        }
      }
      if (streams.length === 0) {
        const languages = ["sub", "dub"];
        for (const language of languages) {
          const { watchUrl: wUrl, embeds } = yield getFlixEmbeds(animeSlug, episodeNumber, language, alId);
          for (let i = 0; i < embeds.length; i++) {
            try {
              const extracted = yield extractFlixCloud(embeds[i], wUrl);
              if (extracted && extracted.url) {
                const streamTitle = mediaType === "movie" ? `${searchTitle} (${language.toUpperCase()})` : `${searchTitle} - Episode ${episodeNumber} (${language.toUpperCase()})`;
                streams.push({
                  name: `Reanime ${language.toUpperCase()} HD-${i + 1}`,
                  title: streamTitle,
                  url: extracted.url,
                  quality: "Auto",
                  server: `HD-${i + 1}`,
                  headers: extracted.headers,
                  provider: "reanime",
                  type: "m3u8",
                  subtitles: extracted.subtitles
                });
              }
            } catch (_) {
            }
          }
        }
      }
      const seen = /* @__PURE__ */ new Set();
      return streams.filter((s) => {
        if (!s.url || seen.has(s.url))
          return false;
        seen.add(s.url);
        return true;
      });
    } catch (_) {
      return [];
    }
  });
}
function getHome() {
  return __async(this, null, function* () {
    try {
      const [latestRes, popularRes, topRatedRes] = yield Promise.allSettled([
        fetchLatestAired(24, "sub"),
        fetchPopular(24, 1),
        fetchTopRated(24, 1)
      ]);
      const sections = [];
      if (latestRes.status === "fulfilled" && latestRes.value) {
        const list = latestRes.value.data || latestRes.value.results || [];
        const items = list.map(toHomeItem).filter(Boolean);
        if (items.length > 0) {
          sections.push({
            title: "Latest Episodes",
            items
          });
        }
      }
      if (popularRes.status === "fulfilled" && popularRes.value) {
        const list = popularRes.value.results || popularRes.value.data || [];
        const items = list.map(toHomeItem).filter(Boolean);
        if (items.length > 0) {
          sections.push({
            title: "Popular Anime",
            items
          });
        }
      }
      if (topRatedRes.status === "fulfilled" && topRatedRes.value) {
        const list = topRatedRes.value.results || topRatedRes.value.data || [];
        const items = list.map(toHomeItem).filter(Boolean);
        if (items.length > 0) {
          sections.push({
            title: "Top Rated",
            items
          });
        }
      }
      return sections;
    } catch (_) {
      return [];
    }
  });
}
function search(query, page = 1) {
  return __async(this, null, function* () {
    try {
      if (!query || !query.trim())
        return [];
      const res = yield searchAnimeApi(query.trim(), page, 36);
      const list = res.results || res.data || [];
      return list.map(toHomeItem).filter(Boolean);
    } catch (_) {
      return [];
    }
  });
}
function getAnimeInfo(contentId) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
      if (!contentId)
        return null;
      let slug = String(contentId).replace(/^reanime:/, "");
      if (slug.startsWith("anilist:") || /^\d+$/.test(slug)) {
        const isAl = slug.startsWith("anilist:");
        const targetId = isAl ? slug.split(":")[1] : slug;
        let title = "";
        let alId = isAl ? targetId : null;
        if (isAl) {
          const alInfo = yield getAnilistMediaInfo(targetId);
          title = alInfo.title;
        } else {
          const tmdb = yield getTmdbInfo(targetId, "tv");
          title = tmdb.title;
        }
        const candidate = yield searchReanimeAnime(title, null, alId);
        if (candidate && candidate.slug) {
          slug = candidate.slug;
        } else {
          return null;
        }
      }
      const details = yield fetchAnimeDetails(slug);
      if (!details || !details.anime_id)
        return null;
      const anilistId = details.anilist_id;
      const [episodesRes, thumbnailsRes, recsRes] = yield Promise.allSettled([
        fetchAnimeEpisodes(slug, 2e3),
        anilistId ? fetchThumbnails(anilistId) : Promise.resolve(null),
        fetchAnimeRecommendations(slug)
      ]);
      const rawEpisodes = episodesRes.status === "fulfilled" && episodesRes.value ? episodesRes.value.data || [] : [];
      const thumbnails = thumbnailsRes.status === "fulfilled" ? thumbnailsRes.value : null;
      const recommendations = recsRes.status === "fulfilled" && recsRes.value ? recsRes.value : [];
      const subCount = details.subbed != null ? details.subbed : null;
      const dubCount = details.dubbed != null ? details.dubbed : null;
      const episodes = rawEpisodes.map((ep) => {
        const epNum = Math.floor(ep.episode_number || 1);
        const epNumStr = String(epNum);
        const titleStr = ep.title || (ep.title_romanji || `Episode ${epNum}`);
        const hasSub = subCount == null || epNum <= subCount;
        const hasDub = dubCount != null ? epNum <= dubCount : false;
        return {
          id: ep.episodeId || `ep-${epNum}`,
          episode: epNum,
          season: 1,
          title: ep.is_recap ? `${titleStr} [Recap]` : titleStr,
          thumbnail: thumbnails && thumbnails[epNumStr] || ep.thumbnail || null,
          overview: ep.description || null,
          isFiller: Boolean(ep.is_filler),
          isSub: hasSub,
          isDub: hasDub
        };
      });
      const related = recommendations.map(toHomeItem).filter(Boolean);
      return {
        id: details.anime_id || slug,
        title: ((_a = details.title) == null ? void 0 : _a.english) || ((_b = details.title) == null ? void 0 : _b.romaji) || ((_c = details.title) == null ? void 0 : _c.native) || slug,
        poster: ((_d = details.cover_image) == null ? void 0 : _d.extra_large) || ((_e = details.cover_image) == null ? void 0 : _e.large) || ((_f = details.cover_image) == null ? void 0 : _f.medium) || null,
        banner: details.banner_image || null,
        description: details.description || null,
        totalEpisodes: (episodes.length > 0 ? episodes.length : null) || subCount,
        subEpisodes: subCount,
        dubEpisodes: dubCount,
        ageRating: details.rating || null,
        status: details.status || null,
        genres: details.genres || [],
        year: details.season_year ? String(details.season_year) : null,
        episodes,
        related
      };
    } catch (_) {
      return null;
    }
  });
}
function onSettings() {
  return __async(this, null, function* () {
    return [
      { type: "header", label: "Domain Selection" },
      {
        type: "select",
        key: "domain",
        label: "Preferred Domain",
        description: "Reanime operates across multiple domains. Choose the one currently working for you.",
        options: [
          { label: "reanime.to", value: "https://reanime.to" },
          { label: "reanime.cz", value: "https://reanime.cz" },
          { label: "reanime.wtf", value: "https://reanime.wtf" }
        ],
        defaultValue: "https://reanime.to"
      }
    ];
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getStreams,
    getAnimeInfo,
    getDetails: getAnimeInfo,
    getHome,
    getMainPage: getHome,
    search,
    searchAnime: search,
    onSettings
  };
} else {
  global.getStreams = getStreams;
  global.getAnimeInfo = getAnimeInfo;
  global.getDetails = getAnimeInfo;
  global.getHome = getHome;
  global.getMainPage = getHome;
  global.search = search;
  global.searchAnime = search;
  global.onSettings = onSettings;
}
