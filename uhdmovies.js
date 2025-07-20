// UHD Movies Scraper for Nuvio Local Scrapers
// React Native compatible version based on original Node.js implementation

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

// Extract quality information from page title
function extractQualityFromTitle(pageTitle) {
  if (!pageTitle) return 'Unknown Quality';
  
  const qualities = [];
  const title = pageTitle.toLowerCase();
  
  // Extract resolution
  if (title.includes('2160p') || title.includes('4k')) {
    qualities.push('4K');
  } else if (title.includes('1080p')) {
    qualities.push('1080p');
  } else if (title.includes('720p')) {
    qualities.push('720p');
  } else if (title.includes('480p')) {
    qualities.push('480p');
  }
  
  // Extract special features
  if (title.includes('hdr')) qualities.push('HDR');
  if (title.includes('dolby vision') || title.includes('dv')) qualities.push('DV');
  if (title.includes('imax')) qualities.push('IMAX');
  if (title.includes('bluray') || title.includes('blu-ray')) qualities.push('BluRay');
  if (title.includes('hevc') || title.includes('x265')) qualities.push('HEVC');
  if (title.includes('10bit')) qualities.push('10bit');
  
  return qualities.length > 0 ? qualities.join(' | ') : 'Unknown Quality';
}

// Extract download links from movie page
async function extractDownloadLinks(movieUrl) {
  try {
    console.log(`[UHDMovies] Extracting links from: ${movieUrl}`);
    
    const response = await makeRequest(movieUrl);
    const html = await response.text();
    
    const links = [];
    
    // Extract page title for quality info
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1] : '';
    const pageTitleQualities = extractQualityFromTitle(pageTitle);
    
    // Look for download links with the new patterns
    const downloadLinkRegex = /<a[^>]*href="([^"]*(?:tech\.unblockedgames\.world|tech\.examzculture\.in)[^"]*)"/gi;
    let match;
    
    while ((match = downloadLinkRegex.exec(html)) !== null) {
      const url = match[1];
      
      if (!links.some(link => link.url === url)) {
        // Look for quality information before this link
        const linkIndex = html.indexOf(match[0]);
        const contextBefore = html.substring(Math.max(0, linkIndex - 1000), linkIndex);
        const contextAfter = html.substring(linkIndex, Math.min(html.length, linkIndex + 500));
        const fullContext = contextBefore + contextAfter;
        
        let currentQuality = 'Unknown Quality';
        let size = 'Unknown';
        
        // Look for quality headers (usually in <pre>, <p><strong>, etc.)
        const qualityPatterns = [
          /<(?:pre|p|h[1-6])[^>]*>\s*<(?:strong|b)[^>]*>([^<]+)<\/(?:strong|b)>\s*<\/(?:pre|p|h[1-6])>/gi,
          /<(?:pre|p)[^>]*>([^<]*(?:1080p|720p|2160p|4K|HEVC|x264|x265)[^<]*)<\/(?:pre|p)>/gi,
          /<(?:strong|b)[^>]*>([^<]*(?:1080p|720p|2160p|4K|HEVC|x264|x265)[^<]*)<\/(?:strong|b)>/gi,
          // Look for text patterns that contain quality info
          /\b((?:720p|1080p|2160p|4K).*?(?:HEVC|x264|x265).*?)\b/gi,
          /\b((?:HEVC|x264|x265).*?(?:720p|1080p|2160p|4K).*?)\b/gi
        ];
        
        let qualityFound = false;
        for (const pattern of qualityPatterns) {
          const qualityMatches = [...fullContext.matchAll(pattern)];
          if (qualityMatches.length > 0) {
            const lastMatch = qualityMatches[qualityMatches.length - 1];
            if (lastMatch[1] && lastMatch[1].trim().length > 5) {
              currentQuality = lastMatch[1].trim();
              qualityFound = true;
              break;
            }
          }
        }
        
        // If no quality found in context, extract from nearby text
        if (!qualityFound) {
          const nearbyText = fullContext.replace(/<[^>]*>/g, ' ');
          const extractedQuality = extractQualityFromTitle(nearbyText);
          if (extractedQuality !== 'Unknown Quality') {
            currentQuality = extractedQuality;
            qualityFound = true;
          }
        }
        
        // Fallback to page title qualities if still no quality found
        if (!qualityFound && pageTitleQualities !== 'Unknown Quality') {
          currentQuality = pageTitleQualities;
        }
        
        // Extract size from quality text or context
        const sizeMatch = fullContext.match(/\[([0-9.,]+\s*[KMGT]B[^\]]*)\]/i) || 
                         fullContext.match(/\b([0-9.,]+\s*[KMGT]B)\b/i);
        if (sizeMatch) {
          size = sizeMatch[1];
        }
        
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

// Function to resolve SID links to driveleech URLs (React Native compatible)
async function resolveSidToDriveleech(sidUrl) {
  console.log(`[UHDMovies] Resolving SID link: ${sidUrl}`);
  const origin = new URL(sidUrl).origin;
  
  try {
    // Step 0: Get the _wp_http value
    console.log("  [SID] Step 0: Fetching initial page...");
    const responseStep0 = await makeRequest(sidUrl);
    const html0 = await responseStep0.text();
    
    const wpHttpRegex = /<input[^>]*name="_wp_http"[^>]*value="([^"]*)"[^>]*>/i;
    const actionRegex = /<form[^>]*id="landing"[^>]*action="([^"]*)"[^>]*>/i;
    
    const wpHttpMatch = wpHttpRegex.exec(html0);
    const actionMatch = actionRegex.exec(html0);
    
    if (!wpHttpMatch || !actionMatch) {
      console.error("  [SID] Error: Could not find _wp_http in initial form.");
      return null;
    }
    
    const wpHttp = wpHttpMatch[1];
    const actionUrl = actionMatch[1];

    // Step 1: POST to the first form's action URL
    console.log("  [SID] Step 1: Submitting initial form...");
    const step1Data = new URLSearchParams({ '_wp_http': wpHttp });
    const responseStep1 = await fetch(actionUrl, {
      method: 'POST',
      body: step1Data,
      headers: { 
        'Referer': sidUrl, 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
      }
    });
    
    const html1 = await responseStep1.text();

    // Step 2: Parse verification page for second form
    console.log("  [SID] Step 2: Parsing verification page...");
    const action2Regex = /<form[^>]*id="landing"[^>]*action="([^"]*)"[^>]*>/i;
    const wpHttp2Regex = /<input[^>]*name="_wp_http2"[^>]*value="([^"]*)"[^>]*>/i;
    const tokenRegex = /<input[^>]*name="token"[^>]*value="([^"]*)"[^>]*>/i;
    
    const action2Match = action2Regex.exec(html1);
    const wpHttp2Match = wpHttp2Regex.exec(html1);
    const tokenMatch = tokenRegex.exec(html1);
    
    if (!action2Match) {
      console.error("  [SID] Error: Could not find verification form action.");
      return null;
    }
    
    const action2Url = action2Match[1];
    const wpHttp2 = wpHttp2Match ? wpHttp2Match[1] : '';
    const token = tokenMatch ? tokenMatch[1] : '';

    // Step 3: POST to the verification URL
    console.log("  [SID] Step 3: Submitting verification...");
    const step2Data = new URLSearchParams({ '_wp_http2': wpHttp2, 'token': token });
    const responseStep2 = await fetch(action2Url, {
      method: 'POST',
      body: step2Data,
      headers: { 
        'Referer': responseStep1.url, 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
      }
    });
    
    const html2 = await responseStep2.text();

    // Step 4: Find dynamic cookie and link from JavaScript
    console.log("  [SID] Step 4: Parsing final page for JS data...");
    let finalLinkPath = null;
    let cookieName = null;
    let cookieValue = null;

    // Look for the JavaScript patterns from the original
    const cookieMatch = html2.match(/s_343\('([^']+)',\s*'([^']+)'/);
    const linkMatch = html2.match(/c\.setAttribute\("href",\s*"([^"]+)"\)/);

    if (cookieMatch) {
      cookieName = cookieMatch[1].trim();
      cookieValue = cookieMatch[2].trim();
    }
    if (linkMatch) {
      finalLinkPath = linkMatch[1].trim();
    }

    if (!finalLinkPath || !cookieName || !cookieValue) {
      console.error("  [SID] Error: Could not extract dynamic cookie/link from JS.");
      return null;
    }

    const finalUrl = new URL(finalLinkPath, origin).href;
    console.log(`  [SID] Dynamic link found: ${finalUrl}`);
    console.log(`  [SID] Dynamic cookie found: ${cookieName}=${cookieValue}`);

    // Step 5: Set cookie and make final request
    console.log("  [SID] Step 5: Setting cookie and making final request...");
    const cookieHeader = `${cookieName}=${cookieValue}`;

    const finalResponse = await fetch(finalUrl, {
      headers: { 
        'Referer': responseStep2.url,
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
      }
    });
    
    const finalHtml = await finalResponse.text();

    // Step 6: Extract driveleech URL from meta refresh tag
    const metaRefreshRegex = /<meta[^>]*http-equiv="refresh"[^>]*content="[^"]*url=([^"]*)"[^>]*>/i;
    const metaMatch = metaRefreshRegex.exec(finalHtml);
    
    if (metaMatch && metaMatch[1]) {
      const driveleechUrl = metaMatch[1].replace(/['"]/g, '');
      console.log(`  [SID] SUCCESS! Resolved Driveleech URL: ${driveleechUrl}`);
      return driveleechUrl;
    }

    console.error("  [SID] Error: Could not find meta refresh tag with Driveleech URL.");
    return null;

  } catch (error) {
    console.error(`  [SID] Error during SID resolution: ${error.message}`);
    return null;
  }
}

// Function to try Instant Download method
async function tryInstantDownload(html) {
  // Look for video-seed.pro or video-leech.pro links (the actual instant download pattern)
  const videoSeedRegex = /href="([^"]*(?:video-seed\.pro|video-leech\.pro)[^"]*)"/i;
  const match = videoSeedRegex.exec(html);
  
  if (!match || !match[1]) {
    return null;
  }

  const instantDownloadLink = match[1];
  console.log('[UHDMovies] Found "Instant Download" link, attempting to extract final URL...');

  try {
    const url = new URL(instantDownloadLink);
    const keys = url.searchParams.get('url');

    if (keys) {
      const apiUrl = `${url.origin}/api`;
      const formData = new URLSearchParams();
      formData.append('keys', keys);

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-token': url.hostname,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (apiResponse.ok) {
        const responseData = await apiResponse.json();
        if (responseData && responseData.url) {
          let finalUrl = responseData.url;
          // Fix spaces in workers.dev URLs by encoding them properly
          if (finalUrl.includes('workers.dev')) {
            const urlParts = finalUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            const encodedFilename = filename.replace(/ /g, '%20');
            urlParts[urlParts.length - 1] = encodedFilename;
            finalUrl = urlParts.join('/');
          }
          console.log('[UHDMovies] Extracted final link from API:', finalUrl);
          return finalUrl;
        }
      }
    }

    console.log('[UHDMovies] Could not find a valid final download link from Instant Download.');
    return null;
  } catch (error) {
    console.log(`[UHDMovies] Error processing "Instant Download": ${error.message}`);
    return null;
  }
}

// Function to try Resume Cloud method
async function tryResumeCloud(html) {
  // Try multiple patterns to match the resume cloud button
  const patterns = [
    /<a[^>]*href="([^"]*)"[^>]*class="[^"]*btn-warning[^"]*"[^>]*>.*?Resume Cloud.*?<\/a>/i,
    /href="([^"]*zfile[^"]*)"/i,
    /<a[^>]*href="([^"]*)"[^>]*>.*?Resume Cloud.*?<\/a>/i
  ];
  
  let resumeLink = null;
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      resumeLink = match[1];
      console.log(`[UHDMovies] Found "Resume Cloud" link using pattern: ${resumeLink}`);
      break;
    }
  }
  
  if (!resumeLink) {
    console.log('[UHDMovies] No Resume Cloud link found');
    return null;
  }

  // Check if it's already a direct download link (workers.dev)
  if (resumeLink.includes('workers.dev')) {
    let directLink = resumeLink;
    // Fix spaces in workers.dev URLs by encoding them properly
    const urlParts = directLink.split('/');
    const filename = urlParts[urlParts.length - 1];
    const encodedFilename = filename.replace(/ /g, '%20');
    urlParts[urlParts.length - 1] = encodedFilename;
    directLink = urlParts.join('/');
    console.log(`[UHDMovies] Found direct "Cloud Resume Download" link: ${directLink}`);
    return directLink;
  }

  // Otherwise, follow the link to get the final download
  try {
    const resumeUrl = resumeLink.startsWith('http') ? resumeLink : new URL(resumeLink, 'https://driveleech.net').href;
    console.log(`[UHDMovies] Found 'Resume Cloud' page link. Following to: ${resumeUrl}`);

    const finalPageResponse = await makeRequest(resumeUrl);
    const finalPageHtml = await finalPageResponse.text();

    // Look for direct download links with multiple patterns
    const downloadLinkPatterns = [
      /<a[^>]*class="[^"]*btn-success[^"]*"[^>]*href="([^"]*workers\.dev[^"]*)"[^>]*>/i,
      /<a[^>]*href="([^"]*workers\.dev[^"]*)"[^>]*class="[^"]*btn-success[^"]*"[^>]*>/i,
      /<a[^>]*href="([^"]*driveleech\.net\/d\/[^"]*)"[^>]*>/i,
      /<a[^>]*href="([^"]*)"[^>]*>.*?Download.*?<\/a>/i
    ];

    let finalDownloadLink = null;
    for (const pattern of downloadLinkPatterns) {
      const linkMatch = pattern.exec(finalPageHtml);
      if (linkMatch && linkMatch[1]) {
        finalDownloadLink = linkMatch[1];
        break;
      }
    }

    if (finalDownloadLink) {
      // Fix spaces in workers.dev URLs by encoding them properly
      if (finalDownloadLink.includes('workers.dev')) {
        const urlParts = finalDownloadLink.split('/');
        const filename = urlParts[urlParts.length - 1];
        const encodedFilename = filename.replace(/ /g, '%20');
        urlParts[urlParts.length - 1] = encodedFilename;
        finalDownloadLink = urlParts.join('/');
      }
      console.log(`[UHDMovies] Extracted final Resume Cloud link: ${finalDownloadLink}`);
      return finalDownloadLink;
    } else {
      console.log('[UHDMovies] Could not find the final download link on the "Resume Cloud" page.');
      return null;
    }
  } catch (error) {
    console.log(`[UHDMovies] Error processing "Resume Cloud": ${error.message}`);
    return null;
  }
}

// Validate if a video URL is working (not 404 or broken)
async function validateVideoUrl(url, timeout = 10000) {
  try {
    console.log(`[UHDMovies] Validating URL: ${url.substring(0, 100)}...`);
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Range': 'bytes=0-1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.ok || response.status === 206) {
      console.log(`[UHDMovies] ✓ URL validation successful (${response.status})`);
      return true;
    } else {
      console.log(`[UHDMovies] ✗ URL validation failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`[UHDMovies] ✗ URL validation failed: ${error.message}`);
    return false;
  }
}

// Function to get final download URL from driveleech page
async function getFinalLink(driveleechUrl) {
  try {
    console.log(`[UHDMovies] Processing driveleech page: ${driveleechUrl}`);
    
    const response = await makeRequest(driveleechUrl);
    const html = await response.text();
    
    // Check for JavaScript redirect
    const jsRedirectRegex = /window\.location\.replace\("([^"]+)"\)/;
    const jsMatch = jsRedirectRegex.exec(html);
    
    let finalHtml = html;
    if (jsMatch) {
      const newUrl = new URL(jsMatch[1], 'https://driveleech.net/').href;
      console.log(`[UHDMovies] Found JavaScript redirect to: ${newUrl}`);
      const newResponse = await makeRequest(newUrl);
      finalHtml = await newResponse.text();
    }
    
    // Extract size and filename information
    let sizeInfo = 'Unknown';
    let fileName = null;
    
    const sizeRegex = /Size\s*:\s*([0-9.,]+\s*[KMGT]B)/i;
    const sizeMatch = sizeRegex.exec(finalHtml);
    if (sizeMatch) {
      sizeInfo = sizeMatch[1];
    }
    
    const nameRegex = /Name\s*:\s*([^<\n]+)/i;
    const nameMatch = nameRegex.exec(finalHtml);
    if (nameMatch) {
      fileName = nameMatch[1].trim();
    }
    
    // Try download methods
    const downloadMethods = [
      { name: 'Resume Cloud', func: tryResumeCloud },
      { name: 'Instant Download', func: tryInstantDownload }
    ];
    
    for (const method of downloadMethods) {
      try {
        console.log(`[UHDMovies] Trying ${method.name}...`);
        const finalUrl = await method.func(finalHtml);
        
        if (finalUrl) {
          const isValid = await validateVideoUrl(finalUrl);
          if (isValid) {
            console.log(`[UHDMovies] ✓ Successfully resolved using ${method.name}`);
            return { url: finalUrl, size: sizeInfo, fileName: fileName };
          } else {
            console.log(`[UHDMovies] ✗ ${method.name} returned invalid URL, trying next method...`);
          }
        }
      } catch (error) {
        console.log(`[UHDMovies] ✗ ${method.name} failed: ${error.message}`);
      }
    }
    
    console.log('[UHDMovies] ✗ All download methods failed');
    return null;
    
  } catch (error) {
    console.error(`[UHDMovies] Error in getFinalLink: ${error.message}`);
    return null;
  }
}

// Resolve download links with full processing chain
async function resolveDownloadLink(linkInfo) {
  try {
    console.log(`[UHDMovies] Resolving link: ${linkInfo.quality}`);
    
    // Step 1: Resolve SID link to driveleech URL
    let driveleechUrl = null;
    
    if (linkInfo.url.includes('tech.unblockedgames.world') || 
        linkInfo.url.includes('tech.examzculture.in') ||
        linkInfo.url.includes('tech.creativeexpressionsblog.com')) {
      driveleechUrl = await resolveSidToDriveleech(linkInfo.url);
    } else if (linkInfo.url.includes('driveleech.net') || linkInfo.url.includes('driveseed.org')) {
      driveleechUrl = linkInfo.url;
    }
    
    if (!driveleechUrl) {
      console.log(`[UHDMovies] Could not resolve SID link for ${linkInfo.quality}`);
      return null;
    }
    
    // Filter out non-driveleech/driveseed URLs
    if (!driveleechUrl.includes('driveleech.net') && !driveleechUrl.includes('driveseed.org')) {
      console.log(`[UHDMovies] Skipping non-driveleech URL: ${driveleechUrl}`);
      return null;
    }
    
    // Step 2: Get final streaming URL from driveleech page
    const finalLinkInfo = await getFinalLink(driveleechUrl);
    
    if (!finalLinkInfo) {
      console.log(`[UHDMovies] Could not get final link for ${linkInfo.quality}`);
      return null;
    }
    
    // Step 3: Return formatted stream info
    const fileName = finalLinkInfo.fileName || linkInfo.quality;
    const cleanFileName = fileName.replace(/\.[^/.]+$/, "").replace(/[._]/g, ' ');
    
    return {
      name: `UHD Movies`,
      title: `${cleanFileName}\n${finalLinkInfo.size}`,
      url: finalLinkInfo.url,
      quality: linkInfo.quality,
      size: finalLinkInfo.size,
      fileName: finalLinkInfo.fileName,
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