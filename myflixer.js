// MyFlixer Scraper for Nuvio Local Scrapers
// React Native compatible version - Standalone (no external dependencies)

// Import cheerio-without-node-native for React Native
const cheerio = require('cheerio-without-node-native');
console.log('[MyFlixer] Using cheerio-without-node-native for DOM parsing');

// Constants
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const MAIN_URL = 'https://watch32.sx';
const VIDEOSTR_URL = 'https://videostr.net';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
    };

    return fetch(url, {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers },
        ...options
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    })
    .catch(error => {
        console.error(`[MyFlixer] Request failed for ${url}: ${error.message}`);
        throw error;
    });
}

// Search for content
function searchContent(query) {
    const searchUrl = `${MAIN_URL}/search/${query.replace(/\s+/g, '-')}`;
    console.log(`[MyFlixer] Searching: ${searchUrl}`);
    
    return makeRequest(searchUrl)
        .then(response => response.text())
        .then(html => {
            const $ = cheerio.load(html);
            const results = [];
            
            $('.flw-item').each((i, element) => {
                const title = $(element).find('h2.film-name > a').attr('title');
                const link = $(element).find('h2.film-name > a').attr('href');
                const poster = $(element).find('img.film-poster-img').attr('data-src');
                
                if (title && link) {
                    results.push({
                        title,
                        url: link.startsWith('http') ? link : `${MAIN_URL}${link}`,
                        poster
                    });
                }
            });
            
            console.log(`[MyFlixer] Found ${results.length} search results`);
            return results;
        })
        .catch(error => {
            console.error(`[MyFlixer] Search error: ${error.message}`);
            return [];
        });
}

// Get content details (movie or TV series)
function getContentDetails(url) {
    console.log(`[MyFlixer] Getting content details: ${url}`);
    
    return makeRequest(url)
        .then(response => response.text())
        .then(html => {
            const $ = cheerio.load(html);
            const contentId = $('.detail_page-watch').attr('data-id');
            const name = $('.detail_page-infor h2.heading-name > a').text();
            const isMovie = url.includes('movie');
            
            if (isMovie) {
                return {
                    type: 'movie',
                    name,
                    data: `list/${contentId}`
                };
            } else {
                // Get TV series episodes
                return makeRequest(`${MAIN_URL}/ajax/season/list/${contentId}`)
                    .then(response => response.text())
                    .then(seasonsHtml => {
                        const $seasons = cheerio.load(seasonsHtml);
                        const episodes = [];
                        const seasonPromises = [];
                        
                        $seasons('a.ss-item').each((i, season) => {
                            const seasonId = $(season).attr('data-id');
                            const seasonNum = $(season).text().replace('Season ', '');
                            
                            const episodePromise = makeRequest(`${MAIN_URL}/ajax/season/episodes/${seasonId}`)
                                .then(response => response.text())
                                .then(episodesHtml => {
                                    const $episodes = cheerio.load(episodesHtml);
                                    
                                    $episodes('a.eps-item').each((i, episode) => {
                                        const epId = $(episode).attr('data-id');
                                        const title = $(episode).attr('title');
                                        const match = title.match(/Eps (\d+): (.+)/);
                                        
                                        if (match) {
                                            episodes.push({
                                                id: epId,
                                                episode: parseInt(match[1]),
                                                name: match[2],
                                                season: parseInt(seasonNum.replace('Series', '').trim()),
                                                data: `servers/${epId}`
                                            });
                                        }
                                    });
                                });
                            
                            seasonPromises.push(episodePromise);
                        });
                        
                        return Promise.all(seasonPromises)
                            .then(() => ({
                                type: 'series',
                                name,
                                episodes
                            }));
                    });
            }
        })
        .catch(error => {
            console.error(`[MyFlixer] Content details error: ${error.message}`);
            return null;
        });
}

// Get server links for content
function getServerLinks(data) {
    console.log(`[MyFlixer] Getting server links: ${data}`);
    
    return makeRequest(`${MAIN_URL}/ajax/episode/${data}`)
        .then(response => response.text())
        .then(html => {
            const $ = cheerio.load(html);
            const servers = [];
            
            $('a.link-item').each((i, element) => {
                const linkId = $(element).attr('data-linkid') || $(element).attr('data-id');
                if (linkId) {
                    servers.push(linkId);
                }
            });
            
            return servers;
        })
        .catch(error => {
            console.error(`[MyFlixer] Server links error: ${error.message}`);
            return [];
        });
}

// Get source URL from link ID
function getSourceUrl(linkId) {
    console.log(`[MyFlixer] Getting source URL for linkId: ${linkId}`);
    
    return makeRequest(`${MAIN_URL}/ajax/episode/sources/${linkId}`)
        .then(response => response.json())
        .then(data => data.link)
        .catch(error => {
            console.error(`[MyFlixer] Source URL error: ${error.message}`);
            return null;
        });
}

// Extract M3U8 from Videostr
function extractVideostrM3u8(url) {
    console.log(`[MyFlixer] Extracting from Videostr: ${url}`);
    
    const headers = {
        'Accept': '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': VIDEOSTR_URL,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    // Extract ID from URL
    const id = url.split('/').pop().split('?')[0];
    
    // Get nonce from embed page
    return makeRequest(url, { headers })
        .then(response => response.text())
        .then(embedHtml => {
            // Try to find 48-character nonce
            let nonce = embedHtml.match(/\b[a-zA-Z0-9]{48}\b/);
            if (nonce) {
                nonce = nonce[0];
            } else {
                // Try to find three 16-character segments
                const matches = embedHtml.match(/\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b.*?\b([a-zA-Z0-9]{16})\b/);
                if (matches) {
                    nonce = matches[1] + matches[2] + matches[3];
                }
            }
            
            if (!nonce) {
                throw new Error('Could not extract nonce');
            }
            
            console.log(`[MyFlixer] Extracted nonce: ${nonce}`);
            
            // Get sources from API
            const apiUrl = `${VIDEOSTR_URL}/embed-1/v3/e-1/getSources?id=${id}&_k=${nonce}`;
            console.log(`[MyFlixer] API URL: ${apiUrl}`);
            
            return makeRequest(apiUrl, { headers })
                .then(response => response.json())
                .then(sourcesData => {
                    if (!sourcesData.sources) {
                        throw new Error('No sources found in response');
                    }
                    
                    let m3u8Url = sourcesData.sources;
                    
                    // Check if sources is already an M3U8 URL
                    if (!m3u8Url.includes('.m3u8')) {
                        console.log('[MyFlixer] Sources are encrypted, attempting to decrypt...');
                        
                        // Get decryption key
                        return makeRequest('https://raw.githubusercontent.com/yogesh-hacker/MegacloudKeys/refs/heads/main/keys.json')
                            .then(response => response.json())
                            .then(keyData => {
                                const key = keyData.vidstr;
                                
                                if (!key) {
                                    throw new Error('Could not get decryption key');
                                }
                                
                                // Decrypt using Google Apps Script
                                const decodeUrl = 'https://script.google.com/macros/s/AKfycbx-yHTwupis_JD0lNzoOnxYcEYeXmJZrg7JeMxYnEZnLBy5V0--UxEvP-y9txHyy1TX9Q/exec';
                                const fullUrl = `${decodeUrl}?encrypted_data=${encodeURIComponent(m3u8Url)}&nonce=${encodeURIComponent(nonce)}&secret=${encodeURIComponent(key)}`;
                                
                                return makeRequest(fullUrl)
                                    .then(response => response.text())
                                    .then(decryptedData => {
                                        // Extract file URL from decrypted response
                                        const fileMatch = decryptedData.match(/"file":"(.*?)"/); 
                                        if (fileMatch) {
                                            m3u8Url = fileMatch[1];
                                        } else {
                                            throw new Error('Could not extract video URL from decrypted response');
                                        }
                                        
                                        return m3u8Url;
                                    });
                            });
                    }
                    
                    return Promise.resolve(m3u8Url);
                })
                .then(finalM3u8Url => {
                    console.log(`[MyFlixer] Final M3U8 URL: ${finalM3u8Url}`);
                    
                    // Filter only megacdn links
                    if (!finalM3u8Url.includes('megacdn.co')) {
                        console.log('[MyFlixer] Skipping non-megacdn link');
                        return null;
                    }
                    
                    // Parse master playlist to extract quality streams
                    return parseM3U8Qualities(finalM3u8Url)
                        .then(qualities => ({
                            m3u8Url: finalM3u8Url,
                            qualities,
                            headers: {
                                'Referer': 'https://videostr.net/',
                                'Origin': 'https://videostr.net/'
                            }
                        }));
                });
        })
        .catch(error => {
            console.error(`[MyFlixer] Videostr extraction error: ${error.message}`);
            return null;
        });
}

// Parse M3U8 master playlist to extract qualities
function parseM3U8Qualities(masterUrl) {
    return makeRequest(masterUrl, {
        headers: {
            'Referer': 'https://videostr.net/',
            'Origin': 'https://videostr.net/'
        }
    })
    .then(response => response.text())
    .then(playlist => {
        const qualities = [];
        
        // Parse M3U8 master playlist
        const lines = playlist.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXT-X-STREAM-INF:')) {
                const nextLine = lines[i + 1]?.trim();
                if (nextLine && !nextLine.startsWith('#')) {
                    // Extract resolution and bandwidth
                    const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
                    const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
                    
                    const resolution = resolutionMatch ? resolutionMatch[1] : 'Unknown';
                    const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1]) : 0;
                    
                    // Determine quality label
                    let quality = 'Unknown';
                    if (resolution.includes('1920x1080')) quality = '1080p';
                    else if (resolution.includes('1280x720')) quality = '720p';
                    else if (resolution.includes('640x360')) quality = '360p';
                    else if (resolution.includes('854x480')) quality = '480p';
                    
                    qualities.push({
                        quality,
                        resolution,
                        bandwidth,
                        url: nextLine.startsWith('http') ? nextLine : new URL(nextLine, masterUrl).href
                    });
                }
            }
        }
        
        // Sort by bandwidth (highest first)
        qualities.sort((a, b) => b.bandwidth - a.bandwidth);
        
        return qualities;
    })
    .catch(error => {
        console.error(`[MyFlixer] Error parsing M3U8 qualities: ${error.message}`);
        return [];
    });
}

// Main scraping function
function getStreams(title, year, season, episode, imdbId) {
    console.log(`[MyFlixer] Searching for: ${title} (${year})`);
    
    // Build search query
    const query = year ? `${title} ${year}` : title;
    
    return searchContent(query)
        .then(searchResults => {
            if (searchResults.length === 0) {
                console.log('[MyFlixer] No search results found');
                return [];
            }
            
            console.log(`[MyFlixer] Found ${searchResults.length} results`);
            
            // Try to find exact match first, then partial match
            let selectedResult = searchResults.find(result => 
                result.title.toLowerCase() === query.toLowerCase()
            );
            
            if (!selectedResult) {
                // Look for best partial match (contains all words from query)
                const queryWords = query.toLowerCase().split(' ');
                selectedResult = searchResults.find(result => {
                    const titleLower = result.title.toLowerCase();
                    return queryWords.every(word => titleLower.includes(word));
                });
            }
            
            // Fallback to first result if no good match found
            if (!selectedResult) {
                selectedResult = searchResults[0];
            }
            
            console.log(`[MyFlixer] Selected: ${selectedResult.title}`);
            
            // Get content details
            return getContentDetails(selectedResult.url);
        })
        .then(contentDetails => {
            if (!contentDetails) {
                console.log('[MyFlixer] Could not get content details');
                return [];
            }
            
            let dataToProcess = [];
            
            if (contentDetails.type === 'movie') {
                dataToProcess.push(contentDetails.data);
            } else {
                // For TV series, filter by episode/season if specified
                let episodes = contentDetails.episodes;
                
                if (season) {
                    episodes = episodes.filter(ep => ep.season === season);
                }
                
                if (episode) {
                    episodes = episodes.filter(ep => ep.episode === episode);
                }
                
                if (episodes.length === 0) {
                    console.log('[MyFlixer] No matching episodes found');
                    return [];
                }
                
                // Use first matching episode
                const targetEpisode = episodes[0];
                console.log(`[MyFlixer] Selected episode: S${targetEpisode.season}E${targetEpisode.episode} - ${targetEpisode.name}`);
                dataToProcess.push(targetEpisode.data);
            }
            
            // Process all data
            const allPromises = dataToProcess.map(data => {
                return getServerLinks(data)
                    .then(serverLinks => {
                        console.log(`[MyFlixer] Found ${serverLinks.length} servers`);
                        
                        // Process all server links
                        const linkPromises = serverLinks.map(linkId => {
                            return getSourceUrl(linkId)
                                .then(sourceUrl => {
                                    if (!sourceUrl) return null;
                                    
                                    console.log(`[MyFlixer] Source URL: ${sourceUrl}`);
                                    
                                    // Check if it's a videostr URL
                                    if (sourceUrl.includes('videostr.net')) {
                                        return extractVideostrM3u8(sourceUrl);
                                    }
                                    return null;
                                })
                                .catch(error => {
                                    console.error(`[MyFlixer] Error processing link ${linkId}: ${error.message}`);
                                    return null;
                                });
                        });
                        
                        return Promise.all(linkPromises);
                    });
            });
            
            return Promise.all(allPromises);
        })
        .then(results => {
            // Flatten and filter results
            const allM3u8Links = [];
            for (const serverResults of results) {
                for (const result of serverResults) {
                    if (result) {
                        allM3u8Links.push(result);
                    }
                }
            }
            
            // Convert to Nuvio format
            const formattedLinks = [];
            
            allM3u8Links.forEach(link => {
                if (link.qualities && link.qualities.length > 0) {
                    link.qualities.forEach(quality => {
                        formattedLinks.push({
                            name: `MyFlixer [${quality.quality}]`,
                            url: quality.url,
                            quality: quality.quality,
                            size: `${Math.round(quality.bandwidth / 1000)}kbps`,
                            headers: link.headers || {},
                            subtitles: []
                        });
                    });
                } else {
                    formattedLinks.push({
                        name: 'MyFlixer',
                        url: link.m3u8Url,
                        quality: 'Unknown',
                        size: 'Unknown',
                        headers: link.headers || {},
                        subtitles: []
                    });
                }
            });
            
            console.log(`[MyFlixer] Total found: ${formattedLinks.length} streams`);
            return formattedLinks;
        })
        .catch(error => {
            console.error(`[MyFlixer] Scraping error: ${error.message}`);
            return [];
        });
}

// Export the main function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    // For React Native environment
    global.MyFlixerScraperModule = { getStreams };
}