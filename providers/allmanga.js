/**
 * allmanga - Built from src/allmanga/
 * Generated: 2026-01-13T11:54:25.571Z
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

// src/allmanga/http.js
var import_axios = __toESM(require("axios"));
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";
function request(_0, _1) {
  return __async(this, arguments, function* (method, url, options = {}) {
    try {
      const headers = __spreadValues({
        "User-Agent": USER_AGENT
      }, options.headers);
      return yield (0, import_axios.default)(__spreadProps(__spreadValues({
        method,
        url
      }, options), {
        headers
      }));
    } catch (error) {
      console.error(`[AllManga] Request error (${url}):`, error.message);
      throw error;
    }
  });
}

// src/allmanga/tmdb.js
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

// src/allmanga/utils.js
function decrypt(str) {
  if (!str.startsWith("--"))
    return str;
  return str.substring(2).match(/.{2}/g).map((m) => String.fromCharCode(parseInt(m, 16) ^ 56)).join("");
}
function normalize(str) {
  if (!str)
    return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/\s+/g, "");
}
function isMatch(title1, title2) {
  if (!title1 || !title2)
    return false;
  const n1 = normalize(title1);
  const n2 = normalize(title2);
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
}

// src/allmanga/constants.js
var BASE_URL = "https://allmanga.to";
var API_URL = "https://api.allanime.day/api";
var SEARCH_QUERY = `query($search: SearchInput, $limit: Int, $page: Int, $translationType: VaildTranslationTypeEnumType, $countryOrigin: VaildCountryOriginEnumType) {
  shows(search: $search, limit: $limit, page: $page, translationType: $translationType, countryOrigin: $countryOrigin) {
    edges {
      _id
      name
      englishName
      nativeName
      thumbnail
      type
    }
  }
}`;
var EPISODE_QUERY = `query($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
  episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) {
    episodeString
    sourceUrls
  }
}`;

// src/allmanga/extractors/index.js
function extractStreams(sourceUrls) {
  return __async(this, null, function* () {
    const streams = [];
    try {
      const versionRes = yield request("get", `${BASE_URL}/getVersion`);
      const endPoint = versionRes.data.episodeIframeHead;
      const endPointUrl = new URL(endPoint);
      for (const source of sourceUrls) {
        let url = source.sourceUrl;
        if (url.startsWith("--")) {
          url = decrypt(url);
        }
        if (url.includes("/clock")) {
          const clockUrl = url.replace("/clock?", "/clock.json?");
          const finalUrl = clockUrl.startsWith("http") ? clockUrl : `${endPoint}${clockUrl}`;
          try {
            const res = yield request("get", finalUrl, {
              headers: {
                "Accept": "*/*",
                "Origin": endPoint,
                "Referer": `${endPoint}/`,
                "Host": endPointUrl.host
              }
            });
            const data = res.data;
            if (data && data.links) {
              for (const link of data.links) {
                let videoUrl = link.link;
                const videoHeaders = {
                  "Referer": `${endPoint}/`,
                  "Origin": endPoint,
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
                };
                if (link.mp4 || link.hls) {
                  streams.push({
                    url: videoUrl,
                    quality: link.resolutionStr || "Auto",
                    type: link.hls ? "hls" : "mp4",
                    name: `AllManga (${source.sourceName})`,
                    headers: videoHeaders
                  });
                }
              }
            }
          } catch (e) {
          }
        } else if (url.startsWith("http")) {
          streams.push({
            url,
            quality: "Unknown",
            type: "iframe",
            name: source.sourceName
          });
        }
      }
    } catch (error) {
      console.error(`[AllManga] Extraction initialization failed:`, error.message);
    }
    return streams;
  });
}

// src/allmanga/index.js
function getStreams(tmdbId, mediaType, season, episode, tmdbData = null) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e, _f;
    const meta = tmdbData || (yield getMetadata(tmdbId, mediaType));
    if (!meta)
      return [];
    console.log(`[AllManga] Searching for: ${meta.title} (${mediaType})`);
    try {
      const searchRes = yield request("post", API_URL, {
        data: {
          query: SEARCH_QUERY,
          variables: {
            search: {
              allowAdult: false,
              allowUnknown: false,
              query: meta.title
            },
            limit: 26,
            page: 1,
            translationType: "sub",
            countryOrigin: "ALL"
          }
        }
      });
      const shows = ((_c = (_b = (_a = searchRes.data) == null ? void 0 : _a.data) == null ? void 0 : _b.shows) == null ? void 0 : _c.edges) || [];
      const match = shows.find((s) => isMatch(s.name, meta.title) || isMatch(s.englishName, meta.title));
      if (!match) {
        console.log(`[AllManga] No match found for ${meta.title}`);
        return [];
      }
      console.log(`[AllManga] Found match: ${match.name} (${match._id})`);
      const epStr = mediaType === "movie" ? "1" : String(episode || 1);
      const episodeRes = yield request("post", API_URL, {
        data: {
          query: EPISODE_QUERY,
          variables: {
            showId: match._id,
            translationType: "sub",
            episodeString: epStr
          }
        }
      });
      const sourceUrls = ((_f = (_e = (_d = episodeRes.data) == null ? void 0 : _d.data) == null ? void 0 : _e.episode) == null ? void 0 : _f.sourceUrls) || [];
      if (sourceUrls.length === 0) {
        console.log(`[AllManga] No source URLs for ${meta.title} Ep ${epStr}`);
        return [];
      }
      return yield extractStreams(sourceUrls);
    } catch (error) {
      console.error(`[AllManga] Error:`, error.message);
      return [];
    }
  });
}
module.exports = { getStreams };
