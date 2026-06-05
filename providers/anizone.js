/**
 * anizone - Built from src/anizone/
 * Generated: 2026-06-05T17:56:35.671Z
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
      let masterUrl = $epPage("media-player").attr("src");
      if (!masterUrl) {
        const matches = episodeHtml.match(/https:\/\/[^"']+\/master\.m3u8/);
        if (matches) {
          masterUrl = matches[0];
        }
      }
      const subtitles = [];
      $epPage("track").each((i, el) => {
        const src = $epPage(el).attr("src");
        const kind = $epPage(el).attr("kind");
        if (src && (kind === "subtitles" || kind === "captions" || src.endsWith(".ass") || src.endsWith(".vtt"))) {
          subtitles.push({
            url: src,
            name: $epPage(el).attr("label") || "English",
            language: $epPage(el).attr("srclang") || "en"
          });
        }
      });
      let format = "Sub";
      $epPage("button").each((i, el) => {
        const text = $epPage(el).text();
        if (text.includes("Audio:")) {
          const hasJapanese = text.includes("Japanese");
          const hasEnglish = text.includes("English");
          if (hasEnglish && !hasJapanese)
            format = "Dub";
          else if (hasEnglish && hasJapanese)
            format = "Sub & Dub";
        }
      });
      if (format === "Sub") {
        $epPage('button[wire\\:click^="setVideo"]').each((i, el) => {
          const btnText = $epPage(el).text();
          const hasJapanese = btnText.includes("Japanese");
          const hasEnglish = btnText.includes("English");
          if (hasEnglish && !hasJapanese)
            format = "Dub";
          else if (hasEnglish && hasJapanese)
            format = "Sub & Dub";
        });
      }
      if (masterUrl) {
        streams.push({
          name: "AniZone",
          title: `${animeTitle} - Episode ${mappedEp} [${format}]`,
          url: masterUrl,
          quality: "Multi",
          headers: HEADERS,
          subtitles
        });
      }
      return streams;
    } catch (error) {
      return [];
    }
  });
}
module.exports = { getStreams };
