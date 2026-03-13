/**
 * anichi - Built from src/anichi/
 * Generated: 2026-03-13T04:23:43.590Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// src/anichi/constants.js
var ANICHI_API = "https://api.allmanga.to/api/v2";
var ANICHI_ENDPOINT = "https://allmanga.to";
var ANICHI_APP = "allanime_android";
var TMDB_API_KEY = "98ae14df2b8d8f8f8136499daf79f0e0";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var HASHES = {
  main: "e42a4466d984b2c0a2cecae5dd13aa68867f634b16ee0f17b380047d14482406",
  popular: "31a117653812a2547fd981632e8c99fa8bf8a75c4ef1a77a1567ef1741a7ab9c",
  detail: "bb263f91e5bdd048c1c978f324613aeccdfe2cbc694a419466a31edb58c0cc0b",
  server: "5f1a64b73793cc2234a389cf3a8f93ad82de7043017dd551f38f65b89daa65e0",
  mainPage: "06327bc10dd682e1ee7e07b6db9c16e9ad2fd56c1b769e47513128cd5c9fc77a"
};
var HEADERS = {
  "app-version": "android_c-247",
  "from-app": ANICHI_APP,
  "platformstr": "android_c",
  "Referer": "https://allmanga.to",
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36"
};

// src/anichi/utils.js
function decryptHex(inputStr) {
  let hexString = inputStr;
  if (inputStr.startsWith("-")) {
    hexString = inputStr.split("-").pop();
  }
  let result = "";
  for (let i = 0; i < hexString.length; i += 2) {
    let hexByte = hexString.substring(i, i + 2);
    let charCode = parseInt(hexByte, 16);
    result += String.fromCharCode(charCode ^ 56);
  }
  return result;
}
function fixUrlPath(url) {
  if (!url)
    return "";
  let fixed = url.replace("https://allanime.site", "https://allmanga.to");
  fixed = fixed.replace("https://allanime.to", "https://allmanga.to");
  return fixed;
}
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const response = yield fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
    });
    if (!response.ok)
      throw new Error(`TMDB API error: ${response.status}`);
    const data = yield response.json();
    const title = mediaType === "tv" ? data.name : data.title;
    const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
    return { title, year, imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null, data };
  });
}
function normalizeTitle(title) {
  if (!title)
    return "";
  return title.toLowerCase().replace(/\b(the|a|an)\b/g, "").replace(/[:\-_]/g, " ").replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
}
function calculateTitleSimilarity(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  if (norm1 === norm2)
    return 1;
  const words1 = norm1.split(/\s+/).filter((w) => w.length > 0);
  const words2 = norm2.split(/\s+/).filter((w) => w.length > 0);
  if (words1.length === 0 || words2.length === 0)
    return 0;
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = words1.filter((w) => set2.has(w));
  const union = /* @__PURE__ */ new Set([...words1, ...words2]);
  return intersection.length / union.size;
}
function findBestTitleMatch(mediaInfo, searchResults) {
  if (!searchResults || searchResults.length === 0)
    return null;
  let bestMatch = null;
  let bestScore = 0;
  for (const result of searchResults) {
    let score = calculateTitleSimilarity(mediaInfo.title, result.title);
    if (mediaInfo.year && result.year) {
      const yearDiff = Math.abs(mediaInfo.year - result.year);
      if (yearDiff === 0)
        score += 0.2;
      else if (yearDiff <= 1)
        score += 0.1;
    }
    if (score > bestScore && score > 0.4) {
      bestScore = score;
      bestMatch = result;
    }
  }
  return bestMatch;
}

// src/anichi/index.js
function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    console.log(`[Anichi] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    try {
      const mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
      const query = mediaInfo.title;
      console.log(`[Anichi] TMDB Info: "${query}" (${mediaInfo.year || "N/A"})`);
      const searchVariables = {
        search: { query },
        limit: 26,
        page: 1,
        translationType: "sub",
        countryOrigin: "ALL"
      };
      const searchUrl = `${ANICHI_API}?variables=${encodeURIComponent(JSON.stringify(searchVariables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASHES.mainPage } }))}`;
      const res = yield fetch(searchUrl, { headers: HEADERS });
      const resData = yield res.json();
      const edges = ((_b = (_a = resData == null ? void 0 : resData.data) == null ? void 0 : _a.shows) == null ? void 0 : _b.edges) || [];
      const searchResults = edges.map((edge) => {
        var _a2;
        return {
          id: edge._id,
          title: edge.name || edge.englishName || edge.nativeName,
          year: (_a2 = edge.airedStart) == null ? void 0 : _a2.year
        };
      });
      const bestMatch = findBestTitleMatch(mediaInfo, searchResults) || searchResults[0];
      if (!bestMatch)
        return [];
      console.log(`[Anichi] Selected: "${bestMatch.title}" (ID: ${bestMatch.id})`);
      const dubStatus = "sub";
      const epStr = mediaType === "movie" ? "1" : episode ? episode.toString() : "1";
      const epVariables = {
        showId: bestMatch.id,
        translationType: dubStatus,
        episodeString: epStr
      };
      const epUrl = `${ANICHI_API}?variables=${encodeURIComponent(JSON.stringify(epVariables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: HASHES.server } }))}`;
      const epRes = yield fetch(epUrl, { headers: HEADERS });
      const epData = yield epRes.json();
      const sources = ((_d = (_c = epData == null ? void 0 : epData.data) == null ? void 0 : _c.episode) == null ? void 0 : _d.sourceUrls) || [];
      const streams = [];
      for (const source of sources) {
        try {
          let link = source.sourceUrl;
          if (!link)
            continue;
          if (link.startsWith("--")) {
            link = decryptHex(link);
          }
          if (link.includes("clock.json")) {
            const clockRes = yield fetch(link, { headers: HEADERS });
            const clockData = yield clockRes.json();
            (clockData.links || []).forEach((item) => {
              streams.push({
                name: "Anichi (AllAnime)",
                title: `Anichi - ${source.sourceName} [${item.resolutionStr}]`,
                url: item.link,
                quality: item.resolutionStr,
                headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: ANICHI_ENDPOINT }),
                provider: "anichi"
              });
            });
          } else if (link.startsWith("http")) {
            const fixedLink = fixUrlPath(link);
            if (fixedLink.includes(".m3u8") || fixedLink.includes(".mp4")) {
              streams.push({
                name: "Anichi (AllAnime)",
                title: `Anichi - ${source.sourceName}`,
                url: fixedLink,
                quality: "Auto",
                headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: ANICHI_ENDPOINT }),
                provider: "anichi"
              });
            }
          }
        } catch (e) {
          console.log(`[Anichi] Error processing source: ${e.message}`);
        }
      }
      return streams;
    } catch (error) {
      console.error(`[Anichi] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
