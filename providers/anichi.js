/**
 * anichi - Built from src/anichi/
 * Generated: 2026-06-07T21:21:30.245Z
 */
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
var API_URL = "https://api.allanime.day/api";
var BASE_URL = "https://allanime.day";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "app-version": "android_c-247",
  "from-app": "animechicken",
  "platformstr": "android_c",
  "Referer": "https://allmanga.to"
};
var SEARCH_HASH = "a24c500a1b765c68ae1d8dd85174931f661c71369c89b92b88b75a725afc471c";
var DETAIL_HASH = "bb263f91e5bdd048c1c978f324613aeccdfe2cbc694a419466a31edb58c0cc0b";
var SERVER_HASH = "d405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec";

// src/anichi/utils.js
function decrypthex(inputStr) {
  const hexString = inputStr.includes("-") ? inputStr.substring(inputStr.lastIndexOf("-") + 1) : inputStr;
  const bytes = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substring(i, i + 2), 16) ^ 56);
  }
  return String.fromCharCode(...bytes);
}
function fixUrlPath(link) {
  if (link.includes(".json?")) {
    return BASE_URL + link;
  } else {
    const urlObj = new URL(link, BASE_URL);
    return BASE_URL + urlObj.pathname + ".json?" + urlObj.search.substring(1);
  }
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}/external_ids?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
      const res = yield fetch(url);
      if (!res.ok)
        return null;
      const data = yield res.json();
      return data.imdb_id || null;
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
    var _a;
    try {
      const res = yield fetch(`https://api.jikan.moe/v4/anime/${malId}`);
      if (!res.ok)
        return null;
      const data = yield res.json();
      return ((_a = data.data) == null ? void 0 : _a.title) || null;
    } catch (e) {
      return null;
    }
  });
}
function extractQuality(url) {
  if (!url)
    return "Unknown";
  const qualityPatterns = [
    /(\d{3,4})p/i,
    /quality[_-]?(\d{3,4})/i,
    /res[_-]?(\d{3,4})/i
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
  if (url.includes("1080"))
    return "1080p";
  if (url.includes("720"))
    return "720p";
  if (url.includes("480"))
    return "480p";
  if (url.includes("360"))
    return "360p";
  return "Unknown";
}

// src/anichi/index.js
function fetchFromAnichi(url) {
  return __async(this, null, function* () {
    const res = yield fetch(url, { headers: HEADERS });
    if (!res.ok)
      throw new Error(`Anichi HTTP ${res.status}`);
    return yield res.json();
  });
}
function getEpisodeLinks(showId, translationType, episodeString) {
  return __async(this, null, function* () {
    var _a, _b;
    const variables = {
      showId,
      translationType,
      episodeString
    };
    const url = `${API_URL}?variables=${encodeURIComponent(JSON.stringify(variables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: SERVER_HASH } }))}`;
    try {
      const data = yield fetchFromAnichi(url);
      return ((_b = (_a = data.data) == null ? void 0 : _a.episode) == null ? void 0 : _b.sourceUrls) || [];
    } catch (e) {
      console.error(`[Anichi] Failed to fetch episode links: ${e.message}`);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e;
    console.log(`[Anichi] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}, S:${seasonNum} E:${episodeNum}`);
    try {
      let animeTitle = "";
      let mappedEp = episodeNum;
      if (mediaType === "tv") {
        const imdbId = yield getImdbId(tmdbId, mediaType);
        if (imdbId) {
          const mapping = yield resolveMapping(imdbId, seasonNum, episodeNum);
          if (mapping && mapping.mal_id) {
            mappedEp = mapping.mal_episode || episodeNum;
            animeTitle = yield getMalTitle(mapping.mal_id);
          }
        }
      }
      if (!animeTitle) {
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
        const tmdbRes = yield fetch(tmdbUrl);
        if (tmdbRes.ok) {
          const tmdbData = yield tmdbRes.json();
          animeTitle = tmdbData.name || tmdbData.title || tmdbData.original_name || tmdbData.original_title;
        }
      }
      if (!animeTitle) {
        console.error("[Anichi] Could not resolve anime title.");
        return [];
      }
      console.log(`[Anichi] Resolved Title: "${animeTitle}"`);
      const searchVariables = {
        search: { query: animeTitle },
        limit: 26,
        page: 1,
        translationType: "sub",
        countryOrigin: "ALL"
      };
      const searchUrl = `${API_URL}?variables=${encodeURIComponent(JSON.stringify(searchVariables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: SEARCH_HASH } }))}`;
      const searchData = yield fetchFromAnichi(searchUrl);
      const edges = ((_b = (_a = searchData.data) == null ? void 0 : _a.shows) == null ? void 0 : _b.edges) || [];
      if (edges.length === 0) {
        console.log("[Anichi] No anime found matching query.");
        return [];
      }
      const match = edges.find(
        (e) => e.name.toLowerCase() === animeTitle.toLowerCase() || e.englishName && e.englishName.toLowerCase() === animeTitle.toLowerCase()
      ) || edges[0];
      const showId = match._id;
      console.log(`[Anichi] Found Show ID: ${showId} (${match.name})`);
      const detailVariables = { _id: showId };
      const detailUrl = `${API_URL}?variables=${encodeURIComponent(JSON.stringify(detailVariables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: DETAIL_HASH } }))}`;
      const detailData = yield fetchFromAnichi(detailUrl);
      const show = (_c = detailData.data) == null ? void 0 : _c.show;
      if (!show)
        return [];
      const subEpisodes = ((_d = show.availableEpisodesDetail) == null ? void 0 : _d.sub) || [];
      const dubEpisodes = ((_e = show.availableEpisodesDetail) == null ? void 0 : _e.dub) || [];
      const hasSub = subEpisodes.includes(String(mappedEp));
      const hasDub = dubEpisodes.includes(String(mappedEp));
      if (!hasSub && !hasDub) {
        console.log(`[Anichi] Episode ${mappedEp} is not available.`);
        return [];
      }
      const streams = [];
      const sourcePromises = [];
      if (hasSub) {
        sourcePromises.push(getEpisodeLinks(showId, "sub", String(mappedEp)).then((sources) => ({ type: "Sub", sources })));
      }
      if (hasDub) {
        sourcePromises.push(getEpisodeLinks(showId, "dub", String(mappedEp)).then((sources) => ({ type: "Dub", sources })));
      }
      const resolvedTypes = yield Promise.all(sourcePromises);
      for (const { type, sources } of resolvedTypes) {
        for (const source of sources) {
          let rawUrl = source.sourceUrl;
          if (!rawUrl)
            continue;
          if (rawUrl.startsWith("--")) {
            rawUrl = decrypthex(rawUrl);
          }
          if (rawUrl.includes("/apivtwo/clock")) {
            const fixedLink = fixUrlPath(rawUrl);
            try {
              const clockRes = yield fetch(fixedLink, { headers: HEADERS });
              if (clockRes.ok) {
                const clockData = yield clockRes.json();
                const links = clockData.links || [];
                links.forEach((item) => {
                  if (item.link) {
                    let quality = item.resolutionStr || extractQuality(item.link);
                    if ((quality === "Hls" || quality === "Adaptive" || quality === "Unknown") && item.link) {
                      if (item.link.includes("1080p") || item.link.includes("1080"))
                        quality = "1080p";
                      else if (item.link.includes("720p") || item.link.includes("720"))
                        quality = "720p";
                      else if (item.link.includes("480p") || item.link.includes("480"))
                        quality = "480p";
                      else if (item.link.includes("360p") || item.link.includes("360"))
                        quality = "360p";
                    }
                    const defaultPlaybackHeaders = item.link.includes("wixmp.com") || item.link.includes("wixstatic.com") ? {
                      "Referer": "https://repackager.wixmp.com/",
                      "Origin": "https://repackager.wixmp.com",
                      "User-Agent": HEADERS["User-Agent"]
                    } : {
                      "User-Agent": HEADERS["User-Agent"]
                    };
                    streams.push({
                      name: `Anichi ${source.sourceName} (${type}) - ${quality}`,
                      title: `${match.name} - Episode ${mappedEp}`,
                      url: item.link,
                      quality,
                      size: "Unknown",
                      headers: item.headers || defaultPlaybackHeaders,
                      provider: "anichi"
                    });
                  }
                });
              }
            } catch (e) {
              console.error(`[Anichi] Error fetching clock URL: ${e.message}`);
            }
          } else {
            const quality = extractQuality(rawUrl);
            const name = `Anichi ${source.sourceName} (${type}) - ${quality}`;
            const cleanHeaders = {
              "User-Agent": HEADERS["User-Agent"]
            };
            streams.push({
              name,
              title: `${match.name} - Episode ${mappedEp}`,
              url: rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl,
              quality,
              size: "Unknown",
              headers: cleanHeaders,
              provider: "anichi"
            });
          }
        }
      }
      const prioritySources = ["Default", "Luf-Mp4", "Ur-mp4", "Ak"];
      const qualityOrder = { "1080p": 4, "720p": 3, "480p": 2, "360p": 1, "Unknown": 0 };
      streams.sort((a, b) => {
        const aPri = prioritySources.some((src) => a.name.includes(src)) || a.url.includes("wixmp.com") || a.url.includes("wixstatic.com") ? 1 : 0;
        const bPri = prioritySources.some((src) => b.name.includes(src)) || b.url.includes("wixmp.com") || b.url.includes("wixstatic.com") ? 1 : 0;
        if (aPri !== bPri) {
          return bPri - aPri;
        }
        const aQ = qualityOrder[a.quality] || 0;
        const bQ = qualityOrder[b.quality] || 0;
        return bQ - aQ;
      });
      console.log(`[Anichi] Total streams found: ${streams.length}`);
      return streams;
    } catch (e) {
      console.error(`[Anichi] Error in getStreams: ${e.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
