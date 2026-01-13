/**
 * kuudere - Built from src/kuudere/
 * Generated: 2026-01-13T08:12:22.465Z
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
var ALT_URLS = ["https://kuudere.to", "https://kuudere.lol"];
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// src/kuudere/http.js
function request(_0, _1) {
  return __async(this, arguments, function* (method, path, options = {}) {
    const baseURL = options.baseURL || BASE_URL;
    const url = path.startsWith("http") ? path : `${baseURL}${path}`;
    try {
      return yield (0, import_axios.default)(__spreadProps(__spreadValues({
        method,
        url
      }, options), {
        headers: __spreadValues({
          "User-Agent": USER_AGENT,
          "Referer": baseURL,
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
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
function getMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
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

// src/kuudere/extractors/zen.js
var import_axios2 = __toESM(require("axios"));
var import_crypto_js = __toESM(require("crypto-js"));
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
function extractSubtitlesFromData(data) {
  const subtitles = [];
  const subLinks = data.subtitle_links || [];
  if (Array.isArray(subLinks)) {
    for (const sub of subLinks) {
      if (sub.url) {
        subtitles.push({
          url: sub.url,
          lang: sub.language || "English",
          label: sub.language || "English"
        });
      }
    }
  }
  if (data.nodes) {
    for (const node of data.nodes) {
      if (node && node.data) {
        const dataArray = node.data;
        const meta = dataArray.find((item) => item && (item.subtitles || item.tracks));
        if (meta) {
          let subIndices = meta.subtitles || meta.tracks || [];
          if (typeof subIndices === "number") {
            subIndices = dataArray[subIndices] || [];
          }
          if (Array.isArray(subIndices)) {
            for (const idx of subIndices) {
              const sub = resolveValue(idx, dataArray);
              if (sub && sub.url) {
                subtitles.push({
                  url: sub.url,
                  lang: sub.language || sub.label || "English",
                  label: sub.language || sub.label || "English"
                });
              }
            }
          }
        }
      }
    }
  }
  return subtitles;
}
function getZenStream(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      const urlObj = new URL(embedUrl);
      const dataUrl = `${urlObj.origin}${urlObj.pathname}/__data.json${urlObj.search}`;
      const response = yield import_axios2.default.get(dataUrl, {
        headers: {
          "Referer": "https://kuudere.ru/",
          "User-Agent": USER_AGENT
        }
      });
      const data = response.data;
      const subtitles = extractSubtitlesFromData(data);
      const node = (_a = data.nodes) == null ? void 0 : _a.find((n) => n && n.data && n.data.some((item) => item && item.obfuscation_seed));
      if (!node) {
        return { url: null, subtitles };
      }
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
        return { url: null, subtitles };
      const manifestRes = yield import_axios2.default.get(`${urlObj.origin}/api/m3u8/${token}`, {
        headers: {
          "Referer": embedUrl,
          "User-Agent": USER_AGENT,
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
      const url = decrypted.toString(import_crypto_js.default.enc.Utf8);
      return { url, subtitles };
    } catch (error) {
      return null;
    }
  });
}

// src/kuudere/extractors/streamwish.js
var import_axios3 = __toESM(require("axios"));
function unPack(code) {
  try {
    const packerMatch = code.match(new RegExp("eval\\(function\\(p,a,c,k,e,d\\)\\{.*?\\}\\((.*)\\)\\)", "s"));
    if (!packerMatch)
      return null;
    const argsContent = packerMatch[1];
    const args = [];
    let currentArg = "";
    let inQuote = false;
    let quoteChar = "";
    let parenBalance = 0;
    for (let i = 0; i < argsContent.length; i++) {
      const char = argsContent[i];
      if (char === "\\" && inQuote) {
        currentArg += char + argsContent[++i];
        continue;
      }
      if ((char === "'" || char === '"' || char === "`") && (!inQuote || quoteChar === char)) {
        inQuote = !inQuote;
        quoteChar = inQuote ? char : "";
        currentArg += char;
        continue;
      }
      if (!inQuote) {
        if (char === "(")
          parenBalance++;
        if (char === ")")
          parenBalance--;
      }
      if (char === "," && !inQuote && parenBalance === 0) {
        args.push(currentArg.trim());
        currentArg = "";
      } else {
        currentArg += char;
      }
    }
    args.push(currentArg.trim());
    if (args.length >= 4) {
      let p = args[0].substring(1, args[0].length - 1);
      const a = parseInt(args[1]);
      const c = parseInt(args[2]);
      const kMatch = args[3].match(new RegExp(`['"](.*?)['"]`, "s"));
      if (!kMatch)
        return null;
      const k = kMatch[1].split("|");
      const e = function(c2) {
        return (c2 < a ? "" : e(parseInt(c2 / a))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
      };
      const dict = {};
      for (let i = 0; i < k.length; i++) {
        if (k[i])
          dict[e(i)] = k[i];
      }
      return p.replace(/\b\w+\b/g, (word) => dict[word] || word);
    }
  } catch (e) {
  }
  return null;
}
function handleRedirector(html, embedUrl) {
  return __async(this, null, function* () {
    if (html.includes("main.js?v=1.1.3") || html.includes("Page is loading, please wait...")) {
      const urlObj = new URL(embedUrl);
      const targets = ["hgplaycdn.com", "wishembed.com", "strwish.com", "dwish.pro", "awish.pro", "hlswish.com"];
      for (const target of targets) {
        if (target === urlObj.hostname)
          continue;
        const newUrl = `https://${target}${urlObj.pathname}${urlObj.search}`;
        try {
          const res = yield import_axios3.default.get(newUrl, {
            headers: { "Referer": "https://kuudere.ru/", "User-Agent": USER_AGENT },
            timeout: 3e3
          });
          if (res.data.includes("jwplayer") || res.data.includes("eval(function(p,a,c,k,e,d)")) {
            return res.data;
          }
        } catch (e) {
        }
      }
    }
    return html;
  });
}
function getStreamWish(embedUrl) {
  return __async(this, null, function* () {
    let finalHtml = null;
    let finalUrl = embedUrl;
    try {
      const response = yield import_axios3.default.get(embedUrl, {
        headers: {
          "Referer": "https://kuudere.ru/",
          "User-Agent": USER_AGENT
        },
        timeout: 5e3,
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
      });
      finalHtml = response.data;
      if (response.request && response.request.res && response.request.res.responseUrl) {
        finalUrl = response.request.res.responseUrl;
      }
      const redirectedHtml = yield handleRedirector(finalHtml, finalUrl);
      if (redirectedHtml !== finalHtml) {
        finalHtml = redirectedHtml;
      }
    } catch (error) {
    }
    if (!finalHtml || !finalHtml.includes("jwplayer") && !finalHtml.includes("eval(function")) {
      const referers = [
        "https://kuudere.ru/",
        "https://strwish.com/",
        "https://streamwish.com/",
        new URL(embedUrl).origin
      ];
      for (const referer of referers) {
        try {
          const res = yield import_axios3.default.get(finalUrl, {
            headers: {
              "Referer": referer,
              "User-Agent": USER_AGENT
            },
            timeout: 5e3
          });
          if (res.data && (res.data.includes("jwplayer") || res.data.includes("eval(function"))) {
            finalHtml = res.data;
            break;
          }
        } catch (e) {
        }
      }
    }
    if (!finalHtml)
      return null;
    try {
      let streamUrl = null;
      const unpacked = unPack(finalHtml);
      if (unpacked) {
        const hls4 = unpacked.match(/"hls4"\s*:\s*"([^"]+)"/);
        const hls3 = unpacked.match(/"hls3"\s*:\s*"([^"]+)"/);
        const hls2 = unpacked.match(/"hls2"\s*:\s*"([^"]+)"/);
        streamUrl = hls4 && hls4[1] || hls3 && hls3[1] || hls2 && hls2[1];
        if (!streamUrl) {
          const innerMatch = unpacked.match(/file\s*:\s*"([^"]+\.(?:m3u8|txt)[^"]*)"/) || unpacked.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
          if (innerMatch) {
            streamUrl = innerMatch[1];
          }
        }
      }
      if (!streamUrl) {
        const m3u8Match = finalHtml.match(/file\s*:\s*"([^"]+\.(?:m3u8|txt)[^"]*)"/) || finalHtml.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
        if (m3u8Match) {
          streamUrl = m3u8Match[1];
        }
      }
      if (!streamUrl)
        return null;
      if (streamUrl.startsWith("/")) {
        const origin = new URL(finalUrl).origin;
        streamUrl = origin + streamUrl;
      }
      return { url: streamUrl };
    } catch (error) {
      return null;
    }
  });
}

// src/kuudere/extractors/vidhide.js
var import_axios4 = __toESM(require("axios"));
function extractSubtitlesFromUrl(url) {
  const subtitles = [];
  try {
    const urlObj = new URL(url);
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (key.startsWith("caption_")) {
        const langCode = key.replace("caption_", "");
        subtitles.push({
          url: value,
          lang: `Caption ${langCode}`,
          label: `Caption ${langCode}`
        });
      }
    }
  } catch (e) {
  }
  return subtitles;
}
function unPack2(code) {
  try {
    const packerMatch = code.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\((.*)\)\)/);
    if (packerMatch) {
      const argsMatch = packerMatch[1].match(/'(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/);
      if (argsMatch) {
        let [_, p, a, c, k] = argsMatch;
        a = parseInt(a);
        c = parseInt(c);
        k = k.split("|");
        const e = function(c2) {
          return (c2 < a ? "" : e(parseInt(c2 / a))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
        };
        if (true) {
          const dict = {};
          while (c--) {
            dict[e(c)] = k[c] || e(c);
          }
          k = [function(c2) {
            return dict[c2];
          }];
          c = 1;
        }
        while (c--) {
          if (k[c]) {
            p = p.replace(new RegExp("\\b\\w+\\b", "g"), function(e2) {
              return k[c](e2) || e2;
            });
          }
        }
        return p;
      }
    }
  } catch (e) {
  }
  return null;
}
function getVidhideStream(embedUrl) {
  return __async(this, null, function* () {
    let finalHtml = null;
    let finalUrl = embedUrl;
    const referers = [
      "https://kuudere.ru/",
      "https://vidhide.com/",
      "https://vidhidepro.com/",
      new URL(embedUrl).origin
    ];
    for (const referer of referers) {
      try {
        const response = yield import_axios4.default.get(finalUrl, {
          headers: {
            "Referer": referer,
            "User-Agent": USER_AGENT
          },
          timeout: 5e3,
          maxRedirects: 5,
          validateStatus: (status) => status >= 200 && status < 400
        });
        if (response.data && (response.data.includes("eval(function") || response.data.includes("sources:"))) {
          finalHtml = response.data;
          if (response.request && response.request.res && response.request.res.responseUrl) {
            finalUrl = response.request.res.responseUrl;
          }
          break;
        }
      } catch (e) {
      }
    }
    if (!finalHtml)
      return null;
    try {
      let streamUrl = null;
      const m3u8Match = finalHtml.match(/file\s*:\s*"([^"]+\.(?:m3u8|txt)[^"]*)"/) || finalHtml.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
      if (m3u8Match) {
        streamUrl = m3u8Match[1];
      } else {
        const unpacked = unPack2(finalHtml);
        if (unpacked) {
          const hls4 = unpacked.match(/"hls4"\s*:\s*"([^"]+)"/);
          const hls3 = unpacked.match(/"hls3"\s*:\s*"([^"]+)"/);
          const hls2 = unpacked.match(/"hls2"\s*:\s*"([^"]+)"/);
          streamUrl = hls4 && hls4[1] || hls3 && hls3[1] || hls2 && hls2[1];
          if (!streamUrl) {
            const innerMatch = unpacked.match(/file\s*:\s*"([^"]+\.(?:m3u8|txt)[^"]*)"/) || unpacked.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/);
            if (innerMatch) {
              streamUrl = innerMatch[1];
            }
          }
        }
      }
      if (!streamUrl)
        return null;
      if (streamUrl.startsWith("/")) {
        const origin = new URL(finalUrl).origin;
        streamUrl = origin + streamUrl;
      }
      const subtitles = extractSubtitlesFromUrl(embedUrl);
      return { url: streamUrl, subtitles };
    } catch (error) {
      return null;
    }
  });
}

// src/kuudere/extractors/doodstream.js
var import_axios5 = __toESM(require("axios"));
function getDoodstream(embedUrl) {
  return __async(this, null, function* () {
    try {
      const response = yield import_axios5.default.get(embedUrl, {
        headers: { "User-Agent": USER_AGENT }
      });
      const html = response.data;
      const md5Match = html.match(/\/pass_md5\/([^']*)/);
      if (!md5Match)
        return null;
      const token = md5Match[1];
      const md5Url = `${new URL(embedUrl).origin}/pass_md5/${token}`;
      const md5Res = yield import_axios5.default.get(md5Url, {
        headers: { "Referer": embedUrl, "User-Agent": USER_AGENT }
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
      const streamUrl = `${urlPart}${randomString(10)}?token=${token}&expiry=${Date.now()}`;
      return { url: streamUrl, subtitles: [] };
    } catch (error) {
      return null;
    }
  });
}

// src/kuudere/extractors/mp4upload.js
var import_axios6 = __toESM(require("axios"));
function unPack3(code) {
  try {
    const packerMatch = code.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\((.*)\)\)/);
    if (packerMatch) {
      const argsMatch = packerMatch[1].match(/'(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/);
      if (argsMatch) {
        let [_, p, a, c, k] = argsMatch;
        a = parseInt(a);
        c = parseInt(c);
        k = k.split("|");
        const e = function(c2) {
          return (c2 < a ? "" : e(parseInt(c2 / a))) + ((c2 = c2 % a) > 35 ? String.fromCharCode(c2 + 29) : c2.toString(36));
        };
        if (true) {
          const dict = {};
          while (c--) {
            dict[e(c)] = k[c] || e(c);
          }
          k = [function(c2) {
            return dict[c2];
          }];
          c = 1;
        }
        while (c--) {
          if (k[c]) {
            p = p.replace(new RegExp("\\b\\w+\\b", "g"), function(e2) {
              return k[c](e2) || e2;
            });
          }
        }
        return p;
      }
    }
  } catch (e) {
  }
  return null;
}
function getMp4Upload(embedUrl) {
  return __async(this, null, function* () {
    try {
      const response = yield import_axios6.default.get(embedUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          "Referer": "https://kuudere.ru/"
        }
      });
      const html = response.data;
      let srcMatch = html.match(/src\s*:\s*"([^"]+\.mp4)"/);
      if (!srcMatch) {
        const unpacked = unPack3(html);
        if (unpacked) {
          srcMatch = unpacked.match(/src\s*:\s*"([^"]+\.mp4)"/);
        }
      }
      return srcMatch ? { url: srcMatch[1], subtitles: [] } : null;
    } catch (error) {
      return null;
    }
  });
}

// src/kuudere/extractors/kumi.js
var import_axios7 = __toESM(require("axios"));
var import_crypto_js2 = __toESM(require("crypto-js"));
var g = (...m) => String.fromCharCode(...m);
function getKumiKey() {
  const lang = "https:";
  const k = "10";
  const O = 110;
  const j = 1;
  let N = "";
  const B = ["7", "5", "1", "9"];
  for (let pe = 0; pe < B.length; pe++)
    N += g(k + B[pe]);
  N += lang[1];
  N += N.substring(1, 3);
  N += g(O, O - 1, O + 7);
  const oe = ["3", "5", "7", "9"];
  N += g(oe[3] + oe[2], oe[1] + oe[2]);
  const val3 = Number(oe[0]) * j + j + oe[3];
  N += g(val3, val3);
  const val4 = Number(oe[3]) * parseInt(k) + Number(oe[3]) * j;
  const val5 = "97";
  N += g(val4, val5);
  const bytes = new Uint8Array(N.length);
  for (let i = 0; i < N.length; i++)
    bytes[i] = N.charCodeAt(i) & 255;
  return import_crypto_js2.default.lib.WordArray.create(bytes, bytes.length);
}
function getKumiIV(hash) {
  const lang = "https:";
  const _ = lang;
  const k = _ + "//";
  const O = hash;
  const j = _.length * k.length;
  const N = 1;
  let B = "";
  for (let Le = N; Le < 10; Le++)
    B += g(Le + j);
  let oe = "111";
  const pe = oe.length * O.charCodeAt(0);
  const Qe = parseInt(oe) * N + _.length;
  const P = Qe + 4;
  const ie = _.charCodeAt(N);
  const Se = ie * N - 2;
  B += g(j, parseInt(oe), pe, Qe, P, ie, Se);
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++)
    bytes[i] = B.charCodeAt(i) & 255;
  return import_crypto_js2.default.lib.WordArray.create(bytes, bytes.length);
}
function decryptData(data, key, iv) {
  return __async(this, null, function* () {
    try {
      if (!data)
        return null;
      let ciphertext;
      if (typeof data === "string") {
        ciphertext = import_crypto_js2.default.enc.Hex.parse(data);
      } else {
        ciphertext = import_crypto_js2.default.lib.WordArray.create(new Uint8Array(data));
      }
      const decrypted = import_crypto_js2.default.AES.decrypt(
        { ciphertext },
        key,
        { iv, mode: import_crypto_js2.default.mode.CBC, padding: import_crypto_js2.default.pad.Pkcs7 }
      );
      let decryptedText = decrypted.toString(import_crypto_js2.default.enc.Utf8);
      if (!decryptedText) {
        decryptedText = decrypted.toString(import_crypto_js2.default.enc.Latin1);
      }
      const start = decryptedText.indexOf("{");
      const end = decryptedText.lastIndexOf("}");
      if (start === -1 || end === -1)
        return null;
      return JSON.parse(decryptedText.substring(start, end + 1));
    } catch (e) {
      return null;
    }
  });
}
function getKumiStream(embedUrl) {
  return __async(this, null, function* () {
    try {
      const urlObj = new URL(embedUrl);
      const hostname = urlObj.hostname;
      const protocol = "https:";
      const hash = urlObj.hash;
      let id = null;
      if (hash) {
        id = hash.substring(1).split("&")[0];
      }
      if (!id && urlObj.searchParams.get("id")) {
        id = urlObj.searchParams.get("id");
      }
      if (!id) {
        const parts = urlObj.pathname.split("/");
        id = parts[parts.length - 1];
      }
      if (!id)
        return null;
      const ivSource = hash || `#${id}`;
      const key = getKumiKey();
      const iv = getKumiIV(ivSource);
      const authorizedDomains = [
        "kuudere.ru",
        hostname,
        "kumi.li",
        "kumi.online",
        "lovetaku.net"
      ];
      for (const r of authorizedDomains) {
        try {
          const videoUrl = `${protocol}//${hostname}/api/v1/video?id=${id}&w=1920&h=1080&r=${r}`;
          const response = yield import_axios7.default.get(videoUrl, {
            headers: {
              "User-Agent": USER_AGENT,
              "Referer": embedUrl,
              // Keep original embed as referer
              "X-Requested-With": "XMLHttpRequest"
            },
            timeout: 5e3
          });
          const videoData = yield decryptData(response.data, key, iv);
          if (videoData && (videoData.source || videoData.cf)) {
            const subtitles = [];
            const rawSubs = videoData.subtitles || videoData.tracks || [];
            for (const sub of rawSubs) {
              subtitles.push({
                url: sub.url || sub.file || sub.src,
                lang: sub.language || sub.label || "Unknown",
                label: sub.label || sub.language || "Unknown"
              });
            }
            return {
              url: videoData.source || videoData.cf,
              subtitles
            };
          }
        } catch (e) {
        }
      }
    } catch (error) {
    }
    return null;
  });
}

// src/kuudere/extractors/index.js
function extractStreams(links) {
  return __async(this, null, function* () {
    const streams = [];
    for (const link of links) {
      try {
        const serverName = link.serverName;
        const embedUrl = link.dataLink;
        let extractionResult = null;
        let quality = "Auto";
        let headers = {};
        const sName = serverName.toLowerCase();
        if (sName.includes("zen")) {
          extractionResult = yield getZenStream(embedUrl);
          quality = "1080p";
          headers = { "Referer": "https://zencloudz.cc/" };
        } else if (sName.includes("wish") || sName.includes("s-wish") || sName.includes("h-wish")) {
          extractionResult = yield getStreamWish(embedUrl);
          headers = { "Referer": new URL(embedUrl).origin };
        } else if (sName.includes("vidhide") || sName.includes("s-hide") || sName.includes("h-hide")) {
          extractionResult = yield getVidhideStream(embedUrl);
          headers = { "Referer": new URL(embedUrl).origin };
        } else if (sName.includes("doodstream")) {
          extractionResult = yield getDoodstream(embedUrl);
          headers = { "Referer": "https://dood.li/" };
        } else if (sName.includes("mp4upload")) {
          extractionResult = yield getMp4Upload(embedUrl);
          headers = { "Referer": "https://www.mp4upload.com/" };
        } else if (sName.startsWith("kumi")) {
          extractionResult = yield getKumiStream(embedUrl);
          headers = { "Referer": new URL(embedUrl).origin };
        }
        if (extractionResult && extractionResult.url) {
          const directUrl = extractionResult.url;
          const subtitles = extractionResult.subtitles || [];
          streams.push({
            name: `Kuudere (${serverName})`,
            title: `${link.dataType.toUpperCase()} - Direct`,
            url: directUrl,
            quality,
            headers,
            subtitles
          });
        } else {
          streams.push({
            name: `Kuudere (${serverName})`,
            title: `${link.dataType.toUpperCase()} - Embed`,
            url: embedUrl,
            quality: "Auto",
            headers: { "Referer": "https://kuudere.ru/" }
          });
        }
      } catch (error) {
      }
    }
    return streams;
  });
}

// src/kuudere/search.js
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
function search(query, baseURL = null) {
  return __async(this, null, function* () {
    try {
      const response = yield request("get", `/search/__data.json?keyword=${encodeURIComponent(query)}`, { baseURL });
      let results = parseSvelteData(response.data);
      if (results.length === 0) {
        const quickResponse = yield request("get", `/api/search?q=${encodeURIComponent(query)}`, { baseURL });
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
        type: item.type,
        baseURL
        // Keep track of which domain found it
      }));
    } catch (error) {
      return [];
    }
  });
}

// src/kuudere/utils.js
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

// src/kuudere/index.js
function getStreams(tmdbId, mediaType, season, episode, tmdbData = null) {
  return __async(this, null, function* () {
    const meta = tmdbData || (yield getMetadata(tmdbId, mediaType));
    if (!meta)
      return [];
    console.log(`[Kuudere] Searching for: ${meta.title} (${meta.year})`);
    const targetType = mediaType === "movie" ? "movie" : "tv";
    const allDomains = [BASE_URL, ...ALT_URLS];
    const queries = [
      meta.title.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim(),
      meta.title.split(/[:\-\–\—]/)[0].trim()
    ];
    let match = null;
    let successfulDomain = BASE_URL;
    for (const domain of allDomains) {
      try {
        let allResults = [];
        for (const q of queries) {
          if (q.length < 3)
            continue;
          const res = yield search(q, domain);
          allResults = [...allResults, ...res];
        }
        const seenIds = /* @__PURE__ */ new Set();
        const filteredResults = allResults.filter((r) => {
          if (seenIds.has(r.url))
            return false;
          seenIds.add(r.url);
          return r.type === targetType;
        });
        if (!match && targetType === "tv" && season && parseInt(season) > 1) {
          const seasonTitle = normalize(`${meta.title} Season ${season}`);
          match = filteredResults.find((r) => normalize(r.title) === seasonTitle || normalize(r.title).includes(seasonTitle));
        }
        if (!match) {
          match = filteredResults.find(
            (r) => isMatch(r.title, meta.title) && (String(r.year) === String(meta.year) || !r.year)
          );
        }
        if (!match) {
          match = filteredResults.find((r) => isMatch(r.title, meta.title));
        }
        if (match) {
          successfulDomain = domain;
          console.log(`[Kuudere] Match found on ${domain}: ${match.title}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    if (!match) {
      console.log("[Kuudere] No matching anime found on any domain.");
      return [];
    }
    try {
      const watchResponse = yield request("get", `/api/watch/${match.url}/${episode || 1}`, { baseURL: successfulDomain });
      const watchData = watchResponse.data;
      if (!watchData.episode_links || watchData.episode_links.length === 0) {
        return [];
      }
      return yield extractStreams(watchData.episode_links);
    } catch (error) {
      return [];
    }
  });
}
module.exports = { getStreams, search };
