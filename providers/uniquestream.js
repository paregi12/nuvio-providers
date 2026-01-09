/**
 * uniquestream - Built from src/uniquestream/
 * Generated: 2026-01-09T05:50:31.873Z
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
        ...searchData.movies || []
      ];
      if (results.length === 0) {
        console.log("[UniqueStream] No results found.");
        return [];
      }
      let anime = results.find((a) => a.title.toLowerCase() === title.toLowerCase());
      if (!anime)
        anime = results.find((a) => a.title.toLowerCase().includes(title.toLowerCase()));
      if (!anime)
        anime = results[0];
      console.log(`[UniqueStream] Selected: ${anime.title} (${anime.content_id}) [Type: ${anime.type}]`);
      let targetEp = null;
      let endpointType = "episode";
      let audioLocales = ["ja-JP", "en-US"];
      if (anime.type === "movie") {
        targetEp = anime;
        endpointType = "movie";
      } else {
        const seriesUrl = `${API_URL}/series/${anime.content_id}`;
        const seriesData = yield fetchJson(seriesUrl);
        if (!seriesData || !seriesData.seasons) {
          console.log("[UniqueStream] No seasons found.");
          return [];
        }
        audioLocales = seriesData.audio_locales || ["ja-JP", "en-US"];
        const targetSeasonStr = season.toString();
        let matchingSeasons = seriesData.seasons.filter((s) => s.display_number === targetSeasonStr);
        if (matchingSeasons.length === 0 && (season === 1 || mediaType === "movie")) {
          matchingSeasons = seriesData.seasons.filter((s) => !s.display_number);
        }
        if (matchingSeasons.length === 0) {
          console.log(`[UniqueStream] Season ${season} not found.`);
          return [];
        }
        const selectedSeason = matchingSeasons[0];
        console.log(`[UniqueStream] Selected Season: ${selectedSeason.title} (${selectedSeason.content_id})`);
        let absoluteOffset = 0;
        const processedDisplays = /* @__PURE__ */ new Set();
        const priorSeasons = seriesData.seasons.filter((s) => {
          const dn = parseInt(s.display_number);
          return !isNaN(dn) && dn < season;
        });
        priorSeasons.forEach((s) => {
          if (!processedDisplays.has(s.display_number)) {
            absoluteOffset += s.episode_count;
            processedDisplays.add(s.display_number);
          }
        });
        const targetAbsoluteEp = absoluteOffset + episode;
        console.log(`[UniqueStream] Target Absolute Ep: ${targetAbsoluteEp} (Relative: ${episode})`);
        let page = Math.ceil(episode / 20);
        let limit = 20;
        const fetchEpisodes = (p) => __async(this, null, function* () {
          const u = `${API_URL}/season/${selectedSeason.content_id}/episodes?page=${p}&limit=${limit}&order_by=asc`;
          return yield fetchJson(u);
        });
        let epsData = yield fetchEpisodes(page);
        const isMatch = (e) => e.episode_number == targetAbsoluteEp || e.episode_number == episode || mediaType === "movie" && e.episode_number == 0;
        targetEp = epsData.find(isMatch);
        if (!targetEp) {
          console.log("[UniqueStream] Episode not found on estimated page. scanning adjacent...");
          if (page > 1) {
            const prevData = yield fetchEpisodes(page - 1);
            targetEp = prevData.find(isMatch);
          }
          if (!targetEp) {
            const nextData = yield fetchEpisodes(page + 1);
            targetEp = nextData.find(isMatch);
          }
        }
        if (targetEp) {
          console.log(`[UniqueStream] Found Episode: ${targetEp.title} (${targetEp.content_id})`);
        }
      }
      if (!targetEp) {
        console.log(`[UniqueStream] Content not found.`);
        return [];
      }
      const streams = [];
      const processedUrls = /* @__PURE__ */ new Set();
      const endpoints = new Set(audioLocales);
      endpoints.add("ja-JP");
      endpoints.add("en-US");
      const promises = Array.from(endpoints).map((locale) => __async(this, null, function* () {
        try {
          const mediaUrl = `${API_URL}/${endpointType}/${targetEp.content_id}/media/hls/${locale}`;
          const mediaData = yield fetchJson(mediaUrl);
          processMediaData(mediaData, streams, processedUrls);
        } catch (e) {
        }
      }));
      yield Promise.all(promises);
      return streams;
    } catch (error) {
      console.error(`[UniqueStream] Error: ${error.message}`);
      return [];
    }
  });
}
function processMediaData(data, streams, processedUrls) {
  if (!data)
    return;
  const processHlsObj = (hls) => {
    if (!hls)
      return;
    const headers = {
      "Origin": "https://anime.uniquestream.net",
      "Referer": "https://anime.uniquestream.net/"
    };
    const locale = hls.locale;
    if (hls.playlist && !processedUrls.has(hls.playlist)) {
      processedUrls.add(hls.playlist);
      let title = `UniqueStream Dub (${getLangName(locale)})`;
      if (locale === "ja-JP")
        title = `UniqueStream Raw (${getLangName(locale)})`;
      streams.push({
        name: "UniqueStream",
        title,
        url: hls.playlist,
        quality: "Auto",
        type: "hls",
        headers
      });
    }
    if (hls.hard_subs) {
      hls.hard_subs.forEach((sub) => {
        if (sub.playlist && !processedUrls.has(sub.playlist)) {
          processedUrls.add(sub.playlist);
          streams.push({
            name: "UniqueStream",
            title: `UniqueStream Sub (${getLangName(sub.locale)})`,
            url: sub.playlist,
            quality: "Auto",
            type: "hls",
            headers
          });
        }
      });
    }
  };
  if (data.hls)
    processHlsObj(data.hls);
  if (data.versions && data.versions.hls) {
    data.versions.hls.forEach(processHlsObj);
  }
}
module.exports = { getStreams };
