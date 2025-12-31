/**
 * uhdmovies - Built from src/uhdmovies/
 * Generated: 2025-12-31T20:41:33.334Z
 */
"use strict";

// src/uhdmovies/search.js
var DOMAIN = "https://uhdmovies.rip";
var TMDB_API = "https://api.themoviedb.org/3";
async function searchByImdbId(tmdbId, mediaType) {
  const endpoint = mediaType === "movie" ? `${TMDB_API}/movie/${tmdbId}/external_ids` : `${TMDB_API}/tv/${tmdbId}/external_ids`;
  const response = await fetch(endpoint);
  const data = await response.json();
  const imdbId = data.imdb_id;
  if (!imdbId) {
    console.log("[UHDMovies] No IMDB ID found");
    return [];
  }
  const searchUrl = `${DOMAIN}/?s=${imdbId}`;
  const searchResponse = await fetch(searchUrl);
  const html = await searchResponse.text();
  return parseSearchResults(html);
}
function parseSearchResults(html) {
  const cheerio3 = require("cheerio-without-node-native");
  const $ = cheerio3.load(html);
  const results = [];
  $(".post-title a, .entry-title a").each((_, el) => {
    results.push({
      title: $(el).text().trim(),
      url: $(el).attr("href")
    });
  });
  return results;
}

// src/uhdmovies/extractor.js
var cheerio = require("cheerio-without-node-native");
async function extractHubCloud(url) {
  console.log("[UHDMovies] Extracting HubCloud:", url);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://uhdmovies.rip/"
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    let directUrl = null;
    $('a[href*=".mkv"], a[href*=".mp4"]').each((_, el) => {
      directUrl = $(el).attr("href");
    });
    if (!directUrl) {
      const downloadBtn = $('a.btn-download, a[class*="download"]').attr("href");
      if (downloadBtn) {
        directUrl = downloadBtn;
      }
    }
    if (!directUrl) {
      const scripts = $("script").text();
      const urlMatch = scripts.match(/https?:\/\/[^"'\s]+\.(mkv|mp4)/i);
      if (urlMatch) {
        directUrl = urlMatch[0];
      }
    }
    if (directUrl) {
      return {
        url: directUrl,
        headers: {
          "Referer": url,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      };
    }
    return null;
  } catch (error) {
    console.error("[UHDMovies] HubCloud extraction failed:", error.message);
    return null;
  }
}
async function extractGDrive(url) {
  console.log("[UHDMovies] Extracting GDrive:", url);
  try {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!fileIdMatch)
      return null;
    const fileId = fileIdMatch[1];
    const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    return {
      url: directUrl,
      headers: {}
    };
  } catch (error) {
    console.error("[UHDMovies] GDrive extraction failed:", error.message);
    return null;
  }
}

// src/uhdmovies/utils.js
function parseQuality(text) {
  const normalized = text.toUpperCase();
  if (normalized.includes("2160") || normalized.includes("4K") || normalized.includes("UHD")) {
    return "2160p";
  }
  if (normalized.includes("1080")) {
    return "1080p";
  }
  if (normalized.includes("720")) {
    return "720p";
  }
  if (normalized.includes("480")) {
    return "480p";
  }
  if (normalized.includes("HDR")) {
    return "HDR";
  }
  return "Unknown";
}

// src/uhdmovies/index.js
var cheerio2 = require("cheerio-without-node-native");
async function getStreams(tmdbId, mediaType, season, episode) {
  console.log(`[UHDMovies] Searching for ${mediaType} ${tmdbId}`);
  const streams = [];
  try {
    const searchResults = await searchByImdbId(tmdbId, mediaType);
    if (!searchResults || searchResults.length === 0) {
      console.log("[UHDMovies] No results found");
      return [];
    }
    for (const result of searchResults) {
      const links = await getDownloadLinks(result.url, mediaType, season, episode);
      for (const link of links) {
        try {
          let extracted;
          if (link.url.includes("hubcloud") || link.url.includes("hubcdn")) {
            extracted = await extractHubCloud(link.url);
          } else if (link.url.includes("drive.google")) {
            extracted = await extractGDrive(link.url);
          }
          if (extracted) {
            streams.push({
              title: `UHDMovies ${link.quality}`,
              url: extracted.url,
              quality: link.quality,
              size: link.size,
              headers: extracted.headers
            });
          }
        } catch (e) {
          console.error(`[UHDMovies] Failed to extract ${link.url}:`, e.message);
        }
      }
    }
  } catch (error) {
    console.error("[UHDMovies] Error:", error.message);
  }
  return streams;
}
async function getDownloadLinks(pageUrl, mediaType, season, episode) {
  const response = await fetch(pageUrl);
  const html = await response.text();
  const $ = cheerio2.load(html);
  const links = [];
  $('a[href*="hubcloud"], a[href*="hubcdn"]').each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text();
    const quality = parseQuality(text);
    links.push({
      url: href,
      quality,
      size: extractSize(text)
    });
  });
  return links;
}
function extractSize(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  return match ? `${match[1]} ${match[2].toUpperCase()}` : null;
}
module.exports = { getStreams };
