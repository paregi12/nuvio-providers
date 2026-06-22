// src/anichi/index.js
import { API_URL, BASE_URL, HEADERS, SEARCH_HASH, DETAIL_HASH, SERVER_HASH } from './constants.js';
import { decrypthex, fixUrlPath, getImdbId, resolveMapping, getMalTitle, extractQuality, decodeToBeParsed } from './utils.js';
import { extractOkRu, extractMp4Upload, extractStreamWish, extractSwiftplayers, extractBysekoze, extractFilemoon, extractVidStack, extractAllanimeups, extractStreamLare } from './extractors.js';

async function fetchFromAnichi(url) {
    const res = await fetch(url, { 
        headers: HEADERS,
        cfKiller: true
    });
    if (!res.ok) throw new Error(`Anichi HTTP ${res.status}`);
    return await res.json();
}

async function getEpisodeLinks(showId, translationType, episodeString) {
    const variables = {
        showId: showId,
        translationType: translationType,
        episodeString: episodeString
    };
    const url = `${API_URL}?variables=${encodeURIComponent(JSON.stringify(variables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: SERVER_HASH } }))}`;
    
    try {
        const data = await fetchFromAnichi(url);
        
        // Check for encrypted response first
        const encrypted = data.tobeparsed || data.data?.tobeparsed;
        if (encrypted) {
            const decryptedText = decodeToBeParsed(encrypted);
            if (decryptedText) {
                const decryptedObj = JSON.parse(decryptedText);
                return decryptedObj.data?.episode?.sourceUrls || decryptedObj.episode?.sourceUrls || [];
            }
        }
        
        // Fallback to direct unencrypted response
        return data.data?.episode?.sourceUrls || data.episode?.sourceUrls || [];
    } catch (e) {
        console.error(`[Anichi] Failed to fetch episode links: ${e.message}`);
        return [];
    }
}

async function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
    console.log(`[Anichi] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}, S:${seasonNum} E:${episodeNum}`);
    
    try {
        let animeTitle = "";
        let mappedEp = episodeNum;

        // 1. Resolve mapping to MAL / Title
        if (mediaType === 'tv') {
            const imdbId = await getImdbId(tmdbId, mediaType);
            if (imdbId) {
                const mapping = await resolveMapping(imdbId, seasonNum, episodeNum);
                if (mapping && mapping.mal_id) {
                    mappedEp = mapping.mal_episode || episodeNum;
                    animeTitle = await getMalTitle(mapping.mal_id);
                }
            }
        }
        
        // Fallback to direct TMDB title lookup if mapping failed or if it's a movie
        if (!animeTitle) {
            const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
            const tmdbRes = await fetch(tmdbUrl);
            if (tmdbRes.ok) {
                const tmdbData = await tmdbRes.json();
                animeTitle = tmdbData.name || tmdbData.title || tmdbData.original_name || tmdbData.original_title;
            }
        }

        if (!animeTitle) {
            console.error("[Anichi] Could not resolve anime title.");
            return [];
        }

        console.log(`[Anichi] Resolved Title: "${animeTitle}"`);

        // 2. Search Anichi/Allanime
        const searchVariables = {
            search: { query: animeTitle },
            limit: 26,
            page: 1,
            translationType: "sub",
            countryOrigin: "ALL"
        };
        const searchUrl = `${API_URL}?variables=${encodeURIComponent(JSON.stringify(searchVariables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: SEARCH_HASH } }))}`;
        
        const searchData = await fetchFromAnichi(searchUrl);
        const edges = searchData.data?.shows?.edges || [];
        if (edges.length === 0) {
            console.log("[Anichi] No anime found matching query.");
            return [];
        }

        // Match closest name
        const match = edges.find(e => 
            e.name.toLowerCase() === animeTitle.toLowerCase() || 
            (e.englishName && e.englishName.toLowerCase() === animeTitle.toLowerCase())
        ) || edges[0];

        const showId = match._id;
        console.log(`[Anichi] Found Show ID: ${showId} (${match.name})`);

        // 3. Load Show Details to verify episode list
        const detailVariables = { _id: showId };
        const detailUrl = `${API_URL}?variables=${encodeURIComponent(JSON.stringify(detailVariables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: DETAIL_HASH } }))}`;
        
        const detailData = await fetchFromAnichi(detailUrl);
        const show = detailData.data?.show;
        if (!show) return [];

        const subEpisodes = show.availableEpisodesDetail?.sub || [];
        const dubEpisodes = show.availableEpisodesDetail?.dub || [];

        const hasSub = subEpisodes.includes(String(mappedEp));
        const hasDub = dubEpisodes.includes(String(mappedEp));

        if (!hasSub && !hasDub) {
            console.log(`[Anichi] Episode ${mappedEp} is not available.`);
            return [];
        }

        const streams = [];
        const sourcePromises = [];

        // Query sources for Sub and Dub if available
        if (hasSub) {
            sourcePromises.push(getEpisodeLinks(showId, "sub", String(mappedEp)).then(sources => ({ type: "Sub", sources })));
        }
        if (hasDub) {
            sourcePromises.push(getEpisodeLinks(showId, "dub", String(mappedEp)).then(sources => ({ type: "Dub", sources })));
        }

        const resolvedTypes = await Promise.all(sourcePromises);

        for (const { type, sources } of resolvedTypes) {
            for (const source of sources) {
                let rawUrl = source.sourceUrl;
                if (!rawUrl) continue;

                // Decrypt hex links
                if (rawUrl.startsWith("--")) {
                    rawUrl = decrypthex(rawUrl);
                }

                // If it is a clock/download API route, resolve it
                if (rawUrl.includes("/apivtwo/clock")) {
                    const fixedLink = fixUrlPath(rawUrl);
                    try {
                        const clockRes = await fetch(fixedLink, { 
                            headers: HEADERS,
                            cfKiller: true
                        });
                        if (clockRes.ok) {
                            const clockData = await clockRes.json();
                            const links = clockData.links || [];
                            links.forEach(item => {
                                if (item.link) {
                                    let quality = item.resolutionStr || extractQuality(item.link);
                                    if ((quality === 'Hls' || quality === 'Adaptive' || quality === 'Unknown') && item.link) {
                                        if (item.link.includes('1080p') || item.link.includes('1080')) quality = '1080p';
                                        else if (item.link.includes('720p') || item.link.includes('720')) quality = '720p';
                                        else if (item.link.includes('480p') || item.link.includes('480')) quality = '480p';
                                        else if (item.link.includes('360p') || item.link.includes('360')) quality = '360p';
                                    }

                                    // Use clean headers for external CDNs (like repackager.wixmp.com) if not explicitly provided
                                    const endpoint = `${API_URL}/player?uri=${encodeURIComponent(item.link)}`;
                                    const isWix = item.link.includes('wixmp.com') || item.link.includes('wixstatic.com');
                                    const isCrunchy = source.sourceName?.includes("Default") && (item.resolutionStr === "SUB" || item.resolutionStr === "Alt vo_SUB");
                                    
                                    const cleanPlayHeaders = {
                                        "Referer": isWix || isCrunchy ? "https://static.crunchyroll.com/" : (item.headers?.Referer || item.headers?.referer || endpoint),
                                        "User-Agent": item.headers?.["user-agent"] || item.headers?.["User-Agent"] || HEADERS["User-Agent"]
                                    };

                                    streams.push({
                                        name: `Anichi ${source.sourceName} (${type}) - ${quality}`,
                                        title: `${match.name} - Episode ${mappedEp}`,
                                        url: item.link,
                                        quality: quality,
                                        size: "Unknown",
                                        headers: cleanPlayHeaders,
                                        provider: "anichi"
                                    });
                                }
                            });
                        }
                    } catch (e) {
                        console.error(`[Anichi] Error fetching clock URL: ${e.message}`);
                    }
                } else {
                    let streamUrl = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
                    const quality = extractQuality(streamUrl);
                    
                    // Do NOT pass Allanime mobile headers to external CDNs/mirrors to prevent blocking
                    const cleanHeaders = {
                        "User-Agent": HEADERS["User-Agent"]
                    };

                    let extractedUrl = null;
                    let extractedQuality = quality;
                    let playHeaders = cleanHeaders;
                    
                    // Determine if URL is a direct video link or an iframe/embed mirror
                    const isDirect = streamUrl.split('?')[0].endsWith('.m3u8') || streamUrl.split('?')[0].endsWith('.mp4');
                    let isMirror = !isDirect;

                    if (streamUrl.includes("ok.ru")) {
                        isMirror = true;
                        try {
                            const res = await extractOkRu(streamUrl);
                            if (res && res.url) {
                                extractedUrl = res.url;
                                playHeaders = {
                                    "Referer": "https://ok.ru/",
                                    "User-Agent": cleanHeaders["User-Agent"]
                                };
                                if (res.quality) {
                                    extractedQuality = res.quality;
                                }
                            }
                        } catch (err) {
                            console.error(`[Anichi] OkRu extraction failed: ${err.message}`);
                        }
                    } else if (streamUrl.includes("mp4upload.com")) {
                        isMirror = true;
                        try {
                            extractedUrl = await extractMp4Upload(streamUrl);
                            if (extractedUrl) {
                                playHeaders = {
                                    "Referer": "https://www.mp4upload.com/",
                                    "User-Agent": cleanHeaders["User-Agent"]
                                };
                            }
                        } catch (err) {
                            console.error(`[Anichi] Mp4Upload extraction failed: ${err.message}`);
                        }
                    } else if (streamUrl.includes("streamwish") || streamUrl.includes("swiftplayers")) {
                        isMirror = true;
                        try {
                            extractedUrl = streamUrl.includes("swiftplayers") ? await extractSwiftplayers(streamUrl) : await extractStreamWish(streamUrl);
                            if (extractedUrl) {
                                const base = streamUrl.includes("swiftplayers") ? "https://swiftplayers.com" : "https://streamwish.to";
                                playHeaders = {
                                    "Referer": `${base}/`,
                                    "Origin": `${base}/`,
                                    "User-Agent": cleanHeaders["User-Agent"]
                                };
                            }
                        } catch (err) {
                            console.error(`[Anichi] Streamwish extraction failed: ${err.message}`);
                        }
                    } else if (streamUrl.includes("bysekoze.com") || streamUrl.includes("byse.sx")) {
                        isMirror = true;
                        try {
                            extractedUrl = await extractBysekoze(streamUrl);
                            if (extractedUrl) {
                                const base = streamUrl.includes("bysekoze.com") ? "https://bysekoze.com" : "https://byse.sx";
                                playHeaders = {
                                    "Referer": `${base}/`,
                                    "User-Agent": cleanHeaders["User-Agent"]
                                };
                            }
                        } catch (err) {
                            console.error(`[Anichi] Bysekoze extraction failed: ${err.message}`);
                        }
                    } else if (streamUrl.includes("filemoon")) {
                        isMirror = true;
                        try {
                            extractedUrl = await extractBysekoze(streamUrl) || await extractFilemoon(streamUrl);
                            if (extractedUrl) {
                                playHeaders = {
                                    "Referer": streamUrl,
                                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                                };
                            }
                        } catch (err) {
                            console.error(`[Anichi] Filemoon extraction failed: ${err.message}`);
                        }
                    } else if (streamUrl.includes("allanime.uns.bio") || streamUrl.includes("uns.bio")) {
                        isMirror = true;
                        try {
                            extractedUrl = await extractAllanimeups(streamUrl);
                            if (extractedUrl) {
                                playHeaders = {
                                    "Referer": streamUrl,
                                    "Origin": "https://allanime.uns.bio",
                                    "User-Agent": cleanHeaders["User-Agent"]
                                };
                            }
                        } catch (err) {
                            console.error(`[Anichi] Vidstack extraction failed: ${err.message}`);
                        }
                    } else if (streamUrl.includes("streamlare.com")) {
                        isMirror = true;
                        try {
                            extractedUrl = await extractStreamLare(streamUrl);
                            if (extractedUrl) {
                                playHeaders = {
                                    "Referer": "https://streamlare.com/",
                                    "User-Agent": cleanHeaders["User-Agent"]
                                };
                            }
                        } catch (err) {
                            console.error(`[Anichi] Streamlare extraction failed: ${err.message}`);
                        }
                    }

                    if (isMirror) {
                        if (extractedUrl) {
                            const finalQuality = (extractedQuality === 'Unknown') ? extractQuality(extractedUrl) : extractedQuality;
                            streams.push({
                                name: `Anichi ${source.sourceName} (${type}) - ${finalQuality}`,
                                title: `${match.name} - Episode ${mappedEp}`,
                                url: extractedUrl,
                                quality: finalQuality,
                                size: "Unknown",
                                headers: playHeaders,
                                provider: "anichi"
                            });
                        }
                    } else {
                        streams.push({
                            name: `Anichi ${source.sourceName} (${type}) - ${quality}`,
                            title: `${match.name} - Episode ${mappedEp}`,
                            url: streamUrl,
                            quality: quality,
                            size: "Unknown",
                            headers: cleanHeaders,
                            provider: "anichi"
                        });
                    }
                }
            }
        }

        // Sort priority sources to the top, then by quality descending
        const prioritySources = ["Default", "Luf-Mp4", "Ur-mp4", "Ak"];
        const qualityOrder = { "1080p": 4, "720p": 3, "480p": 2, "360p": 1, "Unknown": 0 };
        streams.sort((a, b) => {
            const aPri = (prioritySources.some(src => a.name.includes(src)) || a.url.includes("wixmp.com") || a.url.includes("wixstatic.com") || (a.headers?.Referer || a.headers?.referer || "").includes("crunchyroll.com")) ? 1 : 0;
            const bPri = (prioritySources.some(src => b.name.includes(src)) || b.url.includes("wixmp.com") || b.url.includes("wixstatic.com") || (b.headers?.Referer || b.headers?.referer || "").includes("crunchyroll.com")) ? 1 : 0;
            if (aPri !== bPri) {
                return bPri - aPri; // Priority sources first
            }
            const aQ = qualityOrder[a.quality] || 0;
            const bQ = qualityOrder[b.quality] || 0;
            return bQ - aQ;
        });

        console.log(`[Anichi] Total streams found: ${streams.length}`);
        return streams;

    } catch (e) {
        console.error(`[Anichi] Error in getStreams: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
