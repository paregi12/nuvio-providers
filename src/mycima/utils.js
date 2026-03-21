import { TMDB_BASE_URL, TMDB_API_KEY } from './constants.js';

export async function getTMDBDetails(tmdbId, mediaType) {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const response = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
    });
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
    const data = await response.json();
    const title = mediaType === "tv" ? data.name : data.title;
    const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
    return { title, year, imdbId: data.external_ids?.imdb_id || null };
}

export function normalizeTitle(title) {
    if (!title) return "";
    return title.toLowerCase().replace(/\b(the|a|an)\b/g, "").replace(/[:\-_]/g, " ").replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
}

export function calculateTitleSimilarity(title1, title2) {
    const norm1 = normalizeTitle(title1);
    const norm2 = normalizeTitle(title2);
    if (norm1 === norm2) return 1;
    const words1 = norm1.split(/\s+/).filter(w => w.length > 0);
    const words2 = norm2.split(/\s+/).filter(w => w.length > 0);
    if (words1.length === 0 || words2.length === 0) return 0;
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = words1.filter(w => set2.has(w));
    const union = new Set([...words1, ...words2]);
    const jaccard = intersection.length / union.size;
    const extraWordsCount = words2.filter(w => !set1.has(w)).length;
    let score = jaccard - (extraWordsCount * 0.05);
    if (words1.length > 0 && words1.every(w => set2.has(w))) {
        score += 0.2;
    }
    return score;
}

export function findBestTitleMatch(mediaInfo, searchResults, mediaType, season) {
    if (!searchResults || searchResults.length === 0) return null;
    let bestMatch = null;
    let bestScore = 0;
    for (const result of searchResults) {
        let score = calculateTitleSimilarity(mediaInfo.title, result.title);
        if (mediaInfo.year && result.year) {
            const yearDiff = Math.abs(mediaInfo.year - result.year);
            if (yearDiff === 0) score += 0.2;
            else if (yearDiff <= 1) score += 0.1;
            else if (yearDiff > 5) score -= 0.3;
        }
        if (score > bestScore && score > 0.3) {
            bestScore = score;
            bestMatch = result;
        }
    }
    return bestMatch;
}

export const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

export function atob(value) {
    if (!value) return "";
    let input = String(value).replace(/=+$/, "");
    let output = "";
    let bc = 0, bs, buffer, idx = 0;
    while (buffer = input.charAt(idx++)) {
        buffer = BASE64_CHARS.indexOf(buffer);
        if (~buffer) {
            bs = bc % 4 ? bs * 64 + buffer : buffer;
            if (bc++ % 4) {
                output += String.fromCharCode(255 & bs >> (-2 * bc & 6));
            }
        }
    }
    return output;
}

export function getImageURL(style) {
    if (!style) return null;
    const match = style.match(/url\((.*?)\)/);
    if (!match) return null;
    return match[1].trim().replace(/^['"]|['"]$/g, '');
}

/**
 * JS Unpacker for Dean Edwards P.A.C.K.E.R
 */
export function jsUnpack(code) {
    try {
        const match = code.match(/}\s*\(\s*['"](.+?)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*['"](.+?)['"]\.split\(['"]\|['"]\)/);
        if (!match) return code;

        let [ , p, a, c, k ] = match;
        a = parseInt(a);
        c = parseInt(c);
        k = k.split('|');

        function unbase(n, base) {
            const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (base <= 36) return parseInt(n, base).toString(36);
            
            let dict = {};
            for (let i = 0; i < base; i++) dict[alphabet[i]] = i;
            
            let res = 0;
            for (let i = 0; i < n.length; i++) {
                res = res * base + alphabet.indexOf(n[i]);
            }
            return res;
        }

        while (c--) {
            if (k[c]) {
                const word = unbase(c, a);
                const regex = new RegExp('\\b' + word + '\\b', 'g');
                p = p.replace(regex, k[c]);
            }
        }
        return p;
    } catch (e) {
        return code;
    }
}
