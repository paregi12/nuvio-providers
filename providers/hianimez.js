// HiAnimeZ Scraper - Using HiAnime's Native API
// This uses the ACTUAL API endpoints from the site

// ==================== CONFIGURATION ====================

const HIANIMEZ_API_BASE = 'https://hianimez.to/api/v1';
const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://hianimez.to/',
    'Origin': 'https://hianimez.to',
    'X-Requested-With': 'XMLHttpRequest'
};

// Available servers (in priority order)
const SERVERS = ['HD-2', 'HD-1', 'HD', 'S-HD'];

// ==================== UTILITY FUNCTIONS ====================

function fetchRequest(url, options = {}) {
    const merged = Object.assign({ method: 'GET', headers: HEADERS }, options);
    console.log('[FETCH]', url);
    
    return fetch(url, merged)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        })
        .catch(err => {
            console.error('[FETCH ERROR]', err.message);
            throw err;
        });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeTitle(title) {
    return title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ==================== TMDB FUNCTIONS ====================

async function getTMDBDetails(tmdbId) {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const res = await fetchRequest(url);
    const data = await res.json();
    
    return {
        title: data.name,
        originalTitle: data.original_name,
        year: data.first_air_date ? parseInt(data.first_air_date.split('-')[0]) : null
    };
}

// ==================== HIANIMEZ API FUNCTIONS ====================

/**
 * Search anime on HiAnimeZ using their API
 */
async function searchAnime(query) {
    const url = `${HIANIMEZ_API_BASE}/search?q=${encodeURIComponent(query)}`;
    console.log('[SEARCH]', query);
    
    try {
        const res = await fetchRequest(url);
        const data = await res.json();
        
        if (!data.success || !data.data || !data.data.animes) {
            console.warn('[SEARCH] No results found');
            return [];
        }
        
        console.log('[SEARCH] Found', data.data.animes.length, 'results');
        return data.data.animes;
        
    } catch (err) {
        console.error('[SEARCH ERROR]', err.message);
        return [];
    }
}

/**
 * Get anime details and episodes
 */
async function getAnimeInfo(animeId) {
    const url = `${HIANIMEZ_API_BASE}/anime/${animeId}`;
    console.log('[INFO] Getting anime info:', animeId);
    
    try {
        const res = await fetchRequest(url);
        const data = await res.json();
        
        if (!data.success || !data.data) {
            throw new Error('Invalid anime info response');
        }
        
        const anime = data.data.anime;
        const episodes = data.data.episodes || [];
        
        console.log('[INFO]', anime.info?.name || animeId);
        console.log('[EPISODES]', episodes.length);
        
        return {
            info: anime.info,
            episodes: episodes
        };
        
    } catch (err) {
        console.error('[INFO ERROR]', err.message);
        throw err;
    }
}

/**
 * Get streaming links for an episode
 * THIS IS THE KEY FUNCTION - Uses the API endpoint you found!
 */
async function getStreamingLinks(episodeId, server = 'HD-2', type = 'sub') {
    const url = `${HIANIMEZ_API_BASE}/stream?id=${episodeId}&server=${server}&type=${type}`;
    console.log('[STREAM] Getting links:', { episodeId, server, type });
    
    try {
        const res = await fetchRequest(url);
        const data = await res.json();
        
        if (!data.success || !data.data || !data.data.streamingLink) {
            console.warn('[STREAM] No streaming link found');
            return null;
        }
        
        const streamData = data.data.streamingLink;
        
        console.log('[STREAM] ✓ Got streaming link');
        console.log('[STREAM] Server:', streamData.server);
        console.log('[STREAM] Type:', streamData.type);
        console.log('[STREAM] Has intro/outro:', !!streamData.intro);
        
        return streamData;
        
    } catch (err) {
        console.error('[STREAM ERROR]', err.message);
        return null;
    }
}

/**
 * Try multiple servers to find working stream
 */
async function getStreamFromMultipleServers(episodeId, type = 'sub') {
    console.log('[SERVERS] Trying multiple servers...');
    
    for (const server of SERVERS) {
        console.log(`[SERVER] Trying ${server}...`);
        
        const stream = await getStreamingLinks(episodeId, server, type);
        
        if (stream && stream.link && stream.link.file) {
            console.log(`[SERVER] ✓ ${server} worked!`);
            return stream;
        }
        
        console.log(`[SERVER] ✗ ${server} failed, trying next...`);
        await sleep(500); // Rate limiting
    }
    
    console.warn('[SERVERS] All servers failed');
    return null;
}

// ==================== ANIME MATCHING ====================

function findBestMatch(results, targetTitle, season) {
    if (!results || results.length === 0) return null;
    
    const normalized = normalizeTitle(targetTitle);
    
    // For season 1 or no season specified
    if (!season || season === 1) {
        for (const result of results) {
            const resultTitle = normalizeTitle(result.name);
            if (resultTitle === normalized || resultTitle.includes(normalized)) {
                return result;
            }
        }
        return results[0];
    }
    
    // For specific seasons
    const seasonStr = String(season);
    for (const result of results) {
        const title = result.name.toLowerCase();
        if (title.includes(`season ${seasonStr}`) || 
            title.includes(` s${seasonStr}`) ||
            title.includes(`s${seasonStr} `)) {
            return result;
        }
    }
    
    return results[0];
}

// ==================== FORMATTING ====================

function formatStreamForNuvio(streamData, mediaTitle, animeInfo) {
    if (!streamData || !streamData.link || !streamData.link.file) {
        return null;
    }
    
    const videoUrl = streamData.link.file;
    const server = streamData.server || 'Unknown';
    const type = streamData.type || 'sub';
    
    // Extract subtitles from tracks
    const subtitles = (streamData.tracks || [])
        .filter(track => track.kind === 'captions' || track.kind === 'subtitles')
        .map(track => ({
            language: track.label || 'English',
            url: track.file,
            default: track.default || false
        }));
    
    return {
        name: `HIANIMEZ ${server.toUpperCase()} - ${type.toUpperCase()} - AUTO`,
        title: mediaTitle,
        url: videoUrl,
        quality: 'auto', // HLS will handle quality switching
        size: 'Unknown',
        headers: {
            'User-Agent': HEADERS['User-Agent'],
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://hianimez.to/',
            'Origin': 'https://hianimez.to'
        },
        subtitles: subtitles,
        provider: 'hianimez',
        type: streamData.link.type || 'hls',
        isM3U8: true,
        // Extra metadata
        metadata: {
            intro: streamData.intro || null,
            outro: streamData.outro || null,
            iframe: streamData.iframe || null,
            animeInfo: {
                name: animeInfo?.name || null,
                poster: animeInfo?.poster || null,
                description: animeInfo?.description || null
            }
        }
    };
}

// ==================== MAIN FUNCTION ====================

async function getStreams(tmdbId, mediaType, season, episode) {
    if (mediaType !== 'tv') {
        console.log('[REJECTED] Only TV shows supported');
        return [];
    }
    
    console.log('\n========================================');
    console.log('HiAnimeZ Scraper (Native API)');
    console.log('========================================\n');
    
    try {
        // Step 1: Get TMDB details
        console.log('[STEP 1] Fetching TMDB details...');
        const mediaInfo = await getTMDBDetails(tmdbId);
        console.log('[INFO]', mediaInfo.title, `(${mediaInfo.year})`);
        
        await sleep(500);
        
        // Step 2: Search anime
        console.log('\n[STEP 2] Searching anime...');
        const searchResults = await searchAnime(mediaInfo.title);
        
        if (searchResults.length === 0) {
            throw new Error('No search results found');
        }
        
        // Step 3: Find best match
        const match = findBestMatch(searchResults, mediaInfo.title, season);
        console.log('[MATCH]', match.name);
        console.log('[ID]', match.id);
        
        await sleep(500);
        
        // Step 4: Get anime info and episodes
        console.log('\n[STEP 3] Getting episodes...');
        const animeData = await getAnimeInfo(match.id);
        
        if (!animeData.episodes || animeData.episodes.length === 0) {
            throw new Error('No episodes found');
        }
        
        // Step 5: Find the specific episode
        const targetEpisode = animeData.episodes.find(ep => ep.number === episode);
        
        if (!targetEpisode) {
            throw new Error(`Episode ${episode} not found`);
        }
        
        console.log('[EPISODE]', targetEpisode.number, '-', targetEpisode.title);
        console.log('[EPISODE ID]', targetEpisode.episodeId);
        
        await sleep(500);
        
        // Step 6: Get streaming links - Try both sub and dub
        console.log('\n[STEP 4] Getting streaming links...');
        
        const streams = [];
        const mediaTitle = `${mediaInfo.title} S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
        
        // Try SUB first
        console.log('\n[TYPE] Trying SUB...');
        const subStream = await getStreamFromMultipleServers(targetEpisode.episodeId, 'sub');
        if (subStream) {
            const formatted = formatStreamForNuvio(subStream, mediaTitle, animeData.info);
            if (formatted) {
                streams.push(formatted);
                console.log('[✓] SUB stream added');
            }
        }
        
        await sleep(500);
        
        // Try DUB
        console.log('\n[TYPE] Trying DUB...');
        const dubStream = await getStreamFromMultipleServers(targetEpisode.episodeId, 'dub');
        if (dubStream) {
            const formatted = formatStreamForNuvio(dubStream, mediaTitle, animeData.info);
            if (formatted) {
                streams.push(formatted);
                console.log('[✓] DUB stream added');
            }
        }
        
        if (streams.length === 0) {
            throw new Error('No streams found from any server');
        }
        
        console.log('\n========================================');
        console.log('✓ SUCCESS:', streams.length, 'streams found');
        console.log('========================================\n');
        
        // Log each stream
        streams.forEach((stream, i) => {
            console.log(`\n[STREAM ${i + 1}]`);
            console.log('Name:', stream.name);
            console.log('URL:', stream.url.substring(0, 80) + '...');
            console.log('Type:', stream.type);
            console.log('Subtitles:', stream.subtitles.length);
            if (stream.metadata.intro) {
                console.log('Intro:', `${stream.metadata.intro.start}s - ${stream.metadata.intro.end}s`);
            }
            if (stream.metadata.outro) {
                console.log('Outro:', `${stream.metadata.outro.start}s - ${stream.metadata.outro.end}s`);
            }
        });
        
        return streams;
        
    } catch (err) {
        console.error('\n========================================');
        console.error('✗ ERROR:', err.message);
        console.error('Stack:', err.stack);
        console.error('========================================\n');
        return [];
    }
}

// ==================== EXPORT ====================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}

if (typeof window !== 'undefined') {
    window.HiAnimeZScraper = { getStreams };
}

// ==================== USAGE EXAMPLE ====================

/*
// Test with Attack on Titan Season 1 Episode 1
getStreams('1429', 'tv', 1, 1).then(streams => {
    console.log('\n=== RESULTS ===');
    console.log('Total streams:', streams.length);
    
    streams.forEach((stream, i) => {
        console.log(`\n${i + 1}. ${stream.name}`);
        console.log('   URL:', stream.url);
        console.log('   Type:', stream.type);
        console.log('   Subtitles:', stream.subtitles.length);
    });
});

// Expected output:
// [
//   {
//     name: "HIANIMEZ HD-2 - SUB - AUTO",
//     url: "https://ec.netmagcdn.com/.../master.m3u8",
//     type: "hls",
//     metadata: {
//       intro: { start: 75, end: 165 },
//       outro: { start: 1330, end: 1419 }
//     }
//   },
//   ...
// ]
*/
