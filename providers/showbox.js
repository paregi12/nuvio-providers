// ShowBox Scraper for Nuvio Local Scrapers
// React Native compatible version - Promise-based approach only

// TMDB API Configuration
const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// ShowBox API Configuration
const SHOWBOX_API_BASE = 'https://fed-api.pstream.mov';

// Working headers for ShowBox API
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    'Accept': 'pstream.org',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Origin': 'https://pstream.mov',
    'Referer': 'https://pstream.mov/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'region': 'West',
    'DNT': '1'
};

// UI token is provided by the host app via per-scraper settings (Plugin Screen)
function getUiToken() {
    try {
        // Prefer sandbox-injected globals
        if (typeof global !== 'undefined' && global.SCRAPER_SETTINGS && global.SCRAPER_SETTINGS.uiToken) {
            return String(global.SCRAPER_SETTINGS.uiToken);
        }
        if (typeof window !== 'undefined' && window.SCRAPER_SETTINGS && window.SCRAPER_SETTINGS.uiToken) {
            return String(window.SCRAPER_SETTINGS.uiToken);
        }
    } catch (e) {
        // ignore and fall through
    }
    return '';
}

// Utility Functions
function getQualityFromName(qualityStr) {
    if (!qualityStr) return 'Unknown';
    
    const quality = qualityStr.toLowerCase();
    const qualityMap = {
        '4k': '4K', '2160p': '4K', 'uhd': '4K',
        '1440p': '1440p', '2k': '1440p',
        '1080p': '1080p', 'fhd': '1080p', 'full hd': '1080p',
        '720p': '720p', 'hd': '720p',
        '480p': '480p', 'sd': '480p',
        '360p': '360p',
        '240p': '240p',
        'org': 'Original'
    };
    
    for (const [key, value] of Object.entries(qualityMap)) {
        if (quality.includes(key)) return value;
    }
    
    // Try to extract number from string and format consistently
    const match = qualityStr.match(/(\d{3,4})[pP]?/);
    if (match) {
        const resolution = parseInt(match[1]);
        if (resolution >= 2160) return '4K';
        if (resolution >= 1440) return '1440p';
        if (resolution >= 1080) return '1080p';
        if (resolution >= 720) return '720p';
        if (resolution >= 480) return '480p';
        if (resolution >= 360) return '360p';
        return '240p';
    }
    
    return 'Unknown';
}

function formatFileSize(sizeStr) {
    if (!sizeStr) return 'Unknown';
    
    // If it's already formatted (like "15.44 GB"), return as is
    if (typeof sizeStr === 'string' && (sizeStr.includes('GB') || sizeStr.includes('MB'))) {
        return sizeStr;
    }
    
    // If it's a number, convert to GB/MB
    if (typeof sizeStr === 'number') {
        const gb = sizeStr / (1024 * 1024 * 1024);
        if (gb >= 1) {
            return `${gb.toFixed(2)} GB`;
        } else {
            const mb = sizeStr / (1024 * 1024);
            return `${mb.toFixed(0)} MB`;
        }
    }
    
    return sizeStr;
}

// Issue a HEAD request to get headers (e.g., Content-Length)
function headRequest(url, options = {}) {
    const token = getUiToken();
    const defaultHeaders = { ...WORKING_HEADERS };
    if (token) {
        defaultHeaders['ui-token'] = token;
    }
    const headers = { ...defaultHeaders, ...options.headers };
    return fetch(url, {
        method: 'HEAD',
        headers
    }).then(function(response) {
        // Some servers may not fully support HEAD; still return headers if possible
        return response;
    }).catch(function(error) {
        console.error(`[ShowBox] HEAD failed for ${url}: ${error.message}`);
        throw error;
    });
}

// Try to resolve accurate size via HEAD Content-Length
function resolveAccurateSizes(streams) {
    if (!Array.isArray(streams) || streams.length === 0) return Promise.resolve(streams);
    const tasks = streams.map(function(stream) {
        if (!stream || !stream.url) return Promise.resolve(stream);
        return headRequest(stream.url)
            .then(function(resp) {
                try {
                    const len = resp && resp.headers && (resp.headers.get ? resp.headers.get('content-length') : (resp.headers['content-length'] || resp.headers['Content-Length']));
                    if (len) {
                        const numeric = parseInt(len, 10);
                        if (!isNaN(numeric) && numeric > 0) {
                            stream.size = numeric; // store as number for our formatter below
                            stream._resolvedSizeFromHead = true;
                        }
                    }
                } catch (e) {
                    // ignore header parse errors
                }
                return stream;
            })
            .catch(function() { return stream; });
    });
    return Promise.all(tasks).then(function(updated) {
        // Normalize to formatted strings for UI
        updated.forEach(function(s) {
            if (typeof s.size === 'number') {
                s.size = formatFileSize(s.size);
            }
        });
        return updated;
    });
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    const token = getUiToken();
    const defaultHeaders = { ...WORKING_HEADERS };
    if (token) {
        defaultHeaders['ui-token'] = token;
    }

    return fetch(url, {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers },
        ...options
    }).then(function(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    }).catch(function(error) {
        console.error(`[ShowBox] Request failed for ${url}: ${error.message}`);
        throw error;
    });
}

// Get movie/TV show details from TMDB
function getTMDBDetails(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    
    return makeRequest(url)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            const title = mediaType === 'tv' ? data.name : data.title;
            const releaseDate = mediaType === 'tv' ? data.first_air_date : data.release_date;
            const year = releaseDate ? parseInt(releaseDate.split('-')[0]) : null;
            
            return {
                title: title,
                year: year,
                imdbId: data.external_ids?.imdb_id || null
            };
        });
}

// Convert TMDB ID to IMDB ID format for ShowBox API
function convertTmdbToImdb(tmdbId) {
    // ShowBox API expects IMDB format (tt + 7-8 digits)
    // Based on the original request, it seems the API accepts TMDB IDs directly
    // The original request was for tt18163814 which matches TMDB ID 18163814
    return `tt${tmdbId}`;
}

// Process ShowBox API response
function processShowBoxResponse(data, mediaInfo) {
    const streams = [];
    
    try {
        if (data && data.streams) {
            console.log(`[ShowBox] Processing ${Object.keys(data.streams).length} quality streams`);
            
            // Derive a reasonable title if TMDB lookup failed
            let resolvedTitle = mediaInfo.title || '';
            if (!resolvedTitle || /^TMDB ID\s+/i.test(resolvedTitle)) {
                // Use API's name field, cleaning common filename patterns
                const fileName = (data.name || '').toString();
                if (fileName) {
                    // Remove extension
                    const noExt = fileName.replace(/\.[a-zA-Z0-9]{2,4}$/i, '');
                    // Replace dots with spaces
                    const dottedToSpaced = noExt.replace(/\.+/g, ' ');
                    // Remove bracketed segments like [Ben The Men]
                    const withoutBrackets = dottedToSpaced.replace(/\[[^\]]*\]/g, '').trim();
                    resolvedTitle = withoutBrackets || fileName;
                }
            }
            const mediaTitleForOutput = resolvedTitle;

            // Process each quality stream
            Object.entries(data.streams).forEach(function([qualityKey, streamUrl]) {
                const normalizedQuality = getQualityFromName(qualityKey);
                const fileSize = data.size ? formatFileSize(data.size) : 'Unknown';
                
                // Create descriptive title
                let streamTitle = mediaTitleForOutput;
                if (mediaInfo.year) {
                    streamTitle += ` (${mediaInfo.year})`;
                }
                
                streams.push({
                    name: `ShowBox ${normalizedQuality}`,
                    title: streamTitle,
                    url: streamUrl,
                    quality: normalizedQuality,
                    size: fileSize,
                    provider: 'showbox'
                });
                
                console.log(`[ShowBox] Added ${normalizedQuality} stream: ${streamUrl.substring(0, 50)}...`);
            });
        }
    } catch (error) {
        console.error(`[ShowBox] Error processing response: ${error.message}`);
    }
    
    return streams;
}

// Main scraping function
function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    console.log(`[ShowBox] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${seasonNum}E:${episodeNum}` : ''}`);

    // Try to get TMDB details first, but don't fail if it's not available
    return getTMDBDetails(tmdbId, mediaType)
        .then(function(mediaInfo) {
            console.log(`[ShowBox] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || 'N/A'})`);
            return mediaInfo;
        })
        .catch(function(error) {
            console.log(`[ShowBox] TMDB lookup failed: ${error.message}, proceeding with basic info`);
            // Create basic media info if TMDB fails
            return {
                title: `TMDB ID ${tmdbId}`,
                year: null,
                imdbId: null
            };
        })
        .then(function(mediaInfo) {
            // Determine identifier for ShowBox API: prefer real IMDB ID; fallback to raw TMDB ID (no 'tt' prefix)
            const idForApi = mediaInfo.imdbId && typeof mediaInfo.imdbId === 'string' && mediaInfo.imdbId.startsWith('tt')
                ? mediaInfo.imdbId
                : `tt${String(tmdbId)}`;

            console.log(`[ShowBox] Using identifier for API: ${idForApi}${mediaInfo.imdbId ? ' (IMDB)' : ' (TMDB fallback)'}`);

            // Build API URL based on media type
            let apiUrl;
            if (mediaType === 'tv' && seasonNum && episodeNum) {
                // For TV shows, we might need a different endpoint
                // For now, using the movie endpoint as the API structure is unclear
                apiUrl = `${SHOWBOX_API_BASE}/tv/${idForApi}`;
            } else {
                apiUrl = `${SHOWBOX_API_BASE}/movie/${idForApi}`;
            }

            console.log(`[ShowBox] Requesting: ${apiUrl}`);
            // Make request to ShowBox API
            return makeRequest(apiUrl)
                .then(function(response) {
                    console.log(`[ShowBox] API Response status: ${response.status}`);
                    return response.json();
                })
                .then(function(data) {
                    console.log(`[ShowBox] API Response received:`, JSON.stringify(data, null, 2));
                    
                    // Process the response
                    const streams = processShowBoxResponse(data, mediaInfo);
                    
                    if (streams.length === 0) {
                        console.log(`[ShowBox] No streams found in API response`);
                        return [];
                    }
                    
                    // Sort streams by quality (highest first)
                    streams.sort(function(a, b) {
                        const qualityOrder = { 'Original': 5, '4K': 4, '1440p': 3, '1080p': 2, '720p': 1, '480p': 0, '360p': -1, '240p': -2, 'Unknown': -3 };
                        return (qualityOrder[b.quality] || -3) - (qualityOrder[a.quality] || -3);
                    });

                    // Resolve accurate sizes via HEAD before returning
                    return resolveAccurateSizes(streams).then(function(finalStreams) {
                        console.log(`[ShowBox] Returning ${finalStreams.length} streams`);
                        return finalStreams;
                    });
                })
                .catch(function(error) {
                    console.error(`[ShowBox] API request failed: ${error.message}`);
                    // If it's a 500 error, it might be a temporary server issue
                    if (error.message.includes('500')) {
                        console.log(`[ShowBox] Server error (500) - this might be temporary`);
                    }
                    throw error;
                });
        })
        .catch(function(error) {
            console.error(`[ShowBox] Error in getStreams: ${error.message}`);
            return []; // Return empty array on error as per Nuvio scraper guidelines
        });
}

// Export the main function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    // For React Native environment
    global.ShowBoxScraperModule = { getStreams };
}
