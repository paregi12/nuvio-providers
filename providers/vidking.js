/**
 * vidking - Built from src/vidking/
 * Generated: 2026-07-06T08:29:44.621Z
 */
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/vidking/constants.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var WINGS_API_BASE = "https://api.wingsdatabase.com";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
var REQUEST_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "*/*",
  "Origin": "https://www.vidking.net",
  "Referer": "https://www.vidking.net/",
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0"
};
var SERVERS = {
  "Hydrogen": { path: "cdn/sources-with-title" },
  "Titanium": { path: "tejo/sources-with-title" },
  "Oxygen": { path: "neon2/sources-with-title" },
  "Lithium": { path: "downloader2/sources-with-title" },
  "Helium": { path: "1movies/sources-with-title" }
};

// src/vidking/utils.js
var jl = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580];
var Tf = [1732584193, 4023233417, 2562383102, 271733878];
var Js = 61;
var _f = 8;
var ms = 2654435769;
var Ys = [109, 118, 109, 49];
var Sf = (l) => (l * (l + 1) & 1) === 0;
var bf = (l) => (l * (l + 1) & 1) === 1;
function ui(l) {
  l >>>= 0;
  l ^= l >>> 16;
  l = Math.imul(l, 2246822507) >>> 0;
  l ^= l >>> 13;
  l = Math.imul(l, 3266489909) >>> 0;
  l ^= l >>> 16;
  return l >>> 0;
}
function ps(l, o) {
  l >>>= 0;
  o &= 31;
  return o === 0 ? l >>> 0 : (l << o | l >>> 32 - o) >>> 0;
}
function If(l) {
  let o = Tf[0] >>> 0;
  for (let e = 0; e < l.length; e++) {
    o = ps((o ^ Math.imul(l.charCodeAt(e), jl[e & 15])) >>> 0, 5);
  }
  return ui(o);
}
function Af(l) {
  const o = new Array(256);
  for (let i = 0; i < 256; i++)
    o[i] = i;
  let e = 0;
  for (let i = 0; i < 256; i++) {
    e = e + o[i] + l.charCodeAt(i % l.length) & 255;
    const r = o[i];
    o[i] = o[e];
    o[e] = r;
  }
  return o;
}
function wf(l) {
  let o = 2166136261;
  for (let e = 0; e < l.length; e++) {
    o = Math.imul(o ^ l.charCodeAt(e), 16777619) >>> 0;
  }
  return ui(o);
}
function vf(l, o, e) {
  return ((l ^ o) >>> 0 | (l & o & e) >>> 0) >>> 0;
}
function Nf(l, o) {
  if (bf(l.length))
    return { S: Af(l), acc: If(l) };
  const e = new Array(Js);
  let i = ui(wf(l) ^ ui(o >>> 0 ^ ms)) >>> 0;
  for (let r = 0; r < _f; r++) {
    if (Sf(r)) {
      const n = i % Js;
      i = ps(i + ms >>> 0, 7 + (r & 7));
      e[n] = (i ^ ui(i)) >>> 0;
      i = ui(i + n >>> 0);
    } else {
      e[r] = jl[r & 15];
    }
  }
  return { S: e, acc: ui(i ^ 2779096485) >>> 0 };
}
function Rf(l, o) {
  const e = l.S;
  let i = l.acc;
  const r = i % Js;
  const n = 0 - +(r in e);
  const u = e[r] >>> 0;
  const d = Math.imul(ms, o + 1) >>> 0;
  let g = vf(i, (u ^ d) >>> 0, n);
  g = (ps(g + i >>> 0, r & 31) ^ ps(i, Math.imul(r, 7) & 31)) >>> 0;
  i = ui(g + ms >>> 0);
  e[r] = i >>> 0;
  l.acc = i;
  return i >>> 0;
}
function Cf(l, o, e) {
  const i = Nf(l, o);
  const r = new Uint8Array(e);
  let n = 0;
  for (let u = 0; u < e; ) {
    const d = Rf(i, n++);
    r[u++] = d & 255;
    u < e && (r[u++] = d >>> 8 & 255);
    u < e && (r[u++] = d >>> 16 & 255);
    u < e && (r[u++] = d >>> 24 & 255);
  }
  return r;
}
function decodeBase64(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const cleanStr = str.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const len = cleanStr.length;
  const bytes = new Uint8Array(Math.floor(len * 0.75));
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = chars.indexOf(cleanStr[i]);
    const c2 = chars.indexOf(cleanStr[i + 1] || "A");
    const c3 = chars.indexOf(cleanStr[i + 2] || "A");
    const c4 = chars.indexOf(cleanStr[i + 3] || "A");
    bytes[p++] = c1 << 2 | c2 >> 4;
    if (i + 2 < len)
      bytes[p++] = (c2 & 15) << 4 | c3 >> 2;
    if (i + 3 < len)
      bytes[p++] = (c3 & 3) << 6 | c4;
  }
  return bytes;
}
function xf(l) {
  return decodeBase64(l);
}
function decryptWingsDatabase(l, o, e) {
  const i = xf(l);
  const r = Cf(o, e, i.length);
  for (let n = 0; n < i.length; n++)
    i[n] ^= r[n];
  for (let n = 0; n < Ys.length; n++) {
    if (i[n] !== Ys[n])
      throw new Error("decrypt failed: bad seed or tampered payload");
  }
  let out = "";
  const sub = i.subarray(Ys.length);
  for (let n = 0; n < sub.length; ) {
    const c = sub[n++];
    if (c < 128) {
      out += String.fromCharCode(c);
    } else if (c > 191 && c < 224) {
      out += String.fromCharCode((c & 31) << 6 | sub[n++] & 63);
    } else if (c > 223 && c < 240) {
      out += String.fromCharCode((c & 15) << 12 | (sub[n++] & 63) << 6 | sub[n++] & 63);
    } else {
      out += String.fromCharCode((c & 7) << 18 | (sub[n++] & 63) << 12 | (sub[n++] & 63) << 6 | sub[n++] & 63);
    }
  }
  return out;
}
function fetchMediaDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    try {
      const endpoint = mediaType === "tv" ? "tv" : "movie";
      const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      const res = yield fetch(url, {
        headers: {
          "User-Agent": REQUEST_HEADERS["User-Agent"],
          "Accept": "application/json"
        }
      });
      if (!res.ok)
        throw new Error(`TMDB HTTP ${res.status}`);
      const data = yield res.json();
      return {
        title: mediaType === "tv" ? data.name : data.title,
        year: (mediaType === "tv" ? data.first_air_date : data.release_date || "").substring(0, 4),
        imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null,
        mediaType
      };
    } catch (e) {
      console.error(`[Vidking] TMDB details fetch error: ${e.message}`);
      return null;
    }
  });
}
function getLangCode(langName) {
  if (!langName)
    return "en";
  const mapping = {
    "english": "en",
    "spanish": "es",
    "french": "fr",
    "german": "de",
    "italian": "it",
    "portuguese": "pt",
    "portuguese (br)": "pt-br",
    "arabic": "ar",
    "japanese": "ja",
    "korean": "ko",
    "tamil": "ta",
    "telugu": "te",
    "malayalam": "ml",
    "kannada": "kn",
    "hindi": "hi",
    "polish": "pl",
    "greek": "el",
    "croatian": "hr",
    "ukrainian": "uk",
    "lithuanian": "lt",
    "thai": "th",
    "estonian": "et",
    "czech": "cs",
    "zh-tw": "zh-tw",
    "bokm\xE5l": "no",
    "dutch": "nl",
    "indonesian": "id",
    "sinhala": "si",
    "swedish": "sv",
    "romanian": "ro",
    "malay": "ms",
    "persian": "fa",
    "slovak": "sk",
    "bulgarian": "bg",
    "turkish": "tr",
    "danish": "da",
    "hebrew": "he",
    "serbian": "sr",
    "vietnamese": "vi",
    "hungarian": "hu",
    "icelandic": "is",
    "albanian": "sq",
    "bosnian": "bs",
    "slovenian": "sl",
    "bengali": "bn",
    "macedonian": "mk"
  };
  return mapping[langName.toLowerCase().trim()] || "en";
}
function formatStreamsForNuvio(decryptedData, serverName, mediaDetails) {
  try {
    const data = JSON.parse(decryptedData);
    if (!data || typeof data !== "object")
      return [];
    const formattedSubtitles = (data.subtitles || []).map((sub) => ({
      url: sub.url,
      language: getLangCode(sub.language || sub.lang),
      name: sub.language || sub.lang || "English"
    }));
    const streams = [];
    (data.sources || []).forEach((source) => {
      if (!source.url)
        return;
      streams.push({
        name: `VidKing [${serverName}] - ${source.quality || "1080p"}`,
        title: `${mediaDetails.title} (${mediaDetails.year})`,
        url: source.url,
        quality: source.quality || "1080p",
        subtitles: formattedSubtitles,
        provider: "vidking"
      });
    });
    return streams;
  } catch (e) {
    console.error(`[Vidking] Formatting error: ${e.message}`);
    return [];
  }
}

// src/vidking/index.js
function fetchFromWingsServer(serverName, serverConfig, mediaType, tmdbId, mediaDetails, seed, seasonNum, episodeNum) {
  return __async(this, null, function* () {
    const params = {
      title: mediaDetails.title,
      mediaType,
      year: String(mediaDetails.year),
      episodeId: String(episodeNum || 1),
      seasonId: String(seasonNum || 1),
      tmdbId: String(tmdbId),
      imdbId: mediaDetails.imdbId || "",
      enc: "2",
      seed
    };
    const queryString = Object.keys(params).map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join("&");
    const url = `${WINGS_API_BASE}/${serverConfig.path}?${queryString}`;
    console.log(`[VidKing] Querying server ${serverName}: ${url}`);
    try {
      const res = yield fetch(url, { headers: REQUEST_HEADERS });
      if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
      const encryptedData = yield res.text();
      if (!encryptedData || encryptedData.trim() === "") {
        throw new Error("Empty response");
      }
      const decryptedData = decryptWingsDatabase(encryptedData, seed, Number(tmdbId));
      if (!decryptedData)
        return [];
      const streams = formatStreamsForNuvio(decryptedData, serverName, mediaDetails);
      console.log(`[VidKing] \u2705 Found ${streams.length} stream(s) from ${serverName}`);
      return streams;
    } catch (e) {
      console.warn(`[VidKing] \u274C Error from ${serverName}: ${e.message}`);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum = null, episodeNum = null) {
  return __async(this, null, function* () {
    console.log(`[VidKing] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === "tv" ? `, S:${seasonNum}E:${episodeNum}` : ""}`);
    try {
      const mediaDetails = yield fetchMediaDetails(tmdbId, mediaType);
      if (!mediaDetails) {
        console.error("[VidKing] Failed to fetch media details from TMDB.");
        return [];
      }
      console.log(`[VidKing] Media Details: "${mediaDetails.title}" (${mediaDetails.year})`);
      const seedUrl = `${WINGS_API_BASE}/seed?mediaId=${tmdbId}`;
      console.log(`[VidKing] Fetching seed from: ${seedUrl}`);
      const seedRes = yield fetch(seedUrl, { headers: REQUEST_HEADERS });
      if (!seedRes.ok)
        throw new Error(`Seed HTTP ${seedRes.status}`);
      const seedJson = yield seedRes.json();
      const seed = seedJson.seed;
      if (!seed)
        throw new Error("No seed returned from API");
      console.log(`[VidKing] Seed successfully retrieved: ${seed}`);
      const serverPromises = Object.keys(SERVERS).map((serverName) => {
        const serverConfig = SERVERS[serverName];
        return fetchFromWingsServer(
          serverName,
          serverConfig,
          mediaType,
          tmdbId,
          mediaDetails,
          seed,
          seasonNum,
          episodeNum
        );
      });
      const results = yield Promise.all(serverPromises);
      const allStreams = [];
      results.forEach((streams) => {
        allStreams.push(...streams);
      });
      const uniqueStreams = [];
      const seenUrls = /* @__PURE__ */ new Set();
      allStreams.forEach((stream) => {
        if (!seenUrls.has(stream.url)) {
          seenUrls.add(stream.url);
          uniqueStreams.push(stream);
        }
      });
      console.log(`[VidKing] Total unique streams found: ${uniqueStreams.length}`);
      return uniqueStreams;
    } catch (e) {
      console.error(`[VidKing] Error in getStreams: ${e.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
