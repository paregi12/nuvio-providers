/**
 * animepahe - Built from src/animepahe/
 * Generated: 2026-10-12T09:39:22.256Z
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
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
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

// src/animepahe/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/animepahe/constants.js
var MAIN_URL = "https://animepahe.com";
var PROXY_URL = "https://animepaheproxy.phisheranimepahe.workers.dev/?url=";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Cookie": "__ddg2_=1234567890",
  "Referer": "https://animepahe.com/"
};

// src/animepahe/utils.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const _a = options, { useProxy = false } = _a, fetchOptions = __objRest(_a, ["useProxy"]);
    const settings = globalThis.SCRAPER_SETTINGS || {};
    const domain = settings.domain || MAIN_URL;
    const finalUrl = url.startsWith("http") ? url : `${domain}${url}`;
    const targetUrl = useProxy ? `${PROXY_URL}${encodeURIComponent(finalUrl)}` : finalUrl;
    const isAnimePaheUrl = finalUrl.includes("animepahe.");
    const response = yield fetch(targetUrl, __spreadValues({
      headers: __spreadValues(__spreadProps(__spreadValues({}, HEADERS), {
        "Referer": `${domain}/`
      }), fetchOptions.headers),
      cfKiller: isAnimePaheUrl,
      // Only activate native bypass for AnimePahe domains
      skipSizeCheck: true
    }, fetchOptions));
    if (!response.ok)
      throw new Error(`HTTP ${response.status} on ${finalUrl}`);
    return yield response.text();
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const text = yield fetchText(url, options);
    return JSON.parse(text);
  });
}
function getCinemetaTitle(imdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    try {
      const type = mediaType === "tv" ? "series" : "movie";
      const res = yield fetch(`https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`);
      if (!res.ok)
        return null;
      const data = yield res.json();
      return ((_a = data == null ? void 0 : data.meta) == null ? void 0 : _a.name) || null;
    } catch (_) {
      return null;
    }
  });
}
function resolveMapping(imdbId, season, episode) {
  return __async(this, null, function* () {
    try {
      const url = `https://id-mapping-api-malid.hf.space/api/resolve?id=${imdbId}&s=${season}&e=${episode}`;
      const res = yield fetch(url);
      if (!res.ok)
        return null;
      return yield res.json();
    } catch (e) {
      return null;
    }
  });
}
function getMalTitle(malId) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(`https://api.jikan.moe/v4/anime/${malId}`);
      if (!res.ok)
        return null;
      const data = yield res.json();
      return data.data.title;
    } catch (e) {
      return null;
    }
  });
}
function searchAnime(query) {
  return __async(this, null, function* () {
    const url = `/api?m=search&l=8&q=${encodeURIComponent(query)}`;
    return yield fetchJson(url);
  });
}
function extractQuality(text) {
  const match = text.match(/(\d{3,4}p)/);
  return match ? match[1] : "720p";
}

// src/animepahe/extractors.js
function unpack(code) {
  try {
    const match = code.match(/}\((['"])([\s\S]*?)\1,\s*(\d+),\s*(\d+),\s*(['"])([\s\S]*?)\5\.split\((['"])\|\7\)/);
    if (match) {
      let [_, quote1, p, a, c, quote2, kStr] = match;
      p = p.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      a = parseInt(a);
      c = parseInt(c);
      const k = kStr.split("|");
      const e = (c2) => (c2 < a ? "" : e(parseInt(c2 / a))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
      const d = {};
      while (c--)
        d[e(c)] = k[c] || e(c);
      return p.replace(/\b\w+\b/g, (w) => d[w]);
    }
  } catch (e) {
    console.error("[AnimePahe] Unpack error:", e.message);
  }
  return code;
}
function extractKwik(url) {
  return __async(this, null, function* () {
    try {
      const settings = globalThis.SCRAPER_SETTINGS || {};
      const baseUrl = settings.domain || "https://animepahe.com";
      const res = yield fetch(url, {
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Referer": `${baseUrl}/`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        })
      });
      const finalUrl = res.url || url;
      const html = yield res.text();
      const scripts = html.match(/<script.*?>([\s\S]*?)<\/script>/g) || [];
      const matches = [];
      for (const script of scripts) {
        if (script.includes("eval(function(p,a,c,k,e,d)")) {
          let pos = 0;
          while (true) {
            const start = script.indexOf("eval(function(p,a,c,k,e,d)", pos);
            if (start === -1)
              break;
            const end = script.indexOf(".split('|')", start);
            if (end === -1)
              break;
            const closeParen = script.indexOf("))", end);
            if (closeParen === -1)
              break;
            matches.push(script.substring(start, closeParen + 2));
            pos = closeParen + 2;
          }
        }
      }
      for (const scriptContent of matches) {
        const unpacked = unpack(scriptContent);
        const m3u8Match = unpacked.match(/source\s*=\s*'([^']+m3u8[^']*)'/) || unpacked.match(/source\s*=\s*"([^"]+m3u8[^"]*)"/);
        if (m3u8Match) {
          const m3u8Url = m3u8Match[1];
          const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
          const title = titleMatch ? titleMatch[1].trim() : "video";
          const fileName = title.endsWith(".mp4") ? title : title + ".mp4";
          const urlParts = m3u8Url.replace("/stream/", "/mp4/").split("/");
          urlParts.pop();
          const mp4Base = urlParts.join("/");
          const mp4Url = `${mp4Base}?file=${encodeURIComponent(fileName)}`;
          return {
            m3u8: m3u8Url,
            mp4: mp4Url,
            headers: {
              "Referer": finalUrl,
              "Origin": "https://kwik.cx",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          };
        }
      }
    } catch (e) {
      console.error("[AnimePahe] Kwik extraction failed:", e.message);
    }
    return null;
  });
}
function paheDecrypt(fullString, key, v1, v2) {
  const keyIndexMap = {};
  for (let i2 = 0; i2 < key.length; i2++)
    keyIndexMap[key[i2]] = i2;
  let result = "";
  let i = 0;
  const toFind = key[v2];
  while (i < fullString.length) {
    const nextIndex = fullString.indexOf(toFind, i);
    if (nextIndex === -1)
      break;
    let decodedCharStr = "";
    for (let j = i; j < nextIndex; j++) {
      decodedCharStr += keyIndexMap[fullString[j]];
    }
    i = nextIndex + 1;
    const decodedChar = String.fromCharCode(parseInt(decodedCharStr, v2) - v1);
    result += decodedChar;
  }
  return result;
}
function extractPahe(url) {
  return __async(this, null, function* () {
    try {
      const initUrl = url.endsWith("/i") ? url : `${url}/i`;
      const initRes = yield fetch(initUrl, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://pahe.win/"
        }
      });
      const redirectLoc = initRes.headers.get("location") || initRes.headers.get("Location");
      if (!redirectLoc)
        return null;
      const kwikUrl = redirectLoc.startsWith("http") ? redirectLoc : `https://${redirectLoc.replace(/^\/+/, "")}`;
      const kwikRes = yield fetch(kwikUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://kwik.cx/"
        }
      });
      const html = yield kwikRes.text();
      const setCookieHeader = kwikRes.headers.get("set-cookie") || kwikRes.headers.get("Set-Cookie");
      let cookie = "";
      if (setCookieHeader) {
        cookie = setCookieHeader.split(";")[0];
      }
      const kwikParamsRegex = /\("(\w+)",\d+,"(\w+)",(\d+),(\d+),\d+\)/;
      const match = html.match(kwikParamsRegex);
      if (!match)
        return null;
      const [_, fullString, key, v1, v2] = match;
      const decrypted = paheDecrypt(fullString, key, parseInt(v1), parseInt(v2));
      const actionMatch = decrypted.match(/action="([^"]+)"/);
      const tokenMatch = decrypted.match(/value="([^"]+)"/);
      if (!actionMatch || !tokenMatch)
        return null;
      const postUri = actionMatch[1];
      const token = tokenMatch[1];
      const formData = new URLSearchParams();
      formData.append("_token", token);
      let tries = 0;
      let postRes = null;
      let location = null;
      while (tries < 20) {
        postRes = yield fetch(postUri, {
          method: "POST",
          redirect: "manual",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": kwikUrl,
            "Cookie": cookie,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: formData.toString()
        });
        if (postRes.status === 302 || postRes.status === 301) {
          location = postRes.headers.get("location") || postRes.headers.get("Location");
          break;
        }
        tries++;
      }
      if (location) {
        return {
          url: location,
          headers: {
            "Referer": "https://kwik.cx/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        };
      }
    } catch (e) {
      console.error("[AnimePahe] Pahe extractor failed:", e.message);
    }
    return null;
  });
}

// src/animepahe/index.js
function getStreams(episodeUrl) {
  return __async(this, null, function* () {
    try {
      if (typeof episodeUrl !== "string" || !episodeUrl.trim())
        return [];
      const parsedUrl = new URL(episodeUrl, MAIN_URL);
      const playPath = parsedUrl.pathname.match(/\/play\/([^/]+)\/([^/]+)/);
      if (!playPath)
        return [];
      const animeSession = playPath[1];
      const episodeSession = playPath[2];
      const playUrl = `${parsedUrl.pathname}${parsedUrl.search}`;
      const playHtml = yield fetchText(playUrl);
      const $ = import_cheerio_without_node_native.default.load(playHtml);
      const animeTitle = $("title").first().text().replace(/\s*[-|].*$/, "").trim() || "AnimePahe";
      const mappedEp = Number(parsedUrl.searchParams.get("ep")) || 1;
      const streams = [];
      const promises = [];
      $("#resolutionMenu button").each((i, el) => {
        const $btn = $(el);
        const kwikUrl = $btn.attr("data-src");
        const btnText = $btn.text();
        const quality = extractQuality(btnText);
        const isDub = btnText.toLowerCase().includes("eng");
        const type = isDub ? "Dub" : "Sub";
        const format = isDub ? "dub" : "hardsub";
        if (kwikUrl && kwikUrl.includes("kwik")) {
          promises.push(
            extractKwik(kwikUrl).then((res) => {
              if (res) {
                if (res.m3u8) {
                  streams.push({
                    name: `AnimePahe [HLS] (${quality} ${type})`,
                    title: `${animeTitle} - Episode ${mappedEp}`,
                    url: res.m3u8,
                    quality,
                    server: "Kwik",
                    format,
                    headers: res.headers
                  });
                }
                if (res.mp4) {
                  streams.push({
                    name: `AnimePahe [MP4] (${quality} ${type})`,
                    title: `${animeTitle} - Episode ${mappedEp}`,
                    url: res.mp4,
                    quality,
                    server: "Kwik",
                    format,
                    headers: __spreadProps(__spreadValues({}, res.headers), {
                      "Referer": kwikUrl
                    })
                  });
                }
              }
            }).catch(() => {
            })
          );
        }
      });
      $("div#pickDownload a").each((i, el) => {
        const $link = $(el);
        const paheUrl = $link.attr("href");
        const linkText = $link.text();
        const quality = extractQuality(linkText);
        const isDub = $link.find("span").text().toLowerCase().includes("eng");
        const type = isDub ? "Dub" : "Sub";
        const format = isDub ? "dub" : "hardsub";
        if (paheUrl && (paheUrl.includes("pahe.win") || paheUrl.includes("pahe.me") || paheUrl.includes("pahe.li") || paheUrl.includes("kwik"))) {
          promises.push(
            extractPahe(paheUrl).then((res) => {
              if (res && res.url) {
                streams.push({
                  name: `AnimePahe [Direct] (${quality} ${type})`,
                  title: `${animeTitle} - Episode ${mappedEp}`,
                  url: res.url,
                  quality,
                  server: "Pahe",
                  format,
                  headers: res.headers
                });
              }
            }).catch(() => {
            })
          );
        }
      });
      yield Promise.all(promises);
      const qualityOrder = { "1080p": 3, "720p": 2, "360p": 1 };
      return streams.sort((a, b) => (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0));
    } catch (error) {
      return [];
    }
  });
}
function getAnimeInfo(contentId) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e;
    try {
      let queryTitle = "";
      let targetMalId = null;
      const id = String(contentId || "").trim();
      if (/^tt\d+$/.test(id)) {
        queryTitle = (yield getCinemetaTitle(id, "tv")) || "";
        const mapping = yield resolveMapping(id, 1, 1);
        targetMalId = (mapping == null ? void 0 : mapping.mal_id) || null;
        if (!queryTitle && targetMalId)
          queryTitle = (yield getMalTitle(targetMalId)) || "";
      } else if (/^(?:anilist:)?\d+$/.test(id)) {
        const anilistId = Number(id.replace(/^anilist:/, ""));
        const response = yield fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "query($id:Int){Media(id:$id,type:ANIME){idMal title{english romaji native} format episodes description coverImage{large} bannerImage genres status{description}}}",
            variables: { id: anilistId }
          })
        });
        if (!response.ok)
          return null;
        const media = (_b = (_a = yield response.json()) == null ? void 0 : _a.data) == null ? void 0 : _b.Media;
        if (!media)
          return null;
        targetMalId = media.idMal || null;
        queryTitle = ((_c = media.title) == null ? void 0 : _c.english) || ((_d = media.title) == null ? void 0 : _d.romaji) || ((_e = media.title) == null ? void 0 : _e.native) || "";
      } else if (/^(?:mal:)?\d+$/.test(id)) {
        targetMalId = id.replace(/^mal:/, "");
        queryTitle = (yield getMalTitle(targetMalId)) || "";
      } else {
        queryTitle = id;
      }
      if (!queryTitle)
        return null;
      const searchResult = yield searchAnime(queryTitle);
      const candidates = (searchResult == null ? void 0 : searchResult.data) || [];
      if (candidates.length === 0)
        return null;
      let selected = null;
      const normalizedQuery = queryTitle.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      for (const candidate of candidates.slice(0, 5)) {
        const pageHtml = yield fetchText(`/anime/${candidate.session}`);
        const matchesMalId = targetMalId && pageHtml.includes(`myanimelist.net/anime/${targetMalId}`);
        const normalizedTitle = String(candidate.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (matchesMalId || !targetMalId && normalizedTitle === normalizedQuery) {
          selected = __spreadProps(__spreadValues({}, candidate), { pageHtml });
          break;
        }
      }
      if (!selected && targetMalId)
        return null;
      if (!selected) {
        const first = candidates[0];
        selected = __spreadProps(__spreadValues({}, first), { pageHtml: yield fetchText(`/anime/${first.session}`) });
      }
      const $ = import_cheerio_without_node_native.default.load(selected.pageHtml);
      const firstPage = yield fetchJson(`/api?m=release&id=${selected.session}&sort=episode_asc&page=1`);
      const lastPage = Math.min(Number(firstPage.last_page) || 1, 30);
      const pages = yield Promise.all(Array.from(
        { length: lastPage },
        (_, index) => index === 0 ? Promise.resolve(firstPage) : fetchJson(`/api?m=release&id=${selected.session}&sort=episode_asc&page=${index + 1}`).catch(() => null)
      ));
      const releases = pages.flatMap((page) => (page == null ? void 0 : page.data) || []);
      const episodes = releases.map((release) => {
        var _a2;
        const number = Math.floor(Number(release.episode) || 1);
        return {
          id: `${selected.session}:${release.session}`,
          episodeUrl: `${((_a2 = globalThis.SCRAPER_SETTINGS) == null ? void 0 : _a2.domain) || MAIN_URL}/play/${selected.session}/${release.session}`,
          episode: number,
          season: 1,
          title: release.title || `Episode ${number}`,
          thumbnail: release.snapshot || null,
          isSub: true,
          isDub: false
        };
      });
      if (episodes.length === 0)
        return null;
      const image = $('[property="og:image"]').attr("content") || $(".anime-poster img").attr("src") || null;
      const description = $('[property="og:description"]').attr("content") || $(".anime-synopsis").text().trim() || null;
      const title = selected.title || queryTitle;
      return {
        id: String(selected.session),
        title,
        poster: image,
        description,
        type: episodes.length === 1 ? "movie" : "tv",
        format: episodes.length === 1 ? "movie" : "tv",
        totalEpisodes: episodes.length || null,
        subEpisodes: episodes.length || null,
        dubEpisodes: 0,
        episodes
      };
    } catch (_) {
      return null;
    }
  });
}
function onSettings() {
  return __async(this, null, function* () {
    return [
      { type: "header", label: "Domain Selection" },
      {
        type: "select",
        key: "domain",
        label: "Preferred Domain",
        description: "AnimePahe frequently rotates domains. Choose the one currently working for you.",
        options: [
          { label: "animepahe.com", value: "https://animepahe.com" },
          { label: "animepahe.org", value: "https://animepahe.org" },
          { label: "animepahe.pw", value: "https://animepahe.pw" }
        ],
        defaultValue: "https://animepahe.com"
      }
    ];
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams, getAnimeInfo, getDetails: getAnimeInfo, onSettings };
} else {
  global.getStreams = getStreams;
  global.getAnimeInfo = getAnimeInfo;
  global.getDetails = getAnimeInfo;
  global.onSettings = onSettings;
}
