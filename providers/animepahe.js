/**
 * animepahe - Built from src/animepahe/
 * Generated: 2026-01-08T19:47:42.710Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
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

// src/animepahe/constants.js
var BASE_URL = "https://animepahe.si";
var API_URL = "https://animepahe.si/api";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Cookie": "__ddg2_=1234567890",
  "Referer": "https://animepahe.si/"
};
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";

// src/animepahe/http.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    console.log(`[AnimePahe] Fetching: ${url}`);
    const response = yield fetch(url, __spreadValues({
      headers: __spreadValues(__spreadValues({}, HEADERS), options.headers)
    }, options));
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} for ${url}`);
    }
    return yield response.text();
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const raw = yield fetchText(url, options);
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error(`[AnimePahe] Failed to parse JSON from ${url}:`, raw.substring(0, 100));
      throw e;
    }
  });
}

// src/animepahe/tmdb.js
function getTmdbInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    console.log(`[AnimePahe] Fetching TMDB details from: ${url}`);
    try {
      const data = yield fetchJson(url);
      const title = data.name || data.title || data.original_name;
      const year = (data.first_air_date || data.release_date || "").substring(0, 4);
      return { title, year };
    } catch (e) {
      console.error("[AnimePahe] Failed to fetch TMDB metadata", e);
      return null;
    }
  });
}

// src/animepahe/extractor.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
function detect(source) {
  return /eval\(function\(/.test(source);
}
function unpack(source) {
  try {
    let p, a, c, k, e, d;
    const regex = /eval\(function\(p,a,c,k,e,d\)\{.+?return p\}\('(.+?)',(\d+),(\d+),'(.+?)'\.split\('\|'\),0,\{\}\)/;
    const match = source.match(regex);
    if (!match)
      return source;
    p = match[1];
    a = parseInt(match[2]);
    c = parseInt(match[3]);
    k = match[4].split("|");
    e = function(c2) {
      return (c2 < a ? "" : e(parseInt(c2 / a))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
    };
    while (c--) {
      if (k[c]) {
        p = p.replace(new RegExp("\\b" + e(c) + "\\b", "g"), k[c]);
      }
    }
    return p;
  } catch (err) {
    console.error("Unpack error", err);
    return source;
  }
}
function decryptWithKey(fullString, key, v1, v2) {
  let sb = "";
  let i = 0;
  const toFind = key[v2];
  while (i < fullString.length) {
    const nextIndex = fullString.indexOf(toFind, i);
    if (nextIndex === -1)
      break;
    let decodedCharStr = "";
    for (let j = i; j < nextIndex; j++) {
      decodedCharStr += key.indexOf(fullString[j]);
    }
    i = nextIndex + 1;
    try {
      const decodedChar = String.fromCharCode(parseInt(decodedCharStr, v2) - v1);
      sb += decodedChar;
    } catch (e) {
    }
  }
  return sb;
}
function extractKwik(url) {
  return __async(this, null, function* () {
    console.log(`[Kwik] Extracting: ${url}`);
    let targetUrl = url;
    if (url.includes("pahe.win")) {
      try {
        const redirectResponse = yield fetch(`${url}/i`, { redirect: "manual" });
        if (redirectResponse.status === 302 || redirectResponse.status === 301) {
          const loc = redirectResponse.headers.get("location");
          if (loc) {
            const lastHttpsIndex = loc.lastIndexOf("https://");
            if (lastHttpsIndex !== -1) {
              targetUrl = loc.substring(lastHttpsIndex);
            } else {
              targetUrl = loc;
            }
          }
        } else {
          const html2 = yield redirectResponse.text();
        }
      } catch (e) {
        console.log("[Kwik] Pahe redirect check failed:", e);
      }
    }
    console.log(`[Kwik] Target URL: ${targetUrl}`);
    const response = yield fetch(targetUrl, {
      headers: { "Referer": "https://animepahe.si/" }
    });
    const html = yield response.text();
    const cookies = response.headers.get("set-cookie") || "";
    const m3u8Match = html.match(/source=\s*['"](.*?)['"]/);
    if (m3u8Match)
      return m3u8Match[1];
    const kwikParamsRegex = /\(\"(\w+)\",\d+,\"(\w+)\",(\d+),(\d+),\d+\)/;
    const paramsMatch = html.match(kwikParamsRegex);
    if (paramsMatch) {
      console.log("[Kwik] Found obfuscated parameters, decrypting...");
      const [_, fullString, key, v1, v2] = paramsMatch;
      const decrypted = decryptWithKey(fullString, key, parseInt(v1), parseInt(v2));
      const uriMatch = decrypted.match(/action=\"([^\"]+)\"/);
      const tokenMatch = decrypted.match(/value=\"([^\"]+)\"/);
      if (uriMatch && tokenMatch) {
        const uri = uriMatch[1];
        const token = tokenMatch[1];
        console.log(`[Kwik] POST to ${uri} with token ${token}`);
        const postResp = yield fetch(uri, {
          method: "POST",
          headers: {
            "Referer": targetUrl,
            "Cookie": cookies,
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: `_token=${token}`,
          redirect: "manual"
          // We want the Location header
        });
        if (postResp.status === 302 || postResp.status === 301) {
          return postResp.headers.get("location");
        }
      }
    }
    if (detect(html)) {
      const $ = import_cheerio_without_node_native.default.load(html);
      let found = null;
      $("script").each((i, el) => {
        const c = $(el).html();
        if (c && detect(c)) {
          const u = unpack(c);
          const m = u.match(/source=\s*['"](.*?)['"]/);
          if (m)
            found = m[1];
        }
      });
      if (found)
        return found;
    }
    return null;
  });
}

// src/animepahe/index.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      if (!season)
        season = 1;
      if (!episode)
        episode = 1;
      const tmdb = yield getTmdbInfo(tmdbId, mediaType);
      if (!tmdb)
        return [];
      const { title, year } = tmdb;
      console.log(`[AnimePahe] Processing: ${title} (${year}) S${season}E${episode}`);
      const searchUrl = `${API_URL}?m=search&l=8&q=${encodeURIComponent(title)}`;
      const searchData = yield fetchJson(searchUrl);
      if (!searchData || !searchData.data || searchData.data.length === 0) {
        console.log("[AnimePahe] No search results found.");
        return [];
      }
      let anime = searchData.data.find((a) => a.title.toLowerCase() === title.toLowerCase());
      if (!anime && year) {
        anime = searchData.data.find((a) => a.year == year);
      }
      if (!anime)
        anime = searchData.data[0];
      console.log(`[AnimePahe] Selected Anime: ${anime.title} (Session: ${anime.session})`);
      const session = anime.session;
      let page = 1;
      let episodeSession = null;
      let lastPage = 1;
      while (!episodeSession && page <= lastPage) {
        const epUrl = `${API_URL}?m=release&id=${session}&sort=episode_asc&page=${page}`;
        const epData = yield fetchJson(epUrl);
        lastPage = epData.last_page;
        const targetEp = epData.data.find((e) => e.episode == episode);
        if (targetEp) {
          episodeSession = targetEp.session;
          console.log(`[AnimePahe] Found Episode ${episode} (Session: ${episodeSession})`);
        } else {
          page++;
        }
      }
      if (!episodeSession) {
        console.log(`[AnimePahe] Episode ${episode} not found.`);
        return [];
      }
      const playUrl = `${BASE_URL}/play/${session}/${episodeSession}`;
      const playHtml = yield fetchText(playUrl);
      const $ = import_cheerio_without_node_native2.default.load(playHtml);
      const streams = [];
      $("#resolutionMenu button").each((i, el) => {
        const src = $(el).attr("data-src");
        const text = $(el).text();
        const qualityMatch = text.match(/(\d{3,4}p)/);
        const quality = qualityMatch ? qualityMatch[1] : "Unknown";
        const isDub = text.toLowerCase().includes("eng") || text.toLowerCase().includes("dub");
        const lang = isDub ? "Dub" : "Sub";
        if (src && src.includes("kwik")) {
          streams.push({
            url: src,
            quality,
            lang,
            type: "kwik"
          });
        }
      });
      $("div#pickDownload > a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text();
        const qualityMatch = text.match(/(\d{3,4}p)/);
        const quality = qualityMatch ? qualityMatch[1] : "Unknown";
        const isDub = text.toLowerCase().includes("eng") || text.toLowerCase().includes("dub");
        const lang = isDub ? "Dub" : "Sub";
        if (href) {
          if (href.includes("kwik")) {
            streams.push({
              url: href,
              quality,
              lang,
              type: "kwik"
            });
          } else {
            streams.push({
              url: href,
              quality,
              lang,
              type: "pahe"
            });
          }
        }
      });
      const finalStreams = [];
      for (const s of streams) {
        try {
          const directUrl = yield extractKwik(s.url);
          if (directUrl) {
            finalStreams.push({
              name: `AnimePahe ${s.lang}`,
              title: `AnimePahe ${s.quality} ${s.lang}`,
              url: directUrl,
              quality: s.quality
            });
          }
        } catch (e) {
          console.error(`[AnimePahe] Failed to extract Kwik: ${e.message}`);
        }
      }
      return finalStreams;
    } catch (error) {
      console.error(`[AnimePahe] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
