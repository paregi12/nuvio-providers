import { TMDB_BASE_URL, TMDB_API_KEY } from './constants.js';

export async function getTMDBDetails(tmdbId, mediaType) {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,alternative_titles`;
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

export function cleanJsToJson(js) {
    // Remove the leading variable name like 'embeds:'
    let cleaned = js.replace(/^\s*\w+\s*:\s*/, "");
    // Replace void 0 with null
    cleaned = cleaned.replace(/void 0/g, "null");
    // Quote unquoted keys in { key: value } or , key: value
    cleaned = cleaned.replace(/(?<=[{,])\s*(\w+)\s*:/g, '"$1":');
    return cleaned.trim();
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
    return intersection.length / union.size;
}

export function findBestTitleMatch(mediaInfo, searchResults) {
    if (!searchResults || searchResults.length === 0) return null;
    let bestMatch = null;
    let bestScore = 0;
    for (const result of searchResults) {
        let score = calculateTitleSimilarity(mediaInfo.title, result.title);
        if (mediaInfo.year && result.year) {
            const yearDiff = Math.abs(mediaInfo.year - result.year);
            if (yearDiff === 0) score += 0.2;
            else if (yearDiff <= 1) score += 0.1;
        }
        if (score > bestScore && score > 0.3) {
            bestScore = score;
            bestMatch = result;
        }
    }
    return bestMatch;
}
