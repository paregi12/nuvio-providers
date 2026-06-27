// src/cinemacity/index.js
import cheerio from 'cheerio-without-node-native';
import { atobPolyfill, fetchText, extractQuality } from './utils.js';
import { MAIN_URL, HEADERS, TMDB_API_KEY } from './constants.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    const streams = [];
    try {
        // 1. Get IMDB ID and Title from TMDB
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
        const tmdbRes = await fetch(tmdbUrl, { skipSizeCheck: true });
        const tmdbData = await tmdbRes.json();
        
        const imdbId = tmdbData.external_ids?.imdb_id || tmdbData.imdb_id;
        const animeTitle = mediaType === 'movie' ? tmdbData.title : tmdbData.name;
        
        if (!animeTitle && !imdbId) return [];

        // 2. Search on CinemaCity (Prefer IMDB ID for accuracy)
        const searchQuery = imdbId || animeTitle;
        const searchUrl = `${MAIN_URL}/?do=search&subaction=search&search_start=0&full_search=0&story=${encodeURIComponent(searchQuery)}`;
        console.log(`[CinemaCity] Searching for: ${searchQuery}`);
        
        const searchHtml = await fetchText(searchUrl);
        const $search = cheerio.load(searchHtml);
        let mediaUrl = null;

        $search('div.dar-short_item').each((i, el) => {
            if (mediaUrl) return;
            const anchor = $search(el).find('a').filter((idx, a) => ($search(a).attr('href') || "").includes('.html')).first();
            if (!anchor.length) return;

            const href = anchor.attr('href');
            const foundTitle = anchor.text().toLowerCase();
            
            // If we searched by IMDB ID, the first result is likely correct
            if (imdbId && searchHtml.includes(imdbId)) {
                mediaUrl = href;
            } else if (foundTitle.includes(animeTitle.toLowerCase()) || animeTitle.toLowerCase().includes(foundTitle)) {
                mediaUrl = href;
            }
        });

        // Fallback to title search if IMDB search returned nothing or we only had animeTitle
        if (!mediaUrl && imdbId && searchQuery !== animeTitle) {
            console.log(`[CinemaCity] IMDB search failed, falling back to title search: ${animeTitle}`);
            const titleSearchUrl = `${MAIN_URL}/?do=search&subaction=search&search_start=0&full_search=0&story=${encodeURIComponent(animeTitle)}`;
            const titleSearchHtml = await fetchText(titleSearchUrl);
            const $titleSearch = cheerio.load(titleSearchHtml);
            
            $titleSearch('div.dar-short_item').each((i, el) => {
                if (mediaUrl) return;
                const anchor = $titleSearch(el).find('a').filter((idx, a) => ($titleSearch(a).attr('href') || "").includes('.html')).first();
                if (anchor.length) mediaUrl = anchor.attr('href');
            });
        }

        if (!mediaUrl) {
            console.log(`[CinemaCity] No media found for ${animeTitle}`);
            return [];
        }

        // 3. Load Media Page
        console.log(`[CinemaCity] Loading media page: ${mediaUrl}`);
        const pageHtml = await fetchText(mediaUrl);
        const $page = cheerio.load(pageHtml);
        
        // 4. Extract PlayerJS Data
        let fileData = null;
        let globalSubtitleData = null;

        $page('script').each((i, el) => {
            if (fileData) return;
            const html = $page(el).html();
            if (html && html.includes('atob')) {
                const regex = /atob\s*\(\s*(['"])(.*?)\1\s*\)/g;
                let match;
                while ((match = regex.exec(html)) !== null) {
                    try {
                        const decoded = atobPolyfill(match[2]);
                        
                        const fileMatch = decoded.match(/file\s*:\s*(['"])(.*?)\1/s) || 
                                         decoded.match(/file\s*:\s*(\[.*?\])/s) ||
                                         decoded.match(/file\s*:\s*(\{.*?\})/s);
                        
                        const subMatch = decoded.match(/subtitle\s*:\s*(['"])(.*?)\1/s);

                        if (fileMatch) {
                            let rawFile = fileMatch[2] || fileMatch[1];
                            if (rawFile && rawFile.length > 5) {
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
                        }
                        
                        if (subMatch) {
                            globalSubtitleData = subMatch[2];
                        }
                        
                        if (fileData) break;
                    } catch (err) { /* Skip */ }
                }
            }
        });

        if (!fileData) {
            console.log(`[CinemaCity] Failed to extract player data`);
            return [];
        }

        const parseSubtitles = (raw) => {
            const subtitles = [];
            if (!raw || typeof raw !== 'string') return subtitles;

            raw.split(',').forEach(entry => {
                const match = entry.trim().match(/\[(.+?)\](https?:\/\/.+)/);
                if (match) {
                    subtitles.push({
                        url: match[2],
                        language: match[1],
                        name: match[1],
                        headers: { Referer: "https://cinemacity.cc/" }
                    });
                }
            });
            return subtitles;
        };

        const addStream = (url, title, quality, subtitles) => {
            if (!url || !url.startsWith('http') || url.length < 15) return;
            streams.push({
                name: "CinemaCity",
                title: title,
                url: url,
                quality: quality || extractQuality(url),
                headers: { 
                    ...HEADERS,
                    Referer: "https://cinemacity.cc/" 
                },
                subtitles: subtitles || []
            });
        };

        const processStr = (str, title, subtitles, overrideQuality) => {
            if (str.includes('.urlset/master.m3u8')) {
                addStream(str, title, overrideQuality || "Auto", subtitles);
            } else {
                const urls = str.includes('[') ? str.split(',') : [str];
                urls.forEach(u => {
                    const m = u.match(/\[(.*?)\](.*)/);
                    if (m) {
                        let streamUrl = m[2];
                        if (streamUrl.includes(',')) {
                            const parts = streamUrl.split(',');
                            streamUrl = parts.find(p => !p.endsWith('.m4a')) || parts[0];
                        }
                        addStream(streamUrl, title, overrideQuality || m[1], subtitles);
                    } else {
                        let streamUrl = u;
                        if (streamUrl.includes(',')) {
                            const parts = streamUrl.split(',');
                            streamUrl = parts.find(p => !p.endsWith('.m4a')) || parts[0];
                        }
                        addStream(streamUrl, title, overrideQuality || extractQuality(streamUrl), subtitles);
                    }
                });
            }
        };

        if (mediaType === 'movie') {
            if (Array.isArray(fileData)) {
                const obj = fileData.find(f => !f.folder && f.file) || fileData[0];
                if (obj && obj.file) {
                    const subs = parseSubtitles(obj.subtitle || globalSubtitleData);
                    processStr(obj.file, animeTitle, subs);
                }
            } else if (typeof fileData === 'string') {
                const subs = parseSubtitles(globalSubtitleData);
                processStr(fileData, animeTitle, subs);
            }
        } else {
            if (Array.isArray(fileData)) {
                const sLabel = `Season ${season}`;
                const sObj = fileData.find(s => (s.title || "").includes(sLabel) || (s.title || "").includes(`S${season}`));
                if (sObj && sObj.folder) {
                    const eLabel = `Episode ${episode}`;
                    const eObj = sObj.folder.find(e => (e.title || "").includes(eLabel) || (e.title || "").includes(`E${episode}`));
                    if (eObj) {
                        const subs = parseSubtitles(eObj.subtitle || sObj.subtitle || globalSubtitleData);
                        if (eObj.file) {
                            processStr(eObj.file, `${animeTitle} S${season}E${episode}`, subs);
                        } else if (Array.isArray(eObj.folder)) {
                            eObj.folder.forEach(item => {
                                if (item.file) {
                                    const quality = item.title || extractQuality(item.file);
                                    processStr(item.file, `${animeTitle} S${season}E${episode}`, subs, quality);
                                }
                            });
                        }
                    }
                }
            }
        }

        console.log(`[CinemaCity] Successfully processed ${streams.length} streams`);
        return streams;
    } catch (error) {
        console.error(`[CinemaCity] Error in getStreams: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
