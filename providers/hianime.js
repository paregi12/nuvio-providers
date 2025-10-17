// =====================================================
// HIANIME SCRAPER FOR NUVIO v3.1 - FIXED VERSION
// All critical bugs fixed and optimized
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
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(msg, data) {
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[HiAnime][${time}] ${msg}`, data !== undefined ? data : '');
}

function createRequestId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-6);
}

// FIXED: Cross-platform base64 decoding
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

async function fetchWithRetry(url, options = {}, retries = 0) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...CONFIG.HEADERS, ...options.headers }
    });
    
    if (!response.ok) {
      if (response.status === 429 && retries < CONFIG.MAX_RETRIES) {
        await sleep(2000 * (retries + 1));
        return fetchWithRetry(url, options, retries + 1);
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response;
  } catch (err) {
    if (retries < CONFIG.MAX_RETRIES) {
      await sleep(1000);
      return fetchWithRetry(url, options, retries + 1);
    }
    throw err;
  }
}

function normalizeTitle(title) {
  return title.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(str1, str2) {
  const s1 = normalizeTitle(str1);
  const s2 = normalizeTitle(str2);
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  let matches = 0;
  
  words1.forEach(w1 => {
    if (words2.includes(w1) && w1.length > 2) matches++;
  });
  
  return matches / Math.max(words1.length, words2.length);
}

// ==================== TMDB FUNCTIONS ====================

async function getTMDBInfo(tmdbId, mediaType) {
  try {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${CONFIG.TMDB_BASE}/${endpoint}/${tmdbId}?api_key=${CONFIG.TMDB_API_KEY}`;
    
    const res = await fetchWithRetry(url);
    const data = await res.json();
    
    return {
      title: mediaType === 'tv' ? data.name : data.title,
      originalTitle: data.original_name || data.original_title,
      year: (data.first_air_date || data.release_date || '').split('-')[0]
    };
  } catch (err) {
    log('TMDB fetch failed:', err.message);
    return null;
  }
}

// ==================== HIANIME SEARCH ====================

async function searchHiAnime(query, rid) {
  try {
    const searchUrl = `${CONFIG.HIANIME_BASE}/search?keyword=${encodeURIComponent(query)}`;
    log(`[${rid}] Searching HiAnime:`, query);
    
    const res = await fetchWithRetry(searchUrl);
    const html = await res.text();
    
    const results = [];
    const regex = /<div[^>]*class="[^"]*flw-item[^"]*"[^>]*>[\s\S]*?href="\/watch\/([^"?]*)"[\s\S]*?data-tip="([^"]*)"[\s\S]*?class="[^"]*fdi-item[^"]*">([^<]*)<\/div>[\s\S]*?class="[^"]*tick-eps[^"]*">([^<]*)<\/div>/g;
    
    let match;
    while ((match = regex.exec(html)) !== null) {
      results.push({
        id: match[1],
        title: match[2].trim(),
        type: match[3].trim(),
        episodeInfo: match[4].trim()
      });
    }
    
    log(`[${rid}] Found results:`, results.length);
    return results;
  } catch (err) {
    log(`[${rid}] Search failed:`, err.message);
    return [];
  }
}

// ==================== ANIME DETAILS ====================

async function getAnimeEpisodes(animeId, rid) {
  try {
    const url = `${CONFIG.HIANIME_AJAX}/v2/episode/list/${animeId}`;
    log(`[${rid}] Getting episodes:`, animeId);
    
    const res = await fetchWithRetry(url);
    const data = await res.json();
    
    if (!data.status || !data.html) {
      throw new Error('Invalid response');
    }
    
    const episodes = [];
    const regex = /data-id="([^"]*)"[\s\S]*?href="[^"]*\?ep=([^"]*)"[\s\S]*?class="[^"]*number[^"]*">[\s\S]*?(\d+)/g;
    
    let match;
    while ((match = regex.exec(data.html)) !== null) {
      episodes.push({
        dataId: match[1],
        episodeId: match[2],
        number: parseInt(match[3])
      });
    }
    
    log(`[${rid}] Found episodes:`, episodes.length);
    return episodes;
  } catch (err) {
    log(`[${rid}] Episode fetch failed:`, err.message);
    return [];
  }
}

// ==================== SERVER EXTRACTION ====================

// FIXED: Removed duplicate '?' and incorrect parameter
async function getEpisodeServers(episodeId, rid) {
  try {
    const url = `${CONFIG.HIANIME_AJAX}/v2/episode/servers?episodeId=${episodeId}`;
    log(`[${rid}] Getting servers:`, episodeId);
    
    const res = await fetchWithRetry(url);
    const data = await res.json();
    
    if (!data.status || !data.html) {
      throw new Error('Invalid response');
    }
    
    const servers = [];
    const regex = /data-id="([^"]*)"[\s\S]*?data-type="([^"]*)"[\s\S]*?class="[^"]*server-item[^"]*">[\s\S]*?<span>([^<]*)/g;
    
    let match;
    while ((match = regex.exec(data.html)) !== null) {
      const serverName = match[3].trim().toLowerCase();
      servers.push({
        serverId: match[1],
        type: match[2],
        name: serverName,
        priority: SERVER_PRIORITY[serverName] || SERVER_PRIORITY.default
      });
    }
    
    servers.sort((a, b) => b.priority - a.priority);
    
    log(`[${rid}] Found servers:`, servers.length);
    return servers;
  } catch (err) {
    log(`[${rid}] Server fetch failed:`, err.message);
    return [];
  }
}

// ==================== SOURCE EXTRACTION ====================

async function extractSources(serverId, rid) {
  try {
    const url = `${CONFIG.HIANIME_AJAX}/v2/episode/sources?id=${serverId}`;
    log(`[${rid}] Extracting sources:`, serverId);
    
    const res = await fetchWithRetry(url);
    const data = await res.json();
    
    if (!data.status) {
      throw new Error('Failed to get sources');
    }
    
    const sources = {
      streams: [],
      subtitles: [],
      intro: data.intro || null,
      outro: data.outro || null
    };
    
    // Extract direct sources
    if (data.sources && Array.isArray(data.sources)) {
      data.sources.forEach(src => {
        if (src.file || src.url) {
          sources.streams.push({
            url: src.file || src.url,
            quality: src.label || src.quality || 'auto',
            type: src.type || 'hls'
          });
        }
      });
    }
    
    // Extract subtitles/tracks
    if (data.tracks && Array.isArray(data.tracks)) {
      data.tracks.forEach(track => {
        if (track.kind === 'captions' && track.file) {
          sources.subtitles.push({
            language: track.label || 'English',
            url: track.file,
            default: track.default || false
          });
        }
      });
    }
    
    // Extract from link (embed URL)
    if (data.link && sources.streams.length === 0) {
      log(`[${rid}] Extracting from embed:`, data.link);
      const embedSources = await extractFromEmbed(data.link, rid);
      sources.streams = sources.streams.concat(embedSources.streams);
      sources.subtitles = sources.subtitles.concat(embedSources.subtitles);
    }
    
    log(`[${rid}] Extracted sources:`, {
      streams: sources.streams.length,
      subtitles: sources.subtitles.length
    });
    
    return sources;
  } catch (err) {
    log(`[${rid}] Source extraction failed:`, err.message);
    return { streams: [], subtitles: [], intro: null, outro: null };
  }
}

// ==================== EMBED EXTRACTORS ====================

async function extractFromEmbed(embedUrl, rid) {
  const sources = { streams: [], subtitles: [] };
  
  try {
    const lower = embedUrl.toLowerCase();
    
    // Megacloud/Vidplay extraction
    if (lower.includes('megacloud') || lower.includes('vidplay') || lower.includes('mcloud')) {
      log(`[${rid}] Extracting Megacloud/Vidplay`);
      
      const res = await fetchWithRetry(embedUrl);
      const html = await res.text();
      
      // Method 1: Look for sources in script
      const sourcePattern = /sources:\s*\[\s*\{\s*(?:file|src):\s*["']([^"']+)["']/g;
      let match;
      
      while ((match = sourcePattern.exec(html)) !== null) {
        const url = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
        if (url.includes('http')) {
          sources.streams.push({
            url: url,
            quality: 'auto',
            type: 'hls'
          });
        }
      }
      
      // Method 2: Encrypted sources - FIXED
      const encryptedMatch = html.match(/atob\(["']([^"']+)["']\)/);
      if (encryptedMatch) {
        const decoded = decodeBase64(encryptedMatch[1]);
        if (decoded && decoded.includes('http')) {
          sources.streams.push({
            url: decoded,
            quality: 'auto',
            type: 'hls'
          });
        }
      }
      
      // Method 3: M3U8 pattern match
      const m3u8Pattern = /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g;
      const m3u8Matches = html.match(m3u8Pattern) || [];
      
      m3u8Matches.forEach(url => {
        const cleanUrl = url.replace(/['"\\]/g, '');
        if (!sources.streams.some(s => s.url === cleanUrl)) {
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
      log(`[${rid}] Extracting VidStreaming`);
      
      const res = await fetchWithRetry(embedUrl);
      const html = await res.text();
      
      const sourcePattern = /sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/g;
      let match;
      
      while ((match = sourcePattern.exec(html)) !== null) {
        sources.streams.push({
          url: match[1],
          quality: match[1].includes('.m3u8') ? 'auto' : '720p',
          type: match[1].includes('.m3u8') ? 'hls' : 'mp4'
        });
      }
      
      const m3u8Pattern = /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/g;
      const m3u8s = html.match(m3u8Pattern) || [];
      
      m3u8s.forEach(url => {
        if (!sources.streams.some(s => s.url === url)) {
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
      log(`[${rid}] Generic extraction`);
      
      const res = await fetchWithRetry(embedUrl);
      const html = await res.text();
      
      const patterns = [
        /file:\s*["']([^"']+\.m3u8[^"']*)["']/g,
        /src:\s*["']([^"']+\.m3u8[^"']*)["']/g,
        /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/g
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          const url = match[1].replace(/['"\\]/g, '');
          if (url.includes('http') && !sources.streams.some(s => s.url === url)) {
            sources.streams.push({
              url: url,
              quality: 'auto',
              type: 'hls'
            });
          }
        }
      });
    }
    
    log(`[${rid}] Embed extraction complete:`, sources.streams.length);
  } catch (err) {
    log(`[${rid}] Embed extraction error:`, err.message);
  }
  
  return sources;
}

// ==================== STREAM FORMATTING ====================

// FIXED: Better embed URL detection
function isEmbedUrl(url) {
  const embedPattern = /\/(embed|e)\/[^.]+$/;
  const streamPattern = /\.(m3u8|mp4|ts|mpd)/i;
  
  return embedPattern.test(url) && !streamPattern.test(url);
}

function formatStreams(allSources, mediaTitle) {
  const streams = [];
  const seenUrls = new Set();
  
  allSources.forEach(serverData => {
    const serverName = serverData.serverName || 'UNKNOWN';
    const sources = serverData.sources || {};
    
    (sources.streams || []).forEach(stream => {
      if (!stream.url || seenUrls.has(stream.url)) return;
      
      // FIXED: Only skip actual embed pages, not stream URLs
      if (isEmbedUrl(stream.url)) {
        log(`Skipping embed page: ${stream.url.substring(0, 50)}...`);
        return;
      }
      
      seenUrls.add(stream.url);
      
      const quality = stream.quality || 'auto';
      
      streams.push({
        name: `HIANIME ${serverName.toUpperCase()} - ${quality}`,
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
  streams.sort((a, b) => {
    const qualityDiff = (QUALITY_RANK[b.quality] || 0) - (QUALITY_RANK[a.quality] || 0);
    return qualityDiff;
  });
  
  return streams;
}

// ==================== MAIN FUNCTION ====================

async function getStreams(tmdbId, mediaType, season, episode) {
  if (mediaType !== 'tv') {
    log('Only TV shows supported');
    return [];
  }
  
  const rid = createRequestId();
  log(`[${rid}] START`, { tmdbId, season, episode });
  
  try {
    // Get TMDB info
    const tmdbInfo = await getTMDBInfo(tmdbId, 'tv');
    if (!tmdbInfo || !tmdbInfo.title) {
      throw new Error('Failed to get TMDB info');
    }
    
    log(`[${rid}] TMDB:`, tmdbInfo.title);
    await sleep(CONFIG.DELAY);
    
    // Search HiAnime
    const searchResults = await searchHiAnime(tmdbInfo.title, rid);
    if (searchResults.length === 0) {
      throw new Error('No search results');
    }
    
    // Find best match
    let bestMatch = searchResults[0];
    let bestScore = calculateSimilarity(bestMatch.title, tmdbInfo.title);
    
    searchResults.forEach(result => {
      const score = calculateSimilarity(result.title, tmdbInfo.title);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    });
    
    log(`[${rid}] Best match:`, bestMatch.title);
    await sleep(CONFIG.DELAY);
    
    // Get episodes
    const episodes = await getAnimeEpisodes(bestMatch.id, rid);
    if (episodes.length === 0) {
      throw new Error('No episodes found');
    }
    
    // Find target episode
    const targetEpisode = episodes.find(ep => ep.number === episode);
    if (!targetEpisode) {
      throw new Error(`Episode ${episode} not found`);
    }
    
    log(`[${rid}] Target episode:`, targetEpisode.number);
    await sleep(CONFIG.DELAY);
    
    // FIXED: Get servers with correct parameter
    const servers = await getEpisodeServers(targetEpisode.episodeId, rid);
    if (servers.length === 0) {
      throw new Error('No servers found');
    }
    
    log(`[${rid}] Servers:`, servers.map(s => s.name).join(', '));
    
    // Extract from all servers
    const allSources = [];
    
    for (const server of servers) {
      await sleep(CONFIG.DELAY);
      
      const sources = await extractSources(server.serverId, rid);
      
      if (sources.streams.length > 0) {
        allSources.push({
          serverName: server.name,
          sources: sources
        });
      }
    }
    
    if (allSources.length === 0) {
      throw new Error('No sources extracted');
    }
    
    // Format streams
    const mediaTitle = `${tmdbInfo.title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
    const finalStreams = formatStreams(allSources, mediaTitle);
    
    log(`[${rid}] COMPLETE`, { streams: finalStreams.length });
    
    return finalStreams;
    
  } catch (err) {
    log(`[${rid}] ERROR:`, err.message);
    return [];
  }
}

// ==================== EXPORT ====================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
}

if (typeof window !== 'undefined') {
  window.HiAnimeScraper = { getStreams };
}
