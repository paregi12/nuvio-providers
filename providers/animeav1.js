/**
 * animeav1 - Built from src/animeav1/
 * Generated: 2026-03-13T04:49:54.983Z
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

// src/animeav1/index.js
var animeav1_exports = {};
__export(animeav1_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(animeav1_exports);
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/animeav1/constants.js
var MAIN_URL = "https://animeav1.com";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"
};

// src/animeav1/utils.js
function getTMDBDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,alternative_titles`;
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
function cleanJsToJson(js) {
  let cleaned = js.replace(/^\s*\w+\s*:\s*/, "");
  cleaned = cleaned.replace(/void 0/g, "null");
  cleaned = cleaned.replace(new RegExp("(?<=[{,])\\s*(\\w+)\\s*:", "g"), '"$1":');
  return cleaned.trim();
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
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = result;
    }
  }
  return bestMatch;
}

// src/animeav1/extractor.js
function extractZilla(url, referer) {
  return __async(this, null, function* () {
    const mainUrl = "https://player.zilla-networks.com";
    try {
      const id = url.split("/").pop();
      const m3u8Url = `${mainUrl}/m3u8/${id}`;
      return [{
        name: "Animeav1 HLS",
        title: "Animeav1 - HLS (Zilla)",
        url: m3u8Url,
        quality: "1080p",
        headers: {
          "Referer": referer || "",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
        }
      }];
    } catch (e) {
      console.log(`[Animeav1 Extractor] Zilla failed: ${e.message}`);
    }
    return [];
  });
}
function extractVidStack(url, referer) {
  return __async(this, null, function* () {
    if (url.includes(".m3u8") || url.includes(".mp4")) {
      return [{
        name: "Animeav1 VidStack",
        title: "Animeav1 - VidStack",
        url,
        quality: "Auto",
        headers: {
          "Referer": referer || "",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
        }
      }];
    }
    return [];
  });
}

// src/animeav1/index.js
function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
  return __async(this, null, function* () {
    console.log(`[Animeav1] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
    try {
      const mediaInfo = yield getTMDBDetails(tmdbId, mediaType);
      const query = mediaInfo.title;
      console.log(`[Animeav1] TMDB Info: "${query}" (${mediaInfo.year || "N/A"})`);
      const searchUrl = `${MAIN_URL}/catalogo?search=${encodeURIComponent(query)}`;
      const res = yield fetch(searchUrl, { headers: HEADERS });
      const html = yield res.text();
      const $ = import_cheerio_without_node_native.default.load(html);
      const searchResults = [];
      $("article").each((i, el) => {
        const title = $(el).find("h3").text().trim();
        const href = $(el).find("a").attr("href");
        if (title && href) {
          searchResults.push({
            title,
            url: href.startsWith("http") ? href : MAIN_URL + href
          });
        }
      });
      if (searchResults.length === 0) {
        console.log("[Animeav1] No search results found.");
        return [];
      }
      const bestMatch = findBestTitleMatch(mediaInfo, searchResults) || searchResults[0];
      console.log(`[Animeav1] Selected: "${bestMatch.title}" (${bestMatch.url})`);
      const docRes = yield fetch(bestMatch.url, { headers: HEADERS });
      const docHtml = yield docRes.text();
      let epUrl = bestMatch.url;
      if (mediaType === "tv") {
        const regex = new RegExp('media:\\{.*?episodesCount:(\\d+).*?slug:"(.*?)"', "s");
        const match = docHtml.match(regex);
        if (match) {
          const slug = match[2];
          const epNum = episode || 1;
          epUrl = `${MAIN_URL}/media/${slug}/${epNum}`;
        } else {
          console.log("[Animeav1] Could not extract media slug/episodes.");
          const doc$ = import_cheerio_without_node_native.default.load(docHtml);
          const firstEp = doc$("div.grid > article a").first().attr("href");
          if (firstEp) {
            epUrl = firstEp.startsWith("http") ? firstEp : MAIN_URL + firstEp;
          }
        }
      }
      console.log(`[Animeav1] Fetching episode page: ${epUrl}`);
      const epRes = yield fetch(epUrl, { headers: HEADERS });
      const epHtml = yield epRes.text();
      const embedsPattern = new RegExp("embeds:\\s*(\\{([^}]*\\{[^}]*\\})*[^}]*\\})", "s");
      const embedsMatch = epHtml.match(embedsPattern);
      if (!embedsMatch) {
        console.log("[Animeav1] No embeds found in script.");
        return [];
      }
      const embedsJsonStr = cleanJsToJson(embedsMatch[1]);
      const embeds = JSON.parse(embedsJsonStr);
      const streams = [];
      const allEmbeds = [
        ...(embeds.SUB || []).map((e) => __spreadProps(__spreadValues({}, e), { type: "SUB" })),
        ...(embeds.DUB || []).map((e) => __spreadProps(__spreadValues({}, e), { type: "DUB" }))
      ];
      for (const embed of allEmbeds) {
        try {
          const server = embed.server;
          const url = embed.url;
          if (url.includes("zilla-networks.com")) {
            const extracted = yield extractZilla(url, epUrl);
            extracted.forEach((s) => streams.push(__spreadProps(__spreadValues({}, s), { title: `${s.title} [${embed.type}:${server}]`, provider: "animeav1" })));
          } else {
            const extracted = yield extractVidStack(url, epUrl);
            extracted.forEach((s) => streams.push(__spreadProps(__spreadValues({}, s), { title: `${s.title} [${embed.type}:${server}]`, provider: "animeav1" })));
          }
        } catch (e) {
          console.log(`[Animeav1] Failed to process embed: ${e.message}`);
        }
      }
      return streams;
    } catch (error) {
      console.error(`[Animeav1] Error: ${error.message}`);
      return [];
    }
  });
}
