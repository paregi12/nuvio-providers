/**
 * cinemacity - Built from src/cinemacity/
 * Generated: 2026-03-23T00:59:05.929Z
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
var atob = (str) => {
  try {
    if (typeof global !== "undefined" && typeof global.atob === "function")
      return global.atob(str);
    if (typeof window !== "undefined" && typeof window.atob === "function")
      return window.atob(str);
    if (typeof self !== "undefined" && typeof self.atob === "function")
      return self.atob(str);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    str = String(str).replace(/[=]+$/, "");
    if (str.length % 4 === 1)
      return "";
    for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  } catch (e) {
    return "";
  }
};
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
  const low = url.toLowerCase();
  if (low.includes("2160p") || low.includes("4k"))
    return "4K";
  if (low.includes("1080p"))
    return "1080p";
  if (low.includes("720p"))
    return "720p";
  if (low.includes("480p"))
    return "480p";
  if (low.includes("360p"))
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
      const animeTitle = mediaInfo.title || mediaInfo.name;
      let searchHtml = yield search(animeTitle);
      let $search = import_cheerio_without_node_native.default.load(searchHtml);
      let mediaUrl = null;
      const findMatch = ($) => {
        let matchedUrl = null;
        $("div.dar-short_item").each((i, el) => {
          const $el = $(el);
          const anchor = $el.find("a").filter((i2, a) => {
            const href2 = $(a).attr("href");
            return href2 && href2.includes(".html");
          }).first();
          const fullText = anchor.text();
          const foundTitle = fullText.split("(")[0].trim();
          const href = anchor.attr("href");
          if (!foundTitle || !href)
            return;
          if (foundTitle.toLowerCase() === animeTitle.toLowerCase() || foundTitle.toLowerCase().includes(animeTitle.toLowerCase()) || animeTitle.toLowerCase().includes(foundTitle.toLowerCase())) {
            matchedUrl = href;
            return false;
          }
        });
        return matchedUrl;
      };
      mediaUrl = findMatch($search);
      if (!mediaUrl) {
        const homeHtml = yield fetchText(MAIN_URL);
        mediaUrl = findMatch(import_cheerio_without_node_native.default.load(homeHtml));
      }
      if (!mediaUrl)
        return [];
      const pageHtml = yield fetchText(mediaUrl);
      const $page = import_cheerio_without_node_native.default.load(pageHtml);
      let fileData = null;
      $page("script").each((i, el) => {
        if (fileData)
          return;
        const scriptContent = $page(el).html();
        if (scriptContent && scriptContent.includes("atob(")) {
          const b64Match = scriptContent.match(/atob\((['"])(.*?)\1\)/);
          if (b64Match && b64Match[2]) {
            try {
              const decoded = atob(b64Match[2]);
              const fileMatch = decoded.match(new RegExp(`file\\s*:\\s*(['"])(.*?)\\1`, "s")) || decoded.match(new RegExp("file\\s*:\\s*(\\[.*?\\])", "s"));
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
            } catch (e) {
            }
          }
        }
      });
      if (!fileData)
        return [];
      const streams = [];
      const processStreamString = (fileString, baseTitle) => {
        if (!fileString || typeof fileString !== "string" || fileString.length < 10)
          return;
        if (fileString.includes(".urlset/master.m3u8")) {
          if (fileString.startsWith("http")) {
            streams.push({
              name: "CinemaCity",
              title: baseTitle,
              url: fileString,
              quality: "Auto",
              headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: mediaUrl })
            });
          }
          const parts = fileString.split(",");
          const baseUrl = parts[0];
          if (baseUrl && baseUrl.startsWith("http")) {
            parts.slice(1).forEach((part) => {
              if (part.includes(".mp4")) {
                const quality = extractQuality(part);
                const finalUrl = baseUrl + part;
                if (finalUrl.length > baseUrl.length + 5) {
                  streams.push({
                    name: "CinemaCity",
                    title: baseTitle,
                    url: finalUrl,
                    quality,
                    headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: mediaUrl })
                  });
                }
              }
            });
          }
          return;
        }
        const urls = fileString.includes("[") ? fileString.split(",") : [fileString];
        urls.forEach((urlStr) => {
          if (!urlStr || urlStr.length < 10)
            return;
          let finalUrl = urlStr;
          let quality = extractQuality(urlStr);
          const qualityMatch = urlStr.match(/\[(.*?)\](.*)/);
          if (qualityMatch) {
            quality = qualityMatch[1];
            finalUrl = qualityMatch[2];
          }
          if (finalUrl && finalUrl.startsWith("http")) {
            streams.push({
              name: "CinemaCity",
              title: baseTitle,
              url: finalUrl,
              quality,
              headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: mediaUrl })
            });
          }
        });
      };
      if (mediaType === "movie") {
        if (Array.isArray(fileData)) {
          const movieObj = fileData.find((f) => !f.folder && f.file);
          if (movieObj)
            processStreamString(movieObj.file, animeTitle);
          else if (fileData[0] && fileData[0].file)
            processStreamString(fileData[0].file, animeTitle);
        } else if (typeof fileData === "string") {
          processStreamString(fileData, animeTitle);
        }
      } else {
        if (Array.isArray(fileData)) {
          const targetSeasonLabel = `Season ${season}`;
          const seasonObj = fileData.find((s) => s.title && s.title.includes(targetSeasonLabel) || s.title && s.title.includes(`S${season}`));
          if (seasonObj && seasonObj.folder) {
            const targetEpisodeLabel = `Episode ${episode}`;
            const episodeObj = seasonObj.folder.find((e) => e.title && e.title.includes(targetEpisodeLabel) || e.title && e.title.includes(`E${episode}`));
            if (episodeObj && episodeObj.file) {
              processStreamString(episodeObj.file, `${animeTitle} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`);
            } else if (episodeObj && episodeObj.folder) {
              episodeObj.folder.forEach((source) => {
                if (source.file)
                  processStreamString(source.file, `${animeTitle} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`);
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
