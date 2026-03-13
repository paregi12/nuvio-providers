/**
 * allwish - Built from src/allwish/
 * Generated: 2026-03-13T04:36:51.752Z
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
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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

// src/allwish/index.js
var allwish_exports = {};
__export(allwish_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(allwish_exports);
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));

// src/allwish/constants.js
var MAIN_URL = "https://all-wish.me";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var XML_HEADERS = {
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
};
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
};

// src/allwish/utils.js
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
function base64UrlEncode(buffer) {
  let b64 = typeof Buffer !== "undefined" ? Buffer.from(buffer).toString("base64") : btoa(String.fromCharCode.apply(null, buffer));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function generateEpisodeVrf(episodeId) {
  const secretKey = "ysJhV6U27FVIjjuk";
  let encodedId = encodeURIComponent(episodeId).replace(/\+/g, "%20").replace(/!/g, "%21").replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29").replace(/~/g, "%7E").replace(/\*/g, "%2A");
  const keyCodes = [];
  for (let i = 0; i < secretKey.length; i++) {
    keyCodes.push(secretKey.charCodeAt(i));
  }
  const dataCodes = [];
  for (let i = 0; i < encodedId.length; i++) {
    dataCodes.push(encodedId.charCodeAt(i));
  }
  const n = [];
  for (let i = 0; i < 256; i++) {
    n[i] = i;
  }
  let a = 0;
  for (let o2 = 0; o2 < 256; o2++) {
    a = (a + n[o2] + keyCodes[o2 % keyCodes.length]) % 256;
    let temp = n[o2];
    n[o2] = n[a];
    n[a] = temp;
  }
  const out = [];
  let o = 0;
  a = 0;
  for (let r = 0; r < dataCodes.length; r++) {
    o = (o + 1) % 256;
    a = (a + n[o]) % 256;
    let temp = n[o];
    n[o] = n[a];
    n[a] = temp;
    let k = n[(n[o] + n[a]) % 256];
    out.push(dataCodes[r] ^ k);
  }
  const step1 = new Uint8Array(out);
  const base1 = base64UrlEncode(step1);
  const step2Bytes = [];
  for (let i = 0; i < base1.length; i++) {
    step2Bytes.push(base1.charCodeAt(i));
  }
  const transformedList = [];
  for (let index = 0; index < step2Bytes.length; index++) {
    let s = step2Bytes[index];
    switch (index % 8) {
      case 1:
        s += 3;
        break;
      case 7:
        s += 5;
        break;
      case 2:
        s -= 4;
        break;
      case 4:
        s -= 2;
        break;
      case 6:
        s += 4;
        break;
      case 0:
        s -= 3;
        break;
      case 3:
        s += 2;
        break;
      case 5:
        s += 5;
        break;
      default:
        break;
    }
    transformedList.push(s & 255);
  }
  const base2 = base64UrlEncode(new Uint8Array(transformedList));
  let finalStr = "";
  for (let i = 0; i < base2.length; i++) {
    let c = base2[i];
    if (c >= "A" && c <= "Z") {
      finalStr += String.fromCharCode((c.charCodeAt(0) - 65 + 13) % 26 + 65);
    } else if (c >= "a" && c <= "z") {
      finalStr += String.fromCharCode((c.charCodeAt(0) - 97 + 13) % 26 + 97);
    } else {
      finalStr += c;
    }
  }
  return finalStr;
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
  const jaccard = intersection.length / union.size;
  const extraWordsCount = words2.filter((w) => !set1.has(w)).length;
  let score = jaccard - extraWordsCount * 0.05;
  if (words1.length > 0 && words1.every((w) => set2.has(w))) {
    score += 0.2;
  }
  return score;
}
function findBestTitleMatch(mediaInfo, searchResults) {
  if (!searchResults || searchResults.length === 0)
    return null;
  let bestMatch = null;
  let bestScore = 0;
  for (const result of searchResults) {
    let score = calculateTitleSimilarity(mediaInfo.title, result.title);
    if (mediaInfo.data && mediaInfo.data.alternative_titles && mediaInfo.data.alternative_titles.results) {
      for (const alt of mediaInfo.data.alternative_titles.results) {
        const altScore = calculateTitleSimilarity(alt.title, result.title);
        if (altScore > score)
          score = altScore;
      }
    }
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = result;
    }
  }
  return bestMatch;
}

// src/allwish/extractor.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
function extractMegaPlay(url) {
  return __async(this, null, function* () {
    const mainUrl = "https://megaplay.buzz";
    const commonHeaders = {
      "Accept": "*/*",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": mainUrl,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0"
    };
    try {
      const res = yield fetch(url, { headers: commonHeaders });
      const html = yield res.text();
      const $ = import_cheerio_without_node_native.default.load(html);
      const id = $("#megaplay-player").attr("data-id");
      if (!id)
        return [];
      const apiUrl = `${mainUrl}/stream/getSources?id=${id}&id=${id}`;
      const streamRes = yield fetch(apiUrl, { headers: commonHeaders });
      const data = yield streamRes.json();
      if (data && data.sources && data.sources.file) {
        const masterUrl = data.sources.file;
        const baseUrl = masterUrl.substring(0, masterUrl.lastIndexOf("/") + 1);
        const masterDomain = new URL(masterUrl).origin;
        const masterRes = yield fetch(masterUrl, {
          headers: __spreadProps(__spreadValues({}, commonHeaders), {
            "Referer": `${mainUrl}/`,
            "Origin": mainUrl
          })
        });
        const masterText = yield masterRes.text();
        if (masterText.includes("Cloudflare") || !masterText.includes("#EXTM3U")) {
          return [{
            name: "AllWish MegaPlay",
            title: "AllWish - MegaPlay Auto",
            url: masterUrl,
            quality: "Auto",
            headers: {
              "User-Agent": commonHeaders["User-Agent"],
              "Origin": mainUrl,
              "Referer": `${mainUrl}/`
            }
          }];
        }
        const streams = [];
        const lines = masterText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith("#EXT-X-STREAM-INF")) {
            const resolutionMatch = lines[i].match(/RESOLUTION=(\d+x\d+)/);
            const nameMatch = lines[i].match(/NAME="([^"]+)"/);
            let quality = "Auto";
            if (nameMatch) {
              quality = nameMatch[1];
            } else if (resolutionMatch) {
              quality = resolutionMatch[1].split("x")[1] + "p";
            }
            let streamUrl = "";
            for (let j = i + 1; j < lines.length; j++) {
              if (!lines[j].startsWith("#")) {
                streamUrl = lines[j];
                break;
              }
            }
            if (streamUrl) {
              if (!streamUrl.startsWith("http")) {
                streamUrl = baseUrl + streamUrl;
              }
              streams.push({
                name: "AllWish MegaPlay",
                title: `AllWish - MegaPlay ${quality}`,
                url: streamUrl,
                quality,
                headers: {
                  "User-Agent": commonHeaders["User-Agent"],
                  "Origin": masterDomain,
                  "Referer": `${masterDomain}/`
                }
              });
            }
          }
        }
        if (streams.length === 0) {
          streams.push({
            name: "AllWish MegaPlay",
            title: "AllWish - MegaPlay Auto",
            url: masterUrl,
            quality: "Auto",
            headers: {
              "User-Agent": commonHeaders["User-Agent"],
              "Origin": masterDomain,
              "Referer": `${masterDomain}/`
            }
          });
        }
        return streams;
      }
    } catch (e) {
      console.log(`[AllWish Extractor] MegaPlay failed: ${e.message}`);
    }
    return [];
  });
}

// src/allwish/index.js
function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
  return __async(this, null, function* () {
    if (mediaType !== "tv" && mediaType !== "movie")
      return [];
    console.log(`[AllWish] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    try {
      const mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
      const query = mediaInfo.title;
      console.log(`[AllWish] TMDB Info: "${query}" (${mediaInfo.year || "N/A"})`);
      const searchUrl = `${MAIN_URL}/filter?keyword=${encodeURIComponent(query)}&page=1`;
      const res = yield fetch(searchUrl, { headers: HEADERS });
      const html = yield res.text();
      const $ = import_cheerio_without_node_native2.default.load(html);
      const searchResults = [];
      $("div.item").each((i, el) => {
        const title = $(el).find("div.name > a").text().trim();
        const href = $(el).find("div.name > a").attr("href");
        if (title && href) {
          searchResults.push({
            title,
            url: href.startsWith("http") ? href : MAIN_URL + href
          });
        }
      });
      if (searchResults.length === 0) {
        console.log("[AllWish] No search results found.");
        return [];
      }
      const bestMatch = findBestTitleMatch(mediaInfo, searchResults) || searchResults[0];
      console.log(`[AllWish] Selected: "${bestMatch.title}" (${bestMatch.url})`);
      const docRes = yield fetch(bestMatch.url, { headers: HEADERS });
      const docHtml = yield docRes.text();
      const doc$ = import_cheerio_without_node_native2.default.load(docHtml);
      const id = doc$("main > div.container").attr("data-id");
      if (!id) {
        console.log("[AllWish] Anime ID not found on page.");
        return [];
      }
      const vrf = generateEpisodeVrf(id);
      const epUrl = `${MAIN_URL}/ajax/episode/list/${id}?vrf=${vrf}`;
      const epRes = yield fetch(epUrl, { headers: XML_HEADERS });
      const epData = yield epRes.json();
      if (epData.status !== 200 || !epData.result) {
        console.log("[AllWish] Failed to load episodes or invalid VRF.");
        return [];
      }
      const ep$ = import_cheerio_without_node_native2.default.load(epData.result);
      let targetEpId = null;
      const targetEpNum = mediaType === "movie" ? "1" : episode ? episode.toString() : "1";
      ep$("div.range > div > a").each((i, el) => {
        const epId = ep$(el).attr("data-ids");
        const epNum = ep$(el).attr("data-slug");
        if (epNum === targetEpNum) {
          targetEpId = epId;
          return false;
        }
      });
      if (!targetEpId) {
        console.log(`[AllWish] Episode ${targetEpNum} not found.`);
        return [];
      }
      const serverUrl = `${MAIN_URL}/ajax/server/list?servers=${targetEpId}`;
      const serverRes = yield fetch(serverUrl, { headers: XML_HEADERS });
      const serverData = yield serverRes.json();
      if (serverData.status !== 200 || !serverData.result) {
        console.log("[AllWish] Failed to get server list.");
        return [];
      }
      const server$ = import_cheerio_without_node_native2.default.load(serverData.result);
      const dataIds = [];
      server$("div.server-type").each((i, section) => {
        server$(section).find("div.server-list > div.server").each((j, server) => {
          const dataId = server$(server).attr("data-link-id");
          if (dataId)
            dataIds.push(dataId);
        });
      });
      const streams = [];
      yield Promise.all(dataIds.map((dataId) => __async(this, null, function* () {
        try {
          const linkUrl = `${MAIN_URL}/ajax/server?get=${dataId}`;
          const linkRes = yield fetch(linkUrl, { headers: XML_HEADERS });
          const linkData = yield linkRes.json();
          if (linkData.status === 200 && linkData.result && linkData.result.url) {
            const realUrl = linkData.result.url;
            if (realUrl.includes("megaplay.buzz")) {
              const extracted = yield extractMegaPlay(realUrl);
              extracted.forEach((stream) => {
                streams.push(__spreadProps(__spreadValues({}, stream), {
                  provider: "allwish"
                }));
              });
            } else {
              console.log(`[AllWish] Unhandled extractor URL: ${realUrl}`);
            }
          }
        } catch (e) {
          console.log(`[AllWish] Failed to process server ${dataId}: ${e.message}`);
        }
      })));
      return streams;
    } catch (error) {
      console.error(`[AllWish] Error: ${error.message}`);
      return [];
    }
  });
}
