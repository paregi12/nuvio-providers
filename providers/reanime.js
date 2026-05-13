/**
 * reanime - Built from src/reanime/
 * Generated: 2026-05-13T06:47:21.862Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
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

// src/reanime/constants.js
var REANIME_BASE = "https://reanime.to";
var FLIXCLOUD_BASE = "https://flixcloud.cc";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "Accept-Language": "en-US,en;q=0.9"
};
var FLIX_HEADERS = __spreadProps(__spreadValues({}, HEADERS), {
  "Referer": REANIME_BASE + "/"
});

// src/reanime/bytes.js
function utf8Encode(input) {
  const text = String(input || "");
  const out = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 55296 && code <= 56319 && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 56320 && next <= 57343) {
        code = 65536 + (code - 55296 << 10) + (next - 56320);
        i++;
      }
    }
    if (code < 128)
      out.push(code);
    else if (code < 2048)
      out.push(192 | code >> 6, 128 | code & 63);
    else if (code < 65536)
      out.push(224 | code >> 12, 128 | code >> 6 & 63, 128 | code & 63);
    else
      out.push(240 | code >> 18, 128 | code >> 12 & 63, 128 | code >> 6 & 63, 128 | code & 63);
  }
  return new Uint8Array(out);
}
function utf8Decode(bytes) {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b0 = bytes[i++];
    if (b0 < 128) {
      out += String.fromCharCode(b0);
    } else if (b0 >= 192 && b0 < 224) {
      const b1 = bytes[i++] & 63;
      out += String.fromCharCode((b0 & 31) << 6 | b1);
    } else if (b0 >= 224 && b0 < 240) {
      const b1 = bytes[i++] & 63;
      const b2 = bytes[i++] & 63;
      out += String.fromCharCode((b0 & 15) << 12 | b1 << 6 | b2);
    } else {
      const b1 = bytes[i++] & 63;
      const b2 = bytes[i++] & 63;
      const b3 = bytes[i++] & 63;
      let code = (b0 & 7) << 18 | b1 << 12 | b2 << 6 | b3;
      code -= 65536;
      out += String.fromCharCode(55296 + (code >> 10), 56320 + (code & 1023));
    }
  }
  return out;
}
function base64ToBytes(value) {
  const binary = atob(String(value || "").replace(/\s+/g, ""));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i) & 255;
  }
  return out;
}
function bytesToHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

// src/reanime/crypto.js
function requireWebCrypto() {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("Web Crypto is required for FlixCloud extraction");
  }
}
function sha256Hex(text) {
  return __async(this, null, function* () {
    requireWebCrypto();
    const digest = yield crypto.subtle.digest("SHA-256", utf8Encode(text));
    return bytesToHex(new Uint8Array(digest));
  });
}
function deriveFieldMap(seed) {
  return __async(this, null, function* () {
    let first = seed;
    for (let i = 0; i < 3; i++) {
      first = yield sha256Hex(first + String(i));
    }
    let second = first;
    for (let i = 0; i < 3; i++) {
      second = yield sha256Hex(second + String(i));
    }
    return {
      videoField: `vf_${first.substring(0, 8)}`,
      keyField: `kf_${first.substring(8, 16)}`,
      ivField: `ivf_${first.substring(16, 24)}`,
      containerName: `cd_${first.substring(24, 32)}`,
      arrayName: `ad_${first.substring(32, 40)}`,
      objectName: `od_${first.substring(40, 48)}`,
      tokenField: `${first.substring(48, 64)}_${first.substring(56, 64)}`,
      keyFrag2Field: `${second.substring(0, 16)}_${second.substring(16, 24)}`
    };
  });
}
function extractObfuscatedCryptoData(data, fieldMap) {
  const container = data && data[fieldMap.containerName];
  const arr = container && container[fieldMap.arrayName];
  const obj = arr && arr[0] && arr[0][fieldMap.objectName];
  if (!obj || !obj[fieldMap.keyField] || !obj[fieldMap.ivField]) {
    throw new Error("Invalid FlixCloud crypto data");
  }
  return {
    frag1B64: obj[fieldMap.keyField],
    ivB64: obj[fieldMap.ivField]
  };
}
function runWasmTransform(payloadB64, frag1, frag2, tokenKey, seedInt) {
  return __async(this, null, function* () {
    if (typeof WebAssembly === "undefined" || typeof WebAssembly.instantiate !== "function") {
      throw new Error("WebAssembly.instantiate is required for FlixCloud extraction");
    }
    const wasmBytes = base64ToBytes(payloadB64);
    const instance = (yield WebAssembly.instantiate(wasmBytes, {})).instance;
    const exports2 = instance.exports;
    const memory = exports2.memory;
    if (!memory)
      throw new Error("FlixCloud WASM memory missing");
    if (memory.buffer.byteLength === 0 && memory.grow)
      memory.grow(1);
    const inputLength = frag1.length;
    const p1 = 1e3;
    const p2 = p1 + inputLength;
    const p3 = p2 + inputLength;
    const out = p3 + inputLength;
    const mem = new Uint8Array(memory.buffer);
    mem.set(frag1, p1);
    mem.set(frag2, p2);
    mem.set(tokenKey, p3);
    exports2._s(seedInt);
    exports2._r(p1, p2, p3, out, inputLength);
    const result = new Uint8Array(inputLength);
    result.set(mem.subarray(out, out + inputLength));
    return result;
  });
}
function decryptAesCbcUrl(rawKey, ivB64, cipherB64, seed) {
  return __async(this, null, function* () {
    requireWebCrypto();
    const pbkdf2Key = yield crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derivedBits = yield crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: utf8Encode(seed),
        iterations: 1e3,
        hash: "SHA-256"
      },
      pbkdf2Key,
      256
    );
    const keyBytes = new Uint8Array(derivedBits);
    for (let i = 0; i < 32; i++) {
      keyBytes[i] ^= seed.charCodeAt(i % seed.length);
    }
    const digest = yield crypto.subtle.digest("SHA-256", keyBytes);
    const aesKey = yield crypto.subtle.importKey(
      "raw",
      new Uint8Array(digest),
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );
    const plain = yield crypto.subtle.decrypt(
      { name: "AES-CBC", iv: base64ToBytes(ivB64) },
      aesKey,
      base64ToBytes(cipherB64)
    );
    return utf8Decode(new Uint8Array(plain)).trim();
  });
}

// src/reanime/flixcloud.js
function extractBalancedObject(source, key) {
  const keyIndex = source.indexOf(key);
  if (keyIndex < 0)
    return null;
  const start = source.indexOf("{", keyIndex);
  if (start < 0)
    return null;
  let depth = 0;
  let quote = null;
  let escape = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escape)
        escape = false;
      else if (ch === "\\")
        escape = true;
      else if (ch === quote)
        quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0)
        return source.substring(start, i + 1);
    }
  }
  return null;
}
function extractDataObjectContaining(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0)
    return null;
  let dataIndex = source.lastIndexOf("data:", markerIndex);
  while (dataIndex >= 0) {
    const start = source.indexOf("{", dataIndex);
    if (start >= 0 && start < markerIndex) {
      const objectText = extractBalancedObject(source.substring(dataIndex), "data:");
      if (objectText && objectText.includes(marker))
        return objectText;
    }
    dataIndex = source.lastIndexOf("data:", dataIndex - 1);
  }
  return null;
}
function quoteObjectKeys(text) {
  return text.replace(/([{,])\s*([A-Za-z_$][A-Za-z0-9_$]*|[0-9a-f]{4,}(?:_[0-9a-f]{4,})?)\s*:/g, '$1"$2":').replace(/,\s*([}\]])/g, "$1");
}
function parseSsrData(html) {
  const dataObject = extractDataObjectContaining(html, "obfuscation_seed") || extractBalancedObject(html, "data:{subtitles:");
  if (!dataObject)
    throw new Error("FlixCloud SSR data not found");
  return JSON.parse(quoteObjectKeys(dataObject));
}
function normalizeFlixEmbedUrl(url, referer) {
  const finalUrl = url.startsWith("http") ? url : `${FLIXCLOUD_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  const separator = finalUrl.includes("?") ? "&" : "?";
  return `${finalUrl}${separator}v=1&autoPlay=true&skI=false&skO=false&kuudere_ts=${Date.now()}`;
}
function extractFlixCloud(embedUrl, referer) {
  return __async(this, null, function* () {
    const pageUrl = normalizeFlixEmbedUrl(embedUrl, referer);
    const response = yield fetch(pageUrl, {
      headers: __spreadProps(__spreadValues({}, FLIX_HEADERS), {
        "Referer": referer || FLIX_HEADERS.Referer
      })
    });
    if (!response.ok)
      throw new Error(`FlixCloud embed HTTP ${response.status}`);
    const html = yield response.text();
    const data = parseSsrData(html);
    const seed = data.obfuscation_seed;
    const obfuscated = data.obfuscated_crypto_data;
    if (!seed || !obfuscated || !data.w_payload) {
      throw new Error("FlixCloud crypto payload missing");
    }
    const fieldMap = yield deriveFieldMap(seed);
    const cryptoParts = extractObfuscatedCryptoData(obfuscated, fieldMap);
    const frag2B64 = data[fieldMap.keyFrag2Field];
    const tokenRef = data[fieldMap.tokenField];
    if (!frag2B64 || !tokenRef) {
      throw new Error("FlixCloud token fields missing");
    }
    const tokenResponse = yield fetch(`${FLIXCLOUD_BASE}/api/m3u8/${tokenRef}`, {
      headers: __spreadProps(__spreadValues({}, FLIX_HEADERS), {
        "Accept": "application/json",
        "Referer": pageUrl
      })
    });
    if (!tokenResponse.ok)
      throw new Error(`FlixCloud token HTTP ${tokenResponse.status}`);
    const tokenJson = yield tokenResponse.json();
    const videoKey = (yield sha256Hex(tokenRef + "vid")).substring(0, 10);
    const keyKey = (yield sha256Hex(tokenRef + "key")).substring(0, 10);
    const encryptedUrlB64 = tokenJson && tokenJson[videoKey];
    const tokenKeyB64 = tokenJson && tokenJson[keyKey];
    if (!encryptedUrlB64 || !tokenKeyB64) {
      throw new Error("FlixCloud token response incomplete");
    }
    const wasmKey = yield runWasmTransform(
      data.w_payload,
      base64ToBytes(cryptoParts.frag1B64),
      base64ToBytes(frag2B64),
      base64ToBytes(tokenKeyB64),
      parseInt(seed.substring(0, 8), 16)
    );
    const streamUrl = yield decryptAesCbcUrl(wasmKey, cryptoParts.ivB64, encryptedUrlB64, seed);
    if (!streamUrl || !streamUrl.includes(".m3u8")) {
      throw new Error("FlixCloud decrypted URL invalid");
    }
    return {
      url: streamUrl,
      videoId: data.video_id,
      title: data.video_title,
      subtitles: data.subtitles || [],
      headers: {
        "Referer": pageUrl,
        "Origin": FLIXCLOUD_BASE,
        "User-Agent": FLIX_HEADERS["User-Agent"]
      }
    };
  });
}

// src/reanime/reanime.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
function absolutize(path) {
  if (!path)
    return "";
  if (path.startsWith("http"))
    return path;
  return `${REANIME_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const finalUrl = absolutize(url);
    const response = yield fetch(finalUrl, __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues(__spreadValues({}, HEADERS), options.headers || {})
    }));
    if (!response.ok)
      throw new Error(`Reanime HTTP ${response.status}: ${finalUrl}`);
    return yield response.text();
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const text = yield fetchText(url, __spreadProps(__spreadValues({}, options), {
      headers: __spreadValues({
        "Accept": "application/json"
      }, options.headers || {})
    }));
    return JSON.parse(text);
  });
}
function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const res = yield fetch(url, { headers: HEADERS });
    if (!res.ok)
      throw new Error(`TMDB HTTP ${res.status}`);
    const data = yield res.json();
    return {
      title: data.name || data.title || data.original_name || data.original_title || "",
      year: ((data.first_air_date || data.release_date || "").match(/\d{4}/) || [null])[0],
      imdbId: data.external_ids && data.external_ids.imdb_id
    };
  });
}
function normalizeTitle(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function scoreCandidate(title, query, year) {
  const a = normalizeTitle(title);
  const b = normalizeTitle(query);
  if (!a || !b)
    return 0;
  let score = 0;
  if (a === b)
    score += 100;
  if (a.includes(b) || b.includes(a))
    score += 50;
  const words = b.split(/\s+/).filter(Boolean);
  for (const word of words)
    if (a.includes(word))
      score += 4;
  if (year && String(title).includes(String(year)))
    score += 10;
  return score;
}
function extractAnilistId(item) {
  var _a, _b, _c;
  const direct = item && (item.anilist_id || item.anilistId);
  if (direct)
    return String(direct);
  const imageUrls = [
    (_a = item == null ? void 0 : item.cover_image) == null ? void 0 : _a.extra_large,
    (_b = item == null ? void 0 : item.cover_image) == null ? void 0 : _b.large,
    (_c = item == null ? void 0 : item.cover_image) == null ? void 0 : _c.medium,
    item == null ? void 0 : item.banner_image
  ].filter(Boolean);
  for (const url of imageUrls) {
    const match = String(url).match(/\/b?x?(\d+)-|\/(\d+)[-.]/);
    if (match)
      return match[1] || match[2];
  }
  return null;
}
function collectSlugsFromHtml(html) {
  const $ = import_cheerio_without_node_native.default.load(html);
  const results = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/\/(?:anime|watch)\/([^?#]+)/);
    if (match) {
      results.push({
        slug: match[1],
        title: $(el).text().trim()
      });
    }
  });
  return results;
}
function searchReanimeAnime(query, year) {
  return __async(this, null, function* () {
    const endpoints = [
      `/search?keyword=${encodeURIComponent(query)}`,
      `/search?q=${encodeURIComponent(query)}`,
      `/api/search?q=${encodeURIComponent(query)}`,
      `/api/anime/search?q=${encodeURIComponent(query)}`,
      `/api/search/anime?q=${encodeURIComponent(query)}`
    ];
    const candidates = [];
    for (const endpoint of endpoints) {
      try {
        const text = yield fetchText(endpoint);
        if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
          const json = JSON.parse(text);
          const list = json.data || json.results || json.anime || json;
          if (Array.isArray(list)) {
            list.forEach((item) => {
              var _a, _b, _c;
              const slug = item.anime_id || item.slug || item.id || item.url;
              const cleanSlug = ((_a = String(slug || "").match(/\/(?:anime|watch)\/([^?#]+)/)) == null ? void 0 : _a[1]) || slug;
              if (cleanSlug) {
                candidates.push({
                  slug: cleanSlug,
                  title: ((_b = item.title) == null ? void 0 : _b.english) || ((_c = item.title) == null ? void 0 : _c.romaji) || item.title || item.name || cleanSlug,
                  anilistId: extractAnilistId(item)
                });
              }
            });
          }
        } else {
          candidates.push(...collectSlugsFromHtml(text));
        }
      } catch (_) {
      }
      if (candidates.length > 0)
        break;
    }
    const unique = [];
    const seen = /* @__PURE__ */ new Set();
    for (const candidate of candidates) {
      if (!candidate.slug || seen.has(candidate.slug))
        continue;
      seen.add(candidate.slug);
      candidate.score = scoreCandidate(candidate.title || candidate.slug, query, year);
      unique.push(candidate);
    }
    unique.sort((a, b) => b.score - a.score);
    if (unique.length > 0) {
      console.log(`[Reanime] Search for "${query}" found ${unique.length} candidates. Top: "${unique[0].title}" (Score: ${unique[0].score})`);
    }
    return unique.length > 0 ? unique[0] : null;
  });
}
function extractDirectFlixUrls(html) {
  const urls = [];
  const patterns = [
    /https?:\/\/flixcloud\.cc\/e\/[A-Za-z0-9_-]+[^"'\\\s<]*/g,
    /["'](\/e\/[A-Za-z0-9_-]+[^"']*)["']/g,
    /(?:url|embed|src)\s*:\s*["']([^"']*\/e\/[A-Za-z0-9_-]+[^"']*)["']/g
  ];
  for (const pattern of patterns) {
    let match;
    while (match = pattern.exec(html)) {
      const value = match[1] || match[0];
      if (value.includes("/e/"))
        urls.push(value.replace(/\\u0026/g, "&"));
    }
  }
  return [...new Set(urls)];
}
function fetchEpisodeSourcesApi(slug, episodeNumber, language, anilistId) {
  return __async(this, null, function* () {
    const endpoints = [
      anilistId ? `/api/flix/${anilistId}/${episodeNumber}` : null,
      `/api/sources/${slug}/${episodeNumber}?lang=${language}`,
      `/api/episode/sources/${slug}/${episodeNumber}?lang=${language}`,
      `/api/anime/${slug}/episodes/${episodeNumber}/sources?lang=${language}`,
      `/api/watch/${slug}?ep=${episodeNumber}&lang=${language}`
    ].filter(Boolean);
    for (const endpoint of endpoints) {
      try {
        const json = yield fetchJson(endpoint);
        if (Array.isArray(json.servers)) {
          const urls2 = json.servers.filter((server) => !language || server.dataType === language).map((server) => server.dataLink).filter(Boolean);
          if (urls2.length > 0)
            return [...new Set(urls2)];
        }
        const text = JSON.stringify(json);
        const urls = extractDirectFlixUrls(text);
        if (urls.length > 0)
          return urls;
      } catch (_) {
      }
    }
    return [];
  });
}
function getFlixEmbeds(slug, episodeNumber, language, anilistId) {
  return __async(this, null, function* () {
    const watchPath = `/watch/${slug}?ep=${episodeNumber}&lang=${language}`;
    const html = yield fetchText(watchPath);
    const direct = extractDirectFlixUrls(html);
    if (direct.length > 0)
      return { watchUrl: absolutize(watchPath), embeds: direct };
    const apiUrls = yield fetchEpisodeSourcesApi(slug, episodeNumber, language, anilistId);
    return { watchUrl: absolutize(watchPath), embeds: apiUrls };
  });
}

// src/reanime/index.js
function getStreams(tmdbId, mediaType = "tv", season = null, episode = null) {
  return __async(this, null, function* () {
    try {
      const episodeNumber = mediaType === "tv" ? Number(episode || 1) : 1;
      const tmdb = yield getTmdbInfo(tmdbId, mediaType);
      if (!tmdb.title)
        return [];
      const anime = yield searchReanimeAnime(tmdb.title, tmdb.year);
      if (!anime || !anime.slug)
        return [];
      const languages = ["sub", "dub"];
      const streams = [];
      for (const language of languages) {
        const { watchUrl, embeds } = yield getFlixEmbeds(anime.slug, episodeNumber, language, anime.anilistId);
        for (let i = 0; i < embeds.length; i++) {
          try {
            const extracted = yield extractFlixCloud(embeds[i], watchUrl);
            const streamTitle = mediaType === "movie" ? `${tmdb.title} (${language.toUpperCase()})` : `${tmdb.title} - Episode ${episodeNumber} (${language.toUpperCase()})`;
            streams.push({
              name: `Reanime ${language.toUpperCase()} HD-${i + 1}`,
              title: streamTitle,
              url: extracted.url,
              quality: "Auto",
              headers: extracted.headers,
              provider: "reanime",
              type: "m3u8"
            });
          } catch (error) {
            console.warn(`[Reanime] FlixCloud extraction failed: ${error.message}`);
          }
        }
      }
      const seen = /* @__PURE__ */ new Set();
      return streams.filter((stream) => {
        if (!stream.url || seen.has(stream.url))
          return false;
        seen.add(stream.url);
        return true;
      });
    } catch (error) {
      console.error(`[Reanime] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
