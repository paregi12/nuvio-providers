/**
 * reanime - Built from src/reanime/
 * Generated: 2026-10-12T08:07:36.176Z
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

// src/reanime/constants.js
var REANIME_BASE = "https://reanime.to";
var ANILIST_URL = "https://graphql.anilist.co";
var CINEMETA_URL = "https://v3-cinemeta.strem.io/meta";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "Accept-Language": "en-US,en;q=0.9"
};
var FLIX_HEADERS = __spreadProps(__spreadValues({}, HEADERS), {
  "Referer": REANIME_BASE + "/"
});

// src/reanime/client.js
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

// src/reanime/metadata.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/reanime/home.js
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
  const rawFormat = (item.format || item.type || "").toLowerCase();
  const type = rawFormat || (episodes === 1 ? "movie" : "tv");
  return {
    id: String(id),
    title,
    poster,
    banner,
    description,
    rating,
    year,
    type,
    format: rawFormat || type,
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

// src/reanime/metadata.js
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
function getSyncInfo(id, mediaType, season, episode) {
  return __async(this, null, function* () {
    const isImdb = typeof id === "string" && id.indexOf("tt") === 0;
    const getCinemetaInfo = (imdbId) => __async(this, null, function* () {
      const type = mediaType === "movie" ? "movie" : "series";
      const url = `${CINEMETA_URL}/${type}/${imdbId}.json`;
      try {
        const data = yield fetchJson(url);
        const meta = data.meta;
        if (!meta)
          throw new Error("No Cinemeta metadata");
        if (mediaType === "movie")
          return { date: meta.released ? meta.released.split("T")[0] : null, title: meta.name, dayIndex: 1 };
        const videos = meta.videos || [];
        const target = videos.find((v) => v.season == season && v.episode == episode);
        if (!target || !target.released)
          return { date: null, title: meta.name, episodeTitle: null, dayIndex: 1 };
        const targetDate = target.released.split("T")[0];
        const dayIndex = videos.filter((v) => v.season == season && v.released && v.released.split("T")[0] === targetDate && parseInt(v.episode) < parseInt(episode)).length + 1;
        return { date: targetDate, title: meta.name, episodeTitle: target.name || null, dayIndex };
      } catch (e) {
        return { date: null, title: null, dayIndex: 1 };
      }
    });
    if (isImdb) {
      const info = yield getCinemetaInfo(id);
      if (info.date)
        return { imdbId: id, releaseDate: info.date, title: info.title, episodeTitle: info.episodeTitle, dayIndex: info.dayIndex, episode };
      throw new Error("Could not find release date on Cinemeta");
    }
    throw new Error(`Unsupported ID format: ${id}`);
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
    return unique.length > 0 ? unique[0] : null;
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
      if (slug.startsWith("anilist:")) {
        const targetId = slug.split(":")[1];
        const alInfo = yield getAnilistMediaInfo(targetId);
        const candidate = yield searchReanimeAnime(alInfo.title, null, targetId);
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
        const episodeId = ep.episodeId || `ep-${epNum}`;
        const episodeKey = String(episodeId).replace(/^ep-/, "");
        const titleStr = ep.title || (ep.title_romanji || `Episode ${epNum}`);
        const hasSub = subCount == null || epNum <= subCount;
        const hasDub = dubCount != null ? epNum <= dubCount : false;
        return {
          id: episodeId,
          episodeUrl: absolutize(`/watch/${slug}?ep=${encodeURIComponent(episodeKey)}`),
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
      const rawFormat = (details.format || details.type || "").toLowerCase();
      const detectedType = rawFormat || (episodes.length === 1 ? "movie" : "tv");
      return {
        id: details.anime_id || slug,
        title: ((_a = details.title) == null ? void 0 : _a.english) || ((_b = details.title) == null ? void 0 : _b.romaji) || ((_c = details.title) == null ? void 0 : _c.native) || slug,
        poster: ((_d = details.cover_image) == null ? void 0 : _d.extra_large) || ((_e = details.cover_image) == null ? void 0 : _e.large) || ((_f = details.cover_image) == null ? void 0 : _f.medium) || null,
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
        episodes,
        related
      };
    } catch (_) {
      return null;
    }
  });
}

// src/reanime/streamextraction.js
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function getUrlOrigin(url) {
  if (!url)
    return "";
  const match = url.match(/^(https?:\/\/[^\/]+)/);
  return match ? match[1] : "";
}
function normalizeFlixEmbedUrl(url) {
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
  const match = html.match(/type:\s*"data",\s*data:\s*(\{.*?\})\s*,\s*uses:/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (_) {
    }
  }
  const marker = "obfuscation_seed";
  const markerIdx = html.indexOf(marker);
  if (markerIdx >= 0) {
    let dataIdx = html.lastIndexOf("{", markerIdx);
    while (dataIdx >= 0) {
      const obj = extractBalancedObject(html, dataIdx);
      if (obj && obj.includes(marker)) {
        try {
          const jsonText = obj.replace(/([{,])\s*([A-Za-z_$][A-Za-z0-9_$]*|[0-9a-f]{4,}(?:_[0-9a-f]{4,})?)\s*:/g, '$1"$2":').replace(/,\s*([}\]])/g, "$1");
          const parsed = JSON.parse(jsonText);
          return parsed.data || parsed;
        } catch (_) {
        }
      }
      dataIdx = html.lastIndexOf("{", dataIdx - 1);
    }
  }
  throw new Error("FlixCloud SSR data not found");
}
function extractFlixCloud(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    const pageUrl = normalizeFlixEmbedUrl(embedUrl);
    const origin = getUrlOrigin(pageUrl) || "https://flixcloud.cc";
    const response = yield fetch(pageUrl, {
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
    const html = yield response.text();
    const data = parseSsrData(html);
    const cleanedData = __spreadValues({}, data);
    delete cleanedData.subtitles;
    delete cleanedData.intro_chapter;
    delete cleanedData.outro_chapter;
    const resolveResponse = yield fetch("https://enc-dec.app/api/dec-flixcloud?type=token", {
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
    const resolveJson = yield resolveResponse.json();
    const result = resolveJson.result || resolveJson;
    const token = result.token || result.context && result.context.token;
    const context = result.context || result;
    if (!token) {
      throw new Error("Missing token in FlixCloud resolve response");
    }
    const tokenResponse = yield fetch(`${origin}/api/m3u8/${token}`, {
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
          stream_response: tokenJson
        }
      })
    });
    if (!decryptResponse.ok) {
      throw new Error(`Decrypt API HTTP ${decryptResponse.status}`);
    }
    const decryptJson = yield decryptResponse.json();
    const streamResult = decryptJson.result || {};
    const stream = streamResult.stream || streamResult.url || decryptJson.result;
    const wPayload = ((_a = streamResult.context) == null ? void 0 : _a.w_payload) || (context == null ? void 0 : context.w_payload);
    if (!stream || typeof stream !== "string") {
      throw new Error("Decrypt API did not return a valid stream URL");
    }
    let cleanStreamUrl = stream.replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
    if (wPayload) {
      cleanStreamUrl = `https://enc-dec.app/api/parse-flixcloud?url=${encodeURIComponent(cleanStreamUrl)}&w_payload=${encodeURIComponent(wPayload)}`;
    }
    const subtitles = (data.subtitles || []).map((s) => {
      const language = s.language || s.lang || s.label || "Unknown";
      return {
        url: s.url || s.file || "",
        language,
        name: s.name || s.label || language,
        kind: "subtitles"
      };
    }).filter((s) => Boolean(s.url));
    return {
      url: cleanStreamUrl,
      videoId: data.video_id,
      title: data.video_title,
      subtitles,
      headers: {
        "Referer": "https://flixcloud.cc/",
        "User-Agent": USER_AGENT
      }
    };
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
function getStreams(_0) {
  return __async(this, arguments, function* (contentId, mediaType = "tv", season = null, episode = null, context = {}) {
    var _a, _b;
    try {
      const isMovie = mediaType === "movie";
      let episodeNumber = isMovie ? 1 : Number(episode || 1);
      let alId = null;
      let searchTitle = "";
      let animeSlug = null;
      if (context == null ? void 0 : context.episodeUrl) {
        try {
          const episodeUrl = new URL(context.episodeUrl, `${getBaseUrl()}/`);
          const episodePath = episodeUrl.pathname.match(/\/watch\/([^/]+)/);
          if (episodePath) {
            contentId = decodeURIComponent(episodePath[1]);
            episodeNumber = episodeUrl.searchParams.get("ep") || episodeNumber;
          }
        } catch (_) {
        }
      }
      const isDirectSlug = typeof contentId === "string" && !/^\d+$/.test(contentId) && !contentId.startsWith("tt") && !contentId.startsWith("anilist:");
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
        } else if (typeof contentId === "string" && contentId.startsWith("tt")) {
          const syncInfo = yield getSyncInfo(contentId, isMovie ? "movie" : "series", season, episodeNumber);
          searchTitle = syncInfo.title;
          const syncResult = yield resolveByDate(syncInfo.releaseDate, syncInfo.title, episodeNumber, syncInfo.episodeTitle, syncInfo.dayIndex);
          if (syncResult && syncResult.alId) {
            alId = String(syncResult.alId);
            episodeNumber = syncResult.episode;
            searchTitle = syncResult.title;
          }
        } else {
          searchTitle = String(contentId || "");
        }
        const anime = yield searchReanimeAnime(searchTitle, null, alId);
        if (!anime || !anime.slug)
          return [];
        animeSlug = anime.slug;
        if (!alId && anime.anilistId)
          alId = String(anime.anilistId);
      }
      const streams = [];
      if (alId) {
        const servers = yield fetchFlixServers(alId, episodeNumber, animeSlug);
        for (const server of servers) {
          if (!server.dataLink)
            continue;
          try {
            const extracted = yield extractFlixCloud(server.dataLink);
            if (extracted && extracted.url) {
              const lang = (server.dataType || "sub").toUpperCase();
              const sName = server.serverName || "HD-1";
              const isDub = lang === "DUB";
              const isSoft = Boolean(server.softsub);
              const format = isDub ? "dub" : isSoft ? "softsub" : "hardsub";
              const softsubStr = isSoft ? " [Softsub]" : "";
              const streamTitle = isMovie ? `${searchTitle} (${lang})` : `${searchTitle} - Episode ${episodeNumber} (${lang})`;
              streams.push({
                name: `Reanime [${lang}] ${sName}${softsubStr}`,
                title: streamTitle,
                url: extracted.url,
                quality: "Auto",
                server: `${sName}${softsubStr}`,
                format,
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
          const { embeds } = yield getFlixEmbeds(animeSlug, episodeNumber, language, alId);
          for (let i = 0; i < embeds.length; i++) {
            try {
              const extracted = yield extractFlixCloud(embeds[i]);
              if (extracted && extracted.url) {
                const streamTitle = isMovie ? `${searchTitle} (${language.toUpperCase()})` : `${searchTitle} - Episode ${episodeNumber} (${language.toUpperCase()})`;
                const isDub = language === "dub";
                const hasSubs = Array.isArray(extracted.subtitles) && extracted.subtitles.length > 0;
                const format = isDub ? "dub" : hasSubs ? "softsub" : "hardsub";
                streams.push({
                  name: `Reanime ${language.toUpperCase()} HD-${i + 1}`,
                  title: streamTitle,
                  url: extracted.url,
                  quality: "Auto",
                  server: `HD-${i + 1}`,
                  format,
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

// src/reanime/index.js
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
