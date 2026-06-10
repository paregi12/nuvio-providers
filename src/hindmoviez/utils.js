import CryptoJS from 'crypto-js';

const SECRET = "5e96085c56e0f54eda657790ac58d19b271479c504367fc9e6a6c33f1f824e6b";

export function cleanTitle(raw) {
    if (!raw) return "";
    const regex = /S(\d+)[Ee](\d+)(?:-(\d+))?/;
    const match = raw.match(regex);
    if (!match) return raw.trim();

    const season = parseInt(match[1]);
    const epStart = parseInt(match[2]);
    const epEnd = match[3] ? parseInt(match[3]) : null;

    const showName = raw.split(match[0])[0].trim();
    const episodes = epEnd ? `Episodes ${epStart}–${epEnd}` : `Episode ${epStart}`;

    return `${showName} Season ${season} | ${episodes}`;
}

export function getSearchQuality(title) {
    if (!title) return null;
    const u = title.toLowerCase();
    const patterns = [
        { regex: /\b(4k|ds4k|uhd|2160p)\b/i, quality: "4K" },
        { regex: /\b(hdts|hdcam|hdtc)\b/i, quality: "CAM" },
        { regex: /\b(camrip|cam[- ]?rip|cam)\b/i, quality: "CAM" },
        { regex: /\b(web[- ]?dl|webrip|webdl)\b/i, quality: "WEBRip" },
        { regex: /\b(bluray|bdrip|blu[- ]?ray)\b/i, quality: "BluRay" },
        { regex: /\b(1080p|fullhd)\b/i, quality: "1080p" },
        { regex: /\b(720p)\b/i, quality: "720p" },
        { regex: /\b(hdrip|hdtv)\b/i, quality: "720p" },
        { regex: /\b(dvd)\b/i, quality: "DVD" },
        { regex: /\b(hq)\b/i, quality: "HQ" }
    ];

    for (const p of patterns) {
        if (p.regex.test(u)) return p.quality;
    }
    return null;
}

export function extractSpecs(inputString) {
    const results = {
        quality: [],
        codec: [],
        audio: [],
        hdr: [],
        language: [],
        size: []
    };

    const options = {
        quality: ["BluRay", "BluRay REMUX", "BRRip", "BDRip", "WEB-DL", "HDRip", "DVDRip", "HDTV", "CAM", "TeleSync", "SCR", "10bit", "8bit"],
        codec: ["x264", "x265", "h.264", "h.265", "hevc", "avc", "mpeg-2", "mpeg-4", "vp9"],
        audio: ["AAC", "AC3", "DTS", "DTS-HD MA", "TrueHD", "Atmos", "DD+", "Dolby Digital Plus", "DTS Lossless"],
        hdr: ["DV", "HDR10+", "HDR", "SDR"],
        language: [
            { v: "HIN", l: "Hindi🇮🇳" }, { v: "Hindi", l: "Hindi🇮🇳" },
            { v: "Tamil", l: "Tamil🇮🇳" }, { v: "ENG", l: "English🇺🇸" },
            { v: "English", l: "English🇺🇸" }, { v: "Korean", l: "Korean🇰🇷" },
            { v: "KOR", l: "Korean🇰🇷" }, { v: "Japanese", l: "Japanese🇯🇵" },
            { v: "Chinese", l: "Chinese🇨🇳" }, { v: "Telugu", l: "Telugu🇮🇳" }
        ]
    };

    for (const [category, optList] of Object.entries(options)) {
        for (const opt of optList) {
            const val = typeof opt === 'string' ? opt : opt.v;
            const label = typeof opt === 'string' ? opt : opt.l;
            const regex = new RegExp(`\\b${val}\\b`, 'i');
            if (regex.test(inputString)) {
                results[category].push(label);
            }
        }
    }

    const sizeRegex = /(\d+(?:\.\d+)?\s?(?:MB|GB))/i;
    const sizeMatch = inputString.match(sizeRegex);
    if (sizeMatch) {
        results.size.push(sizeMatch[1]);
    }

    return results;
}

export function buildExtractedTitle(extracted) {
    const orderedCategories = ["quality", "codec", "audio", "hdr", "language"];
    const specs = orderedCategories
        .flatMap(cat => extracted[cat] || [])
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(" ");

    const size = extracted.size?.[0];
    return size ? `${specs} [${size}]` : specs;
}

function base64Url(input) {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(input))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function hmacSha256(key, data) {
    return CryptoJS.HmacSHA256(data, key).toString(CryptoJS.enc.Hex).substring(0, 16);
}

export function signHShare(rawId, domain) {
    const t = Math.floor(Date.now() / 1000);
    const encoded = base64Url(rawId);
    const s = hmacSha256(SECRET, `${encoded}|${t}`);
    return `${domain}/r.php?d=${encodeURIComponent(encoded)}&t=${t}&s=${s}`;
}

export function getIndexQuality(str) {
    const match = (str || "").match(/(\d{3,4})[pP]/);
    return match ? parseInt(match[1]) : 0;
}
