/**
 * vidrock - Built from src/vidrock/
 * Generated: 2026-06-08T13:51:02.912Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/vidrock/constants.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var VIDROCK_BASE_URL = "https://vidrock.ru";
var PASSPHRASE = "x7k9mPqT2rWvY8zA5bC3nF6hJ2lK4mN9";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
var WORKING_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://vidrock.ru/",
  "Origin": "https://vidrock.ru"
};
var PLAYBACK_HEADERS = {
  "User-Agent": USER_AGENT,
  "Referer": "https://vidrock.ru/",
  "Origin": "https://vidrock.ru"
};

// src/vidrock/utils.js
var import_crypto_js = __toESM(require("crypto-js"));
function encryptVidrock(text) {
  const key = import_crypto_js.default.enc.Utf8.parse(PASSPHRASE);
  const iv = import_crypto_js.default.enc.Utf8.parse(PASSPHRASE.substring(0, 16));
  const encrypted = import_crypto_js.default.AES.encrypt(text, key, {
    iv,
    mode: import_crypto_js.default.mode.CBC,
    padding: import_crypto_js.default.pad.Pkcs7
  });
  return encrypted.toString().replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fetchTmdbDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    try {
      const endpoint = mediaType === "tv" ? "tv" : "movie";
      const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      const res = yield fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json"
        }
      });
      if (!res.ok)
        throw new Error(`TMDB HTTP ${res.status}`);
      const data = yield res.json();
      return {
        title: mediaType === "tv" ? data.name : data.title,
        year: (mediaType === "tv" ? data.first_air_date : data.release_date || "").substring(0, 4),
        imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null
      };
    } catch (e) {
      console.error(`[Vidrock] TMDB Fetch Error: ${e.message}`);
      return null;
    }
  });
}
function extractQuality(url) {
  if (!url)
    return "Unknown";
  const qualityPatterns = [
    /(\d{3,4})p/i,
    /(\d{3,4})k/i,
    /quality[_-]?(\d{3,4})/i,
    /res[_-]?(\d{3,4})/i,
    /(\d{3,4})x\d{3,4}/i
  ];
  for (const pattern of qualityPatterns) {
    const match = url.match(pattern);
    if (match) {
      const qualityNum = parseInt(match[1]);
      if (qualityNum >= 240 && qualityNum <= 4320) {
        return `${qualityNum}p`;
      }
    }
  }
  if (url.includes("1080") || url.includes("1920"))
    return "1080p";
  if (url.includes("720") || url.includes("1280"))
    return "720p";
  if (url.includes("480") || url.includes("854"))
    return "480p";
  if (url.includes("360") || url.includes("640"))
    return "360p";
  if (url.includes("240") || url.includes("426"))
    return "240p";
  return "Unknown";
}
function parseAstraPlaylist(playlistUrl, serverName, mediaInfo, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    try {
      console.log(`[Vidrock] Fetching Astra playlist: ${playlistUrl}`);
      const res = yield fetch(playlistUrl, {
        headers: PLAYBACK_HEADERS
      });
      if (!res.ok)
        return [];
      const data = yield res.json();
      const streams = [];
      if (Array.isArray(data)) {
        data.forEach((item) => {
          if (item.url && item.resolution) {
            const quality = `${item.resolution}p`;
            let mediaTitle = mediaInfo.title || "Unknown";
            if (mediaInfo.year) {
              mediaTitle += ` (${mediaInfo.year})`;
            }
            if (seasonNum && episodeNum) {
              mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
            }
            streams.push({
              name: `Vidrock [${serverName}] - ${quality}`,
              title: mediaTitle,
              url: item.url,
              quality,
              size: "Unknown",
              headers: PLAYBACK_HEADERS,
              provider: "vidrock"
            });
          }
        });
      }
      return streams;
    } catch (e) {
      console.error(`[Vidrock] Astra playlist parse error: ${e.message}`);
      return [];
    }
  });
}

// src/vidrock/index.js
function getStreams(tmdbId, mediaType, seasonNum = null, episodeNum = null) {
  return __async(this, null, function* () {
    console.log(`[Vidrock] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === "tv" ? `, S:${seasonNum}E:${episodeNum}` : ""}`);
    try {
      const mediaInfo = yield fetchTmdbDetails(tmdbId, mediaType);
      if (!mediaInfo) {
        console.error("[Vidrock] Failed to fetch TMDB details.");
        return [];
      }
      console.log(`[Vidrock] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || "N/A"})`);
      let itemId;
      if (mediaType === "tv" && seasonNum && episodeNum) {
        itemId = `${tmdbId}_${seasonNum}_${episodeNum}`;
      } else {
        itemId = tmdbId.toString();
      }
      const encryptedId = encryptVidrock(itemId);
      const apiUrl = `${VIDROCK_BASE_URL}/api/${mediaType}/${encryptedId}`;
      console.log(`[Vidrock] Querying URL: ${apiUrl}`);
      const response = yield fetch(apiUrl, {
        headers: WORKING_HEADERS
      });
      if (!response.ok) {
        console.error(`[Vidrock] Request failed with HTTP ${response.status}`);
        return [];
      }
      const responseText = yield response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error(`[Vidrock] Invalid JSON response: ${responseText.substring(0, 100)}`);
        return [];
      }
      console.log(`[Vidrock] Processing API response...`);
      const streams = [];
      const astraPromises = [];
      if (data && typeof data === "object") {
        if (data.error) {
          console.error(`[Vidrock] API error returned: ${data.error}`);
          return [];
        }
        for (const serverName of Object.keys(data)) {
          const source = data[serverName];
          if (!source || !source.url)
            continue;
          let videoUrl = source.url;
          if (videoUrl.includes("%")) {
            try {
              videoUrl = decodeURIComponent(videoUrl);
            } catch (e) {
            }
          }
          if (serverName === "Astra" && videoUrl.includes("/playlist/")) {
            astraPromises.push(parseAstraPlaylist(videoUrl, serverName, mediaInfo, seasonNum, episodeNum));
            continue;
          }
          let quality = extractQuality(videoUrl);
          const languageInfo = source.language ? ` ${source.language}` : "";
          let mediaTitle = mediaInfo.title || "Unknown";
          if (mediaInfo.year) {
            mediaTitle += ` (${mediaInfo.year})`;
          }
          if (seasonNum && episodeNum) {
            mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
          }
          const streamHeaders = PLAYBACK_HEADERS;
          streams.push({
            name: `Vidrock [${serverName}]${languageInfo} - ${quality}`,
            title: mediaTitle,
            url: videoUrl,
            quality,
            size: "Unknown",
            headers: streamHeaders,
            provider: "vidrock"
          });
        }
      }
      if (astraPromises.length > 0) {
        const astraResults = yield Promise.all(astraPromises);
        astraResults.forEach((subList) => {
          if (subList && Array.isArray(subList)) {
            streams.push(...subList);
          }
        });
      }
      const uniqueStreams = [];
      const seenUrls = /* @__PURE__ */ new Set();
      streams.forEach((stream) => {
        if (!seenUrls.has(stream.url)) {
          seenUrls.add(stream.url);
          uniqueStreams.push(stream);
        }
      });
      const getQualityValue = (quality) => {
        const q = quality.toLowerCase().replace(/p$/, "");
        if (q === "4k" || q === "2160")
          return 2160;
        if (q === "1440")
          return 1440;
        if (q === "1080")
          return 1080;
        if (q === "720")
          return 720;
        if (q === "480")
          return 480;
        if (q === "360")
          return 360;
        if (q === "240")
          return 240;
        if (q === "unknown")
          return 0;
        const parsed = parseInt(q);
        return isNaN(parsed) ? 1 : parsed;
      };
      uniqueStreams.sort((a, b) => getQualityValue(b.quality) - getQualityValue(a.quality));
      console.log(`[Vidrock] Total streams found: ${uniqueStreams.length}`);
      return uniqueStreams;
    } catch (error) {
      console.error(`[Vidrock] Error in getStreams: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
