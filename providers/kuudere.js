/**
 * kuudere - Built from src/kuudere/
 * Generated: 2026-01-09T18:53:14.831Z
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

// src/kuudere/http.js
var import_axios = __toESM(require("axios"));

// src/kuudere/constants.js
var BASE_URL = "https://kuudere.ru";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// src/kuudere/http.js
function request(_0, _1) {
  return __async(this, arguments, function* (method, path, options = {}) {
    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
    try {
      return yield (0, import_axios.default)(__spreadProps(__spreadValues({
        method,
        url
      }, options), {
        headers: __spreadValues({
          "User-Agent": USER_AGENT,
          "Referer": BASE_URL,
          "X-Requested-With": "XMLHttpRequest"
        }, options.headers)
      }));
    } catch (error) {
      console.error(`[Kuudere] Request error (${url}):`, error.message);
      throw error;
    }
  });
}

// src/kuudere/tmdb.js
var import_axios2 = __toESM(require("axios"));
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
function getMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const endpoint = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
    try {
      const response = yield import_axios2.default.get(url);
      const data = response.data;
      return {
        title: data.name || data.title,
        year: (data.first_air_date || data.release_date || "").split("-")[0]
      };
    } catch (error) {
      console.error("[Kuudere] TMDB metadata error:", error.message);
      return null;
    }
  });
}

// src/kuudere/extractor.js
var import_axios3 = __toESM(require("axios"));
var import_crypto_js = __toESM(require("crypto-js"));
var USER_AGENT2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function resolveValue(idx, dataArray, visited = /* @__PURE__ */ new Set()) {
  if (visited.has(idx))
    return null;
  visited.add(idx);
  const val = dataArray[idx];
  if (typeof val === "number") {
    if (dataArray[val] !== void 0)
      return resolveValue(val, dataArray, visited);
    return val;
  }
  if (Array.isArray(val))
    return val.map((i) => typeof i === "number" ? resolveValue(i, dataArray, new Set(visited)) : i);
  if (val && typeof val === "object") {
    const obj = {};
    for (const [k, v] of Object.entries(val)) {
      obj[k] = typeof v === "number" ? resolveValue(v, dataArray, new Set(visited)) : v;
    }
    return obj;
  }
  return val;
}
function findKeyInObj(obj, key) {
  if (!obj || typeof obj !== "object")
    return null;
  if (obj[key])
    return obj[key];
  for (const k in obj) {
    const res = findKeyInObj(obj[k], key);
    if (res)
      return res;
  }
  return null;
}
function getZenStream(embedUrl) {
  return __async(this, null, function* () {
    try {
      const urlObj = new URL(embedUrl);
      const dataUrl = `${urlObj.origin}${urlObj.pathname.replace(/\/e\//, "/e/")}/__data.json${urlObj.search}`;
      const response = yield import_axios3.default.get(dataUrl, {
        headers: {
          "Referer": "https://kuudere.ru/",
          "User-Agent": USER_AGENT2
        }
      });
      const data = response.data;
      const node = data.nodes.find((n) => n && n.data && n.data.some((item) => item && item.obfuscation_seed));
      if (!node)
        return null;
      const dataArray = node.data;
      const metaIdx = dataArray.findIndex((item) => item && item.obfuscation_seed);
      const meta = dataArray[metaIdx];
      const seed = dataArray[meta.obfuscation_seed];
      const hash = import_crypto_js.default.SHA256(seed).toString();
      const fields = {
        keyField: `kf_${hash.substring(8, 16)}`,
        ivField: `ivf_${hash.substring(16, 24)}`,
        tokenField: `${hash.substring(48, 64)}_${hash.substring(56, 64)}`
      };
      const resolvedMeta = resolveValue(metaIdx, dataArray);
      const encryptedKey = findKeyInObj(resolvedMeta, fields.keyField);
      const encryptedIv = findKeyInObj(resolvedMeta, fields.ivField);
      const token = resolvedMeta[fields.tokenField];
      if (!token || !encryptedKey || !encryptedIv)
        return null;
      const manifestRes = yield import_axios3.default.get(`${urlObj.origin}/api/m3u8/${token}`, {
        headers: {
          "Referer": embedUrl,
          "User-Agent": USER_AGENT2,
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      const encryptedB64 = manifestRes.data.video_b64;
      const key = import_crypto_js.default.enc.Base64.parse(encryptedKey);
      const iv = import_crypto_js.default.enc.Base64.parse(encryptedIv);
      const ciphertext = import_crypto_js.default.enc.Base64.parse(encryptedB64);
      const decrypted = import_crypto_js.default.AES.decrypt(
        { ciphertext },
        key,
        { iv, mode: import_crypto_js.default.mode.CBC, padding: import_crypto_js.default.pad.Pkcs7 }
      );
      return decrypted.toString(import_crypto_js.default.enc.Utf8);
    } catch (error) {
      return null;
    }
  });
}
function getStreamWish(embedUrl) {
  return __async(this, null, function* () {
    try {
      const response = yield import_axios3.default.get(embedUrl, {
        headers: {
          "Referer": "https://kuudere.to/",
          "User-Agent": USER_AGENT2
        }
      });
      const html = response.data;
      const m3u8Match = html.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/) || html.match(/file\s*:\s*"([^"]+\.txt[^"]*)"/) || html.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
      if (m3u8Match)
        return m3u8Match[1];
      const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\).+?\)\)/);
      if (packedMatch) {
        const innerM3u8 = packedMatch[0].match(/https?:\/\/[^"']+\.m3u8/);
        if (innerM3u8)
          return innerM3u8[0];
      }
      return null;
    } catch (error) {
      return null;
    }
  });
}
function getDoodstream(embedUrl) {
  return __async(this, null, function* () {
    try {
      const response = yield import_axios3.default.get(embedUrl, {
        headers: { "User-Agent": USER_AGENT2 }
      });
      const html = response.data;
      const md5Match = html.match(/\/pass_md5\/([^']*)/);
      if (!md5Match)
        return null;
      const token = md5Match[1];
      const md5Url = `${new URL(embedUrl).origin}/pass_md5/${token}`;
      const md5Res = yield import_axios3.default.get(md5Url, {
        headers: { "Referer": embedUrl, "User-Agent": USER_AGENT2 }
      });
      const urlPart = md5Res.data;
      const randomString = (length) => {
        let result = "";
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < length; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      };
      return `${urlPart}${randomString(10)}?token=${token}&expiry=${Date.now()}`;
    } catch (error) {
      return null;
    }
  });
}
function getMp4Upload(embedUrl) {
  return __async(this, null, function* () {
    try {
      const response = yield import_axios3.default.get(embedUrl, {
        headers: { "User-Agent": USER_AGENT2 }
      });
      const html = response.data;
      const srcMatch = html.match(/src\s*:\s*"([^"]+\.mp4)"/);
      return srcMatch ? srcMatch[1] : null;
    } catch (error) {
      return null;
    }
  });
}
function extractStreams(links) {
  return __async(this, null, function* () {
    const streams = [];
    for (const link of links) {
      try {
        const serverName = link.serverName;
        const embedUrl = link.dataLink;
        let directUrl = null;
        let quality = "Auto";
        let headers = {};
        if (serverName.startsWith("Zen")) {
          directUrl = yield getZenStream(embedUrl);
          quality = "1080p";
          headers = { "Referer": "https://zencloudz.cc/" };
        } else if (serverName.includes("Wish") || serverName === "Streamwish") {
          directUrl = yield getStreamWish(embedUrl);
          headers = { "Referer": new URL(embedUrl).origin };
        } else if (serverName.includes("Hide") || serverName === "Vidhide") {
          directUrl = yield getStreamWish(embedUrl);
          headers = { "Referer": new URL(embedUrl).origin };
        } else if (serverName.includes("Dood") || serverName === "Doodstream") {
          directUrl = yield getDoodstream(embedUrl);
          headers = { "Referer": "https://dood.li/" };
        } else if (serverName.includes("Mp4") || serverName === "Mp4upload") {
          directUrl = yield getMp4Upload(embedUrl);
          headers = { "Referer": "https://www.mp4upload.com/" };
        }
        if (directUrl) {
          streams.push({
            name: `Kuudere (${serverName})`,
            title: `${link.dataType.toUpperCase()} - Direct`,
            url: directUrl,
            quality,
            headers
          });
        } else {
          const knownTypes = ["Zen", "Kumi", "Wish", "Hide", "Streamwish", "Vidhide", "Dood", "Mp4"];
          const isKnown = knownTypes.some((t) => serverName.includes(t));
          if (!isKnown) {
            streams.push({
              name: `Kuudere (${serverName})`,
              title: `${link.dataType.toUpperCase()} - Embed`,
              url: embedUrl,
              quality: "Auto",
              headers: { "Referer": "https://kuudere.ru/" }
            });
          }
        }
      } catch (error) {
        console.error(`[Kuudere] Extraction error for ${link.serverName}:`, error.message);
      }
    }
    return streams;
  });
}

// src/kuudere/index.js
function parseSvelteData(data) {
  if (!data || !data.nodes)
    return [];
  const animeNode = data.nodes.find((n) => n && n.data && n.data.some((item) => item && item.animeData));
  if (!animeNode)
    return [];
  const dataArray = animeNode.data;
  const meta = dataArray.find((item) => item && item.animeData);
  const animeIndices = dataArray[dataArray.indexOf(meta) + 1];
  const animeList = [];
  if (Array.isArray(animeIndices)) {
    for (const idx of animeIndices) {
      const item = dataArray[idx];
      if (item && typeof item === "object") {
        const anime = {};
        for (const [key, val] of Object.entries(item)) {
          if (typeof val === "number" && dataArray[val] !== void 0) {
            anime[key] = dataArray[val];
          } else {
            anime[key] = val;
          }
        }
        animeList.push({
          id: anime.id,
          title: anime.english || anime.title || anime.romaji || anime.native,
          poster: anime.cover || anime.coverImage,
          year: anime.year,
          type: String(anime.type).toLowerCase().includes("movie") ? "movie" : "tv"
        });
      }
    }
  }
  return animeList;
}
function normalize(str) {
  if (!str)
    return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w\s]/g, "").trim();
}
function search(query) {
  return __async(this, null, function* () {
    try {
      const response = yield request("get", `/search/__data.json?keyword=${encodeURIComponent(query)}`);
      let results = parseSvelteData(response.data);
      if (results.length === 0) {
        const quickResponse = yield request("get", `/api/search?q=${encodeURIComponent(query)}`);
        if (quickResponse.data && quickResponse.data.results) {
          results = quickResponse.data.results.map((item) => ({
            title: item.title,
            id: item.id,
            poster: item.coverImage,
            type: item.details.toLowerCase().includes("movie") ? "movie" : "tv"
          }));
        }
      }
      return results.map((item) => ({
        name: "Kuudere",
        title: item.title,
        url: item.id,
        poster: item.poster,
        year: item.year,
        type: item.type
      }));
    } catch (error) {
      console.error("[Kuudere] Search error:", error.message);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const meta = yield getMetadata(tmdbId, mediaType);
      if (!meta)
        return [];
      const targetTitle = normalize(meta.title);
      const targetYear = meta.year;
      console.log(`[Kuudere] Searching for: ${meta.title} (${meta.year})`);
      const searchResults = yield search(meta.title.replace(/[^\x00-\x7F]/g, ""));
      let match = null;
      if (mediaType === "tv" && season && parseInt(season) > 1) {
        const seasonTitle = normalize(`${meta.title} Season ${season}`);
        match = searchResults.find((r) => normalize(r.title) === seasonTitle);
        if (!match) {
          match = searchResults.find((r) => normalize(r.title).includes(seasonTitle));
        }
      }
      if (!match) {
        match = searchResults.find(
          (r) => normalize(r.title) === targetTitle && (String(r.year) === String(targetYear) || !r.year)
        );
        if (!match) {
          match = searchResults.find((r) => normalize(r.title) === targetTitle);
        }
        if (!match) {
          match = searchResults.find((r) => normalize(r.title).includes(targetTitle));
        }
      }
      if (!match) {
        console.log("[Kuudere] No matching anime found.");
        return [];
      }
      console.log(`[Kuudere] Found match: ${match.title} (${match.url})`);
      const watchResponse = yield request("get", `/api/watch/${match.url}/${episode}`);
      const watchData = watchResponse.data;
      if (!watchData.episode_links || watchData.episode_links.length === 0) {
        console.log("[Kuudere] No stream links found for this episode.");
        return [];
      }
      return yield extractStreams(watchData.episode_links);
    } catch (error) {
      return [];
    }
  });
}
module.exports = { getStreams, search, extractStreams };
