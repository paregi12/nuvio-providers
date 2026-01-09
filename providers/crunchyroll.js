/**
 * crunchyroll - Built from src/crunchyroll/
 * Generated: 2026-01-09T17:59:02.612Z
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

// src/crunchyroll/http.js
var import_axios = __toESM(require("axios"));

// src/crunchyroll/constants.js
var BASIC_TOKEN = "Basic eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

// src/crunchyroll/http.js
var accessToken = null;
var tokenExpires = 0;
var deviceId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
  const r = Math.random() * 16 | 0, v = c == "x" ? r : r & 3 | 8;
  return v.toString(16);
});
function getAccessToken() {
  return __async(this, null, function* () {
    var _a;
    if (accessToken && Date.now() < tokenExpires) {
      return accessToken;
    }
    try {
      const params = new URLSearchParams();
      params.append("grant_type", "client_id");
      params.append("scope", "offline_access");
      params.append("device_id", deviceId);
      params.append("device_type", "service_python");
      const response = yield import_axios.default.post(`https://www.crunchyroll.com/auth/v1/token`, params.toString(), {
        headers: {
          "Authorization": BASIC_TOKEN,
          "Content-Type": "application/x-www-form-urlencoded",
          "ETP-Anonymous-ID": deviceId,
          "User-Agent": USER_AGENT
        }
      });
      accessToken = response.data.access_token;
      tokenExpires = Date.now() + response.data.expires_in * 1e3 - 6e4;
      return accessToken;
    } catch (error) {
      console.error("[Crunchyroll] Error getting access token:", ((_a = error.response) == null ? void 0 : _a.data) || error.message);
      throw error;
    }
  });
}
function request(_0, _1) {
  return __async(this, arguments, function* (method, path, options = {}) {
    const token = yield getAccessToken();
    const baseUrl = "https://www.crunchyroll.com";
    const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
    return (0, import_axios.default)(__spreadProps(__spreadValues({
      method,
      url
    }, options), {
      headers: __spreadValues({
        "Authorization": `Bearer ${token}`,
        "User-Agent": USER_AGENT
      }, options.headers)
    }));
  });
}

// src/crunchyroll/tmdb.js
var import_axios2 = __toESM(require("axios"));
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
function getMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const endpoint = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    try {
      const response = yield import_axios2.default.get(url);
      const data = response.data;
      return {
        title: data.name || data.title,
        year: (data.first_air_date || data.release_date || "").split("-")[0]
      };
    } catch (error) {
      console.error("[Crunchyroll] TMDB metadata error:", error.message);
      return null;
    }
  });
}

// src/crunchyroll/extractor.js
function extractStreamUrls(videoId) {
  return __async(this, null, function* () {
    const streams = [];
    try {
      const playUrl = `https://cr-play-service.prd.crunchyrollsvc.com/v1/${videoId}/web/chrome/play`;
      const response = yield request("get", playUrl, {
        headers: { "x-cr-stream-limits": "false" }
      });
      const data = response.data;
      if (data.streams) {
        for (const stream of data.streams) {
          streams.push({
            name: `Crunchyroll (${stream.type.toUpperCase()})`,
            title: `${stream.hardsub_locale || "No Sub"} - ${stream.audio_locale}`,
            url: stream.url,
            quality: "Auto",
            headers: { "Referer": "https://www.crunchyroll.com/" }
          });
        }
      }
    } catch (error) {
      console.warn("[Crunchyroll] Play service failed:", error.message);
    }
    if (streams.length === 0) {
      try {
        const response = yield request("get", `/content/v2/cms/streams/${videoId}`);
        const data = response.data;
        if (data.data && data.data[0]) {
          const streamData = data.data[0];
          if (streamData.adaptive_hls) {
            for (const [locale, stream] of Object.entries(streamData.adaptive_hls)) {
              streams.push({
                name: "Crunchyroll (HLS)",
                title: `HLS - ${locale}`,
                url: stream.url,
                quality: "Auto",
                headers: { "Referer": "https://www.crunchyroll.com/" }
              });
            }
          }
        }
      } catch (error) {
        console.warn("[Crunchyroll] CMS extraction failed:", error.message);
      }
    }
    return streams;
  });
}

// src/crunchyroll/index.js
function search(query) {
  return __async(this, null, function* () {
    try {
      const response = yield request("get", `/content/v2/discover/search?q=${encodeURIComponent(query)}&type=series,movie&limit=20`);
      const data = response.data;
      if (!data.data || data.data.length === 0)
        return [];
      const results = data.data.flatMap((cat) => cat.items || []);
      return results.map((item) => {
        var _a, _b, _c, _d;
        return {
          name: "Crunchyroll",
          title: item.title,
          url: item.id,
          poster: (_d = (_c = (_b = (_a = item.images) == null ? void 0 : _a.poster_tall) == null ? void 0 : _b[0]) == null ? void 0 : _c[0]) == null ? void 0 : _d.source,
          type: item.type === "series" ? "tv" : "movie"
        };
      });
    } catch (error) {
      console.error("[Crunchyroll] Search error:", error.message);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      const meta = yield getMetadata(tmdbId, mediaType);
      if (!meta)
        return [];
      console.log(`[Crunchyroll] Searching for: ${meta.title} (${meta.year})`);
      const searchResults = yield search(meta.title);
      const match = searchResults.find(
        (r) => r.title.toLowerCase().includes(meta.title.toLowerCase())
      );
      if (!match) {
        console.log("[Crunchyroll] No matching series found.");
        return [];
      }
      console.log(`[Crunchyroll] Found match: ${match.title} (${match.url})`);
      if (mediaType === "tv" || mediaType === "series") {
        const seasonsResponse = yield request("get", `/content/v2/cms/seasons/${match.url}`);
        const seasons = seasonsResponse.data.data || [];
        const season = seasons.find((s) => s.season_number === parseInt(seasonNum)) || seasons[0];
        if (!season)
          return [];
        const episodesResponse = yield request("get", `/content/v2/cms/episodes/${season.id}`);
        const episodes = episodesResponse.data.data || [];
        const episode = episodes.find((e) => e.episode_number === parseInt(episodeNum));
        if (!episode)
          return [];
        console.log(`[Crunchyroll] Found episode: ${episode.title} (${episode.id})`);
        return yield extractStreamUrls(episode.id);
      } else {
        return yield extractStreamUrls(match.url);
      }
    } catch (error) {
      console.error("[Crunchyroll] getStreams error:", error.message);
      return [];
    }
  });
}
module.exports = { getStreams, search };
