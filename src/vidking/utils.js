// src/vidking/utils.js
import { TMDB_API_KEY, TMDB_BASE_URL, WINGS_API_BASE, REQUEST_HEADERS, USER_AGENT } from './constants.js';

// Decryption constants and helpers
const jl = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580];
const Tf = [1732584193, 4023233417, 2562383102, 271733878];
const Js = 61;
const _f = 8;
const ms = 2654435769;
const Ys = [109, 118, 109, 49];

const Sf = l => (l * (l + 1) & 1) === 0;
const bf = l => (l * (l + 1) & 1) === 1;

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
  for (let i = 0; i < 256; i++) o[i] = i;
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
  if (bf(l.length)) return { S: Af(l), acc: If(l) };
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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const cleanStr = str.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const len = cleanStr.length;
  const bytes = new Uint8Array(Math.floor(len * 0.75));
  
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c1 = chars.indexOf(cleanStr[i]);
    const c2 = chars.indexOf(cleanStr[i + 1] || 'A');
    const c3 = chars.indexOf(cleanStr[i + 2] || 'A');
    const c4 = chars.indexOf(cleanStr[i + 3] || 'A');
    
    bytes[p++] = (c1 << 2) | (c2 >> 4);
    if (i + 2 < len) bytes[p++] = ((c2 & 15) << 4) | (c3 >> 2);
    if (i + 3 < len) bytes[p++] = ((c3 & 3) << 6) | c4;
  }
  return bytes;
}

function xf(l) {
  return decodeBase64(l);
}

// Decrypt WingsDatabase payload
export function decryptWingsDatabase(l, o, e) {
  const i = xf(l);
  const r = Cf(o, e, i.length);
  for (let n = 0; n < i.length; n++) i[n] ^= r[n];
  for (let n = 0; n < Ys.length; n++) {
    if (i[n] !== Ys[n]) throw new Error("decrypt failed: bad seed or tampered payload");
  }
  
  let out = "";
  const sub = i.subarray(Ys.length);
  for (let n = 0; n < sub.length; ) {
    const c = sub[n++];
    if (c < 128) {
      out += String.fromCharCode(c);
    } else if (c > 191 && c < 224) {
      out += String.fromCharCode(((c & 31) << 6) | (sub[n++] & 63));
    } else if (c > 223 && c < 240) {
      out += String.fromCharCode(((c & 15) << 12) | ((sub[n++] & 63) << 6) | (sub[n++] & 63));
    } else {
      out += String.fromCharCode(((c & 7) << 18) | ((sub[n++] & 63) << 12) | ((sub[n++] & 63) << 6) | (sub[n++] & 63));
    }
  }
  return out;
}

// Fetch TMDB metadata
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
      console.error(`[Vidking] TMDB details fetch error: ${e.message}`);
      return null;
  }
}

// Subtitle Language Code mapper
function getLangCode(langName) {
  if (!langName) return 'en';
  const mapping = {
    'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de',
    'italian': 'it', 'portuguese': 'pt', 'portuguese (br)': 'pt-br',
    'arabic': 'ar', 'japanese': 'ja', 'korean': 'ko', 'tamil': 'ta',
    'telugu': 'te', 'malayalam': 'ml', 'kannada': 'kn', 'hindi': 'hi',
    'polish': 'pl', 'greek': 'el', 'croatian': 'hr', 'ukrainian': 'uk',
    'lithuanian': 'lt', 'thai': 'th', 'estonian': 'et', 'czech': 'cs',
    'zh-tw': 'zh-tw', 'bokmål': 'no', 'dutch': 'nl', 'indonesian': 'id',
    'sinhala': 'si', 'swedish': 'sv', 'romanian': 'ro', 'malay': 'ms',
    'persian': 'fa', 'slovak': 'sk', 'bulgarian': 'bg', 'turkish': 'tr',
    'danish': 'da', 'hebrew': 'he', 'serbian': 'sr', 'vietnamese': 'vi',
    'hungarian': 'hu', 'icelandic': 'is', 'albanian': 'sq', 'bosnian': 'bs',
    'slovenian': 'sl', 'bengali': 'bn', 'macedonian': 'mk'
  };
  return mapping[langName.toLowerCase().trim()] || 'en';
}

// Format streams for Nuvio compatibility
export function formatStreamsForNuvio(decryptedData, serverName, mediaDetails) {
  try {
    const data = JSON.parse(decryptedData);
    if (!data || typeof data !== 'object') return [];

    const playbackHeaders = {
      "Referer": "https://www.vidking.net/",
      "Origin": "https://www.vidking.net",
      "User-Agent": USER_AGENT
    };

    const formattedSubtitles = (data.subtitles || []).map(sub => ({
      url: sub.url,
      language: getLangCode(sub.language || sub.lang),
      name: sub.language || sub.lang || "English",
      headers: playbackHeaders
    }));

    const streams = [];
    (data.sources || []).forEach(source => {
      if (!source.url) return;
      streams.push({
        name: `VidKing [${serverName}] - ${source.quality || "1080p"}`,
        title: `${mediaDetails.title} (${mediaDetails.year})`,
        url: source.url,
        quality: source.quality || "1080p",
        headers: playbackHeaders,
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
