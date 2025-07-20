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

// Simple HTML parser (basic cheerio replacement)
function parseHTML(html) {
  // This is a simplified parser - in a real implementation you'd use a proper HTML parser
  // For now, we'll use regex patterns to extract what we need
  return {
    find: (selector) => {
      const results = [];
      
      if (selector === '.post-title a') {
        const titleRegex = /<h2[^>]*class="[^"]*post-title[^"]*"[^>]*>.*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let match;
        while ((match = titleRegex.exec(html)) !== null) {
          results.push({
            href: match[1],
            text: match[2].trim()
          });
        }
      }
      
      return results;
    }
  };
}

// Search for movies on UHD Movies
async function searchMovies(query) {
  try {
    const domain = await getUHDMoviesDomain();
    const searchUrl = `${domain}/?s=${encodeURIComponent(query)}`;
    
    console.log(`[UHDMovies] Searching: ${searchUrl}`);
    
    const response = await makeRequest(searchUrl);
    const html = await response.text();
    const $ = parseHTML(html);
    
    const results = [];
    const searchResults = $.find('.post-title a');
    
    for (const result of searchResults) {
      const title = result.text;
      const url = result.href;
      
      // Extract year from title
      const yearMatch = title.match(/\((\d{4})\)/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      
      results.push({
        title: title.replace(/\(\d{4}\)/, '').trim(),
        year,
        url
      });
    }
    
    console.log(`[UHDMovies] Found ${results.length} search results`);
    return results;
  } catch (error) {
    console.error(`[UHDMovies] Search failed: ${error.message}`);
    return [];
  }
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
    
    // Extract download links using regex patterns
    const linkPatterns = [
      /href="([^"]+driveleech[^"]+)"/gi,
      /href="([^"]+hubdrive[^"]+)"/gi,
      /href="([^"]+gdtot[^"]+)"/gi
    ];
    
    for (const pattern of linkPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1];
        
        // Extract quality and size info from surrounding text
        const quality = extractQuality(html, url);
        const size = extractSize(html, url);
        
        links.push({
          url,
          quality: quality || 'Unknown',
          size: size || 'Unknown'
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

// Extract quality from HTML context
function extractQuality(html, url) {
  const urlIndex = html.indexOf(url);
  if (urlIndex === -1) return null;
  
  // Look for quality indicators in surrounding text
  const contextStart = Math.max(0, urlIndex - 200);
  const contextEnd = Math.min(html.length, urlIndex + 200);
  const context = html.slice(contextStart, contextEnd);
  
  const qualityPatterns = [
    /\b(4K|2160p)\b/i,
    /\b(1080p)\b/i,
    /\b(720p)\b/i,
    /\b(480p)\b/i
  ];
  
  for (const pattern of qualityPatterns) {
    const match = context.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Extract file size from HTML context
function extractSize(html, url) {
  const urlIndex = html.indexOf(url);
  if (urlIndex === -1) return null;
  
  const contextStart = Math.max(0, urlIndex - 200);
  const contextEnd = Math.min(html.length, urlIndex + 200);
  const context = html.slice(contextStart, contextEnd);
  
  const sizePattern = /\b(\d+(?:\.\d+)?\s*(?:GB|MB|TB))\b/i;
  const match = context.match(sizePattern);
  
  return match ? match[1] : null;
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