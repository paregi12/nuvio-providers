/**
 * vixsrc - Built from src/vixsrc/
 * Generated: 2025-12-31T20:45:12.922Z
 */
"use strict";

// src/vixsrc/constants.js
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
var BASE_URL = "https://vixsrc.to";
var USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// src/vixsrc/http.js
async function makeRequest(url, options = {}) {
  const defaultHeaders = {
    "User-Agent": USER_AGENT,
    "Accept": "application/json,*/*",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    ...options.headers
  };
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: defaultHeaders,
      ...options
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    console.error(`[Vixsrc] Request failed for ${url}: ${error.message}`);
    throw error;
  }
}

// src/vixsrc/tmdb.js
async function getTmdbInfo(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const response = await makeRequest(url);
  const data = await response.json();
  const title = mediaType === "tv" ? data.name : data.title;
  const year = mediaType === "tv" ? data.first_air_date?.substring(0, 4) : data.release_date?.substring(0, 4);
  if (!title) {
    throw new Error("Could not extract title from TMDB response");
  }
  console.log(`[Vixsrc] TMDB Info: "${title}" (${year})`);
  return { title, year, data };
}

// src/vixsrc/extractor.js
async function extractStreamFromPage(contentType, contentId, seasonNum, episodeNum) {
  let vixsrcUrl;
  let subtitleApiUrl;
  if (contentType === "movie") {
    vixsrcUrl = `${BASE_URL}/movie/${contentId}`;
    subtitleApiUrl = `https://sub.wyzie.ru/search?id=${contentId}`;
  } else {
    vixsrcUrl = `${BASE_URL}/tv/${contentId}/${seasonNum}/${episodeNum}`;
    subtitleApiUrl = `https://sub.wyzie.ru/search?id=${contentId}&season=${seasonNum}&episode=${episodeNum}`;
  }
  console.log(`[Vixsrc] Fetching: ${vixsrcUrl}`);
  const response = await makeRequest(vixsrcUrl, {
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    }
  });
  const html = await response.text();
  console.log(`[Vixsrc] HTML length: ${html.length} characters`);
  let masterPlaylistUrl = null;
  if (html.includes("window.masterPlaylist")) {
    console.log("[Vixsrc] Found window.masterPlaylist");
    const urlMatch = html.match(/url:\s*['"]([^'"]+)['"]/);
    const tokenMatch = html.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
    const expiresMatch = html.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/);
    if (urlMatch && tokenMatch && expiresMatch) {
      const baseUrl = urlMatch[1];
      const token = tokenMatch[1];
      const expires = expiresMatch[1];
      console.log("[Vixsrc] Extracted tokens:");
      console.log(`  - Base URL: ${baseUrl}`);
      console.log(`  - Token: ${token.substring(0, 20)}...`);
      console.log(`  - Expires: ${expires}`);
      if (baseUrl.includes("?b=1")) {
        masterPlaylistUrl = `${baseUrl}&token=${token}&expires=${expires}&h=1&lang=en`;
      } else {
        masterPlaylistUrl = `${baseUrl}?token=${token}&expires=${expires}&h=1&lang=en`;
      }
      console.log(`[Vixsrc] Constructed master playlist URL: ${masterPlaylistUrl}`);
    }
  }
  if (!masterPlaylistUrl) {
    const m3u8Match = html.match(/(https?:\/\/[^'"\s]+\.m3u8[^'"\s]*)/);
    if (m3u8Match) {
      masterPlaylistUrl = m3u8Match[1];
      console.log("[Vixsrc] Found direct .m3u8 URL:", masterPlaylistUrl);
    }
  }
  if (!masterPlaylistUrl) {
    const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gs);
    if (scriptMatches) {
      for (const script of scriptMatches) {
        const streamMatch = script.match(/['"]?(https?:\/\/[^'"\s]+(?:\.m3u8|playlist)[^'"\s]*)/);
        if (streamMatch) {
          masterPlaylistUrl = streamMatch[1];
          console.log("[Vixsrc] Found stream in script:", masterPlaylistUrl);
          break;
        }
      }
    }
  }
  if (!masterPlaylistUrl) {
    console.log("[Vixsrc] No master playlist URL found");
    return null;
  }
  return { masterPlaylistUrl, subtitleApiUrl };
}

// src/vixsrc/subtitles.js
async function getSubtitles(subtitleApiUrl) {
  try {
    const response = await makeRequest(subtitleApiUrl);
    const subtitleData = await response.json();
    let subtitleTrack = subtitleData.find(
      (track) => track.display.includes("English") && (track.encoding === "ASCII" || track.encoding === "UTF-8")
    );
    if (!subtitleTrack) {
      subtitleTrack = subtitleData.find(
        (track) => track.display.includes("English") && track.encoding === "CP1252"
      );
    }
    if (!subtitleTrack) {
      subtitleTrack = subtitleData.find(
        (track) => track.display.includes("English") && track.encoding === "CP1250"
      );
    }
    if (!subtitleTrack) {
      subtitleTrack = subtitleData.find(
        (track) => track.display.includes("English") && track.encoding === "CP850"
      );
    }
    const subtitles = subtitleTrack ? subtitleTrack.url : "";
    console.log(
      subtitles ? `[Vixsrc] Found subtitles: ${subtitles}` : "[Vixsrc] No English subtitles found"
    );
    return subtitles;
  } catch (error) {
    console.log("[Vixsrc] Subtitle fetch failed:", error.message);
    return "";
  }
}

// src/vixsrc/index.js
async function getStreams(tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) {
  console.log(`[Vixsrc] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
  try {
    const tmdbInfo = await getTmdbInfo(tmdbId, mediaType);
    const { title, year } = tmdbInfo;
    console.log(`[Vixsrc] Title: "${title}" (${year})`);
    const streamData = await extractStreamFromPage(mediaType, tmdbId, seasonNum, episodeNum);
    if (!streamData) {
      console.log("[Vixsrc] No stream data found");
      return [];
    }
    const { masterPlaylistUrl, subtitleApiUrl } = streamData;
    const subtitles = await getSubtitles(subtitleApiUrl);
    const nuvioStreams = [{
      name: "Vixsrc",
      title: "Auto Quality Stream",
      url: masterPlaylistUrl,
      quality: "Auto",
      type: "direct",
      headers: {
        "Referer": BASE_URL,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
      }
    }];
    console.log("[Vixsrc] Successfully processed 1 stream with Auto quality");
    return nuvioStreams;
  } catch (error) {
    console.error(`[Vixsrc] Error in getStreams: ${error.message}`);
    return [];
  }
}
module.exports = { getStreams };
