/**
 * cinemacity - Built from src/cinemacity/
 * Generated: 2026-06-29T06:58:11.325Z
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

// src/cinemacity/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/cinemacity/constants.js
var MAIN_URL = "https://cinemacity.cc";
var HEADERS = {
  "Cookie": "dle_user_id=32729; dle_password=894171c6a8dab18ee594d5c652009a35;",
  "Referer": "https://cinemacity.cc/"
};
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

// src/cinemacity/utils.js
var atobPolyfill = (str) => {
  try {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    str = String(str).replace(/[=]+$/, "");
    if (str.length % 4 === 1)
      return "";
    for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  } catch (e) {
    return "";
  }
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const response = yield fetch(url, __spreadValues({
      headers: options.headers || HEADERS,
      skipSizeCheck: true,
      // Critical for Nuvio not to block HTML/Metadata
      cfKiller: true
    }, options));
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`);
    return yield response.text();
  });
}
function extractQuality(url) {
  const low = (url || "").toLowerCase();
  if (low.includes("2160p") || low.includes("4k"))
    return "4K";
  if (low.includes("1080p"))
    return "1080p";
  if (low.includes("720p"))
    return "720p";
  if (low.includes("480p"))
    return "480p";
  if (low.includes("360p"))
    return "360p";
  return "HD";
}
var abc = "ABCDEFGHIJKLMabcdefghijklmNOPQRSTUVWXYZnopqrstuvwxyz";
var keyStr = abc + "0123456789+/=";
var sugar = (x) => {
  if (!x)
    return "";
  const dechar = String.fromCharCode;
  const parts = x.split(dechar(61));
  let result = "";
  const c1 = dechar(120);
  for (const part of parts) {
    let encoded = "";
    for (const char of part) {
      encoded += char === c1 ? dechar(49) : dechar(48);
    }
    if (encoded) {
      const chr = parseInt(encoded, 2);
      result += dechar(chr);
    }
  }
  return result.substring(0, result.length - 1);
};
var pepper = (s, n, yVal) => {
  s = s.replace(/\+/g, "#").replace(/#/g, "+");
  let a = parseInt(sugar(yVal), 10) * n;
  if (n < 0)
    a += abc.length / 2;
  const r = abc.substring(a * 2) + abc.substring(0, a * 2);
  return s.replace(/[A-Za-z]/g, (c) => {
    return r.charAt(abc.indexOf(c));
  });
};
var saltD = (e) => {
  const dechar = String.fromCharCode;
  let t = "";
  let n, r, i;
  let s, o, u, a;
  let f = 0;
  e = e.replace(/[^A-Za-z0-9\+\/\=]/g, "");
  while (f < e.length) {
    s = keyStr.indexOf(e.charAt(f++));
    o = keyStr.indexOf(e.charAt(f++));
    u = keyStr.indexOf(e.charAt(f++));
    a = keyStr.indexOf(e.charAt(f++));
    n = s << 2 | o >> 4;
    r = (o & 15) << 4 | u >> 2;
    i = (u & 3) << 6 | a;
    t = t + dechar(n);
    if (u !== 64) {
      t = t + dechar(r);
    }
    if (a !== 64) {
      t = t + dechar(i);
    }
  }
  let t2 = "";
  let n2 = 0;
  let r2 = 0, c2 = 0, c3 = 0;
  while (n2 < t.length) {
    r2 = t.charCodeAt(n2);
    if (r2 < 128) {
      t2 += dechar(r2);
      n2++;
    } else if (r2 > 191 && r2 < 224) {
      c2 = t.charCodeAt(n2 + 1);
      t2 += dechar((r2 & 31) << 6 | c2 & 63);
      n2 += 2;
    } else {
      c2 = t.charCodeAt(n2 + 1);
      c3 = t.charCodeAt(n2 + 2);
      t2 += dechar((r2 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
      n2 += 3;
    }
  }
  return t2;
};
function decodeStream(x, yVal) {
  if (x.startsWith("#1")) {
    return saltD(pepper(x.substring(2), -1, yVal));
  } else if (x.startsWith("#0")) {
    return saltD(x.substring(2));
  } else {
    return x;
  }
}
function unpackPacker(code) {
  if (!code || !code.includes("eval(function(p,a,c,k,e,d)")) {
    return code;
  }
  try {
    const match = code.match(/}\s*\(\s*(['"])([\s\S]*?)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])([\s\S]*?)\5\s*\.split\s*\(\s*(['"])\|\7\s*\)/);
    if (!match)
      return code;
    const p = match[2];
    const a = parseInt(match[3], 10);
    const c = parseInt(match[4], 10);
    const k = match[6].split("|");
    const e = function(c2) {
      return (c2 < a ? "" : e(parseInt(c2 / a))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
    };
    const d = {};
    let count = c;
    while (count--) {
      d[e(count)] = k[count] || e(count);
    }
    return p.replace(/\b\w+\b/g, (word) => {
      return d[word] !== void 0 ? d[word] : word;
    });
  } catch (err) {
    return code;
  }
}

// src/cinemacity/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    var _a;
    const streams = [];
    try {
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
      const tmdbRes = yield fetch(tmdbUrl, { skipSizeCheck: true });
      const tmdbData = yield tmdbRes.json();
      const imdbId = ((_a = tmdbData.external_ids) == null ? void 0 : _a.imdb_id) || tmdbData.imdb_id;
      const animeTitle = mediaType === "movie" ? tmdbData.title : tmdbData.name;
      if (!animeTitle && !imdbId)
        return [];
      const searchQuery = imdbId || animeTitle;
      const searchUrl = `${MAIN_URL}/?do=search&subaction=search&search_start=0&full_search=0&story=${encodeURIComponent(searchQuery)}`;
      console.log(`[CinemaCity] Searching for: ${searchQuery}`);
      const searchHtml = yield fetchText(searchUrl);
      const $search = import_cheerio_without_node_native.default.load(searchHtml);
      let mediaUrl = null;
      $search("div.dar-short_item").each((i, el) => {
        if (mediaUrl)
          return;
        const anchor = $search(el).find("a").filter((idx, a) => ($search(a).attr("href") || "").includes(".html")).first();
        if (!anchor.length)
          return;
        const href = anchor.attr("href");
        const foundTitle = anchor.text().toLowerCase();
        if (imdbId && searchHtml.includes(imdbId)) {
          mediaUrl = href;
        } else if (foundTitle.includes(animeTitle.toLowerCase()) || animeTitle.toLowerCase().includes(foundTitle)) {
          mediaUrl = href;
        }
      });
      if (!mediaUrl && imdbId && searchQuery !== animeTitle) {
        console.log(`[CinemaCity] IMDB search failed, falling back to title search: ${animeTitle}`);
        const titleSearchUrl = `${MAIN_URL}/?do=search&subaction=search&search_start=0&full_search=0&story=${encodeURIComponent(animeTitle)}`;
        const titleSearchHtml = yield fetchText(titleSearchUrl);
        const $titleSearch = import_cheerio_without_node_native.default.load(titleSearchHtml);
        $titleSearch("div.dar-short_item").each((i, el) => {
          if (mediaUrl)
            return;
          const anchor = $titleSearch(el).find("a").filter((idx, a) => ($titleSearch(a).attr("href") || "").includes(".html")).first();
          if (anchor.length)
            mediaUrl = anchor.attr("href");
        });
      }
      if (!mediaUrl) {
        console.log(`[CinemaCity] No media found for ${animeTitle}`);
        return [];
      }
      console.log(`[CinemaCity] Loading media page: ${mediaUrl}`);
      const pageHtml = yield fetchText(mediaUrl);
      const $page = import_cheerio_without_node_native.default.load(pageHtml);
      let fileData = null;
      let globalSubtitleData = null;
      const decodedScripts = [];
      $page("script").each((i, el) => {
        const html = $page(el).html();
        if (html && html.includes("atob")) {
          const regex = /atob\s*\(\s*(['"])(.*?)\1\s*\)/g;
          let match;
          while ((match = regex.exec(html)) !== null) {
            try {
              decodedScripts.push(atobPolyfill(match[2]));
            } catch (e) {
            }
          }
        }
      });
      let playerjsPath = null;
      for (const ds of decodedScripts) {
        const m = ds.match(/['"]([^'"]*?\/playerjs\.js\??\d*)['"]/);
        if (m) {
          playerjsPath = m[1];
          break;
        }
      }
      if (playerjsPath) {
        try {
          const playerjsUrl = playerjsPath.startsWith("http") ? playerjsPath : `${MAIN_URL}${playerjsPath.startsWith("/") ? "" : "/"}${playerjsPath}`;
          console.log(`[CinemaCity] Loading dynamic player script: ${playerjsUrl}`);
          let playerjsCode = yield fetchText(playerjsUrl);
          playerjsCode = unpackPacker(playerjsCode);
          const uMatch = playerjsCode.match(/u\s*:\s*\\?['"](#1.*?)\\?['"]/);
          const yMatch = playerjsCode.match(/\by\s*:\s*\\?['"](.*?)\\?['"]/);
          if (uMatch) {
            const encryptedU = uMatch[1];
            const yVal = yMatch ? yMatch[1] : "";
            const decrypted = decodeStream(encryptedU, yVal);
            if (decrypted) {
              try {
                const parsed = JSON.parse(decrypted);
                let rawFile = parsed.file || decrypted;
                if (typeof rawFile === "string") {
                  rawFile = rawFile.replace(/pjs'qt/g, '"');
                  if (rawFile.startsWith("[") || rawFile.startsWith("{")) {
                    try {
                      fileData = JSON.parse(rawFile);
                    } catch (e) {
                      fileData = rawFile;
                    }
                  } else {
                    fileData = rawFile;
                  }
                } else {
                  fileData = rawFile;
                }
                globalSubtitleData = parsed.subtitle;
              } catch (e) {
                fileData = decrypted;
              }
            }
          }
        } catch (err) {
          console.error(`[CinemaCity] Error fetching/decrypting player script: ${err.message}`);
        }
      }
      if (!fileData) {
        for (const decoded of decodedScripts) {
          const fileMatch = decoded.match(new RegExp(`file\\s*:\\s*(['"])(.*?)\\1`, "s")) || decoded.match(new RegExp("file\\s*:\\s*(\\[.*?\\])", "s")) || decoded.match(new RegExp("file\\s*:\\s*(\\{.*?\\})", "s"));
          const subMatch = decoded.match(new RegExp(`subtitle\\s*:\\s*(['"])(.*?)\\1`, "s"));
          if (fileMatch) {
            let rawFile = fileMatch[2] || fileMatch[1];
            if (rawFile && rawFile.length > 5) {
              if (rawFile.startsWith("[") || rawFile.startsWith("{")) {
                try {
                  const unescaped = rawFile.replace(/\\(.)/g, "$1");
                  fileData = JSON.parse(unescaped);
                } catch (e) {
                  try {
                    fileData = JSON.parse(rawFile);
                  } catch (e2) {
                    fileData = rawFile;
                  }
                }
              } else {
                fileData = rawFile;
              }
            }
          }
          if (subMatch) {
            globalSubtitleData = subMatch[2];
          }
          if (fileData)
            break;
        }
      }
      if (!fileData) {
        console.log(`[CinemaCity] Failed to extract player data`);
        return [];
      }
      const parseSubtitles = (raw) => {
        const subtitles = [];
        if (!raw || typeof raw !== "string")
          return subtitles;
        raw.split(",").forEach((entry) => {
          const match = entry.trim().match(/\[(.+?)\](https?:\/\/.+)/);
          if (match) {
            subtitles.push({
              url: match[2],
              language: match[1],
              name: match[1],
              headers: { Referer: "https://cinemacity.cc/" }
            });
          }
        });
        return subtitles;
      };
      const addStream = (url, title, quality, subtitles) => {
        if (!url || !url.startsWith("http") || url.length < 15)
          return;
        streams.push({
          name: "CinemaCity",
          title,
          url,
          quality: quality || extractQuality(url),
          headers: __spreadProps(__spreadValues({}, HEADERS), {
            Referer: "https://cinemacity.cc/"
          }),
          subtitles: subtitles || []
        });
      };
      const processStr = (str, title, subtitles, overrideQuality) => {
        if (str.includes(".urlset/master.m3u8")) {
          addStream(str, title, overrideQuality || "Auto", subtitles);
        } else {
          const urls = str.includes("[") ? str.split(",") : [str];
          urls.forEach((u) => {
            const m = u.match(/\[(.*?)\](.*)/);
            if (m) {
              let streamUrl = m[2];
              if (streamUrl.includes(",")) {
                const parts = streamUrl.split(",");
                streamUrl = parts.find((p) => !p.endsWith(".m4a")) || parts[0];
              }
              addStream(streamUrl, title, overrideQuality || m[1], subtitles);
            } else {
              let streamUrl = u;
              if (streamUrl.includes(",")) {
                const parts = streamUrl.split(",");
                streamUrl = parts.find((p) => !p.endsWith(".m4a")) || parts[0];
              }
              addStream(streamUrl, title, overrideQuality || extractQuality(streamUrl), subtitles);
            }
          });
        }
      };
      if (mediaType === "movie") {
        if (Array.isArray(fileData)) {
          const obj = fileData.find((f) => !f.folder && f.file) || fileData[0];
          if (obj && obj.file) {
            const subs = parseSubtitles(obj.subtitle || globalSubtitleData);
            processStr(obj.file, animeTitle, subs);
          }
        } else if (typeof fileData === "string") {
          const subs = parseSubtitles(globalSubtitleData);
          processStr(fileData, animeTitle, subs);
        }
      } else {
        if (Array.isArray(fileData)) {
          const sObj = findSeason(fileData, season);
          const folderList = sObj && sObj.folder ? sObj.folder : fileData;
          const eObj = findEpisode(folderList, episode);
          if (eObj) {
            const subs = parseSubtitles(eObj.subtitle || (sObj ? sObj.subtitle : null) || globalSubtitleData);
            if (eObj.file) {
              processStr(eObj.file, `${animeTitle} S${season}E${episode}`, subs);
            } else if (Array.isArray(eObj.folder)) {
              eObj.folder.forEach((item) => {
                if (item.file) {
                  const quality = item.title || extractQuality(item.file);
                  processStr(item.file, `${animeTitle} S${season}E${episode}`, subs, quality);
                }
              });
            }
          }
        }
      }
      console.log(`[CinemaCity] Successfully processed ${streams.length} streams`);
      return streams;
    } catch (error) {
      console.error(`[CinemaCity] Error in getStreams: ${error.message}`);
      return [];
    }
  });
}
function findSeason(folders, season) {
  if (!folders || !Array.isArray(folders))
    return null;
  const sStr = String(season);
  const sStrPad = sStr.padStart(2, "0");
  const regex = new RegExp(`\\b(\u0441\u0435\u0437\u043E\u043D|season|s|seaz)\\b.*?\\b(${sStr}|${sStrPad})\\b|\\b(${sStr}|${sStrPad})\\b.*?(\u0441\u0435\u0437\u043E\u043D|season|s|seaz)`, "i");
  let found = folders.find((f) => regex.test(f.title || ""));
  if (found)
    return found;
  found = folders.find((f) => {
    const title = (f.title || "").toLowerCase();
    return title.includes(sStr) || title.includes(sStrPad);
  });
  return found || folders[0];
}
function findEpisode(folderList, episode) {
  if (!folderList || !Array.isArray(folderList))
    return null;
  const eStr = String(episode);
  const eStrPad = eStr.padStart(2, "0");
  const regex = new RegExp(`\\b(\u0441\u0435\u0440\u0438\u044F|episode|ep|e|seria)\\b.*?\\b(${eStr}|${eStrPad})\\b|\\b(${eStr}|${eStrPad})\\b.*?(\u0441\u0435\u0440\u0438\u044F|episode|ep|e|seria)`, "i");
  let found = folderList.find((f) => regex.test(f.title || ""));
  if (found)
    return found;
  found = folderList.find((f) => {
    const title = (f.title || "").toLowerCase();
    return title.includes(eStr) || title.includes(eStrPad);
  });
  return found || folderList[0];
}
module.exports = { getStreams };
