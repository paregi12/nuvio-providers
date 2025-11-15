/**
 * AnimeKai Scraper for Nuvio Local Scrapers
 * @author paregi12
 * @version 3.0.0
 * 
 * Features:
 * - TMDB + Kitsu integration for accurate title mapping
 * - Subtitle extraction and formatting
 * - Sub/Softsub/Dub support
 * - Server 1 & Server 2
 * - Multiple quality variants with M3U8 parsing
 * - Advanced season/episode mapping
 */

const cheerio = require('cheerio-without-node-native');

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const API_BASE = "https://animekai.to";
const ENC_DEC_API = "https://enc-dec.app/api";
const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const KITSU_BASE_URL = 'https://kitsu.io/api/edge';

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Referer": `${API_BASE}/`,
    "Connection": "keep-alive"
};

const STREAM_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
};

const KITSU_HEADERS = {
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json'
};

const SERVERS = ["Server 1", "Server 2"];
const TYPES = ["sub", "softsub", "dub"];

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

function normalizeQuery(query) {
    return query
        .replace(/\b(\d+)(st|nd|rd|th)\b/g, "$1")
        .replace(/\s+/g, " ")
        .replace(/(\d+)\s*Season/i, "$1")
        .replace(/Season\s*(\d+)/i, "$1")
        .trim();
}

function buildMediaTitle(info, season, episode) {
    if (!info || !info.title) return '';
    const s = String(season).padStart(2, '0');
    const e = String(episode).padStart(2, '0');
    return `${info.title} S${s}E${e}`;
}

function cleanJsonHtml(jsonHtml) {
    if (!jsonHtml) return "";
    return jsonHtml
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\")
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r");
}

// ═══════════════════════════════════════════════════════════
// M3U8 Parsing Utilities
// ═══════════════════════════════════════════════════════════

function parseM3U8Master(content, baseUrl) {
    const lines = content.split('\n');
    const streams = [];
    let current = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        if (line.indexOf('#EXT-X-STREAM-INF:') === 0) {
            current = { bandwidth: null, resolution: null, url: null };
            const bw = line.match(/BANDWIDTH=(\d+)/);
            if (bw) current.bandwidth = parseInt(bw[1]);
            const res = line.match(/RESOLUTION=(\d+x\d+)/);
            if (res) current.resolution = res[1];
        } else if (current && line[0] !== '#') {
            current.url = resolveUrlRelative(line, baseUrl);
            streams.push(current);
            current = null;
        }
    }
    return streams;
}

function resolveUrlRelative(url, baseUrl) {
    if (url.indexOf('http') === 0) return url;
    try { return new URL(url, baseUrl).toString(); } catch (e) { return url; }
}

function qualityFromResolution(resolution) {
    if (!resolution) return 'Unknown';
    const h = parseInt(String(resolution).split('x')[1]);
    if (h >= 2160) return '4K';
    if (h >= 1440) return '1440p';
    if (h >= 1080) return '1080p';
    if (h >= 720) return '720p';
    if (h >= 480) return '480p';
    if (h >= 360) return '360p';
    return '240p';
}

// ═══════════════════════════════════════════════════════════
// TMDB Integration
// ═══════════════════════════════════════════════════════════

function getTMDBDetails(tmdbId) {
    return new Promise((resolve, reject) => {
        const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
        console.log(`[AnimeKai] Fetching TMDB: ${tmdbId}`);
        
        fetch(url, { headers: HEADERS })
            .then(res => res.json())
            .then(data => {
                const title = data.name || data.original_name;
                const releaseDate = data.first_air_date;
                const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
                
                console.log(`[AnimeKai] TMDB: ${title} (${year})`);
                resolve({ title: title, year: year });
            })
            .catch(error => {
                console.error(`[AnimeKai] TMDB error:`, error);
                reject('Failed to get TMDB details');
            });
    });
}

function getTMDBSeasonInfo(tmdbId, season) {
    return new Promise((resolve) => {
        const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${season}?api_key=${TMDB_API_KEY}`;
        
        fetch(url, { headers: HEADERS })
            .then(res => res.json())
            .then(data => {
                resolve({
                    name: data.name,
                    episodeCount: data.episodes ? data.episodes.length : 0,
                    seasonNumber: data.season_number
                });
            })
            .catch(() => {
                resolve({ name: null, episodeCount: 0, seasonNumber: season });
            });
    });
}

// ═══════════════════════════════════════════════════════════
// Kitsu Integration
// ═══════════════════════════════════════════════════════════

function searchKitsu(animeTitle) {
    return new Promise((resolve) => {
        const searchUrl = `${KITSU_BASE_URL}/anime?filter[text]=${encodeURIComponent(animeTitle)}&page[limit]=5`;
        console.log(`[AnimeKai] Searching Kitsu: ${animeTitle}`);
        
        fetch(searchUrl, { headers: KITSU_HEADERS })
            .then(res => res.json())
            .then(response => {
                const results = response.data || [];
                const normalizedQuery = animeTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();
                
                const filtered = results.filter(entry => {
                    const canonical = (entry.attributes.canonicalTitle || '').toLowerCase().replace(/[^\w\s]/g, '');
                    const english = (entry.attributes.titles && entry.attributes.titles.en || '').toLowerCase().replace(/[^\w\s]/g, '');
                    return canonical.includes(normalizedQuery) || english.includes(normalizedQuery) || normalizedQuery.includes(canonical);
                });
                
                console.log(`[AnimeKai] Kitsu found ${filtered.length} matches`);
                resolve(filtered);
            })
            .catch(error => {
                console.log(`[AnimeKai] Kitsu error: ${error.message}`);
                resolve([]);
            });
    });
}

// ═══════════════════════════════════════════════════════════
// Encryption/Decryption
// ═══════════════════════════════════════════════════════════

function encryptKai(text) {
    return fetch(`${ENC_DEC_API}/enc-kai?text=${encodeURIComponent(text)}`)
        .then(res => res.json())
        .then(json => json.result);
}

function decryptKai(text) {
    return fetch(`${ENC_DEC_API}/dec-kai`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
    })
        .then(res => res.json())
        .then(json => json.result);
}

function decryptMega(encryptedText, userAgent) {
    const postData = {
        text: encryptedText,
        agent: userAgent || HEADERS["User-Agent"]
    };
    
    return fetch(`${ENC_DEC_API}/dec-mega`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
    })
        .then(res => res.json());
}

// ═══════════════════════════════════════════════════════════
// AnimeKai API Functions
// ═══════════════════════════════════════════════════════════

function searchAnime(query) {
    return new Promise((resolve, reject) => {
        const normalizedQuery = normalizeQuery(query);
        const url = `${API_BASE}/browser?keyword=${encodeURIComponent(normalizedQuery)}`;
        
        console.log(`[AnimeKai] Searching: ${normalizedQuery}`);
        
        fetch(url, { headers: HEADERS })
            .then(res => res.text())
            .then(html => {
                const $ = cheerio.load(html);
                const results = [];
                
                $('div.aitem-wrapper>div.aitem').each((_, elem) => {
                    const $elem = $(elem);
                    const href = $elem.find('a.poster').attr('href');
                    const title = $elem.find('a.title').attr('title');
                    
                    if (href && title) {
                        const id = href.slice(1);
                        results.push({
                            id: id,
                            title: title,
                            url: `${API_BASE}/${id}`
                        });
                    }
                });
                
                console.log(`[AnimeKai] Found ${results.length} results`);
                resolve(results);
            })
            .catch(reject);
    });
}

function pickResultForSeason(results, season, tmdbId) {
    return new Promise((resolve) => {
        if (!results || results.length === 0) {
            resolve(null);
            return;
        }
        
        if (!season || season === 1) {
            resolve(results[0]);
            return;
        }
        
        const seasonStr = String(season);
        
        // Try title-based matching first
        for (let i = 0; i < results.length; i++) {
            const title = (results[i].title || '').toLowerCase();
            if (title.includes('season ' + seasonStr) || title.includes('s' + seasonStr)) {
                console.log(`[AnimeKai] Matched by title: ${results[i].title}`);
                resolve(results[i]);
                return;
            }
        }
        
        // Try TMDB episode count matching
        if (tmdbId && season > 1) {
            getTMDBSeasonInfo(tmdbId, season)
                .then(seasonInfo => {
                    if (seasonInfo.episodeCount > 0) {
                        // Would need episode count from AnimeKai for accurate matching
                        // For now, fallback to first result
                        console.log(`[AnimeKai] Using fallback (first result)`);
                        resolve(results[0]);
                    } else {
                        resolve(results[0]);
                    }
                })
                .catch(() => resolve(results[0]));
        } else {
            resolve(results[0]);
        }
    });
}

function getAnimeId(animeUrl) {
    return new Promise((resolve, reject) => {
        console.log(`[AnimeKai] Getting anime ID from: ${animeUrl}`);
        
        fetch(animeUrl, { headers: HEADERS })
            .then(res => res.text())
            .then(html => {
                const $ = cheerio.load(html);
                const dataId = $('div[data-id]').first().attr('data-id');
                
                if (!dataId) {
                    throw new Error('Anime ID not found');
                }
                
                console.log(`[AnimeKai] Anime ID: ${dataId}`);
                resolve(dataId);
            })
            .catch(reject);
    });
}

function findEpisodes(animeId) {
    return new Promise((resolve, reject) => {
        console.log(`[AnimeKai] Finding episodes for: ${animeId}`);
        
        encryptKai(animeId)
            .then(token => {
                const url = `${API_BASE}/ajax/episodes/list?ani_id=${animeId}&_=${token}`;
                return fetch(url, { headers: HEADERS });
            })
            .then(res => res.json())
            .then(response => {
                const $ = cheerio.load(response.result);
                const episodes = [];
                
                $('ul.range>li>a').each((_, elem) => {
                    const $elem = $(elem);
                    const num = $elem.attr('num');
                    const token = $elem.attr('token');
                    const title = $elem.find('span').text().trim();
                    
                    if (num && token) {
                        episodes.push({
                            number: parseInt(num, 10),
                            token: token,
                            title: title || `Episode ${num}`
                        });
                    }
                });
                
                console.log(`[AnimeKai] Found ${episodes.length} episodes`);
                resolve(episodes);
            })
            .catch(reject);
    });
}

function getEpisodeServers(episodeToken) {
    return new Promise((resolve, reject) => {
        console.log(`[AnimeKai] Getting servers for token`);
        
        encryptKai(episodeToken)
            .then(enc => {
                const url = `${API_BASE}/ajax/links/list?token=${episodeToken}&_=${enc}`;
                return fetch(url, { headers: HEADERS });
            })
            .then(res => res.json())
            .then(response => {
                const cleanedHtml = cleanJsonHtml(response.result);
                const $ = cheerio.load(cleanedHtml);
                
                const servers = [];
                
                $('div.server-items[data-id]').each((_, typeElm) => {
                    const $typeElm = $(typeElm);
                    const type = $typeElm.attr('data-id');
                    
                    if (!TYPES.includes(type)) return;
                    
                    $typeElm.find('span.server[data-lid]').each((_, serverElm) => {
                        const $serverElm = $(serverElm);
                        const serverId = $serverElm.attr('data-lid');
                        const serverName = $serverElm.text().trim();
                        
                        if (SERVERS.includes(serverName)) {
                            servers.push({
                                type: type,
                                serverId: serverId,
                                serverName: serverName
                            });
                        }
                    });
                });
                
                console.log(`[AnimeKai] Found ${servers.length} server(s)`);
                resolve(servers);
            })
            .catch(reject);
    });
}

function extractIframe(server) {
    return new Promise((resolve, reject) => {
        const { type, serverId, serverName } = server;
        
        console.log(`[AnimeKai] Extracting iframe: ${serverName} (${type})`);
        
        encryptKai(serverId)
            .then(enc => {
                const url = `${API_BASE}/ajax/links/view?id=${serverId}&_=${enc}`;
                return fetch(url, { headers: HEADERS });
            })
            .then(res => res.json())
            .then(response => {
                const encodedLink = response.result;
                return decryptKai(encodedLink);
            })
            .then(decrypted => {
                const iframe = decrypted.url;
                
                const typeSuffix = type === "sub" ? "Hard Sub" :
                                 type === "softsub" ? "Soft Sub" :
                                 type === "dub" ? "Dub & S-Sub" : type;
                
                console.log(`[AnimeKai] Iframe URL obtained`);
                
                resolve({
                    iframe: iframe,
                    serverName: `${serverName} | [${typeSuffix}]`,
                    type: type
                });
            })
            .catch(reject);
    });
}

function extractVideo(videoData) {
    return new Promise((resolve, reject) => {
        const { iframe, serverName } = videoData;
        
        console.log(`[AnimeKai] Extracting video: ${serverName}`);
        
        const mediaUrl = iframe.replace('/e/', '/media/');
        
        fetch(mediaUrl, { headers: STREAM_HEADERS })
            .then(res => res.json())
            .then(mediaJson => {
                const encryptedResult = mediaJson.result;
                return decryptMega(encryptedResult, HEADERS["User-Agent"]);
            })
            .then(finalJson => {
                if (!finalJson || finalJson.status !== 200) {
                    throw new Error('Failed to decrypt stream');
                }
                
                if (!finalJson.result || !finalJson.result.sources || finalJson.result.sources.length === 0) {
                    throw new Error('No sources found');
                }
                
                const m3u8Link = finalJson.result.sources[0].file;
                
                // Extract subtitles
                const subtitles = (finalJson.result.tracks || [])
                    .filter(t => t.kind === "captions" && t.file && t.file.endsWith('.vtt'))
                    .map((track, index) => ({
                        id: `sub-${index}`,
                        language: track.label || 'Unknown',
                        url: track.file,
                        isDefault: !!track.default
                    }));
                
                console.log(`[AnimeKai] Found ${subtitles.length} subtitle track(s)`);
                
                // Fetch playlist to get quality variants
                return fetch(m3u8Link)
                    .then(res => res.text())
                    .then(playlistText => ({
                        playlistText: playlistText,
                        m3u8Link: m3u8Link,
                        serverName: serverName,
                        subtitles: subtitles
                    }));
            })
            .then(({ playlistText, m3u8Link, serverName, subtitles }) => {
                const videoSources = [];
                const regex = /#EXT-X-STREAM-INF:BANDWIDTH=\d+,RESOLUTION=(\d+x\d+)\s*(.*)/g;
                let match;
                
                while ((match = regex.exec(playlistText)) !== null) {
                    const resolution = match[1];
                    const path = match[2].trim();
                    
                    if (!path) continue;
                    
                    let fullUrl = "";
                    if (path.includes("list")) {
                        fullUrl = `${m3u8Link.split(',')[0]}/${path}`;
                    } else {
                        fullUrl = `${m3u8Link.split('/list')[0]}/${path}`;
                    }
                    
                    const quality = qualityFromResolution(resolution);
                    
                    videoSources.push({
                        url: fullUrl,
                        quality: quality,
                        serverName: serverName,
                        subtitles: subtitles
                    });
                }
                
                console.log(`[AnimeKai] Extracted ${videoSources.length} quality variant(s)`);
                resolve(videoSources);
            })
            .catch(reject);
    });
}

// ═══════════════════════════════════════════════════════════
// Main Nuvio Export Function
// ═══════════════════════════════════════════════════════════

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise((resolve, reject) => {
        
        if (mediaType !== 'tv') {
            console.log('[AnimeKai] Only TV shows supported');
            resolve([]);
            return;
        }

        console.log(`[AnimeKai] Request: TMDB ${tmdbId}, S${seasonNum}E${episodeNum}`);

        let tmdbInfo = null;

        // Step 1: Get TMDB details
        getTMDBDetails(tmdbId)
            .then(info => {
                tmdbInfo = info;
                if (!info.title) throw new Error("No TMDB title");
                
                // Step 2: Try Kitsu for better title
                return searchKitsu(info.title)
                    .then(kitsuResults => {
                        if (kitsuResults && kitsuResults.length > 0) {
                            const kitsuTitle = kitsuResults[0].attributes.titles.en || 
                                             kitsuResults[0].attributes.canonicalTitle;
                            console.log(`[AnimeKai] Using Kitsu title: ${kitsuTitle}`);
                            return searchAnime(kitsuTitle);
                        }
                        // Fallback to TMDB title
                        return searchAnime(info.title);
                    })
                    .catch(() => searchAnime(info.title));
            })
            .then(searchResults => {
                if (!searchResults || searchResults.length === 0) {
                    throw new Error(`No results for "${tmdbInfo.title}"`);
                }
                
                // Step 3: Pick best result for season
                return pickResultForSeason(searchResults, seasonNum, tmdbId);
            })
            .then(anime => {
                if (!anime) throw new Error("No anime selected");
                
                console.log(`[AnimeKai] Selected: ${anime.title}`);
                
                // Step 4: Get anime ID
                return getAnimeId(anime.url);
            })
            .then(animeId => {
                // Step 5: Get episodes
                return findEpisodes(animeId);
            })
            .then(episodes => {
                if (!episodes || episodes.length === 0) {
                    throw new Error("No episodes found");
                }
                
                const targetEpisode = episodes.find(ep => ep.number === episodeNum);
                
                if (!targetEpisode) {
                    throw new Error(`Episode ${episodeNum} not found`);
                }
                
                console.log(`[AnimeKai] Episode ${episodeNum}: ${targetEpisode.title}`);
                
                // Step 6: Get servers
                return getEpisodeServers(targetEpisode.token);
            })
            .then(servers => {
                if (servers.length === 0) {
                    throw new Error("No servers found");
                }
                
                // Step 7: Extract iframes from all servers
                const iframePromises = servers.map(server => {
                    return extractIframe(server)
                        .catch(err => {
                            console.log(`[AnimeKai] ${server.serverName} failed: ${err.message}`);
                            return null;
                        });
                });
                
                return Promise.all(iframePromises);
            })
            .then(iframeResults => {
                const validIframes = iframeResults.filter(r => r !== null);
                
                if (validIframes.length === 0) {
                    throw new Error("No valid iframes");
                }
                
                // Step 8: Extract videos from all iframes
                const videoPromises = validIframes.map(iframe => {
                    return extractVideo(iframe)
                        .catch(err => {
                            console.log(`[AnimeKai] Video extraction failed: ${err.message}`);
                            return [];
                        });
                });
                
                return Promise.all(videoPromises);
            })
            .then(videoResults => {
                const allVideos = [];
                
                videoResults.forEach(videos => {
                    if (Array.isArray(videos)) {
                        allVideos.push(...videos);
                    }
                });
                
                if (allVideos.length === 0) {
                    throw new Error("No videos extracted");
                }
                
                // Step 9: Format to Nuvio streams
                const mediaTitle = buildMediaTitle(tmdbInfo, seasonNum, episodeNum);
                const streams = allVideos.map(video => ({
                    name: `AnimeKai ${video.serverName} - ${video.quality}`,
                    title: mediaTitle,
                    url: video.url,
                    quality: video.quality,
                    size: "Unknown",
                    headers: STREAM_HEADERS,
                    provider: "animekai",
                    subtitles: video.subtitles || []
                }));
                
                console.log(`[AnimeKai] Success! ${streams.length} stream(s) with subtitles`);
                resolve(streams);
            })
            .catch(error => {
                console.error(`[AnimeKai] Error: ${error.message}`);
                resolve([]);
            });
    });
}

// ═══════════════════════════════════════════════════════════
// React Native Export
// ═══════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
