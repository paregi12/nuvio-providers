// HiAnimeZ Scraper for Nuvio Local Scrapers - FIXED VERSION
// React Native compatible (no Node core modules, Promise chain only)
// Proper embed extraction implementation

// ==================== CONFIGURATION ====================

// TMDB API Configuration - MOVE TO ENV VARIABLE IN PRODUCTION
const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// HiAnimeZ API endpoints
const HIANIMEZ_BASE = 'https://hianimez.to';
const HIANIMEZ_AJAX = 'https://hianimez.to/ajax';

// User Agent and Headers
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Connection': 'keep-alive',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://hianimez.to/',
    'Origin': 'https://hianimez.to'
};

// MAL API Configuration
const MAL_BASE_URL = 'https://api.jikan.moe/v4';

// Quality mapping constants
const QUALITY_ORDER = {
    '4K': 10,
    '2160p': 10,
    '1440p': 8,
    '1080p': 7,
    '720p': 5,
    '480p': 3,
    '360p': 2,
    '240p': 1,
    'auto': 9,
    'default': 6,
    'Unknown': 0
};

// Server priority (higher is better)
const SERVER_PRIORITY = {
    'vidstreaming': 10,
    'gogo': 9,
    'megacloud': 8,
    'vidplay': 8,
    'streamtape': 7,
    'doodstream': 6,
    'filemoon': 5,
    'mp4upload': 4,
    'default': 3
};

// Rate limiting configuration
const RATE_LIMIT = {
    requestDelay: 500,
    maxRetries: 3,
    retryDelay: 1000
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generic fetch helper with error handling and retry logic
 */
function fetchRequest(url, options, retries) {
    retries = retries || 0;
    var merged = Object.assign({ method: 'GET', headers: HEADERS }, options || {});
    
    return fetch(url, merged)
        .then(function(response) {
            if (!response.ok) {
                if (response.status === 429 && retries < RATE_LIMIT.maxRetries) {
                    return sleep(RATE_LIMIT.retryDelay * (retries + 1))
                        .then(function() {
                            return fetchRequest(url, options, retries + 1);
                        });
                }
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            return response;
        })
        .catch(function(err) {
            if (retries < RATE_LIMIT.maxRetries) {
                return sleep(RATE_LIMIT.retryDelay)
                    .then(function() {
                        return fetchRequest(url, options, retries + 1);
                    });
            }
            throw err;
        });
}

/**
 * Create unique request ID for debugging
 */
function createRequestId() {
    try {
        var rand = Math.random().toString(36).slice(2, 8);
        var ts = Date.now().toString(36).slice(-6);
        return rand + ts;
    } catch (e) {
        return String(Date.now());
    }
}

/**
 * Debug logger with request ID
 */
function logRid(rid, msg, extra) {
    try {
        if (typeof extra !== 'undefined') {
            console.log('[HiAnimeZ][rid:' + rid + '] ' + msg, extra);
        } else {
            console.log('[HiAnimeZ][rid:' + rid + '] ' + msg);
        }
    } catch(e) {}
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

/**
 * Extract quality from URL or filename
 */
function extractQualityFromUrl(url) {
    if (!url) return 'Unknown';
    
    var patterns = [
        /(\d{3,4})p/i,
        /(\d{3,4})k/i,
        /quality[_-]?(\d{3,4})/i,
        /res[_-]?(\d{3,4})/i,
        /(\d{3,4})x\d{3,4}/i
    ];
    
    for (var i = 0; i < patterns.length; i++) {
        var m = url.match(patterns[i]);
        if (m) {
            var q = parseInt(m[1]);
            if (q >= 240 && q <= 4320) {
                if (q >= 2160) return '4K';
                return q + 'p';
            }
        }
    }
    
    var lower = url.toLowerCase();
    if (lower.indexOf('4k') !== -1 || lower.indexOf('2160') !== -1) return '4K';
    if (lower.indexOf('1440') !== -1) return '1440p';
    if (lower.indexOf('1080') !== -1) return '1080p';
    if (lower.indexOf('720') !== -1) return '720p';
    if (lower.indexOf('480') !== -1) return '480p';
    if (lower.indexOf('360') !== -1) return '360p';
    if (lower.indexOf('240') !== -1) return '240p';
    
    return 'Unknown';
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate similarity between two strings
 */
function calculateSimilarity(str1, str2) {
    var s1 = normalizeTitle(str1);
    var s2 = normalizeTitle(str2);
    
    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;
    if (s1.indexOf(s2) !== -1 || s2.indexOf(s1) !== -1) return 0.8;
    
    var words1 = s1.split(' ');
    var words2 = s2.split(' ');
    var matches = 0;
    
    for (var i = 0; i < words1.length; i++) {
        for (var j = 0; j < words2.length; j++) {
            if (words1[i] === words2[j] && words1[i].length > 2) {
                matches++;
            }
        }
    }
    
    var maxWords = Math.max(words1.length, words2.length);
    return maxWords > 0 ? matches / maxWords : 0.0;
}

// ==================== M3U8 UTILITIES ====================

/**
 * Resolve relative URL
 */
function resolveUrlRelative(url, baseUrl) {
    if (!url) return baseUrl;
    if (url.indexOf('http') === 0) return url;
    try {
        return new URL(url, baseUrl).toString();
    } catch (e) {
        console.warn('[HiAnimeZ] URL resolution failed:', url, baseUrl);
        return url;
    }
}

/**
 * Parse M3U8 master playlist
 */
function parseM3U8Master(content, baseUrl) {
    var lines = content.split('\n');
    var streams = [];
    var current = null;
    
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        
        if (line.indexOf('#EXT-X-STREAM-INF:') === 0) {
            current = { bandwidth: null, resolution: null, url: null, codecs: null };
            
            var bw = line.match(/BANDWIDTH=(\d+)/);
            if (bw) current.bandwidth = parseInt(bw[1]);
            
            var res = line.match(/RESOLUTION=(\d+x\d+)/);
            if (res) current.resolution = res[1];
            
            var codec = line.match(/CODECS="([^"]*)"/);
            if (codec) current.codecs = codec[1];
            
        } else if (current && line[0] !== '#') {
            current.url = resolveUrlRelative(line, baseUrl);
            streams.push(current);
            current = null;
        }
    }
    
    return streams;
}

/**
 * Determine quality from stream info
 */
function qualityFromResolutionOrBandwidth(stream) {
    if (stream && stream.resolution) {
        var h = parseInt(String(stream.resolution).split('x')[1]);
        if (h >= 2160) return '4K';
        if (h >= 1440) return '1440p';
        if (h >= 1080) return '1080p';
        if (h >= 720) return '720p';
        if (h >= 480) return '480p';
        if (h >= 360) return '360p';
        return '240p';
    }
    
    if (stream && stream.bandwidth) {
        var mbps = stream.bandwidth / 1000000;
        if (mbps >= 15) return '4K';
        if (mbps >= 8) return '1440p';
        if (mbps >= 5) return '1080p';
        if (mbps >= 3) return '720p';
        if (mbps >= 1.5) return '480p';
        if (mbps >= 0.8) return '360p';
        return '240p';
    }
    
    return 'Unknown';
}

/**
 * Resolve M3U8 playlist to quality variants
 */
function resolveM3U8(url, serverType) {
    return fetchRequest(url, {
        headers: Object.assign({}, HEADERS, {
            'Accept': 'application/vnd.apple.mpegurl,application/x-mpegURL,application/octet-stream,*/*'
        })
    })
    .then(function(res) { return res.text(); })
    .then(function(content) {
        if (content.indexOf('#EXT-X-STREAM-INF') !== -1) {
            var variants = parseM3U8Master(content, url);
            var out = [];
            
            for (var i = 0; i < variants.length; i++) {
                var q = qualityFromResolutionOrBandwidth(variants[i]);
                out.push({
                    url: variants[i].url,
                    quality: q,
                    serverType: serverType,
                    bandwidth: variants[i].bandwidth
                });
            }
            
            out.sort(function(a, b) {
                return (QUALITY_ORDER[b.quality] || 0) - (QUALITY_ORDER[a.quality] || 0);
            });
            
            return { success: true, streams: out };
        }
        
        if (content.indexOf('#EXTINF:') !== -1) {
            return {
                success: true,
                streams: [{
                    url: url,
                    quality: 'auto',
                    serverType: serverType
                }]
            };
        }
        
        throw new Error('Invalid M3U8');
    })
    .catch(function(err) {
        console.warn('[HiAnimeZ] M3U8 resolution failed:', err.message);
        return {
            success: false,
            streams: []
        };
    });
}

/**
 * Resolve multiple M3U8 playlists
 */
function resolveMultipleM3U8(m3u8Links) {
    var promises = m3u8Links.map(function(link) {
        return resolveM3U8(link.url, link.serverType);
    });
    
    return Promise.allSettled(promises).then(function(results) {
        var out = [];
        for (var i = 0; i < results.length; i++) {
            if (results[i].status === 'fulfilled' && results[i].value && results[i].value.streams) {
                out = out.concat(results[i].value.streams);
            }
        }
        return out;
    });
}

// ==================== TMDB INTEGRATION ====================

/**
 * Get TMDB details for a show/movie
 */
function getTMDBDetails(tmdbId, mediaType) {
    var endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    var url = TMDB_BASE_URL + '/' + endpoint + '/' + tmdbId + 
              '?api_key=' + TMDB_API_KEY + '&append_to_response=external_ids';
    
    return fetchRequest(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var title = mediaType === 'tv' ? data.name : data.title;
            var releaseDate = mediaType === 'tv' ? data.first_air_date : data.release_date;
            var year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
            
            return {
                title: title,
                year: year,
                originalTitle: data.original_name || data.original_title,
                externalIds: data.external_ids || {}
            };
        })
        .catch(function(err) {
            console.warn('[HiAnimeZ] TMDB fetch failed:', err.message);
            return { title: null, year: null, originalTitle: null, externalIds: {} };
        });
}

/**
 * Get TMDB season information
 */
function getTMDBSeasonInfo(tmdbId, season) {
    var url = TMDB_BASE_URL + '/tv/' + tmdbId + '/season/' + season + '?api_key=' + TMDB_API_KEY;
    
    return fetchRequest(url)
        .then(function(res) { return res.json(); })
        .then(function(seasonData) {
            return {
                name: seasonData.name,
                episodeCount: seasonData.episodes ? seasonData.episodes.length : 0,
                seasonNumber: seasonData.season_number,
                episodes: seasonData.episodes || []
            };
        })
        .catch(function(err) {
            console.warn('[HiAnimeZ] TMDB season fetch failed:', err.message);
            return {
                name: null,
                episodeCount: 0,
                seasonNumber: season,
                episodes: []
            };
        });
}

// ==================== HIANIMEZ SCRAPING ====================

/**
 * Search anime on HiAnimeZ
 */
function searchHiAnimeZ(query) {
    var searchUrl = HIANIMEZ_BASE + '/search?keyword=' + encodeURIComponent(query);
    
    return fetchRequest(searchUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            
            var itemPattern = /<div[^>]*class="[^"]*film_list-wrap[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
            var items = html.match(itemPattern) || [];
            
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                
                var urlMatch = item.match(/href="([^"]*)"/);
                var url = urlMatch ? urlMatch[1] : null;
                
                var titleMatch = item.match(/data-tip="([^"]*)"|title="([^"]*)"/);
                var title = titleMatch ? (titleMatch[1] || titleMatch[2]) : null;
                
                var epMatch = item.match(/(\d+)\s*(?:eps?|episodes?)/i);
                var episodeCount = epMatch ? parseInt(epMatch[1]) : 0;
                
                var typeMatch = item.match(/class="[^"]*fdi-item[^"]*">([^<]*)</);
                var type = typeMatch ? typeMatch[1].trim() : 'TV';
                
                if (url && title) {
                    results.push({
                        title: title.trim(),
                        url: url.indexOf('http') === 0 ? url : HIANIMEZ_BASE + url,
                        episodeCount: episodeCount,
                        type: type
                    });
                }
            }
            
            return results;
        });
}

/**
 * Get anime details from anime page
 */
function getAnimeDetails(animeUrl) {
    return fetchRequest(animeUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var details = {
                animeId: null,
                title: null,
                episodeCount: 0,
                episodes: []
            };
            
            var idMatch = html.match(/data-id="(\d+)"|anime-id="(\d+)"/);
            if (idMatch) {
                details.animeId = idMatch[1] || idMatch[2];
            }
            
            var titleMatch = html.match(/<h1[^>]*class="[^"]*film-name[^"]*"[^>]*>([^<]*)</);
            if (titleMatch) {
                details.title = titleMatch[1].trim();
            }
            
            var epCountMatch = html.match(/(\d+)\s*(?:eps?|episodes?)/i);
            if (epCountMatch) {
                details.episodeCount = parseInt(epCountMatch[1]);
            }
            
            return details;
        });
}

/**
 * Get episode servers for a specific episode
 */
function getEpisodeServers(animeId, episode) {
    var url = HIANIMEZ_AJAX + '/v2/episode/servers?episodeId=' + animeId + '-' + episode;
    
    return fetchRequest(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var servers = [];
            var html = data.html || '';
            
            var serverPattern = /<div[^>]*class="[^"]*server-item[^"]*"[^>]*data-id="([^"]*)"[^>]*>([\s\S]*?)<\/div>/gi;
            var match;
            
            while ((match = serverPattern.exec(html)) !== null) {
                var serverId = match[1];
                var serverHtml = match[2];
                
                var nameMatch = serverHtml.match(/>([^<]+)</);
                var serverName = nameMatch ? nameMatch[1].trim().toLowerCase() : 'unknown';
                
                servers.push({
                    id: serverId,
                    name: serverName,
                    priority: SERVER_PRIORITY[serverName] || SERVER_PRIORITY.default
                });
            }
            
            servers.sort(function(a, b) {
                return b.priority - a.priority;
            });
            
            return servers;
        });
}

// ==================== IMPROVED EMBED EXTRACTION ====================

/**
 * Extract sources from VidStreaming/Gogo embed - IMPROVED
 */
function extractVidStreamingSources(embedUrl, rid) {
    logRid(rid, 'Extracting VidStreaming/Gogo sources', { url: embedUrl });
    
    return fetchRequest(embedUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var sources = {
                streams: [],
                subtitles: []
            };
            
            // Method 1: Extract from sources array in JavaScript
            var sourcesPattern = /sources:\s*\[\s*\{[^}]*file:\s*["']([^"']+)["']/g;
            var sourceMatch;
            while ((sourceMatch = sourcesPattern.exec(html)) !== null) {
                var srcUrl = sourceMatch[1];
                if (srcUrl.indexOf('http') === 0) {
                    sources.streams.push({
                        url: srcUrl,
                        quality: srcUrl.indexOf('.m3u8') !== -1 ? 'auto' : extractQualityFromUrl(srcUrl),
                        type: srcUrl.indexOf('.m3u8') !== -1 ? 'm3u8' : 'mp4'
                    });
                    logRid(rid, 'Found source from sources array', { url: srcUrl });
                }
            }
            
            // Method 2: Extract encrypted data
            var encryptedMatch = html.match(/data-value="([^"]*)"/);
            if (encryptedMatch) {
                try {
                    var decrypted = atob(encryptedMatch[1]);
                    var m3u8Match = decrypted.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/);
                    if (m3u8Match) {
                        sources.streams.push({
                            url: m3u8Match[1],
                            quality: 'auto',
                            type: 'm3u8'
                        });
                        logRid(rid, 'Found source from encrypted data', { url: m3u8Match[1] });
                    }
                } catch(e) {
                    logRid(rid, 'Failed to decrypt data-value', { error: e.message });
                }
            }
            
            // Method 3: Direct M3U8 links
            var m3u8Pattern = /(https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*)/g;
            var m3u8Matches = html.match(m3u8Pattern) || [];
            for (var i = 0; i < m3u8Matches.length; i++) {
                var url = m3u8Matches[i].replace(/['"\\]/g, '');
                if (url.indexOf('http') === 0 && !sources.streams.some(function(s) { return s.url === url; })) {
                    sources.streams.push({
                        url: url,
                        quality: 'auto',
                        type: 'm3u8'
                    });
                    logRid(rid, 'Found M3U8 from pattern match', { url: url });
                }
            }
            
            // Method 4: MP4 sources
            var mp4Pattern = /(https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*)/g;
            var mp4Matches = html.match(mp4Pattern) || [];
            for (var j = 0; j < mp4Matches.length; j++) {
                var mp4Url = mp4Matches[j].replace(/['"\\]/g, '');
                if (mp4Url.indexOf('http') === 0 && !sources.streams.some(function(s) { return s.url === mp4Url; })) {
                    sources.streams.push({
                        url: mp4Url,
                        quality: extractQualityFromUrl(mp4Url),
                        type: 'mp4'
                    });
                    logRid(rid, 'Found MP4 from pattern match', { url: mp4Url });
                }
            }
            
            // Extract subtitles
            var trackPattern = /<track[^>]*kind="captions"[^>]*src="([^"]*)"[^>]*label="([^"]*)"/g;
            var trackMatch;
            while ((trackMatch = trackPattern.exec(html)) !== null) {
                sources.subtitles.push({
                    url: trackMatch[1],
                    language: trackMatch[2] || 'Unknown',
                    default: false
                });
            }
            
            logRid(rid, 'VidStreaming extraction complete', { 
                streams: sources.streams.length, 
                subtitles: sources.subtitles.length 
            });
            
            return sources;
        })
        .catch(function(err) {
            logRid(rid, 'VidStreaming extraction failed', { error: err.message });
            return { streams: [], subtitles: [] };
        });
}

/**
 * Extract sources from Megacloud/Vidplay - NEW
 */
function extractMegacloudSources(embedUrl, rid) {
    logRid(rid, 'Extracting Megacloud/Vidplay sources', { url: embedUrl });
    
    return fetchRequest(embedUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var sources = {
                streams: [],
                subtitles: []
            };
            
            // Megacloud/Vidplay uses encrypted sources
            var sourcesPattern = /sources:\s*\[\s*\{[^}]*file:\s*["']([^"']+)["']/g;
            var match;
            while ((match = sourcesPattern.exec(html)) !== null) {
                var srcUrl = match[1];
                if (srcUrl.indexOf('http') === 0 || srcUrl.indexOf('//') === 0) {
                    if (srcUrl.indexOf('//') === 0) srcUrl = 'https:' + srcUrl;
                    sources.streams.push({
                        url: srcUrl,
                        quality: 'auto',
                        type: 'm3u8'
                    });
                    logRid(rid, 'Found Megacloud source', { url: srcUrl });
                }
            }
            
            // Alternative pattern for encoded sources
            var encodedPattern = /file:\s*atob\(["']([^"']+)["']\)/;
            var encodedMatch = html.match(encodedPattern);
            if (encodedMatch) {
                try {
                    var decoded = atob(encodedMatch[1]);
                    if (decoded.indexOf('http') === 0) {
                        sources.streams.push({
                            url: decoded,
                            quality: 'auto',
                            type: 'm3u8'
                        });
                        logRid(rid, 'Found encoded Megacloud source', { url: decoded });
                    }
                } catch(e) {
                    logRid(rid, 'Failed to decode Megacloud source', { error: e.message });
                }
            }
            
            // Extract M3U8 links
            var m3u8Pattern = /(https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*)/g;
            var m3u8s = html.match(m3u8Pattern) || [];
            for (var i = 0; i < m3u8s.length; i++) {
                var url = m3u8s[i].replace(/['"\\]/g, '');
                if (!sources.streams.some(function(s) { return s.url === url; })) {
                    sources.streams.push({
                        url: url,
                        quality: 'auto',
                        type: 'm3u8'
                    });
                }
            }
            
            logRid(rid, 'Megacloud extraction complete', { streams: sources.streams.length });
            return sources;
        })
        .catch(function(err) {
            logRid(rid, 'Megacloud extraction failed', { error: err.message });
            return { streams: [], subtitles: [] };
        });
}

/**
 * Extract sources from StreamTape - IMPROVED
 */
function extractStreamTapeSources(embedUrl, rid) {
    logRid(rid, 'Extracting StreamTape sources', { url: embedUrl });
    
    return fetchRequest(embedUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var sources = { streams: [], subtitles: [] };
            
            // StreamTape obfuscation pattern
            var idPattern = /getElementById\('robotlink'\)\.innerHTML\s*=\s*(.+?)\s*\+/;
            var idMatch = html.match(idPattern);
            var tokenPattern = /token=([^&"']+)/;
            var tokenMatch = html.match(tokenPattern);
            
            if (idMatch && tokenMatch) {
                // Extract the concatenated string parts
                var parts = idMatch[1].match(/['"]([^'"]+)['"]/g);
                if (parts) {
                    var videoPath = parts.map(function(p) { 
                        return p.replace(/['"]/g, ''); 
                    }).join('');
                    
                    var videoUrl = 'https:' + videoPath + '&token=' + tokenMatch[1];
                    sources.streams.push({
                        url: videoUrl,
                        quality: '720p',
                        type: 'mp4'
                    });
                    logRid(rid, 'Found StreamTape source', { url: videoUrl });
                }
            }
            
            // Fallback: search for video URLs
            var urlPattern = /(https?:\/\/[^\s"']+(?:streamtape|stape)[^\s"']+\.mp4[^\s"']*)/g;
            var urls = html.match(urlPattern) || [];
            for (var i = 0; i < urls.length; i++) {
                var url = urls[i].replace(/['"\\]/g, '');
                if (!sources.streams.some(function(s) { return s.url === url; })) {
                    sources.streams.push({
                        url: url,
                        quality: extractQualityFromUrl(url),
                        type: 'mp4'
                    });
                }
            }
            
            logRid(rid, 'StreamTape extraction complete', { streams: sources.streams.length });
            return sources;
        })
        .catch(function(err) {
            logRid(rid, 'StreamTape extraction failed', { error: err.message });
            return { streams: [], subtitles: [] };
        });
}

/**
 * Extract sources from DoodStream - IMPROVED
 */
function extractDoodStreamSources(embedUrl, rid) {
    logRid(rid, 'Extracting DoodStream sources', { url: embedUrl });
    
    return fetchRequest(embedUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var sources = { streams: [], subtitles: [] };
            
            // DoodStream pass API
            var passMatch = html.match(/\/pass_md5\/[^'"\s]+/);
            if (passMatch) {
                var passPath = passMatch[0];
                var baseUrl = embedUrl.split('/e/')[0];
                var passUrl = baseUrl + passPath;
                
                return fetchRequest(passUrl)
                    .then(function(res) { return res.text(); })
                    .then(function(passData) {
                        // Construct DoodStream URL
                        var videoUrl = passData + 'zUEJeL3mUN?token=' + passPath.split('/').pop();
                        sources.streams.push({
                            url: videoUrl,
                            quality: '480p',
                            type: 'mp4'
                        });
                        logRid(rid, 'Found DoodStream source', { url: videoUrl });
                        return sources;
                    })
                    .catch(function(err) {
                        logRid(rid, 'DoodStream pass fetch failed', { error: err.message });
                        return sources;
                    });
            }
            
            logRid(rid, 'DoodStream extraction complete', { streams: sources.streams.length });
            return sources;
        })
        .catch(function(err) {
            logRid(rid, 'DoodStream extraction failed', { error: err.message });
            return { streams: [], subtitles: [] };
        });
}

/**
 * Extract sources from FileMoon - IMPROVED
 */
function extractFileMoonSources(embedUrl, rid) {
    logRid(rid, 'Extracting FileMoon sources', { url: embedUrl });
    
    return fetchRequest(embedUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var sources = { streams: [], subtitles: [] };
            
            // Method 1: Look for sources in player config
            var sourcesPattern = /sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/;
            var srcMatch = html.match(sourcesPattern);
            
            if (srcMatch) {
                sources.streams.push({
                    url: srcMatch[1],
                    quality: 'auto',
                    type: 'm3u8'
                });
                logRid(rid, 'Found FileMoon source from config', { url: srcMatch[1] });
            }
            
            // Method 2: Extract from packed/eval code
            var evalPattern = /eval\(function\(p,a,c,k,e,d\).*?\}\((.*?)\)\)/;
            var evalMatch = html.match(evalPattern);
            
            if (evalMatch) {
                // Try to find file URLs in the packed code
                var packedCode = evalMatch[0];
                var filePattern = /file["\s:]+["']([^"']+\.m3u8[^"']*)["']/g;
                var fileMatch;
                
                while ((fileMatch = filePattern.exec(packedCode)) !== null) {
                    var fileUrl = fileMatch[1];
                    if (fileUrl.indexOf('http') === 0 && !sources.streams.some(function(s) { return s.url === fileUrl; })) {
                        sources.streams.push({
                            url: fileUrl,
                            quality: 'auto',
                            type: 'm3u8'
                        });
                        logRid(rid, 'Found FileMoon source from packed code', { url: fileUrl });
                    }
                }
            }
            
            // Method 3: Direct M3U8 search
            var m3u8Pattern = /(https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*)/g;
            var m3u8Matches = html.match(m3u8Pattern) || [];
            for (var i = 0; i < m3u8Matches.length; i++) {
                var url = m3u8Matches[i].replace(/['"\\]/g, '');
                if (!sources.streams.some(function(s) { return s.url === url; })) {
                    sources.streams.push({
                        url: url,
                        quality: 'auto',
                        type: 'm3u8'
                    });
                }
            }
            
            logRid(rid, 'FileMoon extraction complete', { streams: sources.streams.length });
            return sources;
        })
        .catch(function(err) {
            logRid(rid, 'FileMoon extraction failed', { error: err.message });
            return { streams: [], subtitles: [] };
        });
}

/**
 * Extract sources from Mp4Upload - IMPROVED
 */
function extractMp4UploadSources(embedUrl, rid) {
    logRid(rid, 'Extracting Mp4Upload sources', { url: embedUrl });
    
    return fetchRequest(embedUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var sources = { streams: [], subtitles: [] };
            
            // Method 1: Player config
            var scriptPattern = /player\.src\(\[?\s*\{\s*(?:type:\s*["'][^"']*["'],\s*)?src:\s*["']([^"']+)["']/;
            var match = html.match(scriptPattern);
            
            if (match) {
                sources.streams.push({
                    url: match[1],
                    quality: extractQualityFromUrl(match[1]),
                    type: match[1].indexOf('.m3u8') !== -1 ? 'm3u8' : 'mp4'
                });
                logRid(rid, 'Found Mp4Upload source from player config', { url: match[1] });
            }
            
            // Method 2: Direct video URLs
            var mp4Pattern = /(https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*)/g;
            var mp4s = html.match(mp4Pattern) || [];
            for (var i = 0; i < mp4s.length; i++) {
                var url = mp4s[i].replace(/['"\\]/g, '');
                if (!sources.streams.some(function(s) { return s.url === url; })) {
                    sources.streams.push({
                        url: url,
                        quality: extractQualityFromUrl(url),
                        type: 'mp4'
                    });
                }
            }
            
            // Method 3: M3U8 URLs
            var m3u8Pattern = /(https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*)/g;
            var m3u8s = html.match(m3u8Pattern) || [];
            for (var j = 0; j < m3u8s.length; j++) {
                var m3u8Url = m3u8s[j].replace(/['"\\]/g, '');
                if (!sources.streams.some(function(s) { return s.url === m3u8Url; })) {
                    sources.streams.push({
                        url: m3u8Url,
                        quality: 'auto',
                        type: 'm3u8'
                    });
                }
            }
            
            logRid(rid, 'Mp4Upload extraction complete', { streams: sources.streams.length });
            return sources;
        })
        .catch(function(err) {
            logRid(rid, 'Mp4Upload extraction failed', { error: err.message });
            return { streams: [], subtitles: [] };
        });
}

/**
 * Generic extractor for unknown embeds - IMPROVED
 */
function extractGenericSources(embedUrl, rid) {
    logRid(rid, 'Extracting from generic embed', { url: embedUrl });
    
    return fetchRequest(embedUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var sources = { streams: [], subtitles: [] };
            
            // Look for common patterns
            var patterns = [
                /sources:\s*\[\s*\{\s*(?:file|src):\s*["']([^"']+)["']/g,
                /file:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/g,
                /src:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/g,
                /(https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*)/g,
                /(https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*)/g
            ];
            
            for (var i = 0; i < patterns.length; i++) {
                var match;
                while ((match = patterns[i].exec(html)) !== null) {
                    var url = match[1].replace(/['"\\]/g, '');
                    if (url.indexOf('http') === 0 && !sources.streams.some(function(s) { return s.url === url; })) {
                        sources.streams.push({
                            url: url,
                            quality: url.indexOf('.m3u8') !== -1 ? 'auto' : extractQualityFromUrl(url),
                            type: url.indexOf('.m3u8') !== -1 ? 'm3u8' : 'mp4'
                        });
                        logRid(rid, 'Found generic source', { url: url });
                    }
                }
            }
            
            logRid(rid, 'Generic extraction complete', { streams: sources.streams.length });
            return sources;
        })
        .catch(function(err) {
            logRid(rid, 'Generic extraction failed', { error: err.message });
            return { streams: [], subtitles: [] };
        });
}

/**
 * Detect embed provider and extract accordingly - IMPROVED
 */
function extractFromEmbed(embedUrl, rid) {
    if (!embedUrl) {
        logRid(rid, 'No embed URL provided');
        return Promise.resolve({ streams: [], subtitles: [] });
    }
    
    var lower = embedUrl.toLowerCase();
    
    // VidStreaming/Gogo
    if (lower.indexOf('gogo') !== -1 || lower.indexOf('vidstreaming') !== -1 || lower.indexOf('gogocdn') !== -1) {
        return extractVidStreamingSources(embedUrl, rid);
    }
    
    // Megacloud/Vidplay
    if (lower.indexOf('megacloud') !== -1 || lower.indexOf('vidplay') !== -1 || lower.indexOf('mcloud') !== -1) {
        return extractMegacloudSources(embedUrl, rid);
    }
    
    // StreamTape
    if (lower.indexOf('streamtape') !== -1 || lower.indexOf('stape') !== -1) {
        return extractStreamTapeSources(embedUrl, rid);
    }
    
    // DoodStream
    if (lower.indexOf('dood') !== -1) {
        return extractDoodStreamSources(embedUrl, rid);
    }
    
    // FileMoon
    if (lower.indexOf('filemoon') !== -1) {
        return extractFileMoonSources(embedUrl, rid);
    }
    
    // Mp4Upload
    if (lower.indexOf('mp4upload') !== -1) {
        return extractMp4UploadSources(embedUrl, rid);
    }
    
    // Generic fallback
    logRid(rid, 'Using generic extractor for unknown provider', { url: embedUrl });
    return extractGenericSources(embedUrl, rid);
}

/**
 * Extract video source from server - FIXED TO PROPERLY EXTRACT
 */
function extractServerSource(serverId, rid) {
    var url = HIANIMEZ_AJAX + '/v2/episode/sources?id=' + serverId;
    
    logRid(rid, 'Fetching server source', { serverId: serverId, url: url });
    
    return fetchRequest(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            logRid(rid, 'Server response received', { 
                hasLink: !!data.link, 
                hasSources: !!(data.sources && data.sources.length),
                hasTracks: !!(data.tracks && data.tracks.length)
            });
            
            var sources = {
                streams: [],
                subtitles: []
            };
            
            // CRITICAL: Process direct sources first (from API)
            if (data.sources && Array.isArray(data.sources)) {
                for (var i = 0; i < data.sources.length; i++) {
                    var src = data.sources[i];
                    if (src.file && src.file.indexOf('http') === 0) {
                        sources.streams.push({
                            url: src.file,
                            quality: src.label || extractQualityFromUrl(src.file),
                            type: src.type || (src.file.indexOf('.m3u8') !== -1 ? 'm3u8' : 'mp4')
                        });
                        logRid(rid, 'Added direct source from API', { 
                            url: src.file, 
                            quality: src.label || extractQualityFromUrl(src.file) 
                        });
                    }
                }
            }
            
            // Extract subtitles from API
            if (data.tracks && Array.isArray(data.tracks)) {
                for (var j = 0; j < data.tracks.length; j++) {
                    var track = data.tracks[j];
                    if (track.kind === 'captions' && track.file) {
                        sources.subtitles.push({
                            language: track.label || 'Unknown',
                            url: track.file,
                            default: !!track.default
                        });
                    }
                }
            }
            
            // NOW extract from embed if we have a link
            if (data.link) {
                logRid(rid, 'Extracting from embed', { embedUrl: data.link });
                
                return extractFromEmbed(data.link, rid).then(function(embedSources) {
                    // Merge embed sources with direct sources
                    if (embedSources.streams && embedSources.streams.length > 0) {
                        logRid(rid, 'Embed extraction successful', { 
                            streams: embedSources.streams.length 
                        });
                        sources.streams = sources.streams.concat(embedSources.streams);
                    } else {
                        logRid(rid, 'Embed extraction returned no streams');
                    }
                    
                    if (embedSources.subtitles && embedSources.subtitles.length > 0) {
                        sources.subtitles = sources.subtitles.concat(embedSources.subtitles);
                    }
                    
                    // REMOVED: No longer adding raw embed URLs as fallback
                    // This was the main issue - we were returning unplayable embed page URLs
                    
                    if (sources.streams.length === 0) {
                        logRid(rid, 'WARNING: No playable streams found for this server');
                    }
                    
                    return sources;
                });
            }
            
            // No embed link, return what we have
            logRid(rid, 'No embed link, returning direct sources only', { 
                streams: sources.streams.length 
            });
            return sources;
        })
        .catch(function(err) {
            logRid(rid, 'Server source extraction failed', { 
                serverId: serverId, 
                error: err.message 
            });
            return { streams: [], subtitles: [] };
        });
}

// ==================== ANIME MATCHING ====================

/**
 * Find best anime match for given season
 */
function findBestAnimeMatch(results, targetTitle, season, tmdbId) {
    if (!results || results.length === 0) {
        return Promise.resolve(null);
    }
    
    if (!season || season === 1) {
        var bestMatch = null;
        var bestScore = 0;
        
        for (var i = 0; i < results.length; i++) {
            var score = calculateSimilarity(results[i].title, targetTitle);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = results[i];
            }
        }
        
        return Promise.resolve(bestMatch);
    }
    
    var seasonStr = String(season);
    var candidates = [];
    
    for (var j = 0; j < results.length; j++) {
        var r = results[j];
        var t = (r.title || '').toLowerCase();
        
        if (t.indexOf('season ' + seasonStr) !== -1 || 
            t.indexOf(' s' + seasonStr) !== -1 ||
            t.indexOf('s' + seasonStr + ' ') !== -1) {
            candidates.push({ result: r, score: 5 });
        }
    }
    
    if (tmdbId && candidates.length === 0) {
        return getTMDBSeasonInfo(tmdbId, season).then(function(seasonInfo) {
            if (seasonInfo.episodeCount > 0) {
                for (var k = 0; k < results.length; k++) {
                    var r2 = results[k];
                    if (r2.episodeCount > 0) {
                        var diff = Math.abs(r2.episodeCount - seasonInfo.episodeCount);
                        if (diff <= 2) {
                            candidates.push({ result: r2, score: 3 - diff });
                        }
                    }
                }
            }
            
            if (candidates.length > 0) {
                candidates.sort(function(a, b) { return b.score - a.score; });
                return candidates[0].result;
            }
            
            var bestMatch = null;
            var bestScore = 0;
            for (var l = 0; l < results.length; l++) {
                var score = calculateSimilarity(results[l].title, targetTitle);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = results[l];
                }
            }
            return bestMatch;
        });
    }
    
    if (candidates.length > 0) {
        candidates.sort(function(a, b) { return b.score - a.score; });
        return Promise.resolve(candidates[0].result);
    }
    
    return Promise.resolve(results[0]);
}

// ==================== FORMATTING ====================

/**
 * Build media title
 */
function buildMediaTitle(info, mediaType, season, episode) {
    if (!info || !info.title) return '';
    
    if (mediaType === 'tv' && season && episode) {
        var s = String(season).padStart(2, '0');
        var e = String(episode).padStart(2, '0');
        return info.title + ' S' + s + 'E' + e;
    }
    
    if (info.year) {
        return info.title + ' (' + info.year + ')';
    }
    
    return info.title;
}

/**
 * Format streams for Nuvio
 */
function formatToNuvioStreams(data, mediaTitle, serverName) {
    var links = [];
    var streams = data && data.streams ? data.streams : [];
    var subs = data && data.subtitles ? data.subtitles : [];
    
    var headers = {
        'User-Agent': HEADERS['User-Agent'],
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Referer': HIANIMEZ_BASE + '/',
        'Origin': HIANIMEZ_BASE
    };
    
    for (var i = 0; i < streams.length; i++) {
        var s = streams[i];
        
        // Skip if URL is invalid or looks like an embed page
        if (!s.url || s.url.indexOf('/embed/') !== -1 || s.url.indexOf('/e/') !== -1) {
            continue;
        }
        
        var quality = s.quality || extractQualityFromUrl(s.url) || 'Unknown';
        var server = (serverName || 'server').toUpperCase();
        
        links.push({
            name: 'HIANIMEZ ' + server + ' - ' + quality,
            title: mediaTitle || '',
            url: s.url,
            quality: quality,
            size: 'Unknown',
            headers: headers,
            subtitles: subs,
            provider: 'hianimez',
            type: s.type || 'unknown'
        });
    }
    
    return links;
}

// ==================== MAIN ENTRY POINT ====================

/**
 * Main function to get streams
 */
function getStreams(tmdbId, mediaType, season, episode) {
    if (mediaType !== 'tv') {
        return Promise.resolve([]);
    }
    
    var rid = createRequestId();
    var mediaInfo = null;
    
    logRid(rid, '========== STREAM EXTRACTION START ==========');
    logRid(rid, 'Request params', {
        tmdbId: tmdbId,
        mediaType: mediaType,
        season: season,
        episode: episode
    });
    
    return getTMDBDetails(tmdbId, 'tv')
        .then(function(info) {
            mediaInfo = info || { title: null, year: null };
            logRid(rid, 'TMDB details fetched', { title: mediaInfo.title, year: mediaInfo.year });
            
            return sleep(RATE_LIMIT.requestDelay).then(function() {
                return searchHiAnimeZ(mediaInfo.title);
            });
        })
        .then(function(searchResults) {
            logRid(rid, 'Search results', { count: searchResults.length });
            
            if (searchResults.length === 0) {
                throw new Error('No search results found for: ' + mediaInfo.title);
            }
            
            return findBestAnimeMatch(searchResults, mediaInfo.title, season, tmdbId);
        })
        .then(function(match) {
            if (!match) {
                throw new Error('No anime match found');
            }
            
            logRid(rid, 'Best match found', {
                title: match.title,
                url: match.url,
                episodeCount: match.episodeCount
            });
            
            return sleep(RATE_LIMIT.requestDelay).then(function() {
                return getAnimeDetails(match.url);
            });
        })
        .then(function(details) {
            if (!details || !details.animeId) {
                throw new Error('Could not extract anime ID');
            }
            
            logRid(rid, 'Anime details', {
                animeId: details.animeId,
                title: details.title,
                episodeCount: details.episodeCount
            });
            
            return sleep(RATE_LIMIT.requestDelay).then(function() {
                return getEpisodeServers(details.animeId, episode);
            });
        })
        .then(function(servers) {
            if (!servers || servers.length === 0) {
                throw new Error('No servers found for episode ' + episode);
            }
            
            logRid(rid, 'Servers found', {
                count: servers.length,
                servers: servers.map(function(s) { return s.name + ' (priority: ' + s.priority + ')'; })
            });
            
            // Extract sources from all servers with rate limiting
            var serverPromises = [];
            for (var i = 0; i < servers.length; i++) {
                (function(server, index) {
                    var promise = sleep(RATE_LIMIT.requestDelay * index)
                        .then(function() {
                            return extractServerSource(server.id, rid);
                        })
                        .then(function(sources) {
                            return {
                                serverName: server.name,
                                sources: sources,
                                priority: server.priority
                            };
                        })
                        .catch(function(err) {
                            logRid(rid, 'Server extraction failed', {
                                server: server.name,
                                error: err.message
                            });
                            return {
                                serverName: server.name,
                                sources: { streams: [], subtitles: [] },
                                priority: 0
                            };
                        });
                    serverPromises.push(promise);
                })(servers[i], i);
            }
            
            return Promise.allSettled(serverPromises);
        })
        .then(function(results) {
            var allStreams = [];
            var allSubtitles = [];
            
            for (var i = 0; i < results.length; i++) {
                if (results[i].status === 'fulfilled' && results[i].value) {
                    var val = results[i].value;
                    var serverName = val.serverName || 'unknown';
                    var sources = val.sources || { streams: [], subtitles: [] };
                    
                    for (var j = 0; j < sources.streams.length; j++) {
                        var stream = sources.streams[j];
                        allStreams.push({
                            url: stream.url,
                            quality: stream.quality,
                            serverName: serverName,
                            type: stream.type,
                            priority: val.priority || 0
                        });
                    }
                    
                    allSubtitles = allSubtitles.concat(sources.subtitles || []);
                }
            }
            
            logRid(rid, 'All sources collected', {
                streams: allStreams.length,
                subtitles: allSubtitles.length
            });
            
            if (allStreams.length === 0) {
                logRid(rid, 'WARNING: No streams extracted from any server!');
                return [];
            }
            
            // Separate M3U8 and direct streams
            var m3u8Streams = allStreams.filter(function(s) {
                return s.url && s.url.indexOf('.m3u8') !== -1;
            });
            
            var directStreams = allStreams.filter(function(s) {
                return s.url && s.url.indexOf('.m3u8') === -1;
            });
            
            logRid(rid, 'Stream types', {
                m3u8: m3u8Streams.length,
                direct: directStreams.length
            });
            
            // Resolve M3U8 playlists
            return resolveMultipleM3U8(m3u8Streams).then(function(resolved) {
                var combined = directStreams.concat(resolved);
                
                logRid(rid, 'M3U8 resolution complete', {
                    resolved: resolved.length,
                    total: combined.length
                });
                
                // Deduplicate subtitles
                var uniqueSubs = [];
                var seenSubUrls = {};
                
                for (var k = 0; k < allSubtitles.length; k++) {
                    var sub = allSubtitles[k];
                    if (sub && sub.url && !seenSubUrls[sub.url]) {
                        seenSubUrls[sub.url] = true;
                        uniqueSubs.push(sub);
                    }
                }
                
                // Format streams
                var mediaTitle = buildMediaTitle(mediaInfo, 'tv', season, episode);
                var formattedStreams = [];
                
                var streamsByServer = {};
                for (var l = 0; l < combined.length; l++) {
                    var st = combined[l];
                    var serverKey = st.serverName || 'unknown';
                    
                    if (!streamsByServer[serverKey]) {
                        streamsByServer[serverKey] = {
                            streams: [],
                            priority: st.priority || 0
                        };
                    }
                    
                    streamsByServer[serverKey].streams.push(st);
                }
                
                var serverKeys = Object.keys(streamsByServer);
                for (var m = 0; m < serverKeys.length; m++) {
                    var serverKey = serverKeys[m];
                    var serverData = streamsByServer[serverKey];
                    
                    var formatted = formatToNuvioStreams(
                        { streams: serverData.streams, subtitles: uniqueSubs },
                        mediaTitle,
                        serverKey
                    );
                    
                    formattedStreams = formattedStreams.concat(formatted);
                }
                
                // Deduplicate streams by URL
                var uniqueStreams = [];
                var seenUrls = {};
                
                for (var n = 0; n < formattedStreams.length; n++) {
                    var stream = formattedStreams[n];
                    if (stream && stream.url && !seenUrls[stream.url]) {
                        seenUrls[stream.url] = true;
                        uniqueStreams.push(stream);
                    }
                }
                
                // Sort by quality and priority
                uniqueStreams.sort(function(a, b) {
                    var qualityDiff = (QUALITY_ORDER[b.quality] || 0) - (QUALITY_ORDER[a.quality] || 0);
                    if (qualityDiff !== 0) return qualityDiff;
                    
                    var aServerName = (a.name.match(/HIANIMEZ (\w+) -/) || [])[1] || '';
                    var bServerName = (b.name.match(/HIANIMEZ (\w+) -/) || [])[1] || '';
                    
                    var aPriority = SERVER_PRIORITY[aServerName.toLowerCase()] || 0;
                    var bPriority = SERVER_PRIORITY[bServerName.toLowerCase()] || 0;
                    
                    return bPriority - aPriority;
                });
                
                logRid(rid, '========== STREAM EXTRACTION COMPLETE ==========');
                logRid(rid, 'Final result', {
                    total: uniqueStreams.length,
                    qualities: uniqueStreams.map(function(s) { return s.quality; }),
                    servers: uniqueStreams.map(function(s) { 
                        return (s.name.match(/HIANIMEZ (\w+) -/) || [])[1]; 
                    })
                });
                
                return uniqueStreams;
            });
        })
        .catch(function(err) {
            logRid(rid, '========== ERROR ==========');
            logRid(rid, 'Fatal error:', err.message);
            console.error('[HiAnimeZ] Stack trace:', err.stack);
            return [];
        });
}

// ==================== EXPORT ====================

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}

// Export for browser/global scope
if (typeof window !== 'undefined') {
    window.HiAnimeZScraper = { getStreams: getStreams };
}

// ==================== USAGE EXAMPLE ====================

/*

// Example usage:
getStreams('12345', 'tv', 1, 5)
    .then(function(streams) {
        console.log('Found ' + streams.length + ' streams');
        
        streams.forEach(function(stream) {
            console.log('Stream:', {
                name: stream.name,
                quality: stream.quality,
                url: stream.url,
                type: stream.type,
                subtitles: stream.subtitles.length
            });
        });
    })
    .catch(function(err) {
        console.error('Error:', err);
    });

// Expected output format:
[
    {
        name: 'HIANIMEZ VIDSTREAMING - 1080p',
        title: 'Attack on Titan S01E05',
        url: 'https://example.com/stream.m3u8',
        quality: '1080p',
        size: 'Unknown',
        headers: {
            'User-Agent': '...',
            'Referer': '...',
            // ... other headers
        },
        subtitles: [
            {
                language: 'English',
                url: 'https://example.com/subs.vtt',
                default: true
            }
        ],
        provider: 'hianimez',
        type: 'm3u8'
    },
    // ... more streams
]

*/