/**
 * videasy - Built from src/videasy/
 * Generated: 2026-06-07T20:45:36.124Z
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

// src/videasy/constants.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var VIDEASY_API_BASE = "https://api.videasy.net";
var DEC_API_URL = "https://enc-dec.app/api/dec-videasy";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
var REQUEST_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "*/*",
  "Origin": "https://www.cineby.sc",
  "Referer": "https://www.cineby.sc/",
  "Connection": "keep-alive"
};
var PLAYBACK_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "*/*",
  "Origin": "https://www.cineby.sc",
  "Referer": "https://www.cineby.sc/"
};
var SERVERS = {
  "Neon": {
    path: "myflixerzupcloud",
    language: "Original"
  },
  "Sage": {
    path: "1movies",
    language: "Original"
  },
  "Cypher": {
    path: "moviebox",
    language: "Original"
  },
  "Reyna": {
    path: "primewire",
    language: "Original"
  },
  "Breach": {
    path: "m4uhd",
    language: "Original"
  },
  "Vyse": {
    path: "hdmovie",
    language: "Original"
  },
  "Yoru": {
    path: "cdn",
    language: "Original",
    moviesOnly: true
  },
  "Ghost": {
    path: "primesrcme",
    language: "Original"
  },
  "Astra": {
    path: "visioncine",
    language: "Portuguese"
  },
  "Phoenix": {
    path: "overflix",
    language: "Portuguese"
  },
  "Raze": {
    path: "superflix",
    language: "Portuguese"
  },
  "Gekko": {
    path: "cuevana",
    language: "Spanish"
  },
  "Viper": {
    path: "lamovie",
    language: "Original"
  },
  "MbFlix": {
    path: "mb-flix",
    language: "Original"
  }
};

// src/videasy/utils.js
function decryptVideoEasy(encryptedText, tmdbId) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(DEC_API_URL, {
        method: "POST",
        headers: __spreadProps(__spreadValues({}, REQUEST_HEADERS), {
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({ text: encryptedText, id: Number(tmdbId) })
      });
      if (!response.ok)
        throw new Error(`Decryption HTTP ${response.status}`);
      const data = yield response.json();
      return data.result || null;
    } catch (e) {
      console.error(`[VideoEasy] Decryption error: ${e.message}`);
      return null;
    }
  });
}
function fetchMediaDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    try {
      const endpoint = mediaType === "tv" ? "tv" : "movie";
      const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      const res = yield fetch(url, {
        headers: {
          "User-Agent": REQUEST_HEADERS["User-Agent"],
          "Accept": "application/json"
        }
      });
      if (!res.ok)
        throw new Error(`TMDB HTTP ${res.status}`);
      const data = yield res.json();
      return {
        title: mediaType === "tv" ? data.name : data.title,
        year: (mediaType === "tv" ? data.first_air_date : data.release_date || "").substring(0, 4),
        imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null,
        mediaType
      };
    } catch (e) {
      console.error(`[VideoEasy] TMDB details fetch error: ${e.message}`);
      return null;
    }
  });
}
function normalizeLanguageName(language) {
  if (!language || typeof language !== "string")
    return "";
  const languageMap = {
    "en": "English",
    "eng": "English",
    "english": "English",
    "hi": "Hindi",
    "hin": "Hindi",
    "hindi": "Hindi",
    "de": "German",
    "ger": "German",
    "german": "German",
    "it": "Italian",
    "ita": "Italian",
    "italian": "Italian",
    "fr": "French",
    "fre": "French",
    "french": "French",
    "es": "Spanish",
    "spa": "Spanish",
    "spanish": "Spanish",
    "pt": "Portuguese",
    "por": "Portuguese",
    "portuguese": "Portuguese",
    "ar": "Arabic",
    "ara": "Arabic",
    "arabic": "Arabic",
    "ja": "Japanese",
    "jpn": "Japanese",
    "japanese": "Japanese",
    "ko": "Korean",
    "kor": "Korean",
    "korean": "Korean",
    "ta": "Tamil",
    "tam": "Tamil",
    "tamil": "Tamil",
    "te": "Telugu",
    "tel": "Telugu",
    "telugu": "Telugu",
    "ml": "Malayalam",
    "mal": "Malayalam",
    "malayalam": "Malayalam",
    "kn": "Kannada",
    "kan": "Kannada",
    "kannada": "Kannada"
  };
  const normalized = language.toLowerCase().trim();
  return languageMap[normalized] || language;
}
function extractQualityFromUrl(url) {
  if (!url)
    return "Unknown";
  const qualityPatterns = [
    /(\d{3,4})p/i,
    /(\d{3,4})k/i,
    /quality[_-]?(\d{3,4})/i,
    /res[_-]?(\d{3,4})/i,
    /(\d{3,4})x\d{3,4}/i,
    /\/MTA4MA==\//i,
    /\/NzIw\//i,
    /\/MzYw\//i,
    /\/NDgw\//i,
    /\/MTkyMA==\//i,
    /\/MTI4MA==\//i
  ];
  for (const pattern of qualityPatterns) {
    const match = url.match(pattern);
    if (match) {
      if (pattern.source.includes("MTA4MA=="))
        return "1080p";
      if (pattern.source.includes("NzIw"))
        return "720p";
      if (pattern.source.includes("MzYw"))
        return "360p";
      if (pattern.source.includes("NDgw"))
        return "480p";
      if (pattern.source.includes("MTkyMA=="))
        return "1080p";
      if (pattern.source.includes("MTI4MA=="))
        return "720p";
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
function formatStreamsForNuvio(mediaData, serverName, serverConfig, mediaDetails) {
  if (!mediaData || typeof mediaData !== "object" || !mediaData.sources) {
    return [];
  }
  const streams = [];
  mediaData.sources.forEach((source) => {
    if (!source.url)
      return;
    let quality = source.quality || extractQualityFromUrl(source.url);
    let detectedLanguage = "";
    if (quality && typeof quality === "string") {
      const providerNames = ["streamwish", "voesx", "filemoon", "fileions", "filelions", "streamtape", "streamlare", "doodstream", "upstream", "mixdrop"];
      const isProviderName = providerNames.some(
        (provider) => quality.toLowerCase().includes(provider.toLowerCase())
      );
      if (isProviderName) {
        quality = extractQualityFromUrl(source.url);
        if (quality === "Unknown")
          quality = "Adaptive";
      }
      if (quality.includes("GB") || quality.includes("MB") || quality.includes("|")) {
        quality = extractQualityFromUrl(source.url);
        if (quality === "Unknown")
          quality = "Adaptive";
      }
      const languageNames = ["english", "hindi", "german", "italian", "spanish", "portuguese", "french", "arabic", "chinese", "japanese", "korean", "tamil", "telugu", "malayalam", "kannada"];
      const isLanguageName = languageNames.some(
        (lang) => quality.toLowerCase().includes(lang.toLowerCase())
      );
      if (isLanguageName) {
        detectedLanguage = normalizeLanguageName(quality);
        quality = extractQualityFromUrl(source.url);
        if (quality === "Unknown")
          quality = "Adaptive";
      }
      if (quality.toLowerCase() === "hd" || quality.toLowerCase() === "high") {
        const urlQuality = extractQualityFromUrl(source.url);
        quality = urlQuality !== "Unknown" ? urlQuality : "720p";
      }
      if (quality.toLowerCase() === "sd" || quality.toLowerCase() === "standard") {
        quality = "480p";
      }
      if (quality.toLowerCase() === "auto")
        quality = "Auto";
      if (quality.toLowerCase() === "adaptive")
        quality = "Adaptive";
    }
    const title = `${mediaDetails.title} (${mediaDetails.year})`;
    let languageInfo = "";
    if (source.language) {
      const normalizedLanguage = normalizeLanguageName(source.language);
      if (normalizedLanguage)
        languageInfo = ` [${normalizedLanguage}]`;
    } else if (detectedLanguage) {
      languageInfo = ` [${detectedLanguage}]`;
    }
    streams.push({
      name: `VIDEASY ${serverName} (${serverConfig.language})${languageInfo} - ${quality}`,
      title,
      url: source.url,
      quality,
      size: "Unknown",
      headers: PLAYBACK_HEADERS,
      provider: "videasy"
    });
  });
  return streams;
}

// src/videasy/index.js
function fetchFromServer(serverName, serverConfig, mediaType, doubleEncodedTitle, year, tmdbId, imdbId, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    if (mediaType === "tv" && serverConfig.moviesOnly) {
      return [];
    }
    const params = {
      title: doubleEncodedTitle,
      mediaType,
      year,
      tmdbId,
      imdbId: imdbId || ""
    };
    if (mediaType === "tv" && seasonNum && episodeNum) {
      params.seasonId = seasonNum;
      params.episodeId = episodeNum;
    }
    const queryString = Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
    const url = `${VIDEASY_API_BASE}/${serverConfig.path}/sources-with-title?${queryString}`;
    console.log(`[VideoEasy] Querying server ${serverName}: ${url}`);
    try {
      const res = yield fetch(url, { headers: REQUEST_HEADERS });
      if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
      const encryptedData = yield res.text();
      if (!encryptedData || encryptedData.trim() === "") {
        throw new Error("Empty response");
      }
      const decryptedData = yield decryptVideoEasy(encryptedData, tmdbId);
      if (!decryptedData)
        return [];
      const streams = formatStreamsForNuvio(decryptedData, serverName, serverConfig, { title: doubleEncodedTitle, year });
      console.log(`[VideoEasy] \u2705 Found ${streams.length} stream(s) from ${serverName}`);
      return streams;
    } catch (e) {
      console.warn(`[VideoEasy] \u274C Error from ${serverName}: ${e.message}`);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum = null, episodeNum = null) {
  return __async(this, null, function* () {
    console.log(`[VideoEasy] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === "tv" ? `, S:${seasonNum}E:${episodeNum}` : ""}`);
    try {
      const mediaDetails = yield fetchMediaDetails(tmdbId, mediaType);
      if (!mediaDetails) {
        console.error("[VideoEasy] Failed to fetch media details from TMDB.");
        return [];
      }
      console.log(`[VideoEasy] Media Details: "${mediaDetails.title}" (${mediaDetails.year})`);
      const doubleEncodedTitle = encodeURIComponent(encodeURIComponent(mediaDetails.title));
      const serverPromises = Object.keys(SERVERS).map((serverName) => {
        const serverConfig = SERVERS[serverName];
        return fetchFromServer(
          serverName,
          serverConfig,
          mediaType,
          doubleEncodedTitle,
          mediaDetails.year,
          tmdbId,
          mediaDetails.imdbId,
          seasonNum,
          episodeNum
        );
      });
      const results = yield Promise.all(serverPromises);
      const allStreams = [];
      results.forEach((streams) => {
        allStreams.push(...streams);
      });
      const uniqueStreams = [];
      const seenUrls = /* @__PURE__ */ new Set();
      allStreams.forEach((stream) => {
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
        if (q === "adaptive" || q === "auto")
          return 4e3;
        if (q === "unknown")
          return 0;
        const parsed = parseInt(q);
        return isNaN(parsed) ? 1 : parsed;
      };
      uniqueStreams.sort((a, b) => getQualityValue(b.quality) - getQualityValue(a.quality));
      console.log(`[VideoEasy] Total unique streams found: ${uniqueStreams.length}`);
      return uniqueStreams;
    } catch (e) {
      console.error(`[VideoEasy] Error in getStreams: ${e.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
