// UHD Movies Scraper for Nuvio Local Scrapers
// Converted from Node.js to React Native compatible version

// Constants
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const FALLBACK_DOMAIN = 'https://uhdmovies.email';
const DOMAIN_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

// Global variables for domain caching
let uhdMoviesDomain = FALLBACK_DOMAIN;
let domainCacheTimestamp = 0;

// Fetch latest domain from GitHub
async function getUHDMoviesDomain() {
  const now = Date.now();
  if (now - domainCacheTimestamp < DOMAIN_CACHE_TTL) {
    return uhdMoviesDomain;
  }

  try {
    console.log('[UHDMovies] Fetching latest domain...');
    const response = await fetch('https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.UHDMovies) {
        uhdMoviesDomain = data.UHDMovies;
        domainCacheTimestamp = now;
        console.log(`[UHDMovies] Updated domain to: ${uhdMoviesDomain}`);
      }
    }
  } catch (error) {
    console.error(`[UHDMovies] Failed to fetch latest domain: ${error.message}`);
  }
  
  return uhdMoviesDomain;
}

// Helper function to make HTTP requests
async function makeRequest(url, options = {}) {
  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}



// Search for movies on UHD Movies
async function searchMovies(query) {
  try {
    const domain = await getUHDMoviesDomain();
    const searchUrl = `${domain}/search/${encodeURIComponent(query)}`;
    
    console.log(`[UHDMovies] Searching: ${searchUrl}`);
    
    const response = await makeRequest(searchUrl);
    const html = await response.text();
    
    const results = [];
    
    // Look for grid-based search results (article.gridlove-post)
    const gridPostRegex = /<article[^>]*class="[^"]*gridlove-post[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let gridMatch;
    
    while ((gridMatch = gridPostRegex.exec(html)) !== null) {
      const articleContent = gridMatch[1];
      
      // Look for download links within this article
      const downloadLinkRegex = /<a[^>]*href="([^"]*\/download-[^"]*)"/i;
      const linkMatch = downloadLinkRegex.exec(articleContent);
      
      if (linkMatch) {
        const link = linkMatch[1];
        
        // Extract title from title attribute or h1.sanket
        const titleAttrRegex = /<a[^>]*title="([^"]+)"/i;
        const h1SanketRegex = /<h1[^>]*class="[^"]*sanket[^"]*"[^>]*>([^<]+)<\/h1>/i;
        
        const titleAttrMatch = titleAttrRegex.exec(articleContent);
        const h1SanketMatch = h1SanketRegex.exec(articleContent);
        
        const title = (titleAttrMatch && titleAttrMatch[1]) || (h1SanketMatch && h1SanketMatch[1]) || '';
        
        if (title && !results.some(item => item.url === link)) {
          // Extract year from title
          const yearMatch = title.match(/\((\d{4})\)/);
          const year = yearMatch ? parseInt(yearMatch[1]) : null;
          
          results.push({
            title: title.replace(/\(\d{4}\)/, '').trim(),
            year,
            url: link.startsWith('http') ? link : `${domain}${link}`
          });
        }
      }
    }
    
    // Fallback for original list-based search if new logic fails
    if (results.length === 0) {
      console.log('[UHDMovies] Grid search logic found no results, trying original list-based logic...');
      const downloadLinkRegex = /<a[^>]*href="([^"]*\/download-[^"]*)"/gi;
      let linkMatch;
      
      while ((linkMatch = downloadLinkRegex.exec(html)) !== null) {
        const link = linkMatch[1];
        
        if (link && !results.some(item => item.url === link)) {
          // Try to find title near the link
          const linkIndex = html.indexOf(linkMatch[0]);
          const contextBefore = html.substring(Math.max(0, linkIndex - 500), linkIndex);
          const contextAfter = html.substring(linkIndex, Math.min(html.length, linkIndex + 500));
          
          // Look for title in various patterns
          const titlePatterns = [
            /<title>([^<]+)<\/title>/i,
            /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i,
            /title="([^"]+)"/i
          ];
          
          let title = '';
          for (const pattern of titlePatterns) {
            const match = pattern.exec(contextBefore + contextAfter);
            if (match && match[1]) {
              title = match[1].trim();
              break;
            }
          }
          
          if (title) {
            // Extract year from title
            const yearMatch = title.match(/\((\d{4})\)/);
            const year = yearMatch ? parseInt(yearMatch[1]) : null;
            
            results.push({
              title: title.replace(/\(\d{4}\)/, '').trim(),
              year,
              url: link.startsWith('http') ? link : `${domain}${link}`
            });
          }
        }
      }
    }
    
    console.log(`[UHDMovies] Found ${results.length} search results`);
    return results;
  } catch (error) {
    console.error(`[UHDMovies] Search failed: ${error.message}`);
    return [];
  }
}

// Function to extract clean quality information from verbose text
function extractCleanQuality(fullQualityText) {
  if (!fullQualityText || fullQualityText === 'Unknown Quality') {
    return 'Unknown Quality';
  }

  const cleanedFullQualityText = fullQualityText.replace(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g, '').trim();
  const text = cleanedFullQualityText.toLowerCase();
  let quality = [];

  // Extract resolution
  if (text.includes('2160p') || text.includes('4k')) {
    quality.push('4K');
  } else if (text.includes('1080p')) {
    quality.push('1080p');
  } else if (text.includes('720p')) {
    quality.push('720p');
  } else if (text.includes('480p')) {
    quality.push('480p');
  }

  // Extract special features
  if (text.includes('hdr')) {
    quality.push('HDR');
  }
  if (text.includes('dolby vision') || text.includes('dovi') || /\bdv\b/.test(text)) {
    quality.push('DV');
  }
  if (text.includes('imax')) {
    quality.push('IMAX');
  }
  if (text.includes('bluray') || text.includes('blu-ray')) {
    quality.push('BluRay');
  }

  // If we found any quality indicators, join them
  if (quality.length > 0) {
    return quality.join(' | ');
  }

  // Fallback: try to extract a shorter version of the original text
  const patterns = [
    /(\d{3,4}p.*?(?:x264|x265|hevc).*?)[\[\(]/i,
    /(\d{3,4}p.*?)[\[\(]/i,
    /((?:720p|1080p|2160p|4k).*?)$/i
  ];

  for (const pattern of patterns) {
    const match = cleanedFullQualityText.match(pattern);
    if (match && match[1].trim().length < 100) {
      return match[1].trim().replace(/x265/ig, 'HEVC');
    }
  }

  // Final fallback: truncate if too long
  if (cleanedFullQualityText.length > 80) {
    return cleanedFullQualityText.substring(0, 77).replace(/x265/ig, 'HEVC') + '...';
  }

  return cleanedFullQualityText.replace(/x265/ig, 'HEVC');
}

// Compare media info with search results
function compareMedia(mediaInfo, searchResult) {
  const titleMatch = mediaInfo.title.toLowerCase().includes(searchResult.title.toLowerCase()) ||
                    searchResult.title.toLowerCase().includes(mediaInfo.title.toLowerCase());
  
  const yearMatch = !mediaInfo.year || !searchResult.year || 
                   Math.abs(mediaInfo.year - searchResult.year) <= 1;
  
  return titleMatch && yearMatch;
}

// Extract download links from movie page
async function extractDownloadLinks(movieUrl) {
  try {
    console.log(`[UHDMovies] Extracting links from: ${movieUrl}`);
    
    const response = await makeRequest(movieUrl);
    const html = await response.text();
    
    const links = [];
    let currentQuality = 'Unknown Quality';
    
    // Look for download links with the new patterns
    const downloadLinkRegex = /<a[^>]*href="([^"]*(?:tech\.unblockedgames\.world|tech\.examzculture\.in)[^"]*)"/gi;
    let match;
    
    while ((match = downloadLinkRegex.exec(html)) !== null) {
      const url = match[1];
      
      if (!links.some(link => link.url === url)) {
        // Look for quality information before this link
        const linkIndex = html.indexOf(match[0]);
        const contextBefore = html.substring(Math.max(0, linkIndex - 1000), linkIndex);
        
        // Look for quality headers (usually in <pre>, <p><strong>, etc.)
        const qualityPatterns = [
          /<(?:pre|p|h[1-6])[^>]*>\s*<(?:strong|b)[^>]*>([^<]+)<\/(?:strong|b)>\s*<\/(?:pre|p|h[1-6])>/gi,
          /<(?:pre|p)[^>]*>([^<]*(?:1080p|720p|2160p|4K|HEVC|x264|x265)[^<]*)<\/(?:pre|p)>/gi,
          /<(?:strong|b)[^>]*>([^<]*(?:1080p|720p|2160p|4K|HEVC|x264|x265)[^<]*)<\/(?:strong|b)>/gi
        ];
        
        let qualityFound = false;
        for (const pattern of qualityPatterns) {
          const qualityMatches = [...contextBefore.matchAll(pattern)];
          if (qualityMatches.length > 0) {
            const lastMatch = qualityMatches[qualityMatches.length - 1];
            if (lastMatch[1] && lastMatch[1].trim().length > 5) {
              currentQuality = lastMatch[1].trim();
              qualityFound = true;
              break;
            }
          }
        }
        
        // Extract size from quality text
        const sizeMatch = currentQuality.match(/\[([0-9.,]+\s*[KMGT]B[^\]]*)\]/i);
        const size = sizeMatch ? sizeMatch[1] : 'Unknown';
        
        // Clean quality text
        const cleanQuality = extractCleanQuality(currentQuality);
        
        links.push({
          url,
          quality: cleanQuality,
          size: size,
          rawQuality: currentQuality
        });
      }
    }
    
    console.log(`[UHDMovies] Extracted ${links.length} download links`);
    return links;
  } catch (error) {
    console.error(`[UHDMovies] Failed to extract links: ${error.message}`);
    return [];
  }
}



// Parse size string to bytes for sorting
function parseSize(sizeString) {
  if (!sizeString || typeof sizeString !== 'string') return 0;
  
  const match = sizeString.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  switch (unit) {
    case 'TB': return value * 1024 * 1024 * 1024 * 1024;
    case 'GB': return value * 1024 * 1024 * 1024;
    case 'MB': return value * 1024 * 1024;
    default: return value;
  }
}

// Resolve download links (simplified version)
async function resolveDownloadLink(linkInfo) {
  try {
    // For now, return the original URL
    // In a full implementation, you'd resolve through the various redirect services
    return {
      name: `UHD Movies - ${linkInfo.quality}`,
      url: linkInfo.url,
      quality: linkInfo.quality,
      size: linkInfo.size,
      type: 'direct'
    };
  } catch (error) {
    console.error(`[UHDMovies] Failed to resolve link: ${error.message}`);
    return null;
  }
}

// Main function - this is the interface our local scraper service expects
async function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null) {
  console.log(`[UHDMovies] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === 'tv' ? `, S:${season}E:${episode}` : ''}`);
  
  try {
    // Get TMDB info
    const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const tmdbResponse = await makeRequest(tmdbUrl);
    const tmdbData = await tmdbResponse.json();
    
    const mediaInfo = {
      title: mediaType === 'tv' ? tmdbData.name : tmdbData.title,
      year: parseInt(((mediaType === 'tv' ? tmdbData.first_air_date : tmdbData.release_date) || '').split('-')[0], 10)
    };
    
    if (!mediaInfo.title) {
      throw new Error('Could not extract title from TMDB response');
    }
    
    console.log(`[UHDMovies] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || 'N/A'})`);
    
    // Search for the media
    let searchTitle = mediaInfo.title.replace(/:/g, '').replace(/\s*&\s*/g, ' and ');
    let searchResults = await searchMovies(searchTitle);
    
    // Try fallback search if no results
    if (searchResults.length === 0 || !searchResults.some(result => compareMedia(mediaInfo, result))) {
      console.log(`[UHDMovies] Primary search failed, trying fallback...`);
      const fallbackTitle = mediaInfo.title.split(':')[0].trim();
      if (fallbackTitle !== searchTitle) {
        searchResults = await searchMovies(fallbackTitle);
      }
    }
    
    if (searchResults.length === 0) {
      console.log(`[UHDMovies] No search results found`);
      return [];
    }
    
    // Find best match
    const bestMatch = searchResults.find(result => compareMedia(mediaInfo, result)) || searchResults[0];
    console.log(`[UHDMovies] Using result: "${bestMatch.title}" (${bestMatch.year})`);
    
    // Extract download links
    const downloadLinks = await extractDownloadLinks(bestMatch.url);
    
    if (downloadLinks.length === 0) {
      console.log(`[UHDMovies] No download links found`);
      return [];
    }
    
    // Resolve links to streams
    const streamPromises = downloadLinks.map(link => resolveDownloadLink(link));
    const streams = (await Promise.all(streamPromises)).filter(Boolean);
    
    // Sort by size (largest first)
    streams.sort((a, b) => {
      const sizeA = parseSize(a.size);
      const sizeB = parseSize(b.size);
      return sizeB - sizeA;
    });
    
    console.log(`[UHDMovies] Successfully processed ${streams.length} streams`);
    return streams;
    
  } catch (error) {
    console.error(`[UHDMovies] Error in getStreams: ${error.message}`);
    return [];
  }
}

// Export the main function
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  // For React Native environment
  global.getStreams = getStreams;
}