/**
 * anizone - Built from src/anizone/
 * Generated: 2026-06-05T17:37:47.600Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
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

// src/anizone/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/anizone/constants.js
var MAIN_URL = "https://anizone.to";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://anizone.to/"
};

// src/anizone/utils.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const finalUrl = url.startsWith("http") ? url : `${MAIN_URL}${url}`;
    try {
      const response = yield fetch(finalUrl, __spreadValues({
        headers: HEADERS
      }, options));
      if (!response.ok)
        return "";
      return yield response.text();
    } catch (e) {
      return "";
    }
  });
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}/external_ids?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
      const res = yield fetch(url, { headers: HEADERS });
      if (!res.ok)
        return null;
      const data = yield res.json();
      return data.imdb_id;
    } catch (e) {
      return null;
    }
  });
}
function resolveMapping(imdbId, season, episode) {
  return __async(this, null, function* () {
    try {
      const url = `https://id-mapping-api-malid.hf.space/api/resolve?id=${imdbId}&s=${season}&e=${episode}`;
      const res = yield fetch(url);
      if (!res.ok)
        return null;
      return yield res.json();
    } catch (e) {
      return null;
    }
  });
}
function getMalTitle(malId) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(`https://api.jikan.moe/v4/anime/${malId}`);
      if (!res.ok)
        return null;
      const data = yield res.json();
      return data.data.title;
    } catch (e) {
      return null;
    }
  });
}

// src/anizone/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      let animeTitle = "";
      let mappedEp = episode;
      if (mediaType === "tv") {
        const imdbId = yield getImdbId(tmdbId, mediaType);
        if (!imdbId)
          return [];
        const mapping = yield resolveMapping(imdbId, season, episode);
        if (!mapping || !mapping.mal_id)
          return [];
        mappedEp = mapping.mal_episode || episode;
        animeTitle = yield getMalTitle(mapping.mal_id);
      } else {
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
        const tmdbRes = yield fetch(tmdbUrl);
        const tmdbData = yield tmdbRes.json();
        animeTitle = tmdbData.title || tmdbData.original_title;
        mappedEp = 1;
      }
      if (!animeTitle)
        return [];
      const searchUrl = `/anime?search=${encodeURIComponent(animeTitle)}`;
      const searchHtml = yield fetchText(searchUrl);
      const $search = import_cheerio_without_node_native.default.load(searchHtml);
      let animeSlug = null;
      $search("main a").each((i, el) => {
        const href = $search(el).attr("href");
        if (href && (href.startsWith("https://anizone.to/anime/") || href.startsWith("/anime/")) && !animeSlug) {
          const parts = href.split("/");
          animeSlug = parts[parts.length - 1] || parts[parts.length - 2];
        }
      });
      if (!animeSlug)
        return [];
      const episodeUrl = `/anime/${animeSlug}/${mappedEp}`;
      const episodeHtml = yield fetchText(episodeUrl);
      const streams = [];
      const $epPage = import_cheerio_without_node_native.default.load(episodeHtml);
      const serverInfos = [];
      $epPage('button[wire\\:click^="setVideo"]').each((i, el) => {
        const $btn = $epPage(el);
        const serverName = $btn.find("div.text-lg").text().trim() || "Unknown";
        const btnText = $btn.text();
        let format = "Sub";
        const hasJapanese = btnText.includes("Japanese");
        const hasEnglish = btnText.includes("English");
        if (hasEnglish && !hasJapanese)
          format = "Dub";
        else if (hasEnglish && hasJapanese)
          format = "Sub & Dub";
        serverInfos.push({ name: serverName, format });
      });
      const m3u8Matches = [...new Set(episodeHtml.match(/https:\/\/[^"']+\/master\.m3u8/g) || [])];
      m3u8Matches.forEach((masterUrl, index) => {
        const info = serverInfos[index] || { name: `Server ${index + 1}`, format: "Sub" };
        const subtitles = [];
        const assMatches = episodeHtml.matchAll(/id="vds-ass-subtitles-([^"]+)"[^>]+label="([^"]+)"[^>]+srclang="([^"]+)"/g);
        for (const match of assMatches) {
          subtitles.push({
            url: match[1],
            name: match[2],
            language: match[3]
          });
        }
        streams.push({
          name: `AniZone [${info.name}]`,
          title: `${animeTitle} - Episode ${mappedEp} [${info.format}]`,
          url: masterUrl,
          quality: "Multi",
          headers: HEADERS,
          subtitles
        });
      });
      return streams;
    } catch (error) {
      return [];
    }
  });
}
module.exports = { getStreams };
