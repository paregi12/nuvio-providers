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

// Kitsu API helper functions for accurate season mapping
function fetchKitsu(url) {
    return fetchRequest(url, { headers: KITSU_HEADERS })
        .then(function(res) { return res.json(); });
}

function getKitsuAnimeInfo(kitsuId) {
    return fetchKitsu(KITSU_BASE_URL + '/anime/' + kitsuId);
}

function getKitsuEpisodeInfo(animeId, episodeNumber) {
    return fetchKitsu(KITSU_BASE_URL + '/anime/' + animeId + '/episodes?filter[number]=' + episodeNumber)
        .then(function(response) {
            return response.data && response.data.length > 0 ? response.data[0] : null;
        });
}

// Determine if we should calculate absolute episode (TMDB has more seasons than Kitsu)
function shouldCalculateAbsoluteEpisode(kitsuResults, requestedSeason) {
    // Check if TMDB likely has more seasons than Kitsu provides
    // This is a heuristic: if requested season > number of Kitsu season groups, calculate absolute
    var seasonGroups = groupKitsuEntriesBySeason(kitsuResults);
    var kitsuSeasons = Object.keys(seasonGroups).map(Number).filter(s => s > 0);

    // If requested season is higher than any Kitsu season, or if we have a main entry but no season match
    return requestedSeason > Math.max(...kitsuSeasons, 0);
}

// Calculate absolute episode number for continuous series where TMDB has seasons but Kitsu doesn't
function calculateAbsoluteEpisodeFromTMDB(tmdbId, season, episode) {
    var url = TMDB_BASE_URL + '/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY;
    return fetchRequest(url)
        .then(function(res) { return res.json(); })
        .then(function(seriesData) {
            var seasons = seriesData.seasons || [];
            var cumulativeEpisodes = 0;

            // Sum up episodes from all seasons before the requested season
            for (var i = 0; i < seasons.length; i++) {
                var s = seasons[i];
                if (s.season_number > 0 && s.season_number < season) {  // Skip specials (season 0)
                    cumulativeEpisodes += s.episode_count || 0;
                }
            }

            // Add the episode number within the requested season
            return cumulativeEpisodes + episode;
        })
        .catch(function(err) {
            console.log('[AnimeKai] Error calculating absolute episode from TMDB:', err.message);
            return episode; // Fallback to original episode number
        });
}

function searchKitsuByTitle(animeTitle) {
    // Search Kitsu for anime entries matching the title
    const searchUrl = KITSU_BASE_URL + '/anime?filter[text]=' + encodeURIComponent(animeTitle);
    return fetchKitsu(searchUrl).then(function(response) {
        return response.data || [];
    });
}

function filterRelevantKitsuResults(kitsuResults, originalTitle) {
    if (!kitsuResults || kitsuResults.length === 0) return [];

    // Normalize the original title for comparison
    var normalizedOriginal = normalizeTitleForComparison(originalTitle);

    // Filter results that have meaningful similarity to the original title
    var relevantResults = [];
    for (var i = 0; i < kitsuResults.length; i++) {
        var entry = kitsuResults[i];
        var canonicalTitle = entry.attributes.canonicalTitle || '';
        var englishTitle = entry.attributes.titles && (entry.attributes.titles.en || entry.attributes.titles.en_us || entry.attributes.titles.en_jp) || '';
        var japaneseTitle = entry.attributes.titles && entry.attributes.titles.ja_jp || '';

        // Check if any of the titles are relevant
        var titlesToCheck = [canonicalTitle, englishTitle, japaneseTitle].filter(function(t) { return t; });

        var isRelevant = false;
        for (var j = 0; j < titlesToCheck.length; j++) {
            var normalizedKitsuTitle = normalizeTitleForComparison(titlesToCheck[j]);
            if (areTitlesSimilar(normalizedOriginal, normalizedKitsuTitle)) {
                isRelevant = true;
                break;
            }
        }

        if (isRelevant) {
            relevantResults.push(entry);
        }
    }

    console.log('[AnimeKai] Filtered Kitsu results: ' + relevantResults.length + '/' + kitsuResults.length + ' relevant');
    return relevantResults;
}

function normalizeTitleForComparison(title) {
    return title.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')    // Normalize whitespace
        .replace(/\b(the|and|or|but|nor|for|yet|so|a|an)\b/g, '') // Remove common words
        .replace(/\s+/g, ' ')    // Normalize whitespace again
        .trim();
}

function areTitlesSimilar(title1, title2) {
    if (!title1 || !title2) return false;

    // Exact match
    if (title1 === title2) return true;

    // One title contains the other (for partial matches)
    if (title1.includes(title2) || title2.includes(title1)) return true;

    // Check for significant word overlap (at least 50% of words)
    var words1 = title1.split(' ').filter(function(w) { return w.length > 2; });
    var words2 = title2.split(' ').filter(function(w) { return w.length > 2; });

    if (words1.length === 0 || words2.length === 0) return false;

    var commonWords = 0;
    for (var i = 0; i < words1.length; i++) {
        if (words2.includes(words1[i])) {
            commonWords++;
        }
    }

    var similarityRatio = commonWords / Math.max(words1.length, words2.length);
    return similarityRatio >= 0.5; // At least 50% word overlap
}

function getAccurateAnimeKaiEntry(animeTitle, season, episode, tmdbId) {
    console.log('[AnimeKai] Searching Kitsu for:', animeTitle, 'S' + season + 'E' + episode);

    // First search Kitsu for all related entries
    return searchKitsuByTitle(animeTitle).then(function(kitsuResults) {
        if (!kitsuResults || kitsuResults.length === 0) {
            console.log('[AnimeKai] No Kitsu results, falling back to direct AnimeKai search');
            return searchAnimeByName(animeTitle).then(function(results) {
                return pickResultForSeason(results, season, tmdbId);
            }).then(function(result) {
                return result;
            });
        }

        // Validate that Kitsu results are actually relevant to our TMDB title
        var relevantKitsuResults = filterRelevantKitsuResults(kitsuResults, animeTitle);
        if (!relevantKitsuResults || relevantKitsuResults.length === 0) {
            console.log('[AnimeKai] Kitsu results not relevant to TMDB title, falling back to direct AnimeKai search');
            return searchAnimeByName(animeTitle).then(function(results) {
                return pickResultForSeason(results, season, tmdbId);
            }).then(function(result) {
                return result;
            });
        }

        // Use the filtered relevant results
        kitsuResults = relevantKitsuResults;

        // Check if we should calculate absolute episode (TMDB has more seasons than Kitsu or continuous series)
        if (shouldCalculateAbsoluteEpisode(kitsuResults, season)) {
            console.log('[AnimeKai] Calculating absolute episode for proper TMDB → Kitsu mapping...');

            // Calculate the absolute episode number across all TMDB seasons
            return calculateAbsoluteEpisodeFromTMDB(tmdbId, season, episode).then(function(absoluteEpisode) {
                console.log('[AnimeKai] TMDB S' + season + 'E' + episode + ' = Absolute Episode', absoluteEpisode);

                // Find the main entry to use (continuous series or first available)
                var mainEntry = kitsuResults.find(function(entry) {
                    return entry.attributes.episodeCount === null && entry.attributes.status === 'current';
                }) || kitsuResults[0];

                // Check if this absolute episode exists in Kitsu
                return getKitsuEpisodeInfo(mainEntry.id, absoluteEpisode).then(function(episodeData) {
                    if (episodeData) {
                        console.log('[AnimeKai] Found episode in Kitsu - using absolute episode mapping');

                        // Use the main entry with absolute episode number
                        return processKitsuEntries([mainEntry], absoluteEpisode, kitsuResults, animeTitle, season, tmdbId);
                    } else {
                        // Fallback to episode-level season data if absolute episode not found
                        console.log('[AnimeKai] Absolute episode not found, trying episode-level data...');
                        return getKitsuEpisodeInfo(mainEntry.id, episode).then(function(originalEpisodeData) {
                            if (originalEpisodeData && originalEpisodeData.attributes.seasonNumber) {
                                console.log('[AnimeKai] Found episode data - Kitsu Season:', originalEpisodeData.attributes.seasonNumber, 'TMDB Season:', season);

                                // For continuous series, Kitsu season numbering may differ from TMDB
                                // Always prefer TMDB season number, but use Kitsu data to find the right entry
                                var seasonGroups = groupKitsuEntriesBySeason(kitsuResults);
                                var seasonEntries = seasonGroups[season] || []; // Use TMDB season, not Kitsu season

                                if (seasonEntries.length > 0) {
                                    console.log('[AnimeKai] Using TMDB Season', season, 'entries for episode mapping');
                                    return processKitsuEntries(seasonEntries, episode, kitsuResults, animeTitle, season, tmdbId);
                                } else {
                                    console.log('[AnimeKai] No entries for TMDB Season', season, '- TMDB may not have season data yet, trying enhanced search');
                                    // If no direct season match and TMDB doesn't have season data yet (common for new seasons),
                                    // try enhanced search with season name
                                    return getTMDBSeasonInfo(tmdbId, season).then(function(seasonInfo) {
                                        console.log('[AnimeKai] TMDB season info:', seasonInfo);

                                        // Try enhanced search title first (includes season name)
                                        var enhancedTitle = animeTitle;
                                        if (seasonInfo.name && seasonInfo.name !== `Season ${season}`) {
                                            enhancedTitle = animeTitle + ' ' + seasonInfo.name;
                                            console.log('[AnimeKai] Trying enhanced search:', enhancedTitle);
                                            return searchAnimeByName(enhancedTitle).then(function(enhancedResults) {
                                                if (enhancedResults && enhancedResults.length > 0) {
                                                    console.log('[AnimeKai] Found results with enhanced search');
                                                    return pickResultForSeason(enhancedResults, season, tmdbId);
                                                }
                                                // Fall back to basic search
                                                return searchAnimeByName(animeTitle).then(function(basicResults) {
                                                    return pickResultForSeason(basicResults, season, tmdbId);
                                                });
                                            });
                                        } else {
                                            // No season name available, use basic search
                                            return searchAnimeByName(animeTitle).then(function(basicResults) {
                                                return pickResultForSeason(basicResults, season, tmdbId);
                                            });
                                        }
                                    }).catch(function(err) {
                                        console.log('[AnimeKai] TMDB season info failed:', err.message, '- using basic search');
                                        // TMDB season endpoint failed (season doesn't exist yet), use basic search
                                        return searchAnimeByName(animeTitle).then(function(basicResults) {
                                            return pickResultForSeason(basicResults, season, tmdbId);
                                        });
                                    });
                                }
                            }

                            // Final fallback to original logic
                            console.log('[AnimeKai] Episode data not helpful, using original logic');
                            return fallbackToOriginalLogic(kitsuResults, season, episode, animeTitle, tmdbId);
                        });
                    }
                });
            });
        }

        // Original logic for non-continuous series
        return fallbackToOriginalLogic(kitsuResults, season, episode, animeTitle, tmdbId);
    });
}

function processKitsuEntries(seasonEntries, episode, kitsuResults, animeTitle, originalSeason, tmdbId) {
    console.log('[AnimeKai] Found', seasonEntries.length, 'entries for episode-season mapping');

    if (seasonEntries.length > 0) {
        seasonEntries.forEach(function(entry, idx) {
            console.log('[AnimeKai]  ', idx + 1 + '.', entry.attributes.canonicalTitle, '(' + entry.attributes.episodeCount + ' eps)');
        });
    } else {
        console.log('[AnimeKai] No entries found for episode-season - using all Kitsu results');
        seasonEntries = kitsuResults;
    }

    // For split seasons, determine which part contains our episode
    var targetEntry = null;
    var translatedEpisode = episode;

    if (seasonEntries.length > 1) {
        // Handle split seasons (like Season 3 → Part 1 + Part 2)
        targetEntry = findEntryForEpisode(seasonEntries, episode);
        translatedEpisode = targetEntry ? targetEntry.translatedEpisode : episode;
        targetEntry = targetEntry ? targetEntry.entry : seasonEntries[0];
        console.log('[AnimeKai] Split season detected, using:', targetEntry.attributes.canonicalTitle, 'episode:', translatedEpisode);
    } else {
        // Single entry season
        targetEntry = seasonEntries[0];
    }

    // Search AnimeKai using the target Kitsu entry
    // Prefer English title (matches AnimeKai naming) with fallback to canonical title
    var kitsuTitle = targetEntry.attributes.titles &&
                    (targetEntry.attributes.titles.en ||
                     targetEntry.attributes.titles.en_us ||
                     targetEntry.attributes.titles.en_jp) ||
                    targetEntry.attributes.canonicalTitle;
    console.log('[AnimeKai] Searching AnimeKai for:', kitsuTitle);

    return searchAnimeByName(kitsuTitle).then(function(animeKaiResults) {
        if (!animeKaiResults || animeKaiResults.length === 0) {
            console.log('[AnimeKai] No AnimeKai results for:', kitsuTitle);
            return null;
        }

        // Find exact title match (normalize punctuation and whitespace)
        var normalizedKitsuTitle = kitsuTitle.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ')    // Normalize whitespace
            .trim();

        var exactMatch = animeKaiResults.find(function(r) {
            var normalizedResultTitle = r.title.toLowerCase()
                .replace(/[^\w\s]/g, '') // Remove punctuation
                .replace(/\s+/g, ' ')    // Normalize whitespace
                .trim();
            return normalizedResultTitle === normalizedKitsuTitle;
        });

        if (exactMatch) {
            console.log('[AnimeKai] Found exact match:', kitsuTitle);
            // Store translated episode for later use
            exactMatch.translatedEpisode = translatedEpisode;
            return exactMatch;
        }

        // Try partial matches
        var partialMatch = animeKaiResults.find(function(r) {
            return kitsuTitle.toLowerCase().includes(r.title.toLowerCase()) ||
                   r.title.toLowerCase().includes(kitsuTitle.toLowerCase());
        });

        if (partialMatch) {
            console.log('[AnimeKai] Found partial match:', kitsuTitle, '→', partialMatch.title);
            partialMatch.translatedEpisode = translatedEpisode;
            return partialMatch;
        }

        return null;
    }).then(function(selectedEntry) {
        if (selectedEntry) {
            return selectedEntry;
        }

        // Final fallback to original pattern matching
        console.log('[AnimeKai] No Kitsu matches found, falling back to pattern matching');
        return searchAnimeByName(animeTitle).then(function(results) {
            return pickResultForSeason(results, originalSeason, tmdbId);
        }).then(function(result) {
            return result;
        });
    });
}

function fallbackToOriginalLogic(kitsuResults, season, episode, animeTitle, tmdbId) {
    // Group all Kitsu results by season and filter for requested season
    var seasonGroups = groupKitsuEntriesBySeason(kitsuResults);
    var seasonEntries = seasonGroups[season] || [];

    console.log('[AnimeKai] Kitsu season groups found:', Object.keys(seasonGroups));
    console.log('[AnimeKai] Found', seasonEntries.length, 'entries for season', season, ':');

    if (seasonEntries.length > 0) {
        seasonEntries.forEach(function(entry, idx) {
            console.log('[AnimeKai]  ', idx + 1 + '.', entry.attributes.canonicalTitle, '(' + entry.attributes.episodeCount + ' eps)');
        });
    } else {
        console.log('[AnimeKai] No entries found for season', season, '- using all Kitsu results as fallback');
        seasonEntries = kitsuResults;
    }

    return processKitsuEntries(seasonEntries, episode, kitsuResults, animeTitle, season, tmdbId);
}

function findEntryForEpisode(seasonEntries, episode) {
    // Prioritize main season entries over specials
    var mainEntries = seasonEntries.filter(function(entry) {
        var title = entry.attributes.canonicalTitle.toLowerCase();
        return !title.includes('special') && !title.includes('ova');
    });

    var cumulativeEpisodes = 0;

    // First try main season entries only
    for (var i = 0; i < mainEntries.length; i++) {
        var entry = mainEntries[i];
        var episodeCount = entry.attributes.episodeCount || 0;
        var startEpisode = cumulativeEpisodes + 1;
        var endEpisode = cumulativeEpisodes + episodeCount;

        console.log('[AnimeKai] Checking', entry.attributes.canonicalTitle, 'episodes', startEpisode + '-' + endEpisode);

        if (episode >= startEpisode && episode <= endEpisode) {
            // Found the entry that contains this episode
            var translatedEpisode = episode - cumulativeEpisodes;
            console.log('[AnimeKai] Found episode', episode, 'as episode', translatedEpisode, 'in', entry.attributes.canonicalTitle);
            return {
                entry: entry,
                translatedEpisode: translatedEpisode,
                episodeRange: startEpisode + '-' + endEpisode
            };
        }

        cumulativeEpisodes += episodeCount;
    }

    console.log('[AnimeKai] Episode', episode, 'not found in main entries, using first entry');
    // Episode not found in main entries, return first main entry with original episode
    return {
        entry: mainEntries[0] || seasonEntries[0],
        translatedEpisode: episode,
        episodeRange: 'unknown'
    };
}

function groupKitsuEntriesBySeason(kitsuResults) {
    // Filter out specials/OVAs and movies - only keep TV series with multiple episodes
    var mainSeries = kitsuResults.filter(function(entry) {
        var episodeCount = entry.attributes.episodeCount || 0;
        var subtype = entry.attributes.subtype || '';
        var title = entry.attributes.canonicalTitle.toLowerCase();

        // Keep entries with >1 episode that are TV series (not movies/specials)
        return episodeCount > 1 &&
               subtype === 'TV' &&
               !title.includes('movie') &&
               !title.includes('ova') &&
               !title.includes('special');
    });

    // Sort by start date to determine chronological order
    mainSeries.sort(function(a, b) {
        var dateA = a.attributes.startDate || '9999-99-99';
        var dateB = b.attributes.startDate || '9999-99-99';
        return dateA.localeCompare(dateB);
    });

    // Group by chronological order as seasons
    var seasonGroups = {};
    mainSeries.forEach(function(entry, index) {
        var seasonNum = index + 1; // 1-based season numbering
        if (!seasonGroups[seasonNum]) {
            seasonGroups[seasonNum] = [];
        }
        seasonGroups[seasonNum].push(entry);
    });

    return seasonGroups;
}

function extractSeasonNumberFromTitle(title) {
    // Extract season number from various title formats
    var patterns = [
        /season\s*(\d+)/i,
        /s(\d+)/i,
        /final season/i,  // Treat "Final Season" as season 4
        /^(.+)$/i         // Fallback: if no season indicators, treat as season 1
    ];

    for (var i = 0; i < patterns.length; i++) {
        var match = title.match(patterns[i]);
        if (match) {
            if (i === 2) return 4; // Final Season = season 4
            if (i === 3) return 1; // No season indicators = season 1
            return parseInt(match[1]);
        }
    }

    return null;
}

function filterKitsuResultsBySeason(kitsuResults, season) {
    var seasonGroups = groupKitsuEntriesBySeason(kitsuResults);
    return seasonGroups[season] || [];
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
            // Updated pattern to capture more info including episode count
            var pattern = /<div class="aitem">[\s\S]*?href="(\/watch\/[^\"]*)"[\s\S]*?<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*)<\/a>[\s\S]*?<div class="info">[\s\S]*?<span[^>]*class="[^"]*sub[^"]*"[^>]*>([^<]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*dub[^"]*"[^>]*>([^<]*?)<\/span>[\s\S]*?<span[^>]*>([^<]*?)<\/span>[\s\S]*?<\/div>/g;
            var m;
            while ((m = pattern.exec(html)) !== null) {
                var href = m[1];
                var title = (m[2] || '').trim();
                var subCount = (m[3] || '').trim();
                var dubCount = (m[4] || '').trim();
                var type = (m[5] || '').trim();

                // Extract episode count from sub/dub spans
                var episodeCount = 0;
                if (subCount) {
                    var subMatch = subCount.match(/(\d+)/);
                    if (subMatch) episodeCount = Math.max(episodeCount, parseInt(subMatch[1]));
                }
                if (dubCount) {
                    var dubMatch = dubCount.match(/(\d+)/);
                    if (dubMatch) episodeCount = Math.max(episodeCount, parseInt(dubMatch[1]));
                }


                if (href && title) {
                    results.push({
                        title: title,
                        url: (href.indexOf('http') === 0 ? href : KAI_AJAX.replace('/ajax', '') + href),
                        episodeCount: episodeCount,
                        type: type
                    });
                }
            }

            if (results.length === 0) {
                // Fallback: simpler pattern
                var pattern2 = /href="(\/watch\/[^\"]*)"[^>]*>[\s\S]*?<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*)<\/a>/g;
                while ((m = pattern2.exec(html)) !== null) {
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
            }

            if (results.length === 0) {
                // Final fallback: grab any watch URL
                var pattern3 = /href="(\/watch\/[^\"]*)"/g;
                while ((m = pattern3.exec(html)) !== null) {
                    var h = m[1];
                    results.push({
                        title: 'Anime ' + h.split('/').pop(),
                        url: KAI_AJAX.replace('/ajax', '') + h,
                        episodeCount: 0,
                        type: 'TV'
                    });
                    if (results.length >= 3) break;
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
            console.log('[AnimeKai] TMDB season info:', seasonInfo);

            if (seasonInfo.episodeCount > 0) {
                // First, try exact episode count match
                for (var k = 0; k < results.length; k++) {
                    var r3 = results[k];
                    if (r3.episodeCount === seasonInfo.episodeCount) {
                        console.log('[AnimeKai] Found exact episode count match:', r3.title, 'for', seasonInfo.episodeCount, 'episodes');
                        return r3;
                    }
                }

                // If no exact match, try close matches (±1 episode, for specials or variations)
                for (var m = 0; m < results.length; m++) {
                    var r4 = results[m];
                    if (Math.abs(r4.episodeCount - seasonInfo.episodeCount) <= 1 && r4.episodeCount > 0) {
                        console.log('[AnimeKai] Found close episode count match:', r4.title, '(', r4.episodeCount, 'vs', seasonInfo.episodeCount, 'episodes)');
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

    // Extract episode number - multiple patterns for different HTML structures
    var episodePatterns = [
        /You are watching <b>Episode (\d+)<\/b>/i,
        /watching.*?Episode (\d+)/i,
        /Episode (\d+)/i,
        /<b>Episode\s*(\d+)<\/b>/i,
        /episode.*?(\d+)/i
    ];

    for (var i = 0; i < episodePatterns.length; i++) {
        var match = html.match(episodePatterns[i]);
        if (match) {
            episodeInfo.episode = parseInt(match[1]);
            break;
        }
    }

    // Extract season/title name - multiple patterns for different HTML structures
    var titlePatterns = [
        // Main title patterns
        /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        // Alternative patterns with itemprop or data attributes
        /<h1[^>]*itemprop="name"[^>]*>([^<]+)<\/h1>/i,
        /<h1[^>]*data-jp="[^"]*"[^>]*>([^<]+)<\/h1>/i,
        // Look for title in meta tags
        /<title>([^<]+)<\/title>/i,
        // Look for title in other heading tags
        /<h2[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h2>/i,
        /<h2[^>]*>([^<]+)<\/h2>/i,
        // Look for specific patterns in the content
        /"title"\s*:\s*"([^"]+)"/i,
        /title['"]?\s*[:=]\s*['"]([^'"]+)['"]/i
    ];

    for (var j = 0; j < titlePatterns.length; j++) {
        var titleMatch = html.match(titlePatterns[j]);
        if (titleMatch) {
            var title = titleMatch[1].trim();
            // Clean up the title - remove extra whitespace and common artifacts
            title = title.replace(/\s+/g, ' ');
            title = title.replace(/\\n/g, '');
            title = title.replace(/&[^;]+;/g, ''); // Remove HTML entities

            if (title && title.length > 3) { // Filter out very short titles
                episodeInfo.seasonName = title;
                break;
            }
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
            subtitles: subs,
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
            console.log('[AnimeKai] TMDB title:', titleToSearch, 'Season:', season, 'Episode:', episode);

            // For series with multiple seasons/arcs, search with season info to get better results
            var searchTitle = titleToSearch;
            if (season > 1) {
                // Get season name from TMDB to improve search
                return getTMDBSeasonInfo(tmdbId, season).then(function(seasonInfo) {
                    if (seasonInfo.name && seasonInfo.name !== `Season ${season}`) {
                        // Use season name in search for better matching (e.g., "Demon Slayer Mugen Train Arc")
                        searchTitle = titleToSearch + ' ' + seasonInfo.name;
                        console.log('[AnimeKai] Enhanced search with season name:', searchTitle);
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
            console.log('[AnimeKai] Selected entry:', chosen.title, 'URL:', chosen.url);

            // Use translated episode number if available (for split seasons)
            var actualEpisode = chosen.translatedEpisode || episode;
            console.log('[AnimeKai] Using episode number:', actualEpisode, '(original:', episode + ')');

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
            console.log('[AnimeKai] Error: ' + err.message);
            return [];
        });
}

// Export for Nuvio
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.AnimeKaiScraperModule = { getStreams };
}


