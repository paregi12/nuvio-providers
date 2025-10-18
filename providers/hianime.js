// =====================================================
// HIANIME SCRAPER FOR NUVIO - PROMISE-BASED VERSION
// NO async/await - React Native Compatible
// =====================================================

const CONFIG = {
  TMDB_API_KEY: '439c478a771f35c05022f9feabcca01c',
  TMDB_BASE: 'https://api.themoviedb.org/3',
  HIANIME_BASE: 'https://hianime.to',
  HIANIME_AJAX: 'https://hianime.to/ajax',
  HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Referer': 'https://hianime.to/',
    'Origin': 'https://hianime.to'
  },
  DELAY: 500,
  MAX_RETRIES: 3
};

const SERVER_PRIORITY = {
  'hd-1': 10,
  'hd-2': 9,
  'hd-3': 8,
  'default': 5
};

const QUALITY_RANK = {
  '1080p': 10, '1080': 10,
  '720p': 8, '720': 8,
  '480p': 6, '480': 6,
  '360p': 4, '360': 4,
  'auto': 9,
  'default': 7
};

// ==================== UTILITIES ====================

function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

function log(msg, data) {
  var time = new Date().toISOString().split('T')[1].split('.')[0];
  console.log('[HiAnime][' + time + '] ' + msg, data !== undefined ? data : '');
}

function createRequestId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-6);
}

function decodeBase64(str) {
  try {
    if (typeof atob !== 'undefined') {
      return atob(str);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'base64').toString('utf-8');
    }
    return null;
  } catch (e) {
    return null;
  }
}

function fetchWithRetry(url, options, retries) {
  retries = retries || 0;
  options = options || {};
  
  return fetch(url, {
    headers: Object.assign({}, CONFIG.HEADERS, options.headers || {}),
    method: options.method || 'GET'
  }).then(function(response) {
    if (!response.ok) {
      if (response.status === 429 && retries < CONFIG.MAX_RETRIES) {
        return sleep(2000 * (retries + 1)).then(function() {
          return fetchWithRetry(url, options, retries + 1);
        });
      }
      throw new Error('HTTP ' + response.status);
    }
    return response;
  }).catch(function(err) {
    if (retries < CONFIG.MAX_RETRIES) {
      return sleep(1000).then(function() {
        return fetchWithRetry(url, options, retries + 1);
      });
    }
    throw err;
  });
}

function normalizeTitle(title) {
  return title.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(str1, str2) {
  var s1 = normalizeTitle(str1);
  var s2 = normalizeTitle(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  
  var words1 = s1.split(' ');
  var words2 = s2.split(' ');
  var matches = 0;
  
  words1.forEach(function(w1) {
    if (words2.includes(w1) && w1.length > 2) matches++;
  });
  
  return matches / Math.max(words1.length, words2.length);
}

function isEmbedUrl(url) {
  var embedPattern = /\/(embed|e)\/[^.]+$/;
  var streamPattern = /\.(m3u8|mp4|ts|mpd)/i;
  
  return embedPattern.test(url) && !streamPattern.test(url);
}

// ==================== TMDB FUNCTIONS ====================

function getTMDBInfo(tmdbId, mediaType, rid) {
  var endpoint = mediaType === 'tv' ? 'tv' : 'movie';
  var url = CONFIG.TMDB_BASE + '/' + endpoint + '/' + tmdbId + '?api_key=' + CONFIG.TMDB_API_KEY;
  
  log('[' + rid + '] Fetching TMDB info...');
  
  return fetchWithRetry(url).then(function(res) {
    return res.json();
  }).then(function(data) {
    log('[' + rid + '] TMDB data received', data.name || data.title);
    return {
      title: mediaType === 'tv' ? data.name : data.title,
      originalTitle: data.original_name || data.original_title,
      year: (data.first_air_date || data.release_date || '').split('-')[0]
    };
  }).catch(function(err) {
    log('[' + rid + '] TMDB fetch failed:', err.message);
    throw err;
  });
}

// ==================== HIANIME SEARCH ====================

function searchHiAnime(query, rid) {
  var searchUrl = CONFIG.HIANIME_BASE + '/search?keyword=' + encodeURIComponent(query);
  log('[' + rid + '] Searching HiAnime:', query);
  
  return fetchWithRetry(searchUrl).then(function(res) {
    return res.text();
  }).then(function(html) {
    var results = [];
    var regex = /<div[^>]*class="[^"]*flw-item[^"]*"[^>]*>[\s\S]*?href="\/watch\/([^"?]*)"[\s\S]*?data-tip="([^"]*)"[\s\S]*?class="[^"]*fdi-item[^"]*">([^<]*)<\/div>[\s\S]*?class="[^"]*tick-eps[^"]*">([^<]*)<\/div>/g;
    
    var match;
    while ((match = regex.exec(html)) !== null) {
      results.push({
        id: match[1],
        title: match[2].trim(),
        type: match[3].trim(),
        episodeInfo: match[4].trim()
      });
    }
    
    log('[' + rid + '] Found results:', results.length);
    return results;
  }).catch(function(err) {
    log('[' + rid + '] Search failed:', err.message);
    return [];
  });
}

// ==================== ANIME EPISODES ====================

function getAnimeEpisodes(animeId, rid) {
  var url = CONFIG.HIANIME_AJAX + '/v2/episode/list/' + animeId;
  log('[' + rid + '] Getting episodes:', animeId);
  
  return fetchWithRetry(url).then(function(res) {
    return res.json();
  }).then(function(data) {
    if (!data.status || !data.html) {
      throw new Error('Invalid response');
    }
    
    var episodes = [];
    var regex = /data-id="([^"]*)"[\s\S]*?href="[^"]*\?ep=([^"]*)"[\s\S]*?class="[^"]*number[^"]*">[\s\S]*?(\d+)/g;
    
    var match;
    while ((match = regex.exec(data.html)) !== null) {
      episodes.push({
        dataId: match[1],
        episodeId: match[2],
        number: parseInt(match[3])
      });
    }
    
    log('[' + rid + '] Found episodes:', episodes.length);
    return episodes;
  }).catch(function(err) {
    log('[' + rid + '] Episode fetch failed:', err.message);
    return [];
  });
}

// ==================== SERVER EXTRACTION ====================

function getEpisodeServers(episodeId, rid) {
  var url = CONFIG.HIANIME_AJAX + '/v2/episode/servers?episodeId=' + episodeId;
  log('[' + rid + '] Getting servers:', episodeId);
  
  return fetchWithRetry(url).then(function(res) {
    return res.json();
  }).then(function(data) {
    if (!data.status || !data.html) {
      throw new Error('Invalid response');
    }
    
    var servers = [];
    var regex = /data-id="([^"]*)"[\s\S]*?data-type="([^"]*)"[\s\S]*?<span>([^<]*)/g;
    
    var match;
    while ((match = regex.exec(data.html)) !== null) {
      var serverName = match[3].trim().toLowerCase();
      servers.push({
        serverId: match[1],
        type: match[2],
        name: serverName,
        priority: SERVER_PRIORITY[serverName] || SERVER_PRIORITY.default
      });
    }
    
    servers.sort(function(a, b) {
      return b.priority - a.priority;
    });
    
    log('[' + rid + '] Found servers:', servers.length);
    return servers;
  }).catch(function(err) {
    log('[' + rid + '] Server fetch failed:', err.message);
    return [];
  });
}

// ==================== SOURCE EXTRACTION ====================

function extractSources(serverId, rid) {
  var url = CONFIG.HIANIME_AJAX + '/v2/episode/sources?id=' + serverId;
  log('[' + rid + '] Extracting sources:', serverId);
  
  return fetchWithRetry(url).then(function(res) {
    return res.json();
  }).then(function(data) {
    if (!data.status) {
      throw new Error('Failed to get sources');
    }
    
    var sources = {
      streams: [],
      subtitles: [],
      intro: data.intro || null,
      outro: data.outro || null
    };
    
    // Extract direct sources
    if (data.sources && Array.isArray(data.sources)) {
      data.sources.forEach(function(src) {
        if (src.file || src.url) {
          sources.streams.push({
            url: src.file || src.url,
            quality: src.label || src.quality || 'auto',
            type: src.type || 'hls'
          });
        }
      });
    }
    
    // Extract subtitles
    if (data.tracks && Array.isArray(data.tracks)) {
      data.tracks.forEach(function(track) {
        if (track.kind === 'captions' && track.file) {
          sources.subtitles.push({
            language: track.label || 'English',
            url: track.file,
            default: track.default || false
          });
        }
      });
    }
    
    // Extract from embed if no direct sources
    if (data.link && sources.streams.length === 0) {
      log('[' + rid + '] Extracting from embed:', data.link);
      return extractFromEmbed(data.link, rid).then(function(embedSources) {
        sources.streams = sources.streams.concat(embedSources.streams);
        sources.subtitles = sources.subtitles.concat(embedSources.subtitles);
        return sources;
      });
    }
    
    log('[' + rid + '] Extracted sources:', {
      streams: sources.streams.length,
      subtitles: sources.subtitles.length
    });
    
    return sources;
  }).catch(function(err) {
    log('[' + rid + '] Source extraction failed:', err.message);
    return { streams: [], subtitles: [], intro: null, outro: null };
  });
}

// ==================== EMBED EXTRACTORS ====================

function extractFromEmbed(embedUrl, rid) {
  var sources = { streams: [], subtitles: [] };
  var lower = embedUrl.toLowerCase();
  
  return fetchWithRetry(embedUrl).then(function(res) {
    return res.text();
  }).then(function(html) {
    
    // Megacloud/Vidplay extraction
    if (lower.includes('megacloud') || lower.includes('vidplay') || lower.includes('mcloud')) {
      log('[' + rid + '] Extracting Megacloud/Vidplay');
      
      // Method 1: Sources in script
      var sourcePattern = /sources:\s*\[\s*\{\s*(?:file|src):\s*["']([^"']+)["']/g;
      var match;
      
      while ((match = sourcePattern.exec(html)) !== null) {
        var url = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
        if (url.includes('http')) {
          sources.streams.push({
            url: url,
            quality: 'auto',
            type: 'hls'
          });
        }
      }
      
      // Method 2: Encrypted sources
      var encryptedMatch = html.match(/atob\(["']([^"']+)["']\)/);
      if (encryptedMatch) {
        var decoded = decodeBase64(encryptedMatch[1]);
        if (decoded && decoded.includes('http')) {
          sources.streams.push({
            url: decoded,
            quality: 'auto',
            type: 'hls'
          });
        }
      }
      
      // Method 3: M3U8 pattern
      var m3u8Pattern = /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g;
      var m3u8Matches = html.match(m3u8Pattern) || [];
      
      m3u8Matches.forEach(function(url) {
        var cleanUrl = url.replace(/['"\\]/g, '');
        var exists = sources.streams.some(function(s) {
          return s.url === cleanUrl;
        });
        if (!exists) {
          sources.streams.push({
            url: cleanUrl,
            quality: 'auto',
            type: 'hls'
          });
        }
      });
    }
    
    // VidStreaming extraction
    else if (lower.includes('vidstreaming') || lower.includes('gogo')) {
      log('[' + rid + '] Extracting VidStreaming');
      
      var sourcePattern = /sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/g;
      var match;
      
      while ((match = sourcePattern.exec(html)) !== null) {
        sources.streams.push({
          url: match[1],
          quality: match[1].includes('.m3u8') ? 'auto' : '720p',
          type: match[1].includes('.m3u8') ? 'hls' : 'mp4'
        });
      }
      
      var m3u8Pattern = /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/g;
      var m3u8s = html.match(m3u8Pattern) || [];
      
      m3u8s.forEach(function(url) {
        var exists = sources.streams.some(function(s) {
          return s.url === url;
        });
        if (!exists) {
          sources.streams.push({
            url: url.replace(/['"\\]/g, ''),
            quality: 'auto',
            type: 'hls'
          });
        }
      });
    }
    
    // Generic extraction
    else {
      log('[' + rid + '] Generic extraction');
      
      var patterns = [
        /file:\s*["']([^"']+\.m3u8[^"']*)["']/g,
        /src:\s*["']([^"']+\.m3u8[^"']*)["']/g,
        /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/g
      ];
      
      patterns.forEach(function(pattern) {
        var match;
        while ((match = pattern.exec(html)) !== null) {
          var url = match[1].replace(/['"\\]/g, '');
          var exists = sources.streams.some(function(s) {
            return s.url === url;
          });
          if (url.includes('http') && !exists) {
            sources.streams.push({
              url: url,
              quality: 'auto',
              type: 'hls'
            });
          }
        }
      });
    }
    
    log('[' + rid + '] Embed extraction complete:', sources.streams.length);
    return sources;
  }).catch(function(err) {
    log('[' + rid + '] Embed extraction error:', err.message);
    return sources;
  });
}

// ==================== STREAM FORMATTING ====================

function formatStreams(allSources, mediaTitle) {
  var streams = [];
  var seenUrls = {};
  
  allSources.forEach(function(serverData) {
    var serverName = serverData.serverName || 'UNKNOWN';
    var sources = serverData.sources || {};
    
    (sources.streams || []).forEach(function(stream) {
      if (!stream.url || seenUrls[stream.url]) return;
      
      if (isEmbedUrl(stream.url)) {
        log('Skipping embed page:', stream.url.substring(0, 50) + '...');
        return;
      }
      
      seenUrls[stream.url] = true;
      
      var quality = stream.quality || 'auto';
      
      streams.push({
        name: 'HIANIME ' + serverName.toUpperCase() + ' - ' + quality,
        title: mediaTitle,
        url: stream.url,
        quality: quality,
        size: 'Unknown',
        headers: {
          'User-Agent': CONFIG.HEADERS['User-Agent'],
          'Referer': CONFIG.HIANIME_BASE + '/',
          'Origin': CONFIG.HIANIME_BASE,
          'Accept': '*/*'
        },
        subtitles: sources.subtitles || [],
        provider: 'hianime',
        type: stream.type || 'hls',
        intro: sources.intro,
        outro: sources.outro
      });
    });
  });
  
  // Sort by quality
  streams.sort(function(a, b) {
    var qualityA = QUALITY_RANK[a.quality] || 0;
    var qualityB = QUALITY_RANK[b.quality] || 0;
    return qualityB - qualityA;
  });
  
  return streams;
}

// ==================== PROCESS SERVERS ====================

function processServers(servers, rid) {
  var allSources = [];
  
  function processNext(index) {
    if (index >= servers.length) {
      return Promise.resolve(allSources);
    }
    
    var server = servers[index];
    
    return sleep(CONFIG.DELAY).then(function() {
      return extractSources(server.serverId, rid);
    }).then(function(sources) {
      if (sources.streams.length > 0) {
        allSources.push({
          serverName: server.name,
          sources: sources
        });
      }
      return processNext(index + 1);
    });
  }
  
  return processNext(0);
}

// ==================== MAIN FUNCTION ====================

function getStreams(tmdbId, mediaType, season, episode) {
  return new Promise(function(resolve, reject) {
    if (mediaType !== 'tv') {
      log('Only TV shows supported');
      resolve([]);
      return;
    }
    
    var rid = createRequestId();
    log('[' + rid + '] START', { tmdbId: tmdbId, season: season, episode: episode });
    
    var tmdbInfo;
    var bestMatch;
    var targetEpisode;
    
    // Step 1: Get TMDB info
    getTMDBInfo(tmdbId, 'tv', rid).then(function(info) {
      if (!info || !info.title) {
        throw new Error('Failed to get TMDB info');
      }
      tmdbInfo = info;
      log('[' + rid + '] TMDB:', tmdbInfo.title);
      return sleep(CONFIG.DELAY);
      
    }).then(function() {
      // Step 2: Search HiAnime
      return searchHiAnime(tmdbInfo.title, rid);
      
    }).then(function(searchResults) {
      if (searchResults.length === 0) {
        throw new Error('No search results');
      }
      
      // Find best match
      bestMatch = searchResults[0];
      var bestScore = calculateSimilarity(bestMatch.title, tmdbInfo.title);
      
      searchResults.forEach(function(result) {
        var score = calculateSimilarity(result.title, tmdbInfo.title);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = result;
        }
      });
      
      log('[' + rid + '] Best match:', bestMatch.title);
      return sleep(CONFIG.DELAY);
      
    }).then(function() {
      // Step 3: Get episodes
      return getAnimeEpisodes(bestMatch.id, rid);
      
    }).then(function(episodes) {
      if (episodes.length === 0) {
        throw new Error('No episodes found');
      }
      
      // Find target episode
      targetEpisode = episodes.find(function(ep) {
        return ep.number === episode;
      });
      
      if (!targetEpisode) {
        throw new Error('Episode ' + episode + ' not found');
      }
      
      log('[' + rid + '] Target episode:', targetEpisode.number);
      return sleep(CONFIG.DELAY);
      
    }).then(function() {
      // Step 4: Get servers
      return getEpisodeServers(targetEpisode.episodeId, rid);
      
    }).then(function(servers) {
      if (servers.length === 0) {
        throw new Error('No servers found');
      }
      
      log('[' + rid + '] Servers:', servers.map(function(s) { return s.name; }).join(', '));
      
      // Step 5: Process all servers
      return processServers(servers, rid);
      
    }).then(function(allSources) {
      if (allSources.length === 0) {
        throw new Error('No sources extracted');
      }
      
      // Format streams
      var mediaTitle = tmdbInfo.title + ' S' + 
        String(season).padStart(2, '0') + 'E' + 
        String(episode).padStart(2, '0');
      
      var finalStreams = formatStreams(allSources, mediaTitle);
      
      log('[' + rid + '] COMPLETE', { streams: finalStreams.length });
      resolve(finalStreams);
      
    }).catch(function(err) {
      log('[' + rid + '] ERROR:', err.message);
      resolve([]);
    });
  });
}

// ==================== EXPORT ====================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}