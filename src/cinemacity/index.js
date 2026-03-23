import cheerio from 'cheerio-without-node-native';
import { MAIN_URL, HEADERS } from './constants.js';
import { search, fetchText, getImdbIdFromPage, getMediaDetails, extractQuality, atob } from './utils.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. Get media info from TMDB to get the title
        const mediaInfo = await getMediaDetails(tmdbId, mediaType);
        if (!mediaInfo) return [];
        const animeTitle = mediaInfo.title || mediaInfo.name;

        // 2. Search on CinemaCity
        let searchHtml = await search(animeTitle);
        let $search = cheerio.load(searchHtml);
        
        let mediaUrl = null;
        const findMatch = ($) => {
            let matchedUrl = null;
            $('div.dar-short_item').each((i, el) => {
                const $el = $(el);
                const anchor = $el.find('a').filter((i, a) => {
                    const href = $(a).attr('href');
                    return href && href.includes('.html');
                }).first();
                const fullText = anchor.text();
                const foundTitle = fullText.split('(')[0].trim();
                const href = anchor.attr('href');
                if (!foundTitle || !href) return;
                if (foundTitle.toLowerCase() === animeTitle.toLowerCase() || 
                    foundTitle.toLowerCase().includes(animeTitle.toLowerCase()) || 
                    animeTitle.toLowerCase().includes(foundTitle.toLowerCase())) {
                    matchedUrl = href;
                    return false;
                }
            });
            return matchedUrl;
        };

        mediaUrl = findMatch($search);
        if (!mediaUrl) {
            const homeHtml = await fetchText(MAIN_URL);
            mediaUrl = findMatch(cheerio.load(homeHtml));
        }

        if (!mediaUrl) return [];

        // 3. Load the media page
        const pageHtml = await fetchText(mediaUrl);
        const $page = cheerio.load(pageHtml);

        // 4. Extract PlayerJS configuration
        let fileData = null;
        $page('script').each((i, el) => {
            if (fileData) return;
            const scriptContent = $page(el).html();
            if (scriptContent && scriptContent.includes('atob(')) {
                // Handle atob('...') or atob("...")
                const b64Match = scriptContent.match(/atob\((['"])(.*?)\1\)/);
                if (b64Match && b64Match[2]) {
                    try {
                        const decoded = atob(b64Match[2]);
                        // Extract "file" property
                        const fileMatch = decoded.match(/file\s*:\s*(['"])(.*?)\1/s) || decoded.match(/file\s*:\s*(\[.*?\])/s);
                        if (fileMatch) {
                            let rawFile = fileMatch[2] || fileMatch[1];
                            if (rawFile.startsWith('[') || rawFile.startsWith('{')) {
                                try {
                                    const unescaped = rawFile.replace(/\\(.)/g, '$1');
                                    fileData = JSON.parse(unescaped);
                                } catch (e) {
                                    try { fileData = JSON.parse(rawFile); } catch (e2) { fileData = rawFile; }
                                }
                            } else {
                                fileData = rawFile;
                            }
                        }
                    } catch (e) {}
                }
            }
        });

        if (!fileData) return [];
        const streams = [];

        const processStreamString = (fileString, baseTitle) => {
            if (!fileString || typeof fileString !== 'string' || fileString.length < 10) return;
            
            if (fileString.includes('.urlset/master.m3u8')) {
                if (fileString.startsWith('http')) {
                    streams.push({
                        name: "CinemaCity", title: baseTitle, url: fileString, quality: "Auto",
                        headers: { ...HEADERS, Referer: mediaUrl }
                    });
                }
                const parts = fileString.split(',');
                const baseUrl = parts[0]; 
                if (baseUrl && baseUrl.startsWith('http')) {
                    parts.slice(1).forEach(part => {
                        if (part.includes('.mp4')) {
                            const quality = extractQuality(part);
                            const finalUrl = baseUrl + part;
                            if (finalUrl.length > baseUrl.length + 5) {
                                streams.push({
                                    name: "CinemaCity", title: baseTitle, url: finalUrl, quality: quality,
                                    headers: { ...HEADERS, Referer: mediaUrl }
                                });
                            }
                        }
                    });
                }
                return;
            }
            
            const urls = fileString.includes('[') ? fileString.split(',') : [fileString];
            urls.forEach(urlStr => {
                if (!urlStr || urlStr.length < 10) return;
                let finalUrl = urlStr;
                let quality = extractQuality(urlStr);
                const qualityMatch = urlStr.match(/\[(.*?)\](.*)/);
                if (qualityMatch) {
                    quality = qualityMatch[1];
                    finalUrl = qualityMatch[2];
                }
                if (finalUrl && finalUrl.startsWith('http')) {
                    streams.push({
                        name: "CinemaCity", title: baseTitle, url: finalUrl, quality: quality,
                        headers: { ...HEADERS, Referer: mediaUrl }
                    });
                }
            });
        };

        if (mediaType === 'movie') {
            if (Array.isArray(fileData)) {
                const movieObj = fileData.find(f => !f.folder && f.file);
                if (movieObj) processStreamString(movieObj.file, animeTitle);
                else if (fileData[0] && fileData[0].file) processStreamString(fileData[0].file, animeTitle);
            } else if (typeof fileData === 'string') {
                processStreamString(fileData, animeTitle);
            }
        } else {
            if (Array.isArray(fileData)) {
                const targetSeasonLabel = `Season ${season}`;
                const seasonObj = fileData.find(s => (s.title && s.title.includes(targetSeasonLabel)) || (s.title && s.title.includes(`S${season}`)));
                if (seasonObj && seasonObj.folder) {
                    const targetEpisodeLabel = `Episode ${episode}`;
                    const episodeObj = seasonObj.folder.find(e => (e.title && e.title.includes(targetEpisodeLabel)) || (e.title && e.title.includes(`E${episode}`)));
                    if (episodeObj && episodeObj.file) {
                        processStreamString(episodeObj.file, `${animeTitle} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`);
                    } else if (episodeObj && episodeObj.folder) {
                        episodeObj.folder.forEach(source => {
                            if (source.file) processStreamString(source.file, `${animeTitle} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`);
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
