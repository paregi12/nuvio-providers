/**
 * uniquestream - Built from src/uniquestream/
 * Generated: 2026-01-24T12:16:27.282Z
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

// src/uniquestream/http.js
var import_axios = __toESM(require("axios"));

// src/uniquestream/constants.js
var BASE_URL = "https://anime.uniquestream.net";
var API_URL = "https://anime.uniquestream.net/api/v1";
var USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/143.0.0.0 Safari/537.36";

// src/uniquestream/http.js
function request(_0, _1) {
  return __async(this, arguments, function* (method, path, options = {}) {
    const url = path.startsWith("http") ? path : `${path}`;
    try {
      return yield (0, import_axios.default)(__spreadProps(__spreadValues({
        method,
        url
      }, options), {
        headers: __spreadValues({
          "User-Agent": USER_AGENT,
          "Referer": BASE_URL,
          "Origin": BASE_URL
        }, options.headers)
      }));
    } catch (error) {
      throw error;
    }
  });
}

// src/uniquestream/tmdb.js
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
function getMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const endpoint = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
    try {
      const response = yield request("get", url);
      const data = response.data;
      return {
        title: data.name || data.title,
        year: (data.first_air_date || data.release_date || "").split("-")[0]
      };
    } catch (error) {
      return null;
    }
  });
}

// src/uniquestream/utils.js
function normalize(str) {
  if (!str)
    return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}
function isMatch(title1, title2) {
  const n1 = normalize(title1);
  const n2 = normalize(title2);
  return n1.includes(n2) || n2.includes(n1);
}

// src/uniquestream/index.js
function search(query) {
  return __async(this, null, function* () {
    try {
      const url = `${API_URL}/search?page=1&query=${encodeURIComponent(query)}&t=all&limit=20`;
      const response = yield request("get", url);
      const results = [];
      if (response.data.series)
        results.push(...response.data.series);
      if (response.data.movies)
        results.push(...response.data.movies);
      return results;
    } catch (error) {
      console.error("[UniqueStream] Search error:", error.message);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const meta = yield getMetadata(tmdbId, mediaType);
    if (!meta)
      return [];
    console.log(`[UniqueStream] Searching for: ${meta.title}`);
    const results = yield search(meta.title);
    let matchedItem = results.find((item) => {
      const isTitleMatch = isMatch(item.title, meta.title);
      const itemType = item.type === "show" ? "tv" : "movie";
      return isTitleMatch && itemType === mediaType;
    });
    if (!matchedItem) {
      console.log("[UniqueStream] No match found");
      return [];
    }
    console.log(`[UniqueStream] Match: ${matchedItem.title} (${matchedItem.content_id})`);
    let episodeId = null;
    if (mediaType === "movie") {
      try {
        const details = yield request("get", `${API_URL}/series/${matchedItem.content_id}`);
      } catch (e) {
      }
    }
    if (!episodeId) {
      try {
        const detailsUrl = `${API_URL}/series/${matchedItem.content_id}`;
        const detailsRes = yield request("get", detailsUrl);
        const seasons = detailsRes.data.seasons || [];
        const targetSeason = seasons.find((s) => s.season_number === parseInt(season));
        if (!targetSeason) {
          console.log(`[UniqueStream] Season ${season} not found`);
          return [];
        }
        let page = 1;
        let foundEpisode = null;
        let hasMore = true;
        while (hasMore) {
          const episodesUrl = `${API_URL}/season/${targetSeason.content_id}/episodes?page=${page}&limit=20&order_by=asc`;
          const episodesRes = yield request("get", episodesUrl);
          const episodes = episodesRes.data || [];
          if (episodes.length === 0) {
            hasMore = false;
            break;
          }
          foundEpisode = episodes.find((e) => e.episode_number === parseFloat(episode));
          if (foundEpisode) {
            hasMore = false;
            break;
          }
          if (episodes.length < 20) {
            hasMore = false;
          } else {
            page++;
          }
          if (page > 20)
            break;
        }
        if (foundEpisode) {
          episodeId = foundEpisode.content_id;
        } else {
          console.log(`[UniqueStream] Episode ${episode} not found`);
          return [];
        }
      } catch (error) {
        console.error("[UniqueStream] Error fetching details:", error.message);
        if (error.response)
          console.error("Data:", error.response.data);
        return [];
      }
    }
    if (!episodeId)
      return [];
    const localesToTry = ["ja-JP", "en-US"];
    const streams = [];
    const seenUrls = /* @__PURE__ */ new Set();
    for (const locale of localesToTry) {
      try {
        const mediaUrl = `${API_URL}/episode/${episodeId}/media/dash/${locale}`;
        const mediaRes = yield request("get", mediaUrl);
        const mediaData = mediaRes.data;
        if (mediaData && mediaData.dash) {
          if (mediaData.dash.playlist && !seenUrls.has(mediaData.dash.playlist)) {
            seenUrls.add(mediaData.dash.playlist);
            streams.push({
              name: "UniqueStream",
              title: `Original (${mediaData.dash.locale}) - Auto`,
              url: mediaData.dash.playlist,
              quality: "auto"
            });
          }
          if (mediaData.dash.hard_subs) {
            mediaData.dash.hard_subs.forEach((sub) => {
              if (!seenUrls.has(sub.playlist)) {
                seenUrls.add(sub.playlist);
                streams.push({
                  name: "UniqueStream",
                  title: `Hardsub ${sub.locale} - Auto`,
                  url: sub.playlist,
                  quality: "auto"
                });
              }
            });
          }
        }
      } catch (e) {
      }
    }
    return streams;
  });
}
module.exports = { getStreams, search };
