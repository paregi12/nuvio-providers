// YFlix Scraper for Nuvio Local Scrapers
// React Native compatible version - Standalone (no external dependencies)

// TMDB API Configuration
const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Headers for requests
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'Connection': 'keep-alive'
};

const API = 'https://enc-dec.app/api';
const YFLIX_AJAX = 'https://yflix.to/ajax';

// Debug helpers
function createRequestId() {
  try {
    const rand = Math.random().toString(36).slice(2, 8);
    const ts = Date.now().toString(36).slice(-6);
    return `${rand}${ts}`;
  } catch (e) {
    return String(Date.now());
  }
}

function logRid(rid, msg, extra) {
  try {
    if (extra !== undefined) {
      console.log(`[YFlix][rid:${rid}] ${msg}`, extra);
    } else {
      console.log(`[YFlix][rid:${rid}] ${msg}`);
    }
  } catch (e) {
    // ignore logging errors
  }
}

// Helper functions for HTTP requests (React Native compatible)
function getText(url) {
  return fetch(url, { headers: HEADERS })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.text();
    });
}

function getJson(url) {
  return fetch(url, { headers: HEADERS })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    });
}

function postJson(url, jsonBody, extraHeaders) {
  const body = JSON.stringify(jsonBody);
  const headers = Object.assign(
    {},
    HEADERS,
    { 'Content-Type': 'application/json', 'Content-Length': body.length.toString() },
    extraHeaders || {}
  );

  return fetch(url, {
    method: 'POST',
    headers,
    body
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  });
}

// Enc/Dec helpers
function encrypt(text) {
  return getJson(`${API}/enc-movies-flix?text=${encodeURIComponent(text)}`).then(j => j.result);
}

function decrypt(text) {
  return getJson(`${API}/dec-movies-flix?text=${encodeURIComponent(text)}`).then(j => j.result);
}

function parseHtml(html) {
  return postJson(`${API}/parse-html`, { text: html }).then(j => j.result);
}

function decryptRapidMedia(embedUrl) {
  const media = embedUrl.replace('/e/', '/media/').replace('/e2/', '/media/');
  return getJson(media)
    .then((mediaJson) => {
      const encrypted = mediaJson && mediaJson.result;
      if (!encrypted) throw new Error('No encrypted media result from RapidShare media endpoint');
      return postJson(`${API}/dec-rapid`, { text: encrypted, agent: HEADERS['User-Agent'] });
    })
    .then(j => j.result);
}

// HLS helpers (Promise-based)
function parseQualityFromM3u8(m3u8Text, baseUrl = '') {
  const streams = [];
  const lines = m3u8Text.split(/\r?\n/);
  let currentInfo = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      const bwMatch = line.match(/BANDWIDTH=\s*(\d+)/i);
      const resMatch = line.match(/RESOLUTION=\s*(\d+)x(\d+)/i);

      currentInfo = {
        bandwidth: bwMatch ? parseInt(bwMatch[1]) : null,
        width: resMatch ? parseInt(resMatch[1]) : null,
        height: resMatch ? parseInt(resMatch[2]) : null,
        quality: null
      };

      if (currentInfo.height) {
        currentInfo.quality = `${currentInfo.height}p`;
      } else if (currentInfo.bandwidth) {
        const bps = currentInfo.bandwidth;
        if (bps >= 6_000_000) currentInfo.quality = '2160p';
        else if (bps >= 4_000_000) currentInfo.quality = '1440p';
        else if (bps >= 2_500_000) currentInfo.quality = '1080p';
        else if (bps >= 1_500_000) currentInfo.quality = '720p';
        else if (bps >= 800_000) currentInfo.quality = '480p';
        else if (bps >= 400_000) currentInfo.quality = '360p';
        else currentInfo.quality = '240p';
      }
    } else if (line && !line.startsWith('#') && currentInfo) {
      let streamUrl = line;
      if (!streamUrl.startsWith('http') && baseUrl) {
        try {
          const url = new URL(streamUrl, baseUrl);
          streamUrl = url.href;
        } catch (e) {
          // Ignore URL parsing errors
        }
      }

      streams.push({
        url: streamUrl,
        quality: currentInfo.quality || 'unknown',
        bandwidth: currentInfo.bandwidth,
        width: currentInfo.width,
        height: currentInfo.height,
        type: 'hls'
      });

      currentInfo = null;
    }
  }

  return {
    isMaster: m3u8Text.includes('#EXT-X-STREAM-INF'),
    streams: streams.sort((a, b) => (b.height || 0) - (a.height || 0))
  };
}

function enhanceStreamsWithQuality(streams) {
  const enhancedStreams = [];

  const tasks = streams.map(s => {
    if (s && s.url && typeof s.url === 'string' && s.url.includes('.m3u8')) {
      return getText(s.url)
        .then(text => {
          const info = parseQualityFromM3u8(text, s.url);
          if (info.isMaster && info.streams.length > 0) {
            info.streams.forEach(qualityStream => {
              enhancedStreams.push({
                ...s,
                ...qualityStream,
                masterUrl: s.url
              });
            });
          } else {
            enhancedStreams.push({
              ...s,
              quality: s.quality || 'unknown'
            });
          }
        })
        .catch(() => {
          enhancedStreams.push({
            ...s,
            quality: s.quality || 'Adaptive'
          });
        });
    } else {
      enhancedStreams.push(s);
    }
    return Promise.resolve();
  });

  return Promise.all(tasks).then(() => enhancedStreams);
}

function formatStreamsData(rapidResult) {
  const streams = [];
  const subtitles = [];
  const thumbnails = [];
  if (rapidResult && typeof rapidResult === 'object') {
    (rapidResult.sources || []).forEach(src => {
      const fileUrl = src && src.file;
      if (fileUrl) {
        streams.push({
          url: fileUrl,
          quality: fileUrl.includes('.m3u8') ? 'Adaptive' : 'unknown',
          type: fileUrl.includes('.m3u8') ? 'hls' : 'file',
          provider: 'rapidshare',
        });
      }
    });
    (rapidResult.tracks || []).forEach(tr => {
      if (tr && tr.kind === 'thumbnails' && tr.file) {
        thumbnails.push({ url: tr.file, type: 'vtt' });
      } else if (tr && (tr.kind === 'captions' || tr.kind === 'subtitles') && tr.file) {
        subtitles.push({ url: tr.file, language: tr.label || '', default: !!tr.default });
      }
    });
  }
  return { streams, subtitles, thumbnails, totalStreams: streams.length };
}

// Parse YFlix search results
function searchYflix(query) {
  const searchUrl = `${YFLIX_AJAX.replace('/ajax', '')}/browser?keyword=${encodeURIComponent(query)}`;
  return getText(searchUrl)
    .then(html => {
      console.log(`[YFlix] Search URL: ${searchUrl}`);
      console.log(`[YFlix] HTML length: ${html.length} characters`);

      const results = [];

      // Updated regex to match the actual YFlix search page structure
      const infoRegex = /<div[^>]*class="[^"]*info[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*watch\/[^"]*)"[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*)<\/a>[\s\S]*?<div[^>]*class="[^"]*metadata[^"]*"[^>]*>([\s\S]*?)<\/div>/g;

      let match;
      while ((match = infoRegex.exec(html)) !== null) {
        const [, url, title, metadata] = match;
        const cleanTitle = title.trim();
        const cleanUrl = url.startsWith('http') ? url : `${YFLIX_AJAX.replace('/ajax', '')}${url}`;

        const typeMatch = metadata.match(/<span[^>]*>([^<]*)<\/span>/g) || [];
        const metadataParts = typeMatch.map(span => span.replace(/<\/?span[^>]*>/g, ''));

        const result = {
          title: cleanTitle,
          url: cleanUrl,
          type: metadataParts[0] || 'Unknown',
          year: metadataParts[1] && /^\d{4}$/.test(metadataParts[1]) ? parseInt(metadataParts[1]) : null,
          duration: metadataParts[2] || null,
          metadata: metadataParts
        };

        results.push(result);
      }

      console.log(`[YFlix] Found ${results.length} results using regex parsing`);
      return results;
    });
}

// Find best matching result based on TMDB title and year
/**
 * Improved title matching utilities for YFlix
 */

/**
 * Normalizes a title for better matching
 * @param {string} title The title to normalize
 * @returns {string} Normalized title
 */
function normalizeTitle(title) {
    if (!title) return '';

    return title
        // Convert to lowercase
        .toLowerCase()
        // Remove common articles
        .replace(/\b(the|a|an)\b/g, '')
        // Normalize punctuation and spaces
        .replace(/[:\-_]/g, ' ')
        .replace(/\s+/g, ' ')
        // Remove special characters but keep alphanumeric and spaces
        .replace(/[^\w\s]/g, '')
        .trim();
}

/**
 * Calculates similarity score between two titles
 * @param {string} title1 First title
 * @param {string} title2 Second title
 * @returns {number} Similarity score (0-1)
 */
function calculateTitleSimilarity(title1, title2) {
    const norm1 = normalizeTitle(title1);
    const norm2 = normalizeTitle(title2);

    // Exact match after normalization
    if (norm1 === norm2) return 1.0;

    // Substring matches
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

    // Word-based similarity
    const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

/**
 * Finds the best title match from search results
 * @param {Array} results Search results array
 * @param {string} tmdbTitle TMDB title
 * @param {number} tmdbYear TMDB year
 * @param {string} mediaType "movie" or "tv"
 * @returns {Object|null} Best matching result
 */
function findBestTitleMatch(results, tmdbTitle, tmdbYear, mediaType) {
    if (!results || results.length === 0) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const result of results) {
        let score = calculateTitleSimilarity(tmdbTitle, result.title);

        // Year matching bonus/penalty
        if (tmdbYear && result.year) {
            const yearDiff = Math.abs(tmdbYear - result.year);
            if (yearDiff === 0) {
                score += 0.2; // Exact year match bonus
            } else if (yearDiff <= 1) {
                score += 0.1; // Close year match bonus
            } else if (yearDiff > 5) {
                score -= 0.3; // Large year difference penalty
            }
        }

        // Media type matching
        const expectedType = mediaType === 'tv' ? 'tv' : 'movie';
        const resultType = (result.type || '').toLowerCase();
        if (resultType.includes(expectedType) || expectedType.includes(resultType)) {
            score += 0.1; // Type match bonus
        }

        if (score > bestScore && score > 0.3) { // Minimum threshold
            bestScore = score;
            bestMatch = result;
        }
    }

    if (bestMatch) {
        console.log(`[YFlix] Best title match: "${bestMatch.title}" (${bestMatch.year}) [${bestMatch.type}] - Score: ${bestScore.toFixed(2)}`);
    }

    return bestMatch;
}

// Backward compatibility - keep old function name
function findBestMatch(results, tmdbTitle, tmdbYear, mediaType) {
    return findBestTitleMatch(results, tmdbTitle, tmdbYear, mediaType);
}

function getContentInfoFromYflixUrl(yflixUrl) {
  const urlMatch = yflixUrl.match(/\/watch\/([^.]+)\.([^\/\?]+)/);
  if (!urlMatch) return Promise.reject(new Error('Invalid YFlix URL format'));

  return getText(yflixUrl)
    .then(html => {
      // Extract content ID
      let contentId = null;
      const idMatch = html.match(/<div[^>]*class="[^"]*rating[^"]*"[^>]*data-id="([^"]*)"[^>]*>/);
      if (idMatch) {
        contentId = idMatch[1];
      } else {
        const altMatch = html.match(/data-id="([^"]*)"[^>]*id="movie-rating/);
        if (altMatch) contentId = altMatch[1];
      }

      if (!contentId) {
        throw new Error('Could not find content ID in YFlix page');
      }

      // Extract title from h1 tag
      const titleMatch = html.match(/<h1[^>]*itemprop="name"[^>]*class="title"[^>]*>([^<]+)<\/h1>/);
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';

      // Extract year from metadata div
      const yearMatch = html.match(/<div[^>]*class="[^"]*metadata[^"]*set[^"]*"[^>]*>[\s\S]*?<span[^>]*>(\d{4})<\/span>/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;

      console.log(`[YFlix] Extracted from YFlix - Title: "${title}", Year: ${year}, ContentID: ${contentId}`);

      return { contentId, title, year };
    });
}

function runStreamFetch(contentId, specificEid = null, title, year, mediaType, seasonNum, episodeNum, rid) {
  logRid(rid, `runStreamFetch: start contentId=${contentId}`);

  return encrypt(contentId)
    .then(encId => {
      logRid(rid, 'episodes/list: enc(contentId) ready');
      return getJson(`${YFLIX_AJAX}/episodes/list?id=${contentId}&_=${encId}`);
    })
    .then(episodesResp => parseHtml(episodesResp.result))
    .then(episodes => {
      const episodeKeys = Object.keys(episodes || {});
      logRid(rid, `episodes parsed: totalKeys=${episodeKeys.length}`);
      let eid;
      if (specificEid) {
        eid = specificEid;
        logRid(rid, `using specified episode eid=${eid}`);
      } else {
        const firstEpKey = episodeKeys[0];
        eid = episodes[firstEpKey].eid;
        logRid(rid, `using first episode ${firstEpKey}, eid=${eid}`);
      }
      return encrypt(eid).then(encEid => {
        logRid(rid, 'links/list: enc(eid) ready');
        return ({ eid, encEid });
      });
    })
    .then(({ eid, encEid }) => getJson(`${YFLIX_AJAX}/links/list?eid=${eid}&_=${encEid}`))
    .then(serversResp => parseHtml(serversResp.result))
    .then(servers => {
      const serverTypes = Object.keys(servers || {});
      const byTypeCounts = serverTypes.map(stype => ({ type: stype, count: Object.keys(servers[stype] || {}).length }));
      logRid(rid, 'servers available', byTypeCounts);

      const allStreams = [];
      const allSubtitles = [];
      const allThumbnails = [];

      const serverPromises = [];
      const lids = [];
      Object.keys(servers).forEach(serverType => {
        Object.keys(servers[serverType]).forEach(serverKey => {
          const lid = servers[serverType][serverKey].lid;
          lids.push(lid);
          const p = encrypt(lid)
            .then(encLid => {
              logRid(rid, `links/view: enc(lid) ready`, { serverType, serverKey, lid });
              return getJson(`${YFLIX_AJAX}/links/view?id=${lid}&_=${encLid}`);
            })
            .then(embedResp => {
              logRid(rid, `decrypt(embed)`, { serverType, serverKey, lid });
              return decrypt(embedResp.result);
            })
            .then(decrypted => {
              if (decrypted && typeof decrypted === 'object' && decrypted.url && decrypted.url.includes('rapidshare.cc')) {
                logRid(rid, `rapid.media → dec-rapid`, { lid });
                return decryptRapidMedia(decrypted.url)
                  .then(rapidData => formatStreamsData(rapidData))
                  .then(formatted => enhanceStreamsWithQuality(formatted.streams)
                    .then(enhanced => {
                      enhanced.forEach(s => {
                        s.serverType = serverType;
                        s.serverKey = serverKey;
                        s.serverLid = lid;
                        allStreams.push(s);
                      });
                      allSubtitles.push(...formatted.subtitles);
                      allThumbnails.push(...formatted.thumbnails);
                    })
                  );
              }
              return null;
            })
            .catch(() => null);
          serverPromises.push(p);
        });
      });
      const uniqueLids = Array.from(new Set(lids));
      logRid(rid, `fan-out: lids`, { total: lids.length, unique: uniqueLids.length });

      return Promise.all(serverPromises).then(() => {
        // Deduplicate streams by URL
        const seen = new Set();
        let dedupedStreams = allStreams.filter(s => {
          if (!s || !s.url) return false;
          if (seen.has(s.url)) return false;
          seen.add(s.url);
          return true;
        });
        logRid(rid, `streams: deduped`, { count: dedupedStreams.length });

        // Convert to Nuvio format
        const nuvioStreams = dedupedStreams.map(stream => ({
          name: `YFlix ${stream.serverType || 'Server'} - ${stream.quality || 'Unknown'}`,
          title: `${title}${year ? ` (${year})` : ''}${mediaType === 'tv' && seasonNum && episodeNum ? ` S${seasonNum}E${episodeNum}` : ''}`,
          url: stream.url,
          quality: stream.quality || 'Unknown',
          size: 'Unknown',
          headers: HEADERS,
          provider: 'yflix'
        }));

        return nuvioStreams;
      });
    });
}

function handleTvShow(yflixUrl, contentId, title, year, seasonNum, episodeNum, rid) {
  logRid(rid, `handleTvShow: S${seasonNum || 1}E${episodeNum || 1}`);

  const selectedSeason = seasonNum || 1;
  const selectedEpisode = episodeNum || 1;

  const episodeUrl = `${yflixUrl}#ep=${selectedSeason},${selectedEpisode}`;
  logRid(rid, `episode URL ${episodeUrl}`);

  return getText(episodeUrl)
    .then(html => {
      const epMatch = html.match(/data-episode="([^"]*)"/) || html.match(/episode["\s]*:[\s]*["']([^"']+)["']/);
      if (epMatch) {
        logRid(rid, `found episode data ${epMatch[1]}`);
        return epMatch[1];
      }

      logRid(rid, 'no episode data in hash page; using main contentId');
      return contentId;
    })
    .then(episodeId => runStreamFetch(contentId, episodeId, title, year, 'tv', selectedSeason, selectedEpisode, rid));
}

// Get TMDB details for search
function getTMDBDetails(tmdbId, mediaType) {
  const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;

  return getJson(url)
    .then(data => ({
      title: data.title || data.name,
      year: data.release_date ? new Date(data.release_date).getFullYear() :
            data.first_air_date ? new Date(data.first_air_date).getFullYear() : null
    }));
}

// Main getStreams function
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
  return new Promise((resolve, reject) => {
    const rid = createRequestId();
    logRid(rid, `getStreams start tmdbId=${tmdbId} type=${mediaType} S=${seasonNum||''} E=${episodeNum||''}`);

    // Get TMDB details for search query only
    getTMDBDetails(tmdbId, mediaType)
      .then(({ title, year }) => {
        logRid(rid, `TMDB query`, { title, year });

        // Search YFlix
        const searchQuery = title + (year ? ` ${year}` : '');
        return searchYflix(searchQuery)
          .then(results => {
            if (results.length === 0) {
              logRid(rid, `no results for ${searchQuery}`);
              resolve([]);
              return;
            }

            // Find best matching result based on TMDB title and year
            const selected = findBestMatch(results, title, year, mediaType);
            if (!selected) {
              logRid(rid, `no suitable match for title/year`);
              resolve([]);
              return;
            }

            logRid(rid, `selected match`, { title: selected.title, year: selected.year, url: selected.url });

            // Extract actual title, year, and contentId from YFlix page
            return getContentInfoFromYflixUrl(selected.url)
              .then(({ contentId, title: yflixTitle, year: yflixYear }) => {
                logRid(rid, `yflix page info`, { contentId, title: yflixTitle, year: yflixYear });

                if (mediaType === 'tv') {
                  return handleTvShow(selected.url, contentId, yflixTitle, yflixYear, seasonNum, episodeNum, rid);
                } else {
                  return runStreamFetch(contentId, null, yflixTitle, yflixYear, mediaType, seasonNum, episodeNum, rid);
                }
              });
          });
      })
      .then(streams => {
        if (streams) {
          logRid(rid, `returning streams`, { count: streams.length });
          resolve(streams);
        } else {
          resolve([]);
        }
      })
      .catch(error => {
        logRid(rid, `ERROR ${error && error.message ? error.message : String(error)}`);
        resolve([]); // Return empty array on error, don't reject
      });
  });
}

// Export for React Native compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
