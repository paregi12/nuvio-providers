// src/videasy/utils.js
import { TMDB_API_KEY, TMDB_BASE_URL, REQUEST_HEADERS, PLAYBACK_HEADERS, DEC_API_URL } from './constants.js';

// Decrypt VideoEasy data using the decryption API
export async function decryptVideoEasy(encryptedText, tmdbId) {
    try {
        const response = await fetch(DEC_API_URL, {
            method: 'POST',
            headers: {
                ...REQUEST_HEADERS,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: encryptedText, id: Number(tmdbId) })
        });
        if (!response.ok) throw new Error(`Decryption HTTP ${response.status}`);
        const data = await response.json();
        return data.result || null;
    } catch (e) {
        console.error(`[VideoEasy] Decryption error: ${e.message}`);
        return null;
    }
}

// Fetch TMDB metadata helper
export async function fetchMediaDetails(tmdbId, mediaType) {
    try {
        const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
        const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': REQUEST_HEADERS['User-Agent'],
                'Accept': 'application/json'
            }
        });
        if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
        const data = await res.json();
        return {
            title: mediaType === 'tv' ? data.name : data.title,
            year: (mediaType === 'tv' ? data.first_air_date : data.release_date || '').substring(0, 4),
            imdbId: data.external_ids?.imdb_id || null,
            mediaType: mediaType
        };
    } catch (e) {
        console.error(`[VideoEasy] TMDB details fetch error: ${e.message}`);
        return null;
    }
}

// Normalize language codes/names to readable format
export function normalizeLanguageName(language) {
    if (!language || typeof language !== 'string') return '';
    const languageMap = {
        'en': 'English', 'eng': 'English', 'english': 'English',
        'hi': 'Hindi', 'hin': 'Hindi', 'hindi': 'Hindi',
        'de': 'German', 'ger': 'German', 'german': 'German',
        'it': 'Italian', 'ita': 'Italian', 'italian': 'Italian',
        'fr': 'French', 'fre': 'French', 'french': 'French',
        'es': 'Spanish', 'spa': 'Spanish', 'spanish': 'Spanish',
        'pt': 'Portuguese', 'por': 'Portuguese', 'portuguese': 'Portuguese',
        'ar': 'Arabic', 'ara': 'Arabic', 'arabic': 'Arabic',
        'ja': 'Japanese', 'jpn': 'Japanese', 'japanese': 'Japanese',
        'ko': 'Korean', 'kor': 'Korean', 'korean': 'Korean',
        'ta': 'Tamil', 'tam': 'Tamil', 'tamil': 'Tamil',
        'te': 'Telugu', 'tel': 'Telugu', 'telugu': 'Telugu',
        'ml': 'Malayalam', 'mal': 'Malayalam', 'malayalam': 'Malayalam',
        'kn': 'Kannada', 'kan': 'Kannada', 'kannada': 'Kannada'
    };
    const normalized = language.toLowerCase().trim();
    return languageMap[normalized] || language;
}

// Extract quality from URL
export function extractQualityFromUrl(url) {
    if (!url) return 'Unknown';
    const qualityPatterns = [
        /(\d{3,4})p/i,
        /(\d{3,4})k/i,
        /quality[_-]?(\d{3,4})/i,
        /res[_-]?(\d{3,4})/i,
        /(\d{3,4})x\d{3,4}/i,
        /\/MTA4MA==\//i,
        /\/NzIw\//i,
        /\/MzYw\//i,
        /\/NDgw\//i,
        /\/MTkyMA==\//i,
        /\/MTI4MA==\//i,
    ];

    for (const pattern of qualityPatterns) {
        const match = url.match(pattern);
        if (match) {
            if (pattern.source.includes('MTA4MA==')) return '1080p';
            if (pattern.source.includes('NzIw')) return '720p';
            if (pattern.source.includes('MzYw')) return '360p';
            if (pattern.source.includes('NDgw')) return '480p';
            if (pattern.source.includes('MTkyMA==')) return '1080p';
            if (pattern.source.includes('MTI4MA==')) return '720p';

            const qualityNum = parseInt(match[1]);
            if (qualityNum >= 240 && qualityNum <= 4320) {
                return `${qualityNum}p`;
            }
        }
    }

    if (url.includes('1080') || url.includes('1920')) return '1080p';
    if (url.includes('720') || url.includes('1280')) return '720p';
    if (url.includes('480') || url.includes('854')) return '480p';
    if (url.includes('360') || url.includes('640')) return '360p';
    if (url.includes('240') || url.includes('426')) return '240p';

    return 'Unknown';
}

// Format streams for Nuvio compatibility
export function formatStreamsForNuvio(mediaData, serverName, serverConfig, mediaDetails) {
    if (!mediaData || typeof mediaData !== 'object' || !mediaData.sources) {
        return [];
    }

    const streams = [];

    mediaData.sources.forEach((source) => {
        if (!source.url) return;

        let quality = source.quality || extractQualityFromUrl(source.url);
        let detectedLanguage = '';

        if (quality && typeof quality === 'string') {
            const providerNames = ['streamwish', 'voesx', 'filemoon', 'fileions', 'filelions', 'streamtape', 'streamlare', 'doodstream', 'upstream', 'mixdrop'];
            const isProviderName = providerNames.some(provider =>
                quality.toLowerCase().includes(provider.toLowerCase())
            );

            if (isProviderName) {
                quality = extractQualityFromUrl(source.url);
                if (quality === 'Unknown') quality = 'Adaptive';
            }

            if (quality.includes('GB') || quality.includes('MB') || quality.includes('|')) {
                quality = extractQualityFromUrl(source.url);
                if (quality === 'Unknown') quality = 'Adaptive';
            }

            const languageNames = ['english', 'hindi', 'german', 'italian', 'spanish', 'portuguese', 'french', 'arabic', 'chinese', 'japanese', 'korean', 'tamil', 'telugu', 'malayalam', 'kannada'];
            const isLanguageName = languageNames.some(lang =>
                quality.toLowerCase().includes(lang.toLowerCase())
            );

            if (isLanguageName) {
                detectedLanguage = normalizeLanguageName(quality);
                quality = extractQualityFromUrl(source.url);
                if (quality === 'Unknown') quality = 'Adaptive';
            }

            if (quality.toLowerCase() === 'hd' || quality.toLowerCase() === 'high') {
                const urlQuality = extractQualityFromUrl(source.url);
                quality = urlQuality !== 'Unknown' ? urlQuality : '720p';
            }

            if (quality.toLowerCase() === 'sd' || quality.toLowerCase() === 'standard') {
                quality = '480p';
            }

            if (quality.toLowerCase() === 'auto') quality = 'Auto';
            if (quality.toLowerCase() === 'adaptive') quality = 'Adaptive';
        }

        const title = `${mediaDetails.title} (${mediaDetails.year})`;

        let languageInfo = '';
        if (source.language) {
            const normalizedLanguage = normalizeLanguageName(source.language);
            if (normalizedLanguage) languageInfo = ` [${normalizedLanguage}]`;
        } else if (detectedLanguage) {
            languageInfo = ` [${detectedLanguage}]`;
        }

        // Always attach PLAYBACK_HEADERS to ensure playback bypasses hotlinking checks
        streams.push({
            name: `VIDEASY ${serverName} (${serverConfig.language})${languageInfo} - ${quality}`,
            title: title,
            url: source.url,
            quality: quality,
            size: 'Unknown',
            headers: PLAYBACK_HEADERS,
            provider: 'videasy'
        });
    });

    return streams;
}
