/**
 * cinemacity - Built from src/cinemacity/
 * Generated: 2026-03-22T16:45:25.018Z
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

// src/cinemacity/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/cinemacity/constants.js
var MAIN_URL = "https://cinemacity.cc";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Cookie": "dle_user_id=32729; dle_password=894171c6a8dab18ee594d5c652009a35;",
  "Referer": "https://cinemacity.cc/"
};
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

// src/cinemacity/utils.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    try {
      const response = yield fetch(url, __spreadValues({
        headers: HEADERS
      }, options));
      if (!response.ok)
        throw new Error(`HTTP ${response.status} on ${url}`);
      return yield response.text();
    } catch (e) {
      console.error(`[fetchText] Failed to fetch ${url}: ${e.message}`);
      throw e;
    }
  });
}
function search(query) {
  return __async(this, null, function* () {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `${MAIN_URL}/index.php?do=search&subaction=search&search_start=0&full_search=0&story=${encodedQuery}`;
    return yield fetchText(searchUrl);
  });
}
function getMediaDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = yield fetch(url);
    if (!response.ok)
      return null;
    return yield response.json();
  });
}
function extractQuality(url) {
  if (url.includes("2160p") || url.includes("4K"))
    return "4K";
  if (url.includes("1080p"))
    return "1080p";
  if (url.includes("720p"))
    return "720p";
  if (url.includes("480p"))
    return "480p";
  if (url.includes("360p"))
    return "360p";
  return "HD";
}

// src/cinemacity/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const mediaInfo = yield getMediaDetails(tmdbId, mediaType);
      if (!mediaInfo)
        return [];
      const title = mediaInfo.title || mediaInfo.name;
      let searchHtml = yield search(title);
      let $search = import_cheerio_without_node_native.default.load(searchHtml);
      let mediaUrl = null;
      const findMatch = ($) => {
        let matchedUrl = null;
        $("div.dar-short_item").each((i, el) => {
          const $el = $(el);
          const anchor = $el.find("a").filter((i2, a) => $(a).attr("href").includes(".html")).first();
          const fullText = anchor.text();
          const foundTitle = fullText.split("(")[0].trim();
          const href = anchor.attr("href");
          if (!foundTitle || !href)
            return;
          if (foundTitle.toLowerCase() === title.toLowerCase() || foundTitle.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(foundTitle.toLowerCase())) {
            matchedUrl = href;
            return false;
          }
        });
        return matchedUrl;
      };
      mediaUrl = findMatch($search);
      if (!mediaUrl) {
        console.log(`[CinemaCity] Not found in search, checking homepage...`);
        const homeHtml = yield fetchText(MAIN_URL);
        mediaUrl = findMatch(import_cheerio_without_node_native.default.load(homeHtml));
      }
      if (!mediaUrl)
        return [];
      console.log(`[CinemaCity] Matched: ${mediaUrl}`);
      const pageHtml = yield fetchText(mediaUrl);
      const $page = import_cheerio_without_node_native.default.load(pageHtml);
      let fileData = null;
      let subtitleData = null;
      $page("script").each((i, el) => {
        if (fileData)
          return;
        const scriptContent = $page(el).html();
        if (scriptContent.includes('atob("')) {
          const b64Match = scriptContent.match(/atob\("([^"]+)"\)/);
          if (b64Match && b64Match[1]) {
            try {
              const decoded = atob(b64Match[1]);
              const fileMatch = decoded.match(new RegExp(`"?file"?\\s*[:=]\\s*(['"])(.*?)\\1`, "s")) || decoded.match(new RegExp('"?file"?\\s*[:=]\\s*(\\[.*?\\]|{.*?})', "s"));
              if (fileMatch) {
                let rawFile = fileMatch[2] || fileMatch[1];
                if (rawFile.startsWith("[") || rawFile.startsWith("{")) {
                  try {
                    const unescaped = rawFile.replace(/\\(.)/g, "$1");
                    fileData = JSON.parse(unescaped);
                  } catch (e) {
                    try {
                      fileData = JSON.parse(rawFile);
                    } catch (e2) {
                      fileData = rawFile;
                    }
                  }
                } else {
                  fileData = rawFile;
                }
              }
              const subtitleMatch = decoded.match(/"?subtitle"?\s*[:=]\s*['"]([^'"]+)['"]/);
              if (subtitleMatch) {
                subtitleData = subtitleMatch[1];
              }
            } catch (e) {
            }
          }
        }
      });
      if (!fileData) {
        console.log(`[CinemaCity] No stream data found on page`);
        return [];
      }
      const streams = [];
      const processStreamString = (fileString, baseTitle) => {
        if (fileString.includes(".urlset/master.m3u8")) {
          streams.push({
            name: "CinemaCity",
            title: baseTitle,
            url: fileString,
            quality: "Auto",
            headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: mediaUrl })
          });
          const parts = fileString.split(",");
          const baseUrl = parts[0];
          parts.slice(1).forEach((part) => {
            if (part.includes(".mp4")) {
              const quality = extractQuality(part);
              streams.push({
                name: "CinemaCity",
                title: baseTitle,
                url: baseUrl + part,
                quality,
                headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: mediaUrl })
              });
            }
          });
          return;
        }
        const urls = fileString.includes("[") ? fileString.split(",") : [fileString];
        urls.forEach((urlStr) => {
          if (!urlStr.trim())
            return;
          let finalUrl = urlStr;
          let quality = extractQuality(urlStr);
          const qualityMatch = urlStr.match(/\[(.*?)\](.*)/);
          if (qualityMatch) {
            quality = qualityMatch[1];
            finalUrl = qualityMatch[2];
          }
          streams.push({
            name: "CinemaCity",
            title: baseTitle,
            url: finalUrl,
            quality,
            headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: mediaUrl })
          });
        });
      };
      if (mediaType === "movie") {
        if (Array.isArray(fileData)) {
          const movieObj = fileData.find((f) => !f.folder && f.file);
          if (movieObj) {
            processStreamString(movieObj.file, title);
          } else if (fileData[0] && fileData[0].file) {
            processStreamString(fileData[0].file, title);
          }
        } else if (typeof fileData === "string") {
          processStreamString(fileData, title);
        }
      } else {
        if (Array.isArray(fileData)) {
          const targetSeasonLabel = `Season ${season}`;
          const seasonObj = fileData.find((s) => s.title && s.title.includes(targetSeasonLabel));
          if (seasonObj && seasonObj.folder) {
            const targetEpisodeLabel = `Episode ${episode}`;
            const episodeObj = seasonObj.folder.find((e) => e.title && e.title.includes(targetEpisodeLabel));
            if (episodeObj && episodeObj.file) {
              processStreamString(episodeObj.file, `${title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`);
            } else if (episodeObj && episodeObj.folder) {
              episodeObj.folder.forEach((source) => {
                if (source.file) {
                  processStreamString(source.file, `${title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`);
                }
              });
            }
          }
        }
      }
      return streams;
    } catch (error) {
      console.error(`[CinemaCity] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
