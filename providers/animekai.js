// AnimeKai Scraper for Nuvio Local Scrapers
// React Native compatible (no Node core modules, Promise chain only)

// TMDB API Configuration (used to build nice titles)
const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Connection': 'keep-alive'
};

const API = 'https://enc-dec.app/api';
const KAI_AJAX = 'https://animekai.to/ajax';

// Kitsu API Configuration (for accurate season mapping)
const KITSU_BASE_URL = 'https://kitsu.io/api/edge';
const KITSU_HEADERS = {
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json'
};

// Dynamic Kitsu search patterns for season mapping

// Generic fetch helper that returns text or json based on caller usage
function fetchRequest(url, options) {
    const merged = Object.assign({ method: 'GET', headers: HEADERS }, options || {});
    return fetch(url, merged).then(function(response) {
        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ': ' + response.statusText);
        }
        return response;
    });
}

function encryptKai(text) {
    return fetchRequest(API + '/enc-kai?text=' + encodeURIComponent(text))
        .then(function(res) { return res.json(); })
        .then(function(json) { return json.result; });
}

function decryptKai(text) {
    return fetchRequest(API + '/dec-kai?text=' + encodeURIComponent(text), { method: 'POST' })
        .then(function(res) { return res.json(); })
        .then(function(json) { return json.result; });
}

function parseHtmlViaApi(html) {
    return fetchRequest(API + '/parse-html', {
        method: 'POST',
        headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ text: html })
    }).then(function(res) { return res.json(); })
      .then(function(json) { return json.result; });
}

function decryptMegaMedia(embedUrl) {
    var mediaUrl = embedUrl.replace('/e/', '/media/');
    return fetchRequest(mediaUrl)
        .then(function(res) { return res.json(); })
        .then(function(mediaResp) { return mediaResp.result; })
        .then(function(encrypted) {
            return fetchRequest(API + '/dec-mega', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/json' }),
                body: JSON.stringify({ text: encrypted, agent: HEADERS['User-Agent'] })
            }).then(function(res) { return res.json(); });
        })
        .then(function(json) { return json.result; });
}

// Simplified Kitsu search - just get the most relevant result
function searchKitsu(animeTitle) {
    const searchUrl = KITSU_BASE_URL + '/anime?filter[text]=' + encodeURIComponent(animeTitle);
    return fetchRequest(searchUrl, { headers: KITSU_HEADERS })
        .then(function(res) { return res.json(); })
        .then(function(response) {
            var results = response.data || [];
            // Simple filter: prefer exact title matches or high similarity
            var normalizedQuery = animeTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();
            return results.filter(function(entry) {
                var canonical = (entry.attributes.canonicalTitle || '').toLowerCase().replace(/[^\w\s]/g, '');
                var english = (entry.attributes.titles && entry.attributes.titles.en || '').toLowerCase().replace(/[^\w\s]/g, '');
                return canonical.includes(normalizedQuery) || english.includes(normalizedQuery) || normalizedQuery.includes(canonical);
            });
        });
}

function getAccurateAnimeKaiEntry(animeTitle, season, episode, tmdbId) {
    // Try Kitsu first, then fallback to direct search
    return searchKitsu(animeTitle).then(function(kitsuResults) {
        if (kitsuResults && kitsuResults.length > 0) {
            // Use Kitsu result to search AnimeKai
            var kitsuEntry = kitsuResults[0];
            var kitsuTitle = kitsuEntry.attributes.titles && kitsuEntry.attributes.titles.en ||
                            kitsuEntry.attributes.canonicalTitle;
            return searchAnimeByName(kitsuTitle).then(function(animeKaiResults) {
                return pickResultForSeason(animeKaiResults, season, tmdbId);
            });
        }
        // Fallback to direct AnimeKai search
        return searchAnimeByName(animeTitle).then(function(results) {
            return pickResultForSeason(results, season, tmdbId);
        });
    }).catch(function() {
        // Kitsu failed, use direct search
        return searchAnimeByName(animeTitle).then(function(results) {
            return pickResultForSeason(results, season, tmdbId);
        });
    });
}


// Quality helpers
function extractQualityFromUrl(url) {
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
            if (q >= 240 && q <= 4320) return q + 'p';
        }
    }
    return 'Unknown';
}

// M3U8 utilities (master/media playlist parsing)
function parseM3U8Master(content, baseUrl) {
    var lines = content.split('\n');
    var streams = [];
    var current = null;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        if (line.indexOf('#EXT-X-STREAM-INF:') === 0) {
            current = { bandwidth: null, resolution: null, url: null };
            var bw = line.match(/BANDWIDTH=(\d+)/);
            if (bw) current.bandwidth = parseInt(bw[1]);
            var res = line.match(/RESOLUTION=(\d+x\d+)/);
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

function resolveM3U8(url, serverType) {
    return fetchRequest(url, { headers: Object.assign({}, HEADERS, { 'Accept': 'application/vnd.apple.mpegurl,application/x-mpegURL,application/octet-stream,*/*' }) })
        .then(function(res) { return res.text(); })
        .then(function(content) {
            if (content.indexOf('#EXT-X-STREAM-INF') !== -1) {
                var variants = parseM3U8Master(content, url);
                var out = [];
                for (var i = 0; i < variants.length; i++) {
                    var q = qualityFromResolutionOrBandwidth(variants[i]);
                    out.push({ url: variants[i].url, quality: q, serverType: serverType });
                }
                // sort high to low
                var order = { '4K': 7, '2160p': 7, '1440p': 6, '1080p': 5, '720p': 4, '480p': 3, '360p': 2, '240p': 1, 'Unknown': 0 };
                out.sort(function(a,b){ return (order[b.quality]||0)-(order[a.quality]||0); });
                return { success: true, streams: out };
            }
            if (content.indexOf('#EXTINF:') !== -1) {
                // media playlist - keep as single
                return { success: true, streams: [{ url: url, quality: 'Unknown', serverType: serverType }] };
            }
            throw new Error('Invalid M3U8');
        })
        .catch(function(){ return { success: false, streams: [{ url: url, quality: 'Unknown', serverType: serverType }] }; });
}

function resolveMultipleM3U8(m3u8Links) {
    var promises = m3u8Links.map(function(link){ return resolveM3U8(link.url, link.serverType); });
    return Promise.allSettled(promises).then(function(results){
        var out = [];
        for (var i = 0; i < results.length; i++) {
            if (results[i].status === 'fulfilled' && results[i].value && results[i].value.streams) {
                out = out.concat(results[i].value.streams);
            }
        }
        return out;
    });
}

function buildMediaTitle(info, mediaType, season, episode, episodeInfo) {
    // Use extracted episode and season name if available
    if (episodeInfo && episodeInfo.seasonName) {
        if (episodeInfo.episode) {
            var e = String(episodeInfo.episode).padStart(2, '0');
            return episodeInfo.seasonName + ' E' + e;
        } else {
            // If we have season name but no episode, use the provided episode
            var e = String(episode).padStart(2, '0');
            return episodeInfo.seasonName + ' E' + e;
        }
    }

    if (!info || !info.title) return '';
    if (mediaType === 'tv' && season && episode) {
        var s = String(season).padStart(2, '0');
        var e = String(episode).padStart(2, '0');
        return info.title + ' S' + s + 'E' + e;
    }
    if (info.year) return info.title + ' (' + info.year + ')';
    return info.title;
}

// TMDB minimal info for display
function getTMDBDetails(tmdbId, mediaType) {
    var endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    var url = TMDB_BASE_URL + '/' + endpoint + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&append_to_response=external_ids';
    return fetchRequest(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var title = mediaType === 'tv' ? data.name : data.title;
            var releaseDate = mediaType === 'tv' ? data.first_air_date : data.release_date;
            var year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
            return {
                title: title,
                year: year
            };
        })
        .catch(function() { return { title: null, year: null }; });
}

// Search on animekai.to and return first matching slug URL
function searchAnimeByName(animeName) {
    var searchUrl = KAI_AJAX.replace('/ajax', '') + '/browser?keyword=' + encodeURIComponent(animeName);
    return fetchRequest(searchUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            // Simple pattern to find anime entries
            var pattern = /href="(\/watch\/[^\"]*)"[^>]*>[\s\S]*?<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*)<\/a>/g;
            var m;
            while ((m = pattern.exec(html)) !== null) {
                var href = m[1];
                var title = (m[2] || '').trim();
                if (href && title) {
                    results.push({
                        title: title,
                        url: (href.indexOf('http') === 0 ? href : KAI_AJAX.replace('/ajax', '') + href),
                        episodeCount: 0,
                        type: 'TV'
                    });
                }
            }
            return results;
        });
}

// Get TMDB season info for better mapping
function getTMDBSeasonInfo(tmdbId, season) {
    var url = TMDB_BASE_URL + '/tv/' + tmdbId + '/season/' + season + '?api_key=' + TMDB_API_KEY;
    return fetchRequest(url)
        .then(function(res) { return res.json(); })
        .then(function(seasonData) {
            return {
                name: seasonData.name,
                episodeCount: seasonData.episodes ? seasonData.episodes.length : 0,
                seasonNumber: seasonData.season_number
            };
        })
        .catch(function() {
            return { name: null, episodeCount: 0, seasonNumber: season };
        });
}

// Pick best search result for a given season (AnimeKai splits seasons by page)
function pickResultForSeason(results, season, tmdbId) {
    if (!results || results.length === 0) return Promise.resolve(null);
    if (!season || !Number.isFinite(season)) return Promise.resolve(results[0]);

    var seasonStr = String(season);
    var candidates = [];

    // Strong match: title explicitly contains "season {n}" (case-insensitive)
    for (var i = 0; i < results.length; i++) {
        var r = results[i];
        var t = (r.title || '').toLowerCase();
        if (t.indexOf('season ' + seasonStr) !== -1 || t.indexOf('s' + seasonStr) !== -1) {
            candidates.push({ r: r, score: 3 });
        }
    }

    // URL-based hints (e.g., -season-2, -s2)
    for (var j = 0; j < results.length; j++) {
        var r2 = results[j];
        var u = (r2.url || '').toLowerCase();
        if (u.indexOf('season-' + seasonStr) !== -1 || u.indexOf('-s' + seasonStr) !== -1 || u.indexOf('-season-' + seasonStr) !== -1) {
            candidates.push({ r: r2, score: 2 });
        }
    }

    // Try to match by episode count if we can get TMDB season info
    if (tmdbId && season > 1) {
        return getTMDBSeasonInfo(tmdbId, season).then(function(seasonInfo) {

            if (seasonInfo.episodeCount > 0) {
                // First, try exact episode count match
                for (var k = 0; k < results.length; k++) {
                    var r3 = results[k];
                    if (r3.episodeCount === seasonInfo.episodeCount) {
                        return r3;
                    }
                }

                // If no exact match, try close matches (±1 episode, for specials or variations)
                for (var m = 0; m < results.length; m++) {
                    var r4 = results[m];
                    if (Math.abs(r4.episodeCount - seasonInfo.episodeCount) <= 1 && r4.episodeCount > 0) {
                        return r4;
                    }
                }
            }

            // Fallback to existing logic
            if (candidates.length > 0) {
                candidates.sort(function(a,b){ return b.score - a.score; });
                return candidates[0].r;
            }

            // Fallback: if no explicit season marker found, try to avoid ones with 'season 1' when season > 1
            if (season > 1) {
                for (var l = 0; l < results.length; l++) {
                    var r5 = results[l];
                    var t5 = (r5.title || '').toLowerCase();
                    if (t5.indexOf('season 1') === -1 && t5.indexOf('s1') === -1) {
                        return r5;
                    }
                }
            }

            return results[0];
        }).catch(function() {
            // Fallback if TMDB call fails - still try episode count matching with available data
            for (var n = 0; n < results.length; n++) {
                var r6 = results[n];
                if (r6.episodeCount > 0) {
                    // Prefer results with episode count data
                    return r6;
                }
            }

            if (candidates.length > 0) {
                candidates.sort(function(a,b){ return b.score - a.score; });
                return candidates[0].r;
            }
            return results[0];
        });
    }

    // Return a promise for consistency
    return Promise.resolve(candidates.length > 0 ? candidates.sort(function(a,b){ return b.score - a.score; })[0].r : results[0]);
}

function extractEpisodeAndTitleFromHtml(html) {
    var episodeInfo = {
        episode: null,
        title: null,
        seasonName: null
    };

    // Extract episode number
    var episodeMatch = html.match(/You are watching <b>Episode (\d+)<\/b>/i) ||
                      html.match(/Episode (\d+)/i);
    if (episodeMatch) {
        episodeInfo.episode = parseInt(episodeMatch[1]);
    }

    // Extract season/title name
    var titleMatch = html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                    html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                    html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
        var title = titleMatch[1].trim().replace(/\s+/g, ' ').replace(/&[^;]+;/g, '');
        if (title && title.length > 3) {
            episodeInfo.seasonName = title;
        }
    }

    return episodeInfo;
}

function extractContentIdFromSlug(slugUrl) {
    return fetchRequest(slugUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var m1 = html.match(/<div[^>]*class="[^"]*rate-box[^"]*"[^>]*data-id="([^"]*)"/);
            var contentId = null;
            if (m1) {
                contentId = m1[1];
            } else {
                var m2 = html.match(/data-id="([^"]*)"/);
                if (m2) contentId = m2[1];
            }

            if (!contentId) {
                throw new Error('Could not find content ID');
            }

            // Extract episode and title information from the HTML
            var episodeInfo = extractEpisodeAndTitleFromHtml(html);

            return {
                contentId: contentId,
                episodeInfo: episodeInfo
            };
        });
}

function formatToNuvioStreams(formattedData, mediaTitle) {
    var links = [];
    var subs = formattedData && formattedData.subtitles ? formattedData.subtitles : [];
    var streams = formattedData && formattedData.streams ? formattedData.streams : [];
    var headers = {
        'User-Agent': HEADERS['User-Agent'],
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity'
    };
    for (var i = 0; i < streams.length; i++) {
        var s = streams[i];
        var quality = s.quality || extractQualityFromUrl(s.url) || 'Unknown';
        var server = (s.serverType || 'server').toUpperCase();
        links.push({
            name: 'ANIMEKAI ' + server + ' - ' + quality,
            title: mediaTitle || '',
            url: s.url,
            quality: quality,
            size: 'Unknown',
            headers: headers,
            subtitles: [], // TEMPORARILY DISABLED
            provider: 'animekai'
        });
    }
    return links;
}

// Main Nuvio entry
function getStreams(tmdbId, mediaType, season, episode) {
    // Only TV is supported reliably for AnimeKai
    if (mediaType !== 'tv') {
        return Promise.resolve([]);
    }

    var mediaInfo = null;
    var selectedEpisodeKey = null;
    var token = null;

    return getTMDBDetails(tmdbId, 'tv')
        .then(function(info) {
            mediaInfo = info || { title: null, year: null };
            var titleToSearch = mediaInfo.title || '';

            // For series with multiple seasons/arcs, search with season info to get better results
            var searchTitle = titleToSearch;
            if (season > 1) {
                // Get season name from TMDB to improve search
                return getTMDBSeasonInfo(tmdbId, season).then(function(seasonInfo) {
                    if (seasonInfo.name && seasonInfo.name !== `Season ${season}`) {
                        // Use season name in search for better matching (e.g., "Demon Slayer Mugen Train Arc")
                        searchTitle = titleToSearch + ' ' + seasonInfo.name;
                    }
                    return getAccurateAnimeKaiEntry(searchTitle, season, episode, tmdbId);
                });
            }

            // Use new Kitsu-powered accurate mapping
            return getAccurateAnimeKaiEntry(titleToSearch, season, episode, tmdbId);
        })
        .then(function(chosen) {
            if (!chosen || !chosen.url) {
                throw new Error('No AnimeKai entry found via Kitsu mapping');
            }

            // Use translated episode number if available (for split seasons)
            var actualEpisode = chosen.translatedEpisode || episode;

            return extractContentIdFromSlug(chosen.url).then(function(result) {
                return {
                    contentId: result.contentId,
                    episode: actualEpisode,
                    episodeInfo: result.episodeInfo
                };
            });
        })
        .then(function(result) {
            var contentId = result.contentId;
            var actualEpisode = result.episode;

            return encryptKai(contentId).then(function(encId) {
                var url = KAI_AJAX + '/episodes/list?ani_id=' + contentId + '&_=' + encId;
                return fetchRequest(url).then(function(res) { return res.json(); });
            })
            .then(function(episodesResp) {
                return parseHtmlViaApi(episodesResp.result);
            })
            .then(function(episodes) {
                var keys = Object.keys(episodes || {}).sort(function(a,b){ return parseInt(a) - parseInt(b); });
                if (keys.length === 0) throw new Error('No episodes');
                if (typeof actualEpisode === 'number' && episodes[String(actualEpisode)]) {
                    selectedEpisodeKey = String(actualEpisode);
                } else {
                    selectedEpisodeKey = keys[0];
                }
                token = episodes[selectedEpisodeKey].token;
                return encryptKai(token);
            })
            .then(function(encToken) {
                var url = KAI_AJAX + '/links/list?token=' + token + '&_=' + encToken;
                return fetchRequest(url).then(function(res) { return res.json(); });
            })
            .then(function(serversResp) { return parseHtmlViaApi(serversResp.result); })
            .then(function(servers) {
                var serverPromises = [];
                Object.keys(servers || {}).forEach(function(serverType) {
                    Object.keys(servers[serverType] || {}).forEach(function(serverKey) {
                        var lid = servers[serverType][serverKey].lid;
                        var p = encryptKai(lid)
                            .then(function(encLid) {
                                var url = KAI_AJAX + '/links/view?id=' + lid + '&_=' + encLid;
                                return fetchRequest(url).then(function(res) { return res.json(); });
                            })
                            .then(function(embedResp) { return decryptKai(embedResp.result); })
                            .then(function(decrypted) {
                                if (decrypted && decrypted.url) {
                                    return decryptMegaMedia(decrypted.url)
                                        .then(function(mediaData) {
                                            // Attach server type metadata
                                            var srcs = [];
                                            if (mediaData && mediaData.sources) {
                                                for (var i = 0; i < mediaData.sources.length; i++) {
                                                    var src = mediaData.sources[i];
                                                    if (src && src.file) {
                                                        srcs.push({
                                                            url: src.file,
                                                            quality: extractQualityFromUrl(src.file),
                                                            serverType: serverType
                                                        });
                                                    }
                                                }
                                            }
                                            // Return normalized structure
                                            return {
                                                streams: srcs,
                                                subtitles: (mediaData && mediaData.tracks) ? mediaData.tracks.filter(function(t){ return t.kind === 'captions'; }).map(function(t){ return { language: t.label || 'Unknown', url: t.file, default: !!t.default }; }) : []
                                            };
                                        });
                                }
                                return { streams: [], subtitles: [] };
                            })
                            .catch(function(){ return { streams: [], subtitles: [] }; });
                        serverPromises.push(p);
                    });
                });

                return Promise.allSettled(serverPromises).then(function(results) {
                    var allStreams = [];
                    var allSubs = [];
                    for (var i = 0; i < results.length; i++) {
                        if (results[i].status === 'fulfilled') {
                            var val = results[i].value || { streams: [], subtitles: [] };
                            allStreams = allStreams.concat(val.streams || []);
                            allSubs = allSubs.concat(val.subtitles || []);
                        }
                    }
                    // Resolve M3U8 masters to quality variants
                    var m3u8Links = allStreams.filter(function(s){ return s && s.url && s.url.indexOf('.m3u8') !== -1; });
                    var directLinks = allStreams.filter(function(s){ return !(s && s.url && s.url.indexOf('.m3u8') !== -1); });

                    return resolveMultipleM3U8(m3u8Links).then(function(resolved) {
                        var combined = directLinks.concat(resolved);
                        // Deduplicate subtitles by URL
                        var uniqueSubs = [];
                        var seen = {};
                        for (var j = 0; j < allSubs.length; j++) {
                            var su = allSubs[j];
                            if (su && su.url && !seen[su.url]) { seen[su.url] = true; uniqueSubs.push(su); }
                        }
                        var mediaTitle = buildMediaTitle(mediaInfo, 'tv', season, actualEpisode || parseInt(selectedEpisodeKey), result.episodeInfo);
                        var formatted = formatToNuvioStreams({ streams: combined, subtitles: uniqueSubs }, mediaTitle);
                        // Sort by quality roughly
                        var order = { '4K': 7, '2160p': 7, '1440p': 6, '1080p': 5, '720p': 4, '480p': 3, '360p': 2, '240p': 1, 'Unknown': 0 };
                        formatted.sort(function(a, b) { return (order[b.quality] || 0) - (order[a.quality] || 0); });
                        return formatted;
                    });
                });
            });
        })
        .catch(function(err) {
            return [];
        });
}

// Export for Nuvio
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.AnimeKaiScraperModule = { getStreams };
}


