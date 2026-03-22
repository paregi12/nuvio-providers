import cheerio from 'cheerio-without-node-native';
import { MAIN_URL, HEADERS } from './constants.js';
import { search, fetchText, getImdbIdFromPage, getMediaDetails, extractQuality } from './utils.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. Get media info from TMDB to get the title
        const mediaInfo = await getMediaDetails(tmdbId, mediaType);
        if (!mediaInfo) return [];
        const title = mediaInfo.title || mediaInfo.name;

        // 2. Search on CinemaCity
        let searchHtml = await search(title);
        let $search = cheerio.load(searchHtml);
        
        let mediaUrl = null;
        const findMatch = ($) => {
            let matchedUrl = null;
            $('div.dar-short_item').each((i, el) => {
                const $el = $(el);
                const anchor = $el.find('a').filter((i, a) => $(a).attr('href').includes('.html')).first();
                const fullText = anchor.text();
                const foundTitle = fullText.split('(')[0].trim();
                const href = anchor.attr('href');
                
                if (!foundTitle || !href) return;

                // console.log(`[CinemaCity] Checking: "${foundTitle}" (${href})`);
                
                if (foundTitle.toLowerCase() === title.toLowerCase() || 
                    foundTitle.toLowerCase().includes(title.toLowerCase()) || 
                    title.toLowerCase().includes(foundTitle.toLowerCase())) {
                    matchedUrl = href;
                    return false;
                }
            });
            return matchedUrl;
        };

        mediaUrl = findMatch($search);

        if (!mediaUrl) {
            console.log(`[CinemaCity] Not found in search, checking homepage...`);
            const homeHtml = await fetchText(MAIN_URL);
            mediaUrl = findMatch(cheerio.load(homeHtml));
        }

        if (!mediaUrl) return [];
        console.log(`[CinemaCity] Matched: ${mediaUrl}`);

        // 3. Load the media page
        const pageHtml = await fetchText(mediaUrl);
        const $page = cheerio.load(pageHtml);

        // 4. Extract PlayerJS configuration
        let fileData = null;
        let subtitleData = null;

        $page('script').each((i, el) => {
            if (fileData) return; // Already found

            const scriptContent = $page(el).html();
            if (scriptContent.includes('atob("')) {
                const b64Match = scriptContent.match(/atob\("([^"]+)"\)/);
                if (b64Match && b64Match[1]) {
                    try {
                        const decoded = atob(b64Match[1]);
                        
                        const fileMatch = decoded.match(/"?file"?\s*[:=]\s*(['"])(.*?)\1/s) || decoded.match(/"?file"?\s*[:=]\s*(\[.*?\]|{.*?})/s);
                        if (fileMatch) {
                            let rawFile = fileMatch[2] || fileMatch[1];
                            if (rawFile.startsWith('[') || rawFile.startsWith('{')) {
                                try {
                                    const unescaped = rawFile.replace(/\\(.)/g, '$1');
                                    fileData = JSON.parse(unescaped);
                                } catch (e) {
                                    try {
                                        fileData = JSON.parse(rawFile);
                                    } catch (e2) {
                                        fileData = rawFile;
                                    }
                                }
                            } else {
                                fileData = rawFile;
                            }
                        }

                        const subtitleMatch = decoded.match(/"?subtitle"?\s*[:=]\s*['"]([^'"]+)['"]/);
                        if (subtitleMatch) {
                            subtitleData = subtitleMatch[1];
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            }
        });

        if (!fileData) {
            console.log(`[CinemaCity] No stream data found on page`);
            return [];
        }

        const streams = [];

        // Helper to process a file string which might contain multiple qualities
        // Format: "[1080p]https://url1,[720p]https://url2" or just "https://url" or Nginx VoD "https://...,file1,file2,.urlset/master.m3u8"
        const processStreamString = (fileString, baseTitle) => {
            if (fileString.includes('.urlset/master.m3u8')) {
                // Add the unified "Auto" (HLS) link first
                streams.push({
                    name: "CinemaCity",
                    title: baseTitle,
                    url: fileString,
                    quality: "Auto",
                    headers: { ...HEADERS, Referer: mediaUrl }
                });

                // Now extract individual quality links for manual selection
                const parts = fileString.split(',');
                const baseUrl = parts[0]; // The first part is the base directory
                
                parts.slice(1).forEach(part => {
                    if (part.includes('.mp4')) {
                        const quality = extractQuality(part);
                        streams.push({
                            name: "CinemaCity",
                            title: baseTitle,
                            url: baseUrl + part,
                            quality: quality,
                            headers: { ...HEADERS, Referer: mediaUrl }
                        });
                    }
                });
                return;
            }

            // Split only if we see the PlayerJS quality bracket format [1080p]...
            const urls = fileString.includes('[') ? fileString.split(',') : [fileString];
            urls.forEach(urlStr => {
                if (!urlStr.trim()) return;
                
                let finalUrl = urlStr;
                let quality = extractQuality(urlStr);
                
                const qualityMatch = urlStr.match(/\[(.*?)\](.*)/);
                if (qualityMatch) {
                    quality = qualityMatch[1];
                    finalUrl = qualityMatch[2];
                }
                
                streams.push({
                    name: "CinemaCity",
                    title: baseTitle,
                    url: finalUrl,
                    quality: quality,
                    headers: { ...HEADERS, Referer: mediaUrl }
                });
            });
        };

        if (mediaType === 'movie') {
            // Movie logic
            if (Array.isArray(fileData)) {
                // E.g. [{"title":"WEB-DL","file":"https://..."}]
                const movieObj = fileData.find(f => !f.folder && f.file);
                if (movieObj) {
                    processStreamString(movieObj.file, title);
                } else if (fileData[0] && fileData[0].file) {
                    processStreamString(fileData[0].file, title);
                }
            } else if (typeof fileData === 'string') {
                processStreamString(fileData, title);
            }
        } else {
            // TV Series logic
            if (Array.isArray(fileData)) {
                // fileData is array of seasons
                const targetSeasonLabel = `Season ${season}`;
                const seasonObj = fileData.find(s => s.title && s.title.includes(targetSeasonLabel));
                
                if (seasonObj && seasonObj.folder) {
                    const targetEpisodeLabel = `Episode ${episode}`;
                    const episodeObj = seasonObj.folder.find(e => e.title && e.title.includes(targetEpisodeLabel));
                    
                    if (episodeObj && episodeObj.file) {
                        processStreamString(episodeObj.file, `${title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`);
                    } else if (episodeObj && episodeObj.folder) {
                        // Sometimes episodes have multiple sources in a nested folder array
                        episodeObj.folder.forEach(source => {
                            if (source.file) {
                                processStreamString(source.file, `${title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`);
                            }
                        });
                    }
                }
            }
        }

        return streams;
    } catch (error) {
        console.error(`[CinemaCity] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
