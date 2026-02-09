/**
 * animex - Built from src/animex/
 * Generated: 2026-02-07T16:59:53.805Z
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
var __spreadValues = (a, b2) => {
  for (var prop in b2 || (b2 = {}))
    if (__hasOwnProp.call(b2, prop))
      __defNormalProp(a, prop, b2[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b2)) {
      if (__propIsEnum.call(b2, prop))
        __defNormalProp(a, prop, b2[prop]);
    }
  return a;
};
var __spreadProps = (a, b2) => __defProps(a, __getOwnPropDescs(b2));
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

// src/animex/http.js
var import_axios = __toESM(require("axios"));
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function request(_0, _1) {
  return __async(this, arguments, function* (method, url, options = {}) {
    try {
      return yield (0, import_axios.default)(__spreadProps(__spreadValues({
        method,
        url
      }, options), {
        headers: __spreadValues({
          "User-Agent": USER_AGENT,
          "X-Requested-With": "XMLHttpRequest"
        }, options.headers)
      }));
    } catch (error) {
      throw error;
    }
  });
}

// src/animex/utils.js
var import_crypto_js = __toESM(require("crypto-js"));
var KEY = new Uint8Array([1, 83, 160, 158, 58, 198, 82, 210, 133, 247, 202, 33, 80, 94, 227, 179, 162, 130, 9, 101, 19, 111, 180, 220, 156, 145, 144, 6, 150, 65, 25, 14]);
var AT = new Uint8Array([166, 215, 77, 130, 106, 46, 255, 237, 4, 39, 65, 214, 6, 17, 101, 113, 101, 252, 253, 240, 204, 202, 234, 19, 69, 132, 45, 76, 82, 15, 17, 205, 14, 190, 42, 67, 116, 216, 73, 243, 79, 171, 41, 4, 233, 158, 71, 45, 3, 227, 49, 8, 130, 167, 70, 179, 211, 169, 152, 21, 255, 230, 7, 100]);
var AU = new Uint8Array([38, 87, 230, 128, 78, 56, 110, 153, 220, 39, 166, 236, 176, 8, 95, 103, 21, 153, 47, 238, 168, 225, 185, 232, 198, 117, 74, 158, 160, 219, 128, 105, 70, 224, 21, 162, 220, 23, 217, 99, 14, 142, 214, 41, 71, 216, 230, 252]);
var b = (() => {
  const f = (n2) => (n2 ^ 1553869343) + (n2 << 7 ^ n2 >>> 11) & 4294967295;
  const g = (n2) => n2 * 2654435769 >>> 0;
  const x = (n2) => {
    let o = n2;
    o ^= o << 13;
    o ^= o >>> 17;
    o ^= o << 5;
    return (o >>> 0) % 256;
  };
  const u = (n2, o) => (n2 << o | n2 >>> 8 - o) & 255;
  const n = new Uint8Array(256);
  for (let o = 0; o < 256; o++) {
    const e = o ^ 170, c = x(e), t = g(e + 23130), s = f(o + c) & 255;
    n[o] = (c ^ t & 255 ^ s ^ o * 19) & 255;
  }
  for (let o = 0; o < 11; o++)
    for (let e = 0; e < 256; e++) {
      const c = n[e], t = n[(e + 37) % 256], s = n[(e + 73) % 256], a = n[(e + 139) % 256], r = u(c, 3) ^ u(t, 5) ^ u(s, 7), _ = f(c + o) & 255;
      n[e] = (r ^ a ^ _ ^ o * 17 + e * 23) & 255;
    }
  for (let o = 0; o < 128; o++) {
    const e = 255 - o, c = n[o] + n[e] & 255, t = (n[o] ^ n[e]) & 255;
    n[o] = (u(c, 2) ^ t) & 255, n[e] = (u(t, 3) ^ c) & 255;
  }
  return n;
})();
var T = (n, o, e) => {
  const c = new Uint8Array(n.length);
  for (let t = 0; t < n.length; t++) {
    const s = o[t % o.length], a = o[(t + 7) % o.length], r = o[(t + 13) % o.length], _ = e[t % e.length], i = e[(t + 11) % e.length], h = b[t * 7 % 256];
    c[t] = (n[t] ^ s ^ a ^ r ^ _ ^ i ^ h ^ t * 23) & 255;
  }
  return c;
};
var q = (n) => {
  const o = new Uint8Array(n.length);
  for (let e = 0; e < n.length; e++) {
    const c = n[e], t = e * 23 & 255;
    o[e] = (c << 4 | c >>> 4) ^ t & 255;
  }
  return o;
};
var m = (n) => btoa(n).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
function encryptGCM(data, key, iv) {
  return __async(this, null, function* () {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const cryptoKey = yield crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt"]);
      const result = yield crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, data);
      return new Uint8Array(result);
    }
    const keyWA = import_crypto_js.default.lib.WordArray.create(key);
    const ivWA = import_crypto_js.default.lib.WordArray.create(iv);
    const dataWA = import_crypto_js.default.lib.WordArray.create(data);
    const counter = new Uint8Array(16);
    counter.set(iv);
    counter[15] = 2;
    const counterWA = import_crypto_js.default.lib.WordArray.create(counter);
    const encrypted = import_crypto_js.default.AES.encrypt(dataWA, keyWA, {
      iv: counterWA,
      mode: import_crypto_js.default.mode.CTR,
      padding: import_crypto_js.default.pad.NoPadding
    });
    const cipherBuffer = encrypted.ciphertext;
    const cipherBytes = wordToByteArray(cipherBuffer.words, cipherBuffer.sigBytes);
    const hBuffer = import_crypto_js.default.AES.encrypt(import_crypto_js.default.lib.WordArray.create(new Uint8Array(16)), keyWA, {
      mode: import_crypto_js.default.mode.ECB,
      padding: import_crypto_js.default.pad.NoPadding
    }).ciphertext;
    const hBytes = wordToByteArray(hBuffer.words, hBuffer.sigBytes);
    const tag = calculateTag(cipherBytes, hBytes, iv, keyWA);
    const finalResult = new Uint8Array(cipherBytes.length + tag.length);
    finalResult.set(cipherBytes);
    finalResult.set(tag, cipherBytes.length);
    return finalResult;
  });
}
function wordToByteArray(words, length) {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
  }
  return array;
}
function calculateTag(ciphertext, h, iv, keyWA) {
  let y = new Uint8Array(16);
  const blocks = Math.ceil(ciphertext.length / 16);
  for (let i = 0; i < blocks; i++) {
    const block = new Uint8Array(16);
    block.set(ciphertext.slice(i * 16, (i + 1) * 16));
    for (let j = 0; j < 16; j++)
      y[j] ^= block[j];
    y = gmultiply(y, h);
  }
  const lenBlock = new Uint8Array(16);
  const cipherLenBits = ciphertext.length * 8;
  lenBlock[15] = cipherLenBits & 255;
  lenBlock[14] = cipherLenBits >>> 8 & 255;
  lenBlock[13] = cipherLenBits >>> 16 & 255;
  lenBlock[12] = cipherLenBits >>> 24 & 255;
  for (let j = 0; j < 16; j++)
    y[j] ^= lenBlock[j];
  y = gmultiply(y, h);
  const j0 = new Uint8Array(16);
  j0.set(iv);
  j0[15] = 1;
  const ej0Buffer = import_crypto_js.default.AES.encrypt(import_crypto_js.default.lib.WordArray.create(j0), keyWA, {
    mode: import_crypto_js.default.mode.ECB,
    padding: import_crypto_js.default.pad.NoPadding
  }).ciphertext;
  const ej0 = wordToByteArray(ej0Buffer.words, ej0Buffer.sigBytes);
  for (let j = 0; j < 16; j++)
    y[j] ^= ej0[j];
  return y;
}
function gmultiply(x, y) {
  const res = new Uint8Array(16);
  const v = new Uint8Array(y);
  for (let i = 0; i < 128; i++) {
    if (x[i >>> 3] >>> 7 - i % 8 & 1) {
      for (let j = 0; j < 16; j++)
        res[j] ^= v[j];
    }
    const msb = v[15] & 1;
    for (let j = 15; j > 0; j--) {
      v[j] = v[j] >>> 1 | (v[j - 1] & 1) << 7;
    }
    v[0] >>>= 1;
    if (msb)
      v[0] ^= 225;
  }
  return res;
}
function encrypt(n) {
  return __async(this, null, function* () {
    const iv = typeof crypto !== "undefined" && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(12)) : new Uint8Array(12).map(() => Math.floor(Math.random() * 256));
    const s = new TextEncoder().encode(n);
    const a = q(s);
    const r = T(a, AT, AU);
    const encrypted = yield encryptGCM(r, KEY, iv);
    const i = new Uint8Array(iv.length + encrypted.length);
    i.set(iv);
    i.set(encrypted, iv.length);
    return m(Array.from(i).map((b2) => String.fromCharCode(b2)).join(""));
  });
}
function generateId(_0) {
  return __async(this, arguments, function* (n, o = {}) {
    const e = __spreadProps(__spreadValues({ id: n }, o), { timestamp: Date.now() });
    return yield encrypt(JSON.stringify(e));
  });
}
function normalize(str) {
  if (!str)
    return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}
function isMatch(title1, title2) {
  const n1 = normalize(title1);
  const n2 = normalize(title2);
  return n1.includes(n2) || n2.includes(n1);
}

// src/animex/index.js
var ANILIST_API = "https://graphql.anilist.co/";
var BASE_URL = "https://animex.one";
function search(query) {
  return __async(this, null, function* () {
    const gql = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          format
          status
          seasonYear
        }
      }
    }
    `;
    try {
      const response = yield request("post", ANILIST_API, {
        data: {
          query: gql,
          variables: { search: query }
        }
      });
      const results = response.data.data.Page.media;
      return results.map((item) => ({
        id: item.id,
        title: item.title.english || item.title.romaji || item.title.native,
        year: item.seasonYear,
        type: item.format === "MOVIE" ? "movie" : "tv"
      }));
    } catch (error) {
      return [];
    }
  });
}
function getSlug(title, id, episode) {
  const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${slug}-${id}-episode-${episode}`;
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const tmdbMeta = yield getTmdbMetadata(tmdbId, mediaType);
    if (!tmdbMeta)
      return [];
    let match = null;
    let targetEpNum = episode || 1;
    let currentSeason = season || 1;
    if (mediaType === "tv" && currentSeason > 1) {
      const seasonalSearch = yield search(`${tmdbMeta.title} Season ${currentSeason}`);
      match = seasonalSearch.find(
        (r) => isMatch(r.title, tmdbMeta.title) && r.title.toLowerCase().includes(`season ${currentSeason}`) || isMatch(r.title, tmdbMeta.title) && r.title.toLowerCase().includes(` ${currentSeason}`)
      );
    }
    if (!match) {
      const searchResults = yield search(tmdbMeta.title);
      if (mediaType === "tv" && currentSeason > 1) {
        match = searchResults.find(
          (r) => isMatch(r.title, tmdbMeta.title) && (r.title.toLowerCase().includes(`season ${currentSeason}`) || r.title.toLowerCase().includes(` ${currentSeason}`))
        );
      }
      if (!match) {
        match = searchResults.find((r) => isMatch(r.title, tmdbMeta.title) && (String(r.year) === String(tmdbMeta.year) || !r.year));
      }
    }
    if (!match)
      return [];
    try {
      let episodesResponse = yield request("get", `${BASE_URL}/api/anime/episodes/${match.id}?refresh=false`);
      let episodes = episodesResponse.data;
      let targetEp = episodes.find((e) => e.number === targetEpNum);
      if (!targetEp && episodes.length > 0) {
      }
      if (!targetEp)
        return [];
      const streams = [];
      const watchUrl = `${BASE_URL}/watch/${getSlug(match.title, match.id, targetEpNum)}`;
      const categories = [
        { type: "sub", providers: targetEp.subProviders || [], label: "Hardsub" },
        { type: "softsub", providers: targetEp.subProviders || [], label: "Softsub" },
        { type: "dub", providers: targetEp.dubProviders || [], label: "Dub" }
      ];
      for (const cat of categories) {
        for (const provider of cat.providers) {
          try {
            const encryptedId = yield generateId(match.id, {
              host: provider,
              epNum: targetEp.number,
              type: cat.type,
              cache: "true"
            });
            const sourcesResponse = yield request("get", `${BASE_URL}/api/anime/sources/${encryptedId}`, {
              headers: {
                "Referer": watchUrl,
                "Origin": BASE_URL
              }
            });
            const sourcesData = sourcesResponse.data;
            if (sourcesData.sources) {
              for (const s of sourcesData.sources) {
                streams.push({
                  name: `AnimeX - ${provider} (${cat.label})`,
                  title: `${cat.label} - ${s.quality || "Auto"}`,
                  url: s.url,
                  quality: s.quality || "auto",
                  headers: {
                    "Referer": watchUrl,
                    "Origin": BASE_URL,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                  }
                });
              }
            }
          } catch (e) {
          }
        }
      }
      return streams;
    } catch (error) {
      return [];
    }
  });
}
function getTmdbMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
    const endpoint = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
    try {
      const response = yield request("get", url);
      const data = response.data;
      return {
        title: data.name || data.title,
        year: (data.first_air_date || data.release_date || "").split("-")[0]
      };
    } catch (error) {
      return null;
    }
  });
}
module.exports = { getStreams, search };
