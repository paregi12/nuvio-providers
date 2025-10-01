const https = require('https');
const http = require('http');
const { URL } = require('url');

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Connection": "keep-alive"
};

const API = "https://enc-dec.app/api";
const KAI_AJAX = "https://animekai.to/ajax";

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                ...HEADERS,
                ...options.headers
            },
            timeout: options.timeout || 10000
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
                        resolve(JSON.parse(data));
                    } else {
                        resolve(data);
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// Encrypt text using the API
function encrypt(text) {
    return makeRequest(`${API}/enc-kai?text=${encodeURIComponent(text)}`)
        .then(response => response.result);
}

// Decrypt text using the API
function decrypt(text) {
    return makeRequest(`${API}/dec-kai?text=${encodeURIComponent(text)}`, {
        method: 'POST'
    }).then(response => response.result);
}

// Parse HTML using the API
function parseHtml(html) {
    return makeRequest(`${API}/parse-html`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: html })
    }).then(response => response.result);
}

// Get JSON data from URL
function getJson(url) {
    return makeRequest(url);
}

// Decrypt MegaUp media URL
function decryptMegaMedia(embedUrl) {
    const media = embedUrl.replace("/e/", "/media/");
    
    return makeRequest(media)
        .then(response => response.result)
        .then(encrypted => {
            return makeRequest(`${API}/dec-mega`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: encrypted,
                    agent: HEADERS["User-Agent"]
                })
            });
        })
        .then(response => response.result);
}

// Extract quality information from HLS URL
function extractQualityFromUrl(url) {
    const qualityPatterns = [
        /(\d{3,4})p/i,  // 1080p, 720p, etc. (3-4 digits)
        /(\d{3,4})k/i,  // 1080k, 720k, etc. (3-4 digits)
        /quality[_-]?(\d{3,4})/i,  // quality-1080, quality_720, etc.
        /res[_-]?(\d{3,4})/i,  // res-1080, res_720, etc.
        /(\d{3,4})x\d{3,4}/i,  // 1920x1080, 1280x720, etc.
    ];
    
    for (const pattern of qualityPatterns) {
        const match = url.match(pattern);
        if (match) {
            const qualityNum = parseInt(match[1]);
            // Only accept reasonable quality values
            if (qualityNum >= 240 && qualityNum <= 4320) {
                return `${qualityNum}p`;
            }
        }
    }
    
    return "unknown";
}

// Parse HLS playlist to extract quality information
function parseHlsPlaylist(url) {
    return makeRequest(url, { timeout: 10000 })
        .then(content => {
            // Look for multiple quality streams in the playlist
            const resolutions = [];
            const bandwidths = [];
            
            // Extract all RESOLUTION values
            const resolutionMatches = content.match(/RESOLUTION=(\d+x\d+)/g);
            if (resolutionMatches) {
                resolutionMatches.forEach(match => {
                    const res = match.match(/RESOLUTION=(\d+x\d+)/)[1];
                    const height = parseInt(res.split('x')[1]);
                    resolutions.push(height);
                });
            }
            
            // Extract all BANDWIDTH values
            const bandwidthMatches = content.match(/BANDWIDTH=(\d+)/g);
            if (bandwidthMatches) {
                bandwidthMatches.forEach(match => {
                    const bw = parseInt(match.match(/BANDWIDTH=(\d+)/)[1]);
                    bandwidths.push(bw);
                });
            }
            
            // If we found resolutions, use the highest one
            if (resolutions.length > 0) {
                const maxResolution = Math.max(...resolutions);
                if (maxResolution >= 1080) return "1080p";
                else if (maxResolution >= 720) return "720p";
                else if (maxResolution >= 480) return "480p";
                else if (maxResolution >= 360) return "360p";
                else return "240p";
            }
            
            // If no resolutions but we have bandwidth, estimate quality
            if (bandwidths.length > 0) {
                const maxBandwidth = Math.max(...bandwidths);
                if (maxBandwidth >= 5000000) return "1080p";
                else if (maxBandwidth >= 3000000) return "720p";
                else if (maxBandwidth >= 1500000) return "480p";
                else if (maxBandwidth >= 800000) return "360p";
                else return "240p";
            }
            
            // Check if it's a master playlist (contains other playlists)
            if (content.includes('#EXT-X-STREAM-INF')) {
                return "adaptive";  // Multiple qualities available
            }
            
            return "unknown";
        })
        .catch(error => {
            console.log(`Error parsing HLS playlist: ${error.message}`);
            return "unknown";
        });
}

// Format and sort streaming data with quality information
function formatStreamsData(mediaData) {
    if (!mediaData || typeof mediaData !== 'object' || !mediaData.sources) {
        return Promise.resolve({ error: "No sources found in media data" });
    }
    
    const streamPromises = [];
    
    mediaData.sources.forEach(source => {
        if (source.file) {
            const url = source.file;
            
            // Extract quality from URL first
            let quality = extractQualityFromUrl(url);
            
            // If quality is unknown, try to parse HLS playlist
            if (quality === "unknown") {
                const streamPromise = parseHlsPlaylist(url).then(detectedQuality => {
                    // Determine stream type
                    let streamType = "unknown";
                    if (url.includes('.m3u8')) streamType = "hls";
                    else if (url.includes('.mp4')) streamType = "mp4";
                    
                    return {
                        url: url,
                        quality: detectedQuality,
                        type: streamType,
                        provider: "megaup"
                    };
                });
                streamPromises.push(streamPromise);
            } else {
                // Determine stream type
                let streamType = "unknown";
                if (url.includes('.m3u8')) streamType = "hls";
                else if (url.includes('.mp4')) streamType = "mp4";
                
                const streamInfo = {
                    url: url,
                    quality: quality,
                    type: streamType,
                    provider: "megaup"
                };
                
                streamPromises.push(Promise.resolve(streamInfo));
            }
        }
    });
    
    // Wait for all quality detection promises to resolve
    return Promise.all(streamPromises).then(streams => {
        // Sort streams by quality (highest first)
        const qualityOrder = { "1080p": 1, "720p": 2, "480p": 3, "360p": 4, "240p": 5, "adaptive": 2, "unknown": 6 };
        streams.sort((a, b) => (qualityOrder[a.quality] || 6) - (qualityOrder[b.quality] || 6));
        
        // Format subtitles
        const subtitles = [];
        if (mediaData.tracks) {
            mediaData.tracks.forEach(track => {
                if (track.kind === 'captions') {
                    const subtitleInfo = {
                        url: track.file,
                        language: track.label || 'Unknown',
                        default: track.default || false
                    };
                    subtitles.push(subtitleInfo);
                }
            });
        }
        
        // Format thumbnails
        const thumbnails = [];
        if (mediaData.tracks) {
            mediaData.tracks.forEach(track => {
                if (track.kind === 'thumbnails') {
                    thumbnails.push({
                        url: track.file,
                        type: "vtt"
                    });
                }
            });
        }
        
        const formattedData = {
            streams: streams,
            subtitles: subtitles,
            thumbnails: thumbnails,
            download: mediaData.download || '',
            total_streams: streams.length,
            qualities_available: [...new Set(streams.map(s => s.quality))]
        };
        
        return formattedData;
    });
}

// Search for anime by name and extract slug URL
function searchAnimeByName(animeName) {
    const searchUrl = `${KAI_AJAX.replace('/ajax', '')}/browser?keyword=${encodeURIComponent(animeName)}`;
    
    return makeRequest(searchUrl)
        .then(html => {
            console.log(`Search URL: ${searchUrl}`);
            console.log(`HTML length: ${html.length} characters`);
            
            // Parse HTML to find search results - multiple regex patterns
            const results = [];
            
            // Pattern 1: Look for href and title in aitem divs
            const pattern1 = /<div[^>]*class="[^"]*aitem[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*class="[^"]*poster[^"]*"[\s\S]*?<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*)<\/a>/g;
            
            // Pattern 2: Simpler pattern for href and title
            const pattern2 = /href="(\/watch\/[^"]*)"[\s\S]*?class="[^"]*title[^"]*"[^>]*>([^<]*)<\/a>/g;
            
            // Pattern 3: Even simpler - just look for watch URLs
            const pattern3 = /href="(\/watch\/[^"]*)"[^>]*>[\s\S]*?<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]*)<\/a>/g;
            
            const patterns = [pattern1, pattern2, pattern3];
            
            for (const pattern of patterns) {
                let match;
                while ((match = pattern.exec(html)) !== null) {
                    const [, href, title] = match;
                    const cleanTitle = title.trim();
                    const cleanHref = href.trim();
                    
                    if (cleanTitle && cleanHref && !results.some(r => r.url.includes(cleanHref))) {
                        results.push({
                            title: cleanTitle,
                            url: cleanHref.startsWith('http') ? cleanHref : `${KAI_AJAX.replace('/ajax', '')}${cleanHref}`,
                            posterUrl: '' // We'll skip poster for now
                        });
                    }
                }
                
                if (results.length > 0) break; // Use first pattern that finds results
            }
            
            // If still no results, try to find any watch URLs
            if (results.length === 0) {
                const watchUrlPattern = /href="(\/watch\/[^"]*)"/g;
                let match;
                while ((match = watchUrlPattern.exec(html)) !== null) {
                    const href = match[1];
                    results.push({
                        title: `Anime (${href.split('/').pop()})`,
                        url: href.startsWith('http') ? href : `${KAI_AJAX.replace('/ajax', '')}${href}`,
                        posterUrl: ''
                    });
                    if (results.length >= 5) break; // Limit results
                }
            }
            
            console.log(`Found ${results.length} results using regex parsing`);
            return results;
        });
}

// Extract content ID from slug URL
function extractContentIdFromSlug(slugUrl) {
    return makeRequest(slugUrl)
        .then(html => {
            // Look for the data-id attribute in div.rate-box
            const dataIdMatch = html.match(/<div[^>]*class="[^"]*rate-box[^"]*"[^>]*data-id="([^"]*)"/);
            if (dataIdMatch) {
                return dataIdMatch[1];
            }
            
            // Alternative: look for any data-id attribute
            const altMatch = html.match(/data-id="([^"]*)"/);
            if (altMatch) {
                return altMatch[1];
            }
            
            throw new Error("Could not find content ID in the page");
        });
}

// Main execution function with anime name input
function runAnimeKaiTest(animeName = "cyberpunk edgerunners", season = null, episode = null) {
    console.log("=".repeat(60));
    console.log("ANIMEKAI API TESTING SCRIPT (JavaScript)");
    console.log("=".repeat(60));
    console.log(`Searching for: "${animeName}"`);
    if (season) console.log(`Season: ${season}`);
    if (episode) console.log(`Episode: ${episode}`);

    // --- PART 1: Search and Extract Slug URL ---
    console.log("\n1. SEARCHING FOR ANIME");
    console.log("-".repeat(40));

    searchAnimeByName(animeName)
        .then(searchResults => {
            if (searchResults.length === 0) {
                throw new Error(`No results found for "${animeName}"`);
            }
            
            console.log(`Found ${searchResults.length} result(s):`);
            searchResults.forEach((result, index) => {
                console.log(`${index + 1}. ${result.title}`);
                console.log(`   URL: ${result.url}`);
            });
            
            // Use the first result
            const selectedAnime = searchResults[0];
            console.log(`\nUsing: ${selectedAnime.title}`);
            console.log(`Slug URL: ${selectedAnime.url}`);
            
            return extractContentIdFromSlug(selectedAnime.url);
        })
        .then(contentId => {
            console.log(`\n2. EXTRACTED CONTENT ID`);
            console.log("-".repeat(40));
            console.log(`Content ID: ${contentId}`);
            
            // --- PART 3: Episode Extraction Workflow ---
            console.log("\n3. EPISODE EXTRACTION WORKFLOW");
            console.log("-".repeat(40));

            // Episodes data
            return encrypt(contentId)
                .then(encId => {
                    return getJson(`${KAI_AJAX}/episodes/list?ani_id=${contentId}&_=${encId}`);
                })
                .then(episodesResp => {
                    return parseHtml(episodesResp.result);
                })
                .then(episodes => {
                    console.log(`Found ${Object.keys(episodes).length} episodes`);
                    
                    // Show available episodes
                    console.log("\nAvailable episodes:");
                    const episodeKeys = Object.keys(episodes).sort((a, b) => parseInt(a) - parseInt(b));
                    episodeKeys.slice(0, 20).forEach(epKey => {
                        console.log(`  ${epKey}: Episode ${epKey}`);
                    });
                    if (episodeKeys.length > 20) {
                        console.log(`  ... and ${episodeKeys.length - 20} more episodes`);
                    }
                    
                    // Select episode based on user input
                    let selectedEpisodeKey = null;
                    
                    if (episode !== null) {
                        // User specified episode number
                        if (episodes[episode.toString()]) {
                            selectedEpisodeKey = episode.toString();
                            console.log(`\nUsing specified episode ${episode}`);
                        } else {
                            console.log(`\nEpisode ${episode} not found. Available episodes: ${episodeKeys.slice(0, 10)}...`);
                            selectedEpisodeKey = episodeKeys[0];
                            console.log(`Using first available episode: ${selectedEpisodeKey}`);
                        }
                    } else {
                        // Use first episode by default
                        selectedEpisodeKey = episodeKeys[0];
                        console.log(`\nUsing first episode: ${selectedEpisodeKey}`);
                    }
                    
                    const token = episodes[selectedEpisodeKey].token;
                    console.log(`Episode ${selectedEpisodeKey} token: ${token}`);
                    
                    return encrypt(token).then(encToken => {
                        return getJson(`${KAI_AJAX}/links/list?token=${token}&_=${encToken}`);
                    }).then(serversResp => {
                        return parseHtml(serversResp.result);
                    }).then(servers => {
                        console.log(`Found servers: ${Object.keys(servers)}`);
                        
                        // Show available servers
                        console.log("\nAvailable servers:");
                        Object.keys(servers).forEach(serverType => {
                            const serverList = servers[serverType];
                            console.log(`  ${serverType}: ${Object.keys(serverList).length} servers`);
                            Object.keys(serverList).slice(0, 5).forEach(serverKey => {
                                console.log(`    - ${serverType} server ${serverKey}`);
                            });
                        });
                        
                        // --- PART 4: Fetch Streams from ALL Servers ---
                        console.log("\n\n4. FETCHING STREAMS FROM ALL SERVERS");
                        console.log("-".repeat(40));
                        
                        const allStreams = [];
                        const allSubtitles = [];
                        const allThumbnails = [];
                        
                        // Process all servers
                        const serverPromises = [];
                        
                        Object.keys(servers).forEach(serverType => {
                            console.log(`\nProcessing ${serverType.toUpperCase()} servers...`);
                            
                            Object.keys(servers[serverType]).forEach(serverKey => {
                                const serverData = servers[serverType][serverKey];
                                const lid = serverData.lid;
                                
                                console.log(`  Fetching ${serverType} server ${serverKey} (lid: ${lid})`);
                                
                                const serverPromise = encrypt(lid)
                                    .then(encLid => {
                                        return getJson(`${KAI_AJAX}/links/view?id=${lid}&_=${encLid}`);
                                    })
                                    .then(embedResp => {
                                        const encrypted = embedResp.result;
                                        return decrypt(encrypted);
                                    })
                                    .then(decrypted => {
                                        if (decrypted && typeof decrypted === 'object' && decrypted.url) {
                                            const embedUrl = decrypted.url;
                                            console.log(`    Embed URL: ${embedUrl}`);
                                            
                                            return decryptMegaMedia(embedUrl)
                                                .then(mediaData => {
                                                    return formatStreamsData(mediaData);
                                                })
                                                .then(formattedData => {
                                                    // Categorize streams by server type
                                                    formattedData.streams.forEach(stream => {
                                                        stream.serverType = serverType;
                                                        stream.serverKey = serverKey;
                                                        stream.serverLid = lid;
                                                        allStreams.push(stream);
                                                    });
                                                    
                                                    // Collect subtitles and thumbnails
                                                    allSubtitles.push(...formattedData.subtitles);
                                                    allThumbnails.push(...formattedData.thumbnails);
                                                    
                                                    console.log(`    ✅ Found ${formattedData.streams.length} stream(s)`);
                                                })
                                                .catch(error => {
                                                    console.log(`    ❌ Error decrypting media: ${error.message}`);
                                                });
                                        } else {
                                            console.log(`    ❌ No embed URL found`);
                                        }
                                    })
                                    .catch(error => {
                                        console.log(`    ❌ Error processing server: ${error.message}`);
                                    });
                                
                                serverPromises.push(serverPromise);
                            });
                        });
                        
                        // Wait for all servers to complete
                        return Promise.all(serverPromises)
                            .then(() => {
                                // --- PART 5: Format Final Results ---
                                console.log(`\n\n5. FINAL STREAMING RESULTS`);
                                console.log("-".repeat(40));
                                
                                // Group streams by server type
                                const streamsByType = {};
                                allStreams.forEach(stream => {
                                    const serverType = stream.serverType;
                                    if (!streamsByType[serverType]) {
                                        streamsByType[serverType] = [];
                                    }
                                    streamsByType[serverType].push(stream);
                                });
                                
                                // Remove duplicate subtitles and thumbnails
                                const uniqueSubtitles = allSubtitles.filter((sub, index, self) => 
                                    index === self.findIndex(s => s.url === sub.url)
                                );
                                const uniqueThumbnails = allThumbnails.filter((thumb, index, self) => 
                                    index === self.findIndex(t => t.url === thumb.url)
                                );
                                
                                // Create final formatted result
                                const finalResult = {
                                    streamsByServer: streamsByType,
                                    allStreams: allStreams,
                                    subtitles: uniqueSubtitles,
                                    thumbnails: uniqueThumbnails,
                                    totalStreams: allStreams.length,
                                    serverTypesAvailable: Object.keys(streamsByType),
                                    streamsPerServer: Object.keys(streamsByType).reduce((acc, serverType) => {
                                        acc[serverType] = streamsByType[serverType].length;
                                        return acc;
                                    }, {})
                                };
                                
                                console.log(`\n${'-'.repeat(25)} Complete Streaming Data ${'-'.repeat(25)}\n`);
                                console.log(JSON.stringify(finalResult, null, 2));
                                
                                console.log("\n" + "=".repeat(60));
                                console.log("STREAMING LINKS EXTRACTION COMPLETE");
                                console.log("=".repeat(60));
                                console.log(`Total streams found: ${allStreams.length}`);
                                console.log(`Server types: ${Object.keys(streamsByType).join(', ')}`);
                                Object.keys(streamsByType).forEach(serverType => {
                                    console.log(`  ${serverType}: ${streamsByType[serverType].length} stream(s)`);
                                });
                            });
                    });
                });
        })
        .catch(error => {
            console.error(`Error in anime search/extraction: ${error.message}`);
        });
}

// Command line argument parsing
function getAnimeNameFromArgs() {
    const args = process.argv.slice(2);
    const animeArgs = [];
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--season=') || arg.startsWith('--episode=') || 
            arg === '-s' || arg === '-e') {
            // Skip season/episode arguments
            if (arg === '-s' || arg === '-e') {
                i++; // Skip the next argument (the value)
            }
        } else {
            animeArgs.push(arg);
        }
    }
    
    if (animeArgs.length > 0) {
        return animeArgs.join(' ');
    }
    return "cyberpunk edgerunners"; // Default
}

function parseSeasonEpisodeArgs() {
    const args = process.argv.slice(2);
    let season = null;
    let episode = null;
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--season=')) {
            season = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--episode=')) {
            episode = parseInt(arg.split('=')[1]);
        } else if (arg === '-s' && i + 1 < args.length) {
            season = parseInt(args[i + 1]);
            i++; // Skip the next argument
        } else if (arg === '-e' && i + 1 < args.length) {
            episode = parseInt(args[i + 1]);
            i++; // Skip the next argument
        }
    }
    
    return { season, episode };
}

// Run the test with command line argument or default
const animeName = getAnimeNameFromArgs();
const { season, episode } = parseSeasonEpisodeArgs();
runAnimeKaiTest(animeName, season, episode);
