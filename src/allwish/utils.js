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
    return { title, year, imdbId: data.external_ids?.imdb_id || null, data };
}

function base64UrlEncode(buffer) {
    let b64 = (typeof Buffer !== 'undefined') ? Buffer.from(buffer).toString('base64') : btoa(String.fromCharCode.apply(null, buffer));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function generateEpisodeVrf(episodeId) {
    const secretKey = "ysJhV6U27FVIjjuk";

    let encodedId = encodeURIComponent(episodeId)
        .replace(/\+/g, "%20")
        .replace(/!/g, "%21")
        .replace(/'/g, "%27")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
        .replace(/~/g, "%7E")
        .replace(/\*/g, "%2A");

    const keyCodes = [];
    for (let i = 0; i < secretKey.length; i++) {
        keyCodes.push(secretKey.charCodeAt(i));
    }
    
    const dataCodes = [];
    for (let i = 0; i < encodedId.length; i++) {
        dataCodes.push(encodedId.charCodeAt(i));
    }

    const n = [];
    for (let i = 0; i < 256; i++) {
        n[i] = i;
    }
    
    let a = 0;
    for (let o = 0; o < 256; o++) {
        a = (a + n[o] + keyCodes[o % keyCodes.length]) % 256;
        let temp = n[o];
        n[o] = n[a];
        n[a] = temp;
    }

    const out = [];
    let o = 0;
    a = 0;
    for (let r = 0; r < dataCodes.length; r++) {
        o = (o + 1) % 256;
        a = (a + n[o]) % 256;
        let temp = n[o];
        n[o] = n[a];
        n[a] = temp;
        let k = n[(n[o] + n[a]) % 256];
        out.push(dataCodes[r] ^ k);
    }

    const step1 = new Uint8Array(out);
    const base1 = base64UrlEncode(step1);

    const step2Bytes = [];
    for(let i = 0; i < base1.length; i++) {
        step2Bytes.push(base1.charCodeAt(i));
    }

    const transformedList = [];
    for (let index = 0; index < step2Bytes.length; index++) {
        let s = step2Bytes[index];
        switch (index % 8) {
            case 1: s += 3; break;
            case 7: s += 5; break;
            case 2: s -= 4; break;
            case 4: s -= 2; break;
            case 6: s += 4; break;
            case 0: s -= 3; break;
            case 3: s += 2; break;
            case 5: s += 5; break;
            default: break;
        }
        transformedList.push(s & 0xFF);
    }

    const base2 = base64UrlEncode(new Uint8Array(transformedList));

    let finalStr = "";
    for (let i = 0; i < base2.length; i++) {
        let c = base2[i];
        if (c >= 'A' && c <= 'Z') {
            finalStr += String.fromCharCode((c.charCodeAt(0) - 65 + 13) % 26 + 65);
        } else if (c >= 'a' && c <= 'z') {
            finalStr += String.fromCharCode((c.charCodeAt(0) - 97 + 13) % 26 + 97);
        } else {
            finalStr += c;
        }
    }

    return finalStr;
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

export function findBestTitleMatch(mediaInfo, searchResults) {
    if (!searchResults || searchResults.length === 0) return null;
    let bestMatch = null;
    let bestScore = 0;
    for (const result of searchResults) {
        let score = calculateTitleSimilarity(mediaInfo.title, result.title);
        // Bonus for anime-specific alternative title match if provided in mediaInfo
        if (mediaInfo.data && mediaInfo.data.alternative_titles && mediaInfo.data.alternative_titles.results) {
             for(const alt of mediaInfo.data.alternative_titles.results) {
                 const altScore = calculateTitleSimilarity(alt.title, result.title);
                 if (altScore > score) score = altScore;
             }
        }
        if (score > bestScore && score > 0.3) {
            bestScore = score;
            bestMatch = result;
        }
    }
    return bestMatch;
}
