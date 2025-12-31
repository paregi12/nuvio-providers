/**
 * castle - Built from src/castle/
 * Generated: 2025-12-31T20:56:39.378Z
 */
"use strict";

// src/castle/constants.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var CASTLE_BASE = "https://api.fstcy.com";
var PKG = "com.external.castle";
var CHANNEL = "IndiaA";
var CLIENT = "1";
var LANG = "en-US";
var API_HEADERS = {
  "User-Agent": "okhttp/4.9.3",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Connection": "Keep-Alive",
  "Referer": CASTLE_BASE
};
var PLAYBACK_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Accept": "video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "identity",
  "Connection": "keep-alive",
  "Sec-Fetch-Dest": "video",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Site": "cross-site",
  "DNT": "1"
};

// src/castle/http.js
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: { ...API_HEADERS, ...options.headers },
      body: options.body
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    console.error(`[Castle] Request failed for ${url}: ${error.message}`);
    throw error;
  }
}
async function extractCipherFromResponse(response) {
  const text = await response.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Empty response");
  }
  try {
    const json = JSON.parse(trimmed);
    if (json && json.data && typeof json.data === "string") {
      return json.data.trim();
    }
  } catch (e) {
  }
  return trimmed;
}
function extractDataBlock(obj) {
  if (obj && obj.data && typeof obj.data === "object") {
    return obj.data;
  }
  return obj || {};
}

// src/castle/tmdb.js
async function getTMDBDetails(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
  const response = await makeRequest(url);
  const data = await response.json();
  const title = mediaType === "tv" ? data.name : data.title;
  const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
  const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
  return {
    title,
    year,
    tmdbId
  };
}

// src/castle/decrypt.js
async function decryptCastle(encryptedB64, securityKeyB64) {
  console.log("[Castle] Starting AES-CBC decryption...");
  const response = await fetch("https://aesdec.nuvioapp.space/decrypt-castle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      encryptedData: encryptedB64,
      securityKey: securityKeyB64
    })
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  console.log("[Castle] Decryption successful");
  return data.decrypted;
}

// src/castle/api.js
async function getSecurityKey() {
  console.log("[Castle] Fetching security key...");
  const url = `${CASTLE_BASE}/v0.1/system/getSecurityKey/1?channel=${CHANNEL}&clientType=${CLIENT}&lang=${LANG}`;
  const response = await makeRequest(url);
  const data = await response.json();
  if (data.code !== 200 || !data.data) {
    throw new Error(`Security key API error: ${JSON.stringify(data)}`);
  }
  console.log("[Castle] Security key obtained");
  return data.data;
}
async function searchCastle(securityKey, keyword, page = 1, size = 30) {
  console.log(`[Castle] Searching for: ${keyword}`);
  const params = new URLSearchParams({
    channel: CHANNEL,
    clientType: CLIENT,
    keyword,
    lang: LANG,
    mode: "1",
    packageName: PKG,
    page: page.toString(),
    size: size.toString()
  });
  const url = `${CASTLE_BASE}/film-api/v1.1.0/movie/searchByKeyword?${params.toString()}`;
  const response = await makeRequest(url);
  const cipher = await extractCipherFromResponse(response);
  const decrypted = await decryptCastle(cipher, securityKey);
  return JSON.parse(decrypted);
}
async function getDetails(securityKey, movieId) {
  console.log(`[Castle] Fetching details for movieId: ${movieId}`);
  const url = `${CASTLE_BASE}/film-api/v1.1/movie?channel=${CHANNEL}&clientType=${CLIENT}&lang=${LANG}&movieId=${movieId}&packageName=${PKG}`;
  const response = await makeRequest(url);
  const cipher = await extractCipherFromResponse(response);
  const decrypted = await decryptCastle(cipher, securityKey);
  return JSON.parse(decrypted);
}
async function getVideo2(securityKey, movieId, episodeId, resolution = 2) {
  console.log(`[Castle] Fetching video (v2) for movieId: ${movieId}, episodeId: ${episodeId}`);
  const url = `${CASTLE_BASE}/film-api/v2.0.1/movie/getVideo2?clientType=${CLIENT}&packageName=${PKG}&channel=${CHANNEL}&lang=${LANG}`;
  const body = {
    mode: "1",
    appMarket: "GuanWang",
    clientType: "1",
    woolUser: "false",
    apkSignKey: "ED0955EB04E67A1D9F3305B95454FED485261475",
    androidVersion: "13",
    movieId,
    episodeId,
    isNewUser: "true",
    resolution: resolution.toString(),
    packageName: PKG
  };
  const response = await makeRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const cipher = await extractCipherFromResponse(response);
  const decrypted = await decryptCastle(cipher, securityKey);
  return JSON.parse(decrypted);
}
async function getVideoV1(securityKey, movieId, episodeId, languageId, resolution = 2) {
  console.log(`[Castle] Fetching video (v1) for movieId: ${movieId}, languageId: ${languageId}`);
  const params = new URLSearchParams({
    apkSignKey: "ED0955EB04E67A1D9F3305B95454FED485261475",
    channel: CHANNEL,
    clientType: CLIENT,
    episodeId: episodeId.toString(),
    lang: LANG,
    languageId: languageId.toString(),
    mode: "1",
    movieId: movieId.toString(),
    packageName: PKG,
    resolution: resolution.toString()
  });
  const url = `${CASTLE_BASE}/film-api/v1.9.1/movie/getVideo?${params.toString()}`;
  const response = await makeRequest(url);
  const cipher = await extractCipherFromResponse(response);
  const decrypted = await decryptCastle(cipher, securityKey);
  return JSON.parse(decrypted);
}
async function findCastleMovieId(securityKey, tmdbInfo) {
  const searchTerm = tmdbInfo.year ? `${tmdbInfo.title} ${tmdbInfo.year}` : tmdbInfo.title;
  const searchResult = await searchCastle(securityKey, searchTerm);
  const data = extractDataBlock(searchResult);
  const rows = data.rows || [];
  if (rows.length === 0) {
    throw new Error("No search results found");
  }
  for (const item of rows) {
    const itemTitle = (item.title || item.name || "").toLowerCase();
    const searchTitle = tmdbInfo.title.toLowerCase();
    if (itemTitle.includes(searchTitle) || searchTitle.includes(itemTitle)) {
      const movieId2 = item.id || item.redirectId || item.redirectIdStr;
      if (movieId2) {
        console.log(`[Castle] Found match: ${item.title || item.name} (id: ${movieId2})`);
        return movieId2.toString();
      }
    }
  }
  const firstItem = rows[0];
  const movieId = firstItem.id || firstItem.redirectId || firstItem.redirectIdStr;
  if (movieId) {
    console.log(`[Castle] Using first result: ${firstItem.title || firstItem.name} (id: ${movieId})`);
    return movieId.toString();
  }
  throw new Error("Could not extract movie ID from search results");
}

// src/castle/utils.js
function getQualityValue(quality) {
  if (!quality)
    return 0;
  const cleanQuality = quality.toString().toLowerCase().replace(/^(sd|hd|fhd|uhd|4k)\s*/i, "").replace(/p$/, "").trim();
  const qualityMap = {
    "4k": 2160,
    "2160": 2160,
    "1440": 1440,
    "1080": 1080,
    "720": 720,
    "480": 480,
    "360": 360,
    "240": 240
  };
  if (qualityMap[cleanQuality]) {
    return qualityMap[cleanQuality];
  }
  const numQuality = parseInt(cleanQuality);
  if (!isNaN(numQuality) && numQuality > 0) {
    return numQuality;
  }
  return 0;
}
function formatSize(sizeValue) {
  if (typeof sizeValue !== "number" || sizeValue <= 0) {
    return "Unknown";
  }
  if (sizeValue > 1e9) {
    return `${(sizeValue / 1e9).toFixed(2)} GB`;
  }
  return `${(sizeValue / 1e6).toFixed(0)} MB`;
}
function resolutionToQuality(resolution) {
  const qualityMap = {
    1: "480p",
    2: "720p",
    3: "1080p"
  };
  return qualityMap[resolution] || `${resolution}p`;
}

// src/castle/index.js
function processVideoResponse(videoData, mediaInfo, seasonNum, episodeNum, resolution, languageInfo) {
  const streams = [];
  const data = extractDataBlock(videoData);
  const videoUrl = data.videoUrl;
  if (!videoUrl) {
    console.log("[Castle] No videoUrl found in response");
    return streams;
  }
  let mediaTitle = mediaInfo.title || "Unknown";
  if (mediaInfo.year) {
    mediaTitle += ` (${mediaInfo.year})`;
  }
  if (seasonNum && episodeNum) {
    mediaTitle = `${mediaInfo.title} S${String(seasonNum).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`;
  }
  const quality = resolutionToQuality(resolution);
  if (data.videos && Array.isArray(data.videos)) {
    for (const video of data.videos) {
      let videoQuality = video.resolutionDescription || video.resolution || quality;
      videoQuality = videoQuality.replace(/^(SD|HD|FHD)\s+/i, "");
      const streamName = languageInfo ? `Castle ${languageInfo} - ${videoQuality}` : `Castle - ${videoQuality}`;
      streams.push({
        name: streamName,
        title: mediaTitle,
        url: video.url || videoUrl,
        quality: videoQuality,
        size: formatSize(video.size),
        headers: PLAYBACK_HEADERS,
        provider: "castle"
      });
    }
  } else {
    const streamName = languageInfo ? `Castle ${languageInfo} - ${quality}` : `Castle - ${quality}`;
    streams.push({
      name: streamName,
      title: mediaTitle,
      url: videoUrl,
      quality,
      size: formatSize(data.size),
      headers: PLAYBACK_HEADERS,
      provider: "castle"
    });
  }
  return streams;
}
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  console.log(`[Castle] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === "tv" ? `, S:${seasonNum}E:${episodeNum}` : ""}`);
  try {
    const tmdbInfo = await getTMDBDetails(tmdbId, mediaType);
    console.log(`[Castle] TMDB Info: "${tmdbInfo.title}" (${tmdbInfo.year || "N/A"})`);
    const securityKey = await getSecurityKey();
    const movieId = await findCastleMovieId(securityKey, tmdbInfo);
    let details = await getDetails(securityKey, movieId);
    let currentMovieId = movieId;
    if (mediaType === "tv" && seasonNum && episodeNum) {
      const data = extractDataBlock(details);
      const seasons = data.seasons || [];
      const season = seasons.find((s) => s.number === seasonNum);
      if (season && season.movieId && season.movieId !== movieId) {
        console.log(`[Castle] Fetching season ${seasonNum} details...`);
        details = await getDetails(securityKey, season.movieId.toString());
        currentMovieId = season.movieId.toString();
      }
    }
    const detailsData = extractDataBlock(details);
    const episodes = detailsData.episodes || [];
    let episodeId = null;
    if (mediaType === "tv" && seasonNum && episodeNum) {
      const episode2 = episodes.find((e) => e.number === episodeNum);
      if (episode2 && episode2.id) {
        episodeId = episode2.id.toString();
      }
    } else if (episodes.length > 0) {
      episodeId = episodes[0].id.toString();
    }
    if (!episodeId) {
      throw new Error("Could not find episode ID");
    }
    const episode = episodes.find((e) => e.id.toString() === episodeId);
    const tracks = episode && episode.tracks || [];
    const resolution = 2;
    const allStreams = [];
    for (const track of tracks) {
      const langName = track.languageName || track.abbreviate || "Unknown";
      if (track.existIndividualVideo && track.languageId) {
        try {
          console.log(`[Castle] Fetching ${langName} (languageId: ${track.languageId})`);
          const videoData = await getVideoV1(securityKey, currentMovieId, episodeId, track.languageId, resolution);
          const langStreams = processVideoResponse(videoData, tmdbInfo, seasonNum, episodeNum, resolution, `[${langName}]`);
          if (langStreams.length > 0) {
            console.log(`[Castle] \u2705 ${langName}: Found ${langStreams.length} streams`);
            allStreams.push(...langStreams);
          }
        } catch (error) {
          console.log(`[Castle] \u26A0\uFE0F ${langName}: Failed - ${error.message}`);
        }
      }
    }
    if (allStreams.length === 0) {
      console.log("[Castle] Falling back to shared stream (v2)");
      const videoData = await getVideo2(securityKey, currentMovieId, episodeId, resolution);
      const sharedStreams = processVideoResponse(videoData, tmdbInfo, seasonNum, episodeNum, resolution, "[Shared]");
      allStreams.push(...sharedStreams);
    }
    allStreams.sort((a, b) => getQualityValue(b.quality) - getQualityValue(a.quality));
    console.log(`[Castle] Total streams found: ${allStreams.length}`);
    return allStreams;
  } catch (error) {
    console.error(`[Castle] Error: ${error.message}`);
    return [];
  }
}
module.exports = { getStreams };
