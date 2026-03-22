/**
 * animepahe - Built from src/animepahe/
 * Generated: 2026-03-22T17:28:00.045Z
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
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
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

// src/animepahe/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/animepahe/constants.js
var MAIN_URL = "https://animepahe.si";
var PROXY_URL = "https://animepaheproxy.phisheranimepahe.workers.dev/?url=";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Cookie": "__ddg2_=1234567890",
  "Referer": "https://animepahe.si/"
};

// src/animepahe/utils.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const _a = options, { useProxy = true } = _a, fetchOptions = __objRest(_a, ["useProxy"]);
    const finalUrl = url.startsWith("http") ? url : `${MAIN_URL}${url}`;
    const targetUrl = useProxy ? `${PROXY_URL}${encodeURIComponent(finalUrl)}` : finalUrl;
    const response = yield fetch(targetUrl, __spreadValues({
      headers: HEADERS
    }, fetchOptions));
    if (!response.ok)
      throw new Error(`HTTP ${response.status} on ${finalUrl}`);
    return yield response.text();
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const text = yield fetchText(url, options);
    return JSON.parse(text);
  });
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}/external_ids?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
      const res = yield fetch(url);
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
function searchAnime(query) {
  return __async(this, null, function* () {
    const url = `/api?m=search&l=8&q=${encodeURIComponent(query)}`;
    return yield fetchJson(url);
  });
}
function extractQuality(text) {
  const match = text.match(/(\d{3,4}p)/);
  return match ? match[1] : "720p";
}

// src/animepahe/extractors.js
function unpack(code) {
  try {
    const match = code.match(/}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|\7\)/);
    if (match) {
      let [_, quote1, p, a, c, quote2, kStr] = match;
      p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      a = parseInt(a);
      c = parseInt(c);
      const k = kStr.split("|");
      const e = (c2) => (c2 < a ? "" : e(parseInt(c2 / a))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
      const d = {};
      while (c--)
        d[e(c)] = k[c] || e(c);
      return p.replace(/\b\w+\b/g, (w) => d[w]);
    }
  } catch (e) {
    console.error("[AnimePahe] Unpack error:", e.message);
  }
  return code;
}
function extractKwik(url) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Referer": url,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }),
        useProxy: false
      });
      const scripts = html.match(/<script.*?>([\s\S]*?)<\/script>/g) || [];
      const matches = [];
      for (const script of scripts) {
        if (script.includes("eval(function(p,a,c,k,e,d)")) {
          let pos = 0;
          while (true) {
            const start = script.indexOf("eval(function(p,a,c,k,e,d)", pos);
            if (start === -1)
              break;
            const end = script.indexOf(".split('|')", start);
            if (end === -1)
              break;
            const closeParen = script.indexOf("))", end);
            if (closeParen === -1)
              break;
            matches.push(script.substring(start, closeParen + 2));
            pos = closeParen + 2;
          }
        }
      }
      for (const scriptContent of matches) {
        const unpacked = unpack(scriptContent);
        const urlMatch = unpacked.match(/source\s*=\s*['"](https?:\/\/.*?)['"]/) || unpacked.match(/const\s+source\s*=\s*['"](https?:\/\/.*?)['"]/) || unpacked.match(/var\s+source\s*=\s*['"](https?:\/\/.*?)['"]/) || unpacked.match(/src\s*:\s*['"](https?:\/\/.*?)['"]/);
        if (urlMatch) {
          return {
            url: urlMatch[1],
            headers: {
              "Referer": "https://kwik.cx/",
              "Origin": "https://kwik.cx",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          };
        }
      }
    } catch (e) {
      console.error("[AnimePahe] Kwik extraction failed:", e.message);
    }
    return null;
  });
}

// src/animepahe/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      let animeSession = null;
      let animeTitle = "Anime";
      let targetEpNum = episode;
      if (mediaType === "tv") {
        const imdbId = yield getImdbId(tmdbId, mediaType);
        if (imdbId) {
          const mapping = yield resolveMapping(imdbId, season, episode);
          if (mapping && mapping.mal_id) {
            const malId = mapping.mal_id;
            targetEpNum = mapping.mal_episode || episode;
            animeTitle = mapping.anime_title || "Anime";
            const malUrl = `https://animepahe.si/a/${malId}`;
            const malPageHtml = yield fetchText(malUrl);
            const sessionMatch = malPageHtml.match(/\/anime\/([a-z0-9-]+)/);
            if (sessionMatch) {
              animeSession = sessionMatch[1];
            }
          }
        }
      }
      if (!animeSession) {
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
        const tmdbRes = yield fetch(tmdbUrl);
        const tmdbData = yield tmdbRes.json();
        animeTitle = tmdbData.name || tmdbData.title;
        targetEpNum = mediaType === "movie" ? 1 : episode;
        if (!animeTitle)
          return [];
        const searchResults = yield searchAnime(animeTitle);
        if (!searchResults.data || searchResults.data.length === 0) {
          return [];
        }
        const bestMatch = searchResults.data.find(
          (a) => a.title.toLowerCase().includes(animeTitle.toLowerCase()) || animeTitle.toLowerCase().includes(a.title.toLowerCase())
        ) || searchResults.data[0];
        animeSession = bestMatch.session;
      }
      if (!animeSession)
        return [];
      let episodeSession = null;
      let page = 1;
      let lastPage = 1;
      do {
        const epListUrl = `/api?m=release&id=${animeSession}&sort=episode_asc&page=${page}`;
        const epListData = yield fetchJson(epListUrl);
        lastPage = epListData.last_page;
        const foundEp = epListData.data.find((e) => e.episode == targetEpNum);
        if (foundEp) {
          episodeSession = foundEp.session;
          break;
        }
        page++;
      } while (page <= lastPage);
      if (!episodeSession)
        return [];
      const playUrl = `/play/${animeSession}/${episodeSession}`;
      const playHtml = yield fetchText(playUrl);
      const $ = import_cheerio_without_node_native.default.load(playHtml);
      const streams = [];
      const promises = [];
      const buttons = $("#resolutionMenu button");
      buttons.each((i, el) => {
        const $btn = $(el);
        const kwikUrl = $btn.attr("data-src");
        const btnText = $btn.text();
        const quality = extractQuality(btnText);
        const type = btnText.toLowerCase().includes("eng") ? "Dub" : "Sub";
        if (kwikUrl && kwikUrl.includes("kwik")) {
          promises.push(
            extractKwik(kwikUrl).then((res) => {
              if (res) {
                streams.push({
                  name: `AnimePahe (${quality} ${type})`,
                  title: `${animeTitle} - Episode ${targetEpNum}`,
                  url: res.url,
                  quality,
                  headers: res.headers
                });
              }
            })
          );
        }
      });
      yield Promise.all(promises);
      const qualityOrder = { "1080p": 3, "720p": 2, "360p": 1 };
      return streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
    } catch (error) {
      console.error(`[AnimePahe] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
