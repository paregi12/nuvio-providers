/**
 * uniquestream - Built from src/uniquestream/
 * Generated: 2026-01-09T07:08:38.917Z
 */
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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

// src/uniquestream/http.js
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://anime.uniquestream.net/",
  "Origin": "https://anime.uniquestream.net"
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    console.log(`[UniqueStream] Fetching: ${url}`);
    const response = yield fetch(url, __spreadValues({
      headers: __spreadValues(__spreadValues({}, HEADERS), options.headers)
    }, options));
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} for ${url}`);
    }
    return yield response.text();
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const raw = yield fetchText(url, options);
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error(`[UniqueStream] Failed to parse JSON from ${url}:`, raw.substring(0, 100));
      throw e;
    }
  });
}

// src/uniquestream/tmdb.js
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    console.log(`[UniqueStream] Fetching TMDB details from: ${url}`);
    try {
      const data = yield fetchJson(url);
      const title = data.name || data.title || data.original_name;
      const year = (data.first_air_date || data.release_date || "").substring(0, 4);
      return { title, year };
    } catch (e) {
      console.error("[UniqueStream] Failed to fetch TMDB metadata", e);
      return null;
    }
  });
}

// src/uniquestream/constants.js
var API_URL = "https://anime.uniquestream.net/api/v1";

// src/uniquestream/index.js
var LOCALE_MAP = {
  "en-US": "English",
  "es-419": "Spanish (LatAm)",
  "es-ES": "Spanish",
  "pt-BR": "Portuguese",
  "fr-FR": "French",
  "de-DE": "German",
  "it-IT": "Italian",
  "ru-RU": "Russian",
  "ja-JP": "Japanese"
};
function getLangName(locale) {
  return LOCALE_MAP[locale] || locale;
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      if (!season)
        season = 1;
      if (!episode)
        episode = 1;
      const tmdb = yield getTmdbInfo(tmdbId, mediaType);
      if (!tmdb)
        return [];
      const { title, year } = tmdb;
      console.log(`[UniqueStream] Processing: ${title} (${year}) S${season}E${episode} (${mediaType})`);
      const searchUrl = `${API_URL}/search?page=1&query=${encodeURIComponent(title)}&t=all&limit=20`;
      const searchData = yield fetchJson(searchUrl);
      const results = [
        ...searchData.series || [],
        ...searchData.movies || [],
        ...searchData.episodes || []
      ];
      if (results.length === 0)
        return [];
      let anime = results.find((a) => a.title.toLowerCase() === title.toLowerCase());
      if (!anime)
        anime = results.find((a) => a.title.toLowerCase().includes(title.toLowerCase()));
      if (!anime)
        anime = results[0];
      console.log(`[UniqueStream] Selected: ${anime.title} [Type: ${anime.type}]`);
      let targetEp = null;
      let endpointType = "episode";
      if (anime.type === "movie" || anime.type === "episode") {
        targetEp = anime;
        endpointType = anime.type;
      } else {
        const seriesUrl = `${API_URL}/series/${anime.content_id}`;
        const seriesData = yield fetchJson(seriesUrl);
        if (!seriesData || !seriesData.seasons)
          return [];
        const targetSeasonStr = season.toString();
        let matchingSeasons = seriesData.seasons.filter((s) => s.display_number === targetSeasonStr);
        if (matchingSeasons.length === 0 && (season === 1 || mediaType === "movie")) {
          matchingSeasons = seriesData.seasons.filter((s) => !s.display_number);
        }
        if (matchingSeasons.length === 0)
          return [];
        const selectedSeason = matchingSeasons[0];
        let absoluteOffset = 0;
        const processedDisplays = /* @__PURE__ */ new Set();
        seriesData.seasons.filter((s) => {
          const dn = parseInt(s.display_number);
          return !isNaN(dn) && dn < season;
        }).forEach((s) => {
          if (!processedDisplays.has(s.display_number)) {
            absoluteOffset += s.episode_count;
            processedDisplays.add(s.display_number);
          }
        });
        const targetAbsoluteEp = absoluteOffset + episode;
        let page = Math.ceil(episode / 20);
        const fetchEpisodes = (p) => __async(this, null, function* () {
          const u = `${API_URL}/season/${selectedSeason.content_id}/episodes?page=${p}&limit=20&order_by=asc`;
          return yield fetchJson(u);
        });
        let epsData = yield fetchEpisodes(page);
        const isMatch = (e) => e.episode_number == targetAbsoluteEp || e.episode_number == episode || mediaType === "movie" && e.episode_number == 0;
        targetEp = epsData.find(isMatch);
        if (!targetEp) {
          if (page > 1)
            targetEp = (yield fetchEpisodes(page - 1)).find(isMatch);
          if (!targetEp)
            targetEp = (yield fetchEpisodes(page + 1)).find(isMatch);
        }
      }
      if (!targetEp)
        return [];
      const streams = [];
      const processedUrls = /* @__PURE__ */ new Set();
      const endpoints = ["ja-JP", "en-US"];
      for (const locale of endpoints) {
        try {
          const mediaUrl = `${API_URL}/${endpointType}/${targetEp.content_id}/media/hls/${locale}`;
          const mediaData = yield fetchJson(mediaUrl);
          processMediaData(mediaData, streams, processedUrls);
        } catch (e) {
        }
      }
      return streams.sort((a, b) => {
        const getScore = (s) => {
          let score = 0;
          const t = s.title.toLowerCase();
          if (t.includes("english"))
            score += 100;
          if (t.includes("japanese") || t.includes("raw"))
            score += 50;
          return score;
        };
        return getScore(b) - getScore(a);
      });
    } catch (error) {
      console.error(`[UniqueStream] Error: ${error.message}`);
      return [];
    }
  });
}
function processMediaData(data, streams, processedUrls) {
  if (!data)
    return;
  const headers = {
    "Origin": "https://anime.uniquestream.net",
    "Referer": "https://anime.uniquestream.net/"
  };
  const handleHls = (hls) => {
    if (!hls)
      return;
    const locale = hls.locale;
    const langName = getLangName(locale);
    const addStream = (url, isSub, subLocale) => {
      if (!url || processedUrls.has(url))
        return;
      processedUrls.add(url);
      let title = isSub ? `UniqueStream Sub (${getLangName(subLocale)})` : locale === "ja-JP" ? `UniqueStream Raw (${langName})` : `UniqueStream Dub (${langName})`;
      streams.push({
        name: "UniqueStream",
        title: `${title} [Multi-Quality]`,
        url,
        quality: "Auto",
        type: "hls",
        headers
      });
    };
    if (hls.playlist)
      addStream(hls.playlist, false);
    if (hls.hard_subs) {
      hls.hard_subs.forEach((sub) => addStream(sub.playlist, true, sub.locale));
    }
  };
  if (data.hls)
    handleHls(data.hls);
  if (data.versions && data.versions.hls) {
    data.versions.hls.forEach(handleHls);
  }
}
module.exports = { getStreams };
