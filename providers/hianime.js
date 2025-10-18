// =====================================================
// HIANIME SCRAPER - BASED ON ANIWATCH-API
// Promise-based, Nuvio Compatible
// =====================================================

var CONFIG = {
  TMDB_API_KEY: '439c478a771f35c05022f9feabcca01c',
  TMDB_BASE: 'https://api.themoviedb.org/3',
  HIANIME_BASE: 'https://hianime.to',
  HIANIME_AJAX: 'https://hianime.to/ajax/v2',
  HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://hianime.to/',
    'Origin': 'https://hianime.to',
    'X-Requested-With': 'XMLHttpRequest'
  }
};

// ==================== UTILITIES ====================

function log(msg, data) {
  console.log('[HiAnime] ' + msg, data || '');
}

function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

function fetchWithRetry(url, options, retries) {
  retries = retries || 0;
  options = options || {};
  
  var headers = {};
  for (var key in CONFIG.HEADERS) {
    headers[key] = CONFIG.HEADERS[key];
  }
  if (options.headers) {
    for (var key in options.headers) {
      headers[key] = options.headers[key];
    }
  }
  
  return fetch(url, {
    method: options.method || 'GET',
    headers: headers
  }).then(function(response) {
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    return response;
  }).catch(function(err) {
    if (retries < 2) {
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
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  var words1 = s1.split(' ');
  var words2 = s2.split(' ');
  var matches = 0;
  
  for (var i = 0; i < words1.length; i++) {
    if (words2.indexOf(words1[i]) >= 0 && words1[i].length > 2) {
      matches++;
    }
  }
  
  return matches / Math.max(words1.length, words2.length);
}

// ==================== TMDB ====================

function getTMDBInfo(tmdbId) {
  var url = CONFIG.TMDB_BASE + '/tv/' + tmdbId + '?api_key=' + CONFIG.TMDB_API_KEY;
  log('Fetching TMDB...');
  
  return fetchWithRetry(url).then(function(res) {
    return res.json();
  }).then(function(data) {
    log('TMDB:', data.name);
    return {
      title: data.name,
      originalTitle: data.original_name,
      year: (data.first_air_date || '').split('-')[0]
    };
  });
}

// ==================== SEARCH ====================

function searchAnime(query) {
  var url = CONFIG.HIANIME_BASE + '/search?keyword=' + encodeURIComponent(query);
  log('Searching:', query);
  
  return fetchWithRetry(url).then(function(res) {
    return res.text();
  }).then(function(html) {
    var results = [];
    var regex = /href="\/watch\/([^"?]+)"[^>]*>[\s\S]*?data-tip="([^"]+)"/g;
    var match;
    
    while ((match = regex.exec(html)) !== null) {
      results.push({
        id: match[1],
        title: match[2].trim()
      });
    }
    
    log('Found:', results.length + ' results');
    return results;
  });
}

// ==================== EPISODES ====================

function getEpisodes(animeId) {
  var url = CONFIG.HIANIME_AJAX + '/episode/list/' + animeId.split('-').pop();
  log('Getting episodes for:', animeId);
  
  return fetchWithRetry(url).then(function(res) {
    return res.json();
  }).then(function(data) {
    if (!data.status || !data.html) {
      throw new Error('Invalid episodes response');
    }
    
    var episodes = [];
    var regex = /data-id="(\d+)"[\s\S]*?href="[^"]*\?ep=(\d+)"[\s\S]*?title="[^"]*Episode\s+(\d+)/gi;
    var match;
    
    while ((match = regex.exec(data.html)) !== null) {
      episodes.push({
        dataId: match[1],
        episodeId: match[2],
        number: parseInt(match[3])
      });
    }
    
    log('Found episodes:', episodes.length);
    return episodes;
  });
}

// ==================== SERVERS ====================

function getServers(animeEpisodeId) {
  var url = CONFIG.HIANIME_AJAX + '/episode/servers?episodeId=' + animeEpisodeId;
  log('Getting servers...');
  
  return fetchWithRetry(url).then(function(res) {
    return res.json();
  }).then(function(data) {
    if (!data.status || !data.html) {
      throw new Error('Invalid servers response');
    }
    
    var servers = [];
    var regex = /data-id="(\d+)"[\s\S]*?data-type="(sub|dub|raw)"[\s\S]*?<span>([^<]+)/gi;
    var match;
    
    while ((match = regex.exec(data.html)) !== null) {
      servers.push({
        serverId: match[1],
        type: match[2],
        name: match[3].trim()
      });
    }
    
    log('Found servers:', servers.length);
    return servers;
  });
}

// ==================== SOURCES ====================

function getSources(serverId, category) {
  category = category || 'sub';
  var url = CONFIG.HIANIME_AJAX + '/episode/sources?id=' + serverId;
  log('Getting sources from server:', serverId);
  
  return fetchWithRetry(url).then(function(res) {
    return res.json();
  }).then(function(data) {
    if (!data.status) {
      throw new Error('Failed to get sources');
    }
    
    var sources = {
      streams: [],
      subtitles: []
    };
    
    // Direct sources
    if (data.sources && data.sources.length > 0) {
      for (var i = 0; i < data.sources.length; i++) {
        var src = data.sources[i];
        if (src.url) {
          sources.streams.push({
            url: src.url,
            quality: src.quality || 'auto',
            isM3U8: true
          });
        }
      }
    }
    
    // Subtitles
    if (data.tracks && data.tracks.length > 0) {
      for (var i = 0; i < data.tracks.length; i++) {
        var track = data.tracks[i];
        if (track.kind === 'captions' && track.file) {
          sources.subtitles.push({
            language: track.label || 'English',
            url: track.file
          });
        }
      }
    }
    
    log('Extracted:', sources.streams.length + ' streams');
    return sources;
  });
}

// ==================== MAIN FUNCTION ====================

function getStreams(tmdbId, mediaType, season, episode) {
  return new Promise(function(resolve, reject) {
    if (mediaType !== 'tv') {
      log('Only TV shows supported');
      resolve([]);
      return;
    }
    
    log('START - TMDB:' + tmdbId + ' S' + season + 'E' + episode);
    
    var tmdbInfo;
    var bestMatch;
    var targetEpisode;
    var allStreams = [];
    
    // Step 1: Get TMDB info
    getTMDBInfo(tmdbId).then(function(info) {
      tmdbInfo = info;
      return sleep(300);
      
    }).then(function() {
      // Step 2: Search anime
      return searchAnime(tmdbInfo.title);
      
    }).then(function(searchResults) {
      if (searchResults.length === 0) {
        throw new Error('No search results');
      }
      
      // Find best match
      bestMatch = searchResults[0];
      var bestScore = calculateSimilarity(bestMatch.title, tmdbInfo.title);
      
      for (var i = 1; i < searchResults.length; i++) {
        var score = calculateSimilarity(searchResults[i].title, tmdbInfo.title);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = searchResults[i];
        }
      }
      
      log('Best match:', bestMatch.title);
      return sleep(300);
      
    }).then(function() {
      // Step 3: Get episodes
      return getEpisodes(bestMatch.id);
      
    }).then(function(episodes) {
      if (episodes.length === 0) {
        throw new Error('No episodes found');
      }
      
      // Find target episode
      targetEpisode = null;
      for (var i = 0; i < episodes.length; i++) {
        if (episodes[i].number === episode) {
          targetEpisode = episodes[i];
          break;
        }
      }
      
      if (!targetEpisode) {
        throw new Error('Episode ' + episode + ' not found');
      }
      
      log('Found episode:', episode);
      return sleep(300);
      
    }).then(function() {
      // Step 4: Get servers
      return getServers(targetEpisode.episodeId);
      
    }).then(function(servers) {
      if (servers.length === 0) {
        throw new Error('No servers found');
      }
      
      // Filter to sub servers only
      var subServers = [];
      for (var i = 0; i < servers.length; i++) {
        if (servers[i].type === 'sub') {
          subServers.push(servers[i]);
        }
      }
      
      if (subServers.length === 0) {
        subServers = servers;
      }
      
      log('Using servers:', subServers.length);
      
      // Step 5: Get sources from first 2 servers
      var promises = [];
      for (var i = 0; i < Math.min(2, subServers.length); i++) {
        promises.push(getSources(subServers[i].serverId, 'sub'));
      }
      
      return Promise.all(promises).then(function(results) {
        return { servers: subServers, sources: results };
      });
      
    }).then(function(data) {
      // Step 6: Format streams
      var mediaTitle = tmdbInfo.title + ' S' + 
        ('0' + season).slice(-2) + 'E' + 
        ('0' + episode).slice(-2);
      
      for (var i = 0; i < data.sources.length; i++) {
        var serverSources = data.sources[i];
        var serverName = data.servers[i] ? data.servers[i].name : 'Unknown';
        
        for (var j = 0; j < serverSources.streams.length; j++) {
          var stream = serverSources.streams[j];
          
          allStreams.push({
            name: 'HIANIME ' + serverName.toUpperCase() + ' - ' + stream.quality,
            title: mediaTitle,
            url: stream.url,
            quality: stream.quality,
            size: 'Unknown',
            headers: {
              'User-Agent': CONFIG.HEADERS['User-Agent'],
              'Referer': CONFIG.HIANIME_BASE + '/',
              'Origin': CONFIG.HIANIME_BASE,
              'Accept': '*/*'
            },
            subtitles: serverSources.subtitles || [],
            provider: 'hianime',
            type: 'hls'
          });
        }
      }
      
      log('COMPLETE - Streams:', allStreams.length);
      resolve(allStreams);
      
    }).catch(function(err) {
      log('ERROR:', err.message);
      resolve([]);
    });
  });
}

// ==================== EXPORT ====================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams: getStreams };
}

log('HiAnime scraper loaded');