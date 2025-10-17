// HiAnimeZ Scraper - DEBUG VERSION
// This version includes extensive logging to identify playback issues

// ==================== CONFIGURATION ====================

const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const HIANIMEZ_BASE = 'https://hianimez.to';
const HIANIMEZ_AJAX = 'https://hianimez.to/ajax';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://hianimez.to/',
    'Origin': 'https://hianimez.to'
};

const QUALITY_ORDER = {
    '4K': 10, '2160p': 10, '1440p': 8, '1080p': 7, '720p': 5,
    '480p': 3, '360p': 2, '240p': 1, 'auto': 9, 'default': 6, 'Unknown': 0
};

const SERVER_PRIORITY = {
    'vidstreaming': 10, 'gogo': 9, 'megacloud': 8,
    'streamtape': 7, 'doodstream': 6, 'filemoon': 5, 'mp4upload': 4, 'default': 3
};

// ==================== UTILITY FUNCTIONS ====================

function fetchRequest(url, options) {
    var merged = Object.assign({ method: 'GET', headers: HEADERS }, options || {});
    console.log('[FETCH]', url);
    
    return fetch(url, merged)
        .then(function(response) {
            console.log('[RESPONSE]', response.status, url);
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }
            return response;
        })
        .catch(function(err) {
            console.error('[FETCH ERROR]', url, err.message);
            throw err;
        });
}

function createRequestId() {
    return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-6);
}

function logRid(rid, msg, extra) {
    var prefix = '[HiAnimeZ][' + rid + '] ';
    if (extra) {
        console.log(prefix + msg, JSON.stringify(extra, null, 2));
    } else {
        console.log(prefix + msg);
    }
}

function sleep(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

function extractQualityFromUrl(url) {
    if (!url) return 'Unknown';
    var lower = url.toLowerCase();
    if (lower.indexOf('4k') !== -1 || lower.indexOf('2160') !== -1) return '4K';
    if (lower.indexOf('1440') !== -1) return '1440p';
    if (lower.indexOf('1080') !== -1) return '1080p';
    if (lower.indexOf('720') !== -1) return '720p';
    if (lower.indexOf('480') !== -1) return '480p';
    if (lower.indexOf('360') !== -1) return '360p';
    return 'Unknown';
}

function normalizeTitle(title) {
    if (!title) return '';
    return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function calculateSimilarity(str1, str2) {
    var s1 = normalizeTitle(str1);
    var s2 = normalizeTitle(str2);
    if (s1 === s2) return 1.0;
    if (s1.indexOf(s2) !== -1 || s2.indexOf(s1) !== -1) return 0.8;
    return 0.5;
}

// ==================== VALIDATION FUNCTIONS ====================

function isValidVideoUrl(url) {
    if (!url || typeof url !== 'string') {
        console.warn('[VALIDATION] Invalid URL type:', typeof url);
        return false;
    }
    
    // Must start with http/https
    if (url.indexOf('http') !== 0) {
        console.warn('[VALIDATION] URL missing protocol:', url);
        return false;
    }
    
    // Must not be an embed page
    if (url.indexOf('/embed/') !== -1 || url.indexOf('/e/') !== -1) {
        console.warn('[VALIDATION] URL is embed page, not video:', url);
        return false;
    }
    
    // Check for video extensions or HLS
    var hasVideoExt = url.indexOf('.m3u8') !== -1 || 
                      url.indexOf('.mp4') !== -1 || 
                      url.indexOf('.mkv') !== -1;
    
    if (!hasVideoExt) {
        console.warn('[VALIDATION] URL missing video extension:', url);
    }
    
    console.log('[VALIDATION] ✓ Valid video URL:', url.substring(0, 60) + '...');
    return true;
}

function validateStreamObject(stream) {
    if (!stream) {
        console.error('[STREAM VALIDATION] Stream is null/undefined');
        return false;
    }
    
    if (!stream.url) {
        console.error('[STREAM VALIDATION] Stream missing URL');
        return false;
    }
    
    if (!isValidVideoUrl(stream.url)) {
        console.error('[STREAM VALIDATION] Invalid video URL:', stream.url);
        return false;
    }
    
    console.log('[STREAM VALIDATION] ✓ Valid stream:', {
        url: stream.url.substring(0, 50),
        quality: stream.quality,
        type: stream.type
    });
    
    return true;
}

// ==================== TMDB FUNCTIONS ====================

function getTMDBDetails(tmdbId, mediaType) {
    var url = TMDB_BASE_URL + '/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY;
    
    return fetchRequest(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            return {
                title: data.name,
                year: data.first_air_date ? parseInt(data.first_air_date.split('-')[0]) : null,
                originalTitle: data.original_name
            };
        });
}

// ==================== HIANIMEZ SCRAPING ====================

function searchHiAnimeZ(query) {
    var searchUrl = HIANIMEZ_BASE + '/search?keyword=' + encodeURIComponent(query);
    
    return fetchRequest(searchUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            var itemPattern = /<div[^>]*class="[^"]*film_list-wrap[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
            var items = html.match(itemPattern) || [];
            
            console.log('[SEARCH] Found', items.length, 'results');
            
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var urlMatch = item.match(/href="([^"]*)"/);
                var titleMatch = item.match(/data-tip="([^"]*)"|title="([^"]*)"/);
                
                if (urlMatch && titleMatch) {
                    var result = {
                        title: (titleMatch[1] || titleMatch[2]).trim(),
                        url: urlMatch[1].indexOf('http') === 0 ? urlMatch[1] : HIANIMEZ_BASE + urlMatch[1]
                    };
                    results.push(result);
                    console.log('[SEARCH] Result ' + (i+1) + ':', result.title);
                }
            }
            
            return results;
        });
}

function getAnimeDetails(animeUrl) {
    return fetchRequest(animeUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var idMatch = html.match(/data-id="(\d+)"|anime-id="(\d+)"/);
            var titleMatch = html.match(/<h1[^>]*class="[^"]*film-name[^"]*"[^>]*>([^<]*)</);
            
            var details = {
                animeId: idMatch ? (idMatch[1] || idMatch[2]) : null,
                title: titleMatch ? titleMatch[1].trim() : null
            };
            
            console.log('[ANIME DETAILS]', details);
            return details;
        });
}

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
                
                console.log('[SERVER FOUND]', serverName, '(ID:', serverId + ')');
            }
            
            servers.sort(function(a, b) { return b.priority - a.priority; });
            return servers;
        });
}

// ==================== EMBED EXTRACTION ====================

function extractVidStreamingSources(embedUrl, rid) {
    logRid(rid, 'Extracting VidStreaming', { url: embedUrl });
    
    return fetchRequest(embedUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var sources = { streams: [], subtitles: [] };
            
            // Method 1: Extract from sources array
            var sourcesPattern = /sources:\s*\[\s*\{[^}]*file:\s*["']([^"']+)["']/g;
            var match;
            while ((match = sourcesPattern.exec(html)) !== null) {
                var url = match[1];
                if (isValidVideoUrl(url)) {
                    sources.streams.push({
                        url: url,
                        quality: 'auto',
                        type: 'm3u8'
                    });
                    logRid(rid, '✓ Found source from config', { url: url.substring(0, 60) });
                }
            }
            
            // Method 2: Direct M3U8 search
            var m3u8Pattern = /(https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*)/g;
            var m3u8s = html.match(m3u8Pattern) || [];
            
            for (var i = 0; i < m3u8s.length; i++) {
                var url = m3u8s[i].replace(/['"\\]/g, '');
                if (isValidVideoUrl(url) && !sources.streams.some(function(s) { return s.url === url; })) {
                    sources.streams.push({
                        url: url,
                        quality: 'auto',
                        type: 'm3u8'
                    });
                    logRid(rid, '✓ Found M3U8', { url: url.substring(0, 60) });
                }
            }
            
            logRid(rid, 'VidStreaming complete', { streams: sources.streams.length });
            return sources;
        })
        .catch(function(err) {
            logRid(rid, '✗ VidStreaming failed', { error: err.message });
            return { streams: [], subtitles: [] };
        });
}

function extractGenericSources(embedUrl, rid) {
    logRid(rid, 'Extracting generic', { url: embedUrl });
    
    return fetchRequest(embedUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var sources = { streams: [], subtitles: [] };
            
            var patterns = [
                /sources:\s*\[\s*\{\s*(?:file|src):\s*["']([^"']+)["']/g,
                /(https?:\/\/[^\s"'\\]+\.m3u8[^\s"'\\]*)/g,
                /(https?:\/\/[^\s"'\\]+\.mp4[^\s"'\\]*)/g
            ];
            
            for (var i = 0; i < patterns.length; i++) {
                var match;
                while ((match = patterns[i].exec(html)) !== null) {
                    var url = match[1].replace(/['"\\]/g, '');
                    if (isValidVideoUrl(url) && !sources.streams.some(function(s) { return s.url === url; })) {
                        sources.streams.push({
                            url: url,
                            quality: extractQualityFromUrl(url),
                            type: url.indexOf('.m3u8') !== -1 ? 'm3u8' : 'mp4'
                        });
                    }
                }
            }
            
            logRid(rid, 'Generic extraction complete', { streams: sources.streams.length });
            return sources;
        })
        .catch(function(err) {
            logRid(rid, '✗ Generic extraction failed', { error: err.message });
            return { streams: [], subtitles: [] };
        });
}

function extractFromEmbed(embedUrl, rid) {
    if (!embedUrl) return Promise.resolve({ streams: [], subtitles: [] });
    
    var lower = embedUrl.toLowerCase();
    
    if (lower.indexOf('gogo') !== -1 || lower.indexOf('vidstreaming') !== -1) {
        return extractVidStreamingSources(embedUrl, rid);
    }
    
    return extractGenericSources(embedUrl, rid);
}

function extractServerSource(serverId, rid) {
    var url = HIANIMEZ_AJAX + '/v2/episode/sources?id=' + serverId;
    
    logRid(rid, 'Fetching server source', { serverId: serverId });
    
    return fetchRequest(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            logRid(rid, 'Server API response', { 
                hasLink: !!data.link,
                hasSources: !!(data.sources && data.sources.length)
            });
            
            var sources = { streams: [], subtitles: [] };
            
            // Extract from API sources first
            if (data.sources && Array.isArray(data.sources)) {
                for (var i = 0; i < data.sources.length; i++) {
                    var src = data.sources[i];
                    if (src.file && isValidVideoUrl(src.file)) {
                        sources.streams.push({
                            url: src.file,
                            quality: src.label || extractQualityFromUrl(src.file),
                            type: src.file.indexOf('.m3u8') !== -1 ? 'm3u8' : 'mp4'
                        });
                        logRid(rid, '✓ API source added', { url: src.file.substring(0, 60) });
                    }
                }
            }
            
            // Extract from embed
            if (data.link) {
                logRid(rid, 'Extracting from embed', { embedUrl: data.link });
                
                return extractFromEmbed(data.link, rid).then(function(embedSources) {
                    if (embedSources.streams.length > 0) {
                        logRid(rid, '✓ Embed extraction successful', { 
                            streams: embedSources.streams.length 
                        });
                        
                        // Validate each stream
                        for (var j = 0; j < embedSources.streams.length; j++) {
                            if (validateStreamObject(embedSources.streams[j])) {
                                sources.streams.push(embedSources.streams[j]);
                            }
                        }
                    } else {
                        logRid(rid, '✗ No streams from embed');
                    }
                    
                    if (sources.streams.length === 0) {
                        logRid(rid, '⚠ WARNING: No valid streams found!');
                    }
                    
                    return sources;
                });
            }
            
            return sources;
        })
        .catch(function(err) {
            logRid(rid, '✗ Server extraction failed', { error: err.message });
            return { streams: [], subtitles: [] };
        });
}

// ==================== MAIN FUNCTION ====================

function getStreams(tmdbId, mediaType, season, episode) {
    if (mediaType !== 'tv') {
        console.log('[REJECTED] Only TV shows supported, got:', mediaType);
        return Promise.resolve([]);
    }
    
    var rid = createRequestId();
    var mediaInfo = null;
    
    console.log('\n========================================');
    console.log('HiAnimeZ Scraper - Debug Mode');
    console.log('Request ID:', rid);
    console.log('========================================\n');
    
    logRid(rid, 'START', { tmdbId: tmdbId, season: season, episode: episode });
    
    return getTMDBDetails(tmdbId, 'tv')
        .then(function(info) {
            mediaInfo = info;
            logRid(rid, 'TMDB Info', { title: info.title, year: info.year });
            return sleep(500);
        })
        .then(function() {
            return searchHiAnimeZ(mediaInfo.title);
        })
        .then(function(results) {
            if (results.length === 0) throw new Error('No search results');
            logRid(rid, 'Best match', { title: results[0].title, url: results[0].url });
            return sleep(500).then(function() { return results[0]; });
        })
        .then(function(match) {
            return getAnimeDetails(match.url);
        })
        .then(function(details) {
            if (!details.animeId) throw new Error('No anime ID found');
            logRid(rid, 'Anime ID', { id: details.animeId });
            return sleep(500).then(function() { 
                return getEpisodeServers(details.animeId, episode); 
            });
        })
        .then(function(servers) {
            if (servers.length === 0) throw new Error('No servers found');
            logRid(rid, 'Servers', { count: servers.length });
            
            // Try first server only for debugging
            return extractServerSource(servers[0].id, rid).then(function(sources) {
                return [{
                    serverName: servers[0].name,
                    sources: sources,
                    priority: servers[0].priority
                }];
            });
        })
        .then(function(results) {
            var allStreams = [];
            
            for (var i = 0; i < results.length; i++) {
                var result = results[i];
                var sources = result.sources || { streams: [] };
                
                for (var j = 0; j < sources.streams.length; j++) {
                    var stream = sources.streams[j];
                    if (validateStreamObject(stream)) {
                        allStreams.push({
                            url: stream.url,
                            quality: stream.quality,
                            serverName: result.serverName,
                            type: stream.type
                        });
                    }
                }
            }
            
            logRid(rid, 'Valid streams collected', { count: allStreams.length });
            
            if (allStreams.length === 0) {
                logRid(rid, '⚠⚠⚠ CRITICAL: No valid streams found! ⚠⚠⚠');
                return [];
            }
            
            // Format for Nuvio
            var formatted = [];
            for (var k = 0; k < allStreams.length; k++) {
                var s = allStreams[k];
                var streamObj = {
                    name: 'HIANIMEZ ' + s.serverName.toUpperCase() + ' - ' + s.quality,
                    title: mediaInfo.title + ' S' + String(season).padStart(2, '0') + 'E' + String(episode).padStart(2, '0'),
                    url: s.url,
                    quality: s.quality,
                    size: 'Unknown',
                    headers: {
                        'User-Agent': HEADERS['User-Agent'],
                        'Referer': HIANIMEZ_BASE + '/',
                        'Origin': HIANIMEZ_BASE
                    },
                    subtitles: [],
                    provider: 'hianimez',
                    type: s.type
                };
                
                formatted.push(streamObj);
                
                console.log('\n[FINAL STREAM]', {
                    name: streamObj.name,
                    url: streamObj.url.substring(0, 80),
                    quality: streamObj.quality,
                    type: streamObj.type
                });
            }
            
            console.log('\n========================================');
            console.log('✓ SUCCESS: Returning', formatted.length, 'streams');
            console.log('========================================\n');
            
            return formatted;
        })
        .catch(function(err) {
            console.error('\n========================================');
            console.error('✗✗✗ FATAL ERROR ✗✗✗');
            console.error('Error:', err.message);
            console.error('Stack:', err.stack);
            console.error('========================================\n');
            return [];
        });
}

// ==================== EXPORT ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}

if (typeof window !== 'undefined') {
    window.HiAnimeZScraper = { getStreams: getStreams };
}

// ==================== TEST ====================

// Uncomment to test:
/*
getStreams('1429', 'tv', 1, 1).then(function(streams) {
    console.log('\n=== TEST RESULTS ===');
    console.log('Total streams:', streams.length);
    streams.forEach(function(s, i) {
        console.log((i+1) + '.', s.name);
        console.log('   URL:', s.url.substring(0, 100));
        console.log('   Type:', s.type);
    });
});
*/