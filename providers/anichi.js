/**
 * anichi - Built from src/anichi/
 * Generated: 2026-06-08T12:16:19.328Z
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

// src/anichi/constants.js
var API_URL = "https://api.allanime.day/api";
var BASE_URL = "https://allanime.day";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "app-version": "android_c-247",
  "from-app": "animechicken",
  "platformstr": "android_c",
  "Referer": "https://allmanga.to"
};
var SEARCH_HASH = "a24c500a1b765c68ae1d8dd85174931f661c71369c89b92b88b75a725afc471c";
var DETAIL_HASH = "bb263f91e5bdd048c1c978f324613aeccdfe2cbc694a419466a31edb58c0cc0b";
var SERVER_HASH = "d405d0edd690624b66baba3068e0edc3ac90f1597d898a1ec8db4e5c43c00fec";

// src/anichi/utils.js
function decrypthex(inputStr) {
  const hexString = inputStr.includes("-") ? inputStr.substring(inputStr.lastIndexOf("-") + 1) : inputStr;
  const bytes = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substring(i, i + 2), 16) ^ 56);
  }
  return String.fromCharCode(...bytes);
}
function fixUrlPath(link) {
  if (link.includes(".json?")) {
    return BASE_URL + link;
  } else {
    const urlObj = new URL(link, BASE_URL);
    return BASE_URL + urlObj.pathname + ".json?" + urlObj.search.substring(1);
  }
}
function getImdbId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}/external_ids?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
      const res = yield fetch(url);
      if (!res.ok)
        return null;
      const data = yield res.json();
      return data.imdb_id || null;
    } catch (e) {
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
    var _a;
    try {
      const res = yield fetch(`https://api.jikan.moe/v4/anime/${malId}`);
      if (!res.ok)
        return null;
      const data = yield res.json();
      return ((_a = data.data) == null ? void 0 : _a.title) || null;
    } catch (e) {
      return null;
    }
  });
}
function extractQuality(url) {
  if (!url)
    return "Unknown";
  const qualityPatterns = [
    /(\d{3,4})p/i,
    /quality[_-]?(\d{3,4})/i,
    /res[_-]?(\d{3,4})/i
  ];
  for (const pattern of qualityPatterns) {
    const match = url.match(pattern);
    if (match) {
      const qualityNum = parseInt(match[1]);
      if (qualityNum >= 240 && qualityNum <= 4320) {
        return `${qualityNum}p`;
      }
    }
  }
  if (url.includes("1080"))
    return "1080p";
  if (url.includes("720"))
    return "720p";
  if (url.includes("480"))
    return "480p";
  if (url.includes("360"))
    return "360p";
  return "Unknown";
}

// src/anichi/extractors.js
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
    console.error("[Anichi Extractor] Unpack error:", e.message);
  }
  return code;
}
function base64ToBytes(b64) {
  if (typeof atob !== "undefined") {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) & 255;
    }
    return bytes;
  }
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(b64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }
  throw new Error("Base64 decoding not supported in this environment");
}
function b64UrlDecode(s) {
  const fixed = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - fixed.length % 4) % 4;
  const padded = fixed + "=".repeat(pad);
  return base64ToBytes(padded);
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
function buildAesKey(playback) {
  const p1 = b64UrlDecode(playback.key_parts[0]);
  const p2 = b64UrlDecode(playback.key_parts[1]);
  const keyBytes = new Uint8Array(p1.length + p2.length);
  keyBytes.set(p1, 0);
  keyBytes.set(p2, p1.length);
  return keyBytes;
}
function decryptPlayback(playback) {
  return __async(this, null, function* () {
    var _a, _b;
    const keyBytes = buildAesKey(playback);
    const ivBytes = b64UrlDecode(playback.iv);
    const cipherBytes = b64UrlDecode(playback.payload);
    let webCrypto;
    if (typeof crypto !== "undefined" && crypto.subtle) {
      webCrypto = crypto.subtle;
    } else {
      try {
        const nodeCrypto = require("crypto");
        if (nodeCrypto.webcrypto) {
          webCrypto = nodeCrypto.webcrypto.subtle;
        }
      } catch (e) {
      }
    }
    if (!webCrypto) {
      throw new Error("WebCrypto API is not available");
    }
    const cryptoKey = yield webCrypto.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    const plainBuffer = yield webCrypto.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes,
        tagLength: 128
      },
      cryptoKey,
      cipherBytes
    );
    const jsonStr = utf8Decode(new Uint8Array(plainBuffer)).trim();
    const cleanJson = jsonStr.startsWith("\uFEFF") ? jsonStr.substring(1) : jsonStr;
    const data = JSON.parse(cleanJson);
    return ((_b = (_a = data.sources) == null ? void 0 : _a[0]) == null ? void 0 : _b.url) || null;
  });
}
function decryptAesCbc(cipherHex, keyStr, ivStr) {
  return __async(this, null, function* () {
    const keyBytes = new TextEncoder().encode(keyStr);
    const ivBytes = new TextEncoder().encode(ivStr);
    const cipherBytes = new Uint8Array(cipherHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
    let webCrypto;
    if (typeof crypto !== "undefined" && crypto.subtle) {
      webCrypto = crypto.subtle;
    } else {
      try {
        const nodeCrypto = require("crypto");
        if (nodeCrypto.webcrypto) {
          webCrypto = nodeCrypto.webcrypto.subtle;
        }
      } catch (e) {
      }
    }
    if (!webCrypto) {
      throw new Error("WebCrypto API is not available");
    }
    const cryptoKey = yield webCrypto.importKey(
      "raw",
      keyBytes,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );
    const plainBuffer = yield webCrypto.decrypt(
      {
        name: "AES-CBC",
        iv: ivBytes
      },
      cryptoKey,
      cipherBytes
    );
    return utf8Decode(new Uint8Array(plainBuffer));
  });
}
function getBaseUrl(url) {
  const u = new URL(url);
  return `${u.protocol}//${u.host}`;
}
function getCodeFromUrl(url) {
  const u = new URL(url);
  const path = u.pathname;
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}
function getDetails(mainUrl) {
  return __async(this, null, function* () {
    const base = getBaseUrl(mainUrl);
    const code = getCodeFromUrl(mainUrl);
    const url = `${base}/api/videos/${code}/embed/details`;
    const res = yield fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": mainUrl
      }
    });
    if (!res.ok)
      return null;
    return yield res.json();
  });
}
function getPlayback(mainUrl) {
  return __async(this, null, function* () {
    const details = yield getDetails(mainUrl);
    if (!details || !details.embed_frame_url)
      return null;
    const embedFrameUrl = details.embed_frame_url;
    const embedBase = getBaseUrl(embedFrameUrl);
    const code = getCodeFromUrl(embedFrameUrl);
    const playbackUrl = `${embedBase}/api/videos/${code}/embed/playback`;
    const headers = {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.5",
      "referer": embedFrameUrl,
      "x-embed-parent": embedFrameUrl,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    };
    let res = yield fetch(playbackUrl, { headers });
    if (res.status === 200) {
      return yield res.json();
    } else {
      const postHeaders = {
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "Referer": embedFrameUrl,
        "X-Embed-Parent": mainUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      };
      const body = JSON.stringify({ fingerprint: {} });
      res = yield fetch(playbackUrl, {
        method: "POST",
        headers: postHeaders,
        body
      });
      if (res.ok) {
        return yield res.json();
      }
    }
    return null;
  });
}
function extractBysekoze(url) {
  return __async(this, null, function* () {
    try {
      const playbackRoot = yield getPlayback(url);
      if (!playbackRoot || !playbackRoot.playback)
        return null;
      return yield decryptPlayback(playbackRoot.playback);
    } catch (e) {
      console.error(`[Anichi Extractor] Bysekoze error: ${e.message}`);
    }
    return null;
  });
}
function extractStreamWish(url) {
  return __async(this, null, function* () {
    try {
      const embedUrl = url.includes("/e/") ? url : url.replace("/f/", "/e/");
      const res = yield fetch(embedUrl);
      if (!res.ok)
        return null;
      const html = yield res.text();
      const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/g);
      if (packedMatch) {
        for (const script of packedMatch) {
          const unpacked = unpack(script);
          const fileMatch = unpacked.match(/file\s*:\s*["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.m3u8(?:\?[^"'\s]*)?)["']/);
          if (fileMatch) {
            return fileMatch[1];
          }
        }
      }
      const m3u8Match = html.match(/["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.m3u8(?:\?[^"'\s]*)?)["']/);
      if (m3u8Match)
        return m3u8Match[1];
    } catch (e) {
      console.error(`[Anichi Extractor] Streamwish error: ${e.message}`);
    }
    return null;
  });
}
function extractSwiftplayers(url) {
  return __async(this, null, function* () {
    return yield extractStreamWish(url);
  });
}
function extractFilemoon(url) {
  return __async(this, null, function* () {
    try {
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": url
      };
      let res = yield fetch(url, { headers });
      if (!res.ok)
        return null;
      let html = yield res.text();
      const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
      if (iframeMatch) {
        const iframeUrl = iframeMatch[1];
        const iframeHeaders = {
          "User-Agent": headers["User-Agent"],
          "Referer": url,
          "Accept-Language": "en-US,en;q=0.5"
        };
        res = yield fetch(iframeUrl, { headers: iframeHeaders });
        if (res.ok) {
          html = yield res.text();
        }
      }
      const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/g);
      if (packedMatch) {
        for (const script of packedMatch) {
          const unpacked = unpack(script);
          const fileMatch = unpacked.match(/file\s*:\s*["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.m3u8(?:\?[^"'\s]*)?)["']/) || unpacked.match(/sources\s*:\s*\[\s*\{\s*file\s*:\s*["']([^"'\s]+)["']/);
          if (fileMatch) {
            return fileMatch[1];
          }
        }
      }
      const m3u8Match = html.match(/["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.m3u8(?:\?[^"'\s]*)?)["']/);
      if (m3u8Match)
        return m3u8Match[1];
    } catch (e) {
      console.error(`[Anichi Extractor] Filemoon error: ${e.message}`);
    }
    return null;
  });
}
function extractOkRu(url) {
  return __async(this, null, function* () {
    var _a;
    try {
      const res = yield fetch(url);
      if (!res.ok)
        return null;
      const html = yield res.text();
      const dataOptionsMatch = html.match(/data-options="([^"]+)"/);
      if (dataOptionsMatch) {
        const unescaped = dataOptionsMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
        const options = JSON.parse(unescaped);
        const metadataStr = (_a = options.flashvars) == null ? void 0 : _a.metadata;
        if (metadataStr) {
          const metadata = JSON.parse(metadataStr);
          const videos = metadata.videos || [];
          const qualityOrder = { "odnoklassniki": 6, "hd": 5, "sd": 4, "low": 3, "lowest": 2, "mobile": 1 };
          videos.sort((a, b) => (qualityOrder[b.name] || 0) - (qualityOrder[a.name] || 0));
          if (videos.length > 0 && videos[0].url) {
            return {
              url: videos[0].url,
              quality: videos[0].name === "hd" ? "720p" : videos[0].name === "sd" ? "480p" : "Unknown"
            };
          }
        }
      }
    } catch (e) {
      console.error(`[Anichi Extractor] OkRu error: ${e.message}`);
    }
    return null;
  });
}
function extractMp4Upload(url) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(url);
      if (!res.ok)
        return null;
      const html = yield res.text();
      const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\(['"]\|['"]\)\)/g);
      if (packedMatch) {
        for (const script of packedMatch) {
          const unpacked = unpack(script);
          const srcMatch = unpacked.match(/player\.src\(\s*\{\s*src\s*:\s*["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.mp4(?:\?[^"'\s]*)?)["']/) || unpacked.match(/player\.src\(\s*["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.mp4(?:\?[^"'\s]*)?)["']/) || unpacked.match(/src\s*:\s*["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.mp4(?:\?[^"'\s]*)?)["']/);
          if (srcMatch) {
            return srcMatch[1];
          }
        }
      }
      const mp4Match = html.match(/["'](https?:\/\/[^"'\s]+\/[^"'\s/]+\.mp4(?:\?[^"'\s]*)?)["']/);
      if (mp4Match)
        return mp4Match[1];
    } catch (e) {
      console.error(`[Anichi Extractor] Mp4Upload error: ${e.message}`);
    }
    return null;
  });
}
function extractVidStack(url) {
  return __async(this, null, function* () {
    try {
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0"
      };
      const hash = url.split("#").pop().split("/").pop();
      const baseurl = getBaseUrl(url);
      const res = yield fetch(`${baseurl}/api/v1/video?id=${hash}`, { headers });
      if (!res.ok)
        return null;
      const encoded = (yield res.text()).trim();
      const key = "kiemtienmua911ca";
      const ivs = ["1234567890oiuytr", "0123456789abcdef"];
      let decryptedText = null;
      for (const iv of ivs) {
        try {
          decryptedText = yield decryptAesCbc(encoded, key, iv);
          if (decryptedText)
            break;
        } catch (err) {
        }
      }
      if (!decryptedText) {
        console.error("[Anichi Extractor] Vidstack decryption failed with all IVs");
        return null;
      }
      const sourceMatch = decryptedText.match(/"source"\s*:\s*"(.*?)"/);
      if (sourceMatch) {
        const m3u8 = sourceMatch[1].replace(/\\/g, "");
        return m3u8;
      }
    } catch (e) {
      console.error(`[Anichi Extractor] Vidstack error: ${e.message}`);
    }
    return null;
  });
}
function extractAllanimeups(url) {
  return __async(this, null, function* () {
    return yield extractVidStack(url);
  });
}
function extractStreamLare(url) {
  return __async(this, null, function* () {
    var _a;
    try {
      const id = url.split("/").pop();
      const res = yield fetch("https://streamlare.com/api/video/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Referer": url
        },
        body: JSON.stringify({ id })
      });
      if (!res.ok)
        return null;
      const data = yield res.json();
      const result = data.result || {};
      const qualities = Object.keys(result);
      if (qualities.length > 0) {
        const sorted = qualities.sort((a, b) => parseInt(b) - parseInt(a));
        const bestQuality = sorted[0];
        const file = (_a = result[bestQuality]) == null ? void 0 : _a.file;
        if (file) {
          return file;
        }
      }
    } catch (e) {
      console.error(`[Anichi Extractor] Streamlare error: ${e.message}`);
    }
    return null;
  });
}

// src/anichi/index.js
function fetchFromAnichi(url) {
  return __async(this, null, function* () {
    const res = yield fetch(url, { headers: HEADERS });
    if (!res.ok)
      throw new Error(`Anichi HTTP ${res.status}`);
    return yield res.json();
  });
}
function getEpisodeLinks(showId, translationType, episodeString) {
  return __async(this, null, function* () {
    var _a, _b;
    const variables = {
      showId,
      translationType,
      episodeString
    };
    const url = `${API_URL}?variables=${encodeURIComponent(JSON.stringify(variables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: SERVER_HASH } }))}`;
    try {
      const data = yield fetchFromAnichi(url);
      return ((_b = (_a = data.data) == null ? void 0 : _a.episode) == null ? void 0 : _b.sourceUrls) || [];
    } catch (e) {
      console.error(`[Anichi] Failed to fetch episode links: ${e.message}`);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, seasonNum = 1, episodeNum = 1) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e;
    console.log(`[Anichi] Starting extraction for TMDB ID: ${tmdbId}, Type: ${mediaType}, S:${seasonNum} E:${episodeNum}`);
    try {
      let animeTitle = "";
      let mappedEp = episodeNum;
      if (mediaType === "tv") {
        const imdbId = yield getImdbId(tmdbId, mediaType);
        if (imdbId) {
          const mapping = yield resolveMapping(imdbId, seasonNum, episodeNum);
          if (mapping && mapping.mal_id) {
            mappedEp = mapping.mal_episode || episodeNum;
            animeTitle = yield getMalTitle(mapping.mal_id);
          }
        }
      }
      if (!animeTitle) {
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
        const tmdbRes = yield fetch(tmdbUrl);
        if (tmdbRes.ok) {
          const tmdbData = yield tmdbRes.json();
          animeTitle = tmdbData.name || tmdbData.title || tmdbData.original_name || tmdbData.original_title;
        }
      }
      if (!animeTitle) {
        console.error("[Anichi] Could not resolve anime title.");
        return [];
      }
      console.log(`[Anichi] Resolved Title: "${animeTitle}"`);
      const searchVariables = {
        search: { query: animeTitle },
        limit: 26,
        page: 1,
        translationType: "sub",
        countryOrigin: "ALL"
      };
      const searchUrl = `${API_URL}?variables=${encodeURIComponent(JSON.stringify(searchVariables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: SEARCH_HASH } }))}`;
      const searchData = yield fetchFromAnichi(searchUrl);
      const edges = ((_b = (_a = searchData.data) == null ? void 0 : _a.shows) == null ? void 0 : _b.edges) || [];
      if (edges.length === 0) {
        console.log("[Anichi] No anime found matching query.");
        return [];
      }
      const match = edges.find(
        (e) => e.name.toLowerCase() === animeTitle.toLowerCase() || e.englishName && e.englishName.toLowerCase() === animeTitle.toLowerCase()
      ) || edges[0];
      const showId = match._id;
      console.log(`[Anichi] Found Show ID: ${showId} (${match.name})`);
      const detailVariables = { _id: showId };
      const detailUrl = `${API_URL}?variables=${encodeURIComponent(JSON.stringify(detailVariables))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: DETAIL_HASH } }))}`;
      const detailData = yield fetchFromAnichi(detailUrl);
      const show = (_c = detailData.data) == null ? void 0 : _c.show;
      if (!show)
        return [];
      const subEpisodes = ((_d = show.availableEpisodesDetail) == null ? void 0 : _d.sub) || [];
      const dubEpisodes = ((_e = show.availableEpisodesDetail) == null ? void 0 : _e.dub) || [];
      const hasSub = subEpisodes.includes(String(mappedEp));
      const hasDub = dubEpisodes.includes(String(mappedEp));
      if (!hasSub && !hasDub) {
        console.log(`[Anichi] Episode ${mappedEp} is not available.`);
        return [];
      }
      const streams = [];
      const sourcePromises = [];
      if (hasSub) {
        sourcePromises.push(getEpisodeLinks(showId, "sub", String(mappedEp)).then((sources) => ({ type: "Sub", sources })));
      }
      if (hasDub) {
        sourcePromises.push(getEpisodeLinks(showId, "dub", String(mappedEp)).then((sources) => ({ type: "Dub", sources })));
      }
      const resolvedTypes = yield Promise.all(sourcePromises);
      for (const { type, sources } of resolvedTypes) {
        for (const source of sources) {
          let rawUrl = source.sourceUrl;
          if (!rawUrl)
            continue;
          if (rawUrl.startsWith("--")) {
            rawUrl = decrypthex(rawUrl);
          }
          if (rawUrl.includes("/apivtwo/clock")) {
            const fixedLink = fixUrlPath(rawUrl);
            try {
              const clockRes = yield fetch(fixedLink, { headers: HEADERS });
              if (clockRes.ok) {
                const clockData = yield clockRes.json();
                const links = clockData.links || [];
                links.forEach((item) => {
                  var _a2, _b2, _c2, _d2, _e2;
                  if (item.link) {
                    let quality = item.resolutionStr || extractQuality(item.link);
                    if ((quality === "Hls" || quality === "Adaptive" || quality === "Unknown") && item.link) {
                      if (item.link.includes("1080p") || item.link.includes("1080"))
                        quality = "1080p";
                      else if (item.link.includes("720p") || item.link.includes("720"))
                        quality = "720p";
                      else if (item.link.includes("480p") || item.link.includes("480"))
                        quality = "480p";
                      else if (item.link.includes("360p") || item.link.includes("360"))
                        quality = "360p";
                    }
                    const endpoint = `${API_URL}/player?uri=${encodeURIComponent(item.link)}`;
                    const isWix = item.link.includes("wixmp.com") || item.link.includes("wixstatic.com");
                    const isCrunchy = ((_a2 = source.sourceName) == null ? void 0 : _a2.includes("Default")) && (item.resolutionStr === "SUB" || item.resolutionStr === "Alt vo_SUB");
                    const cleanPlayHeaders = {
                      "Referer": isWix || isCrunchy ? "https://static.crunchyroll.com/" : ((_b2 = item.headers) == null ? void 0 : _b2.Referer) || ((_c2 = item.headers) == null ? void 0 : _c2.referer) || endpoint,
                      "User-Agent": ((_d2 = item.headers) == null ? void 0 : _d2["user-agent"]) || ((_e2 = item.headers) == null ? void 0 : _e2["User-Agent"]) || HEADERS["User-Agent"]
                    };
                    streams.push({
                      name: `Anichi ${source.sourceName} (${type}) - ${quality}`,
                      title: `${match.name} - Episode ${mappedEp}`,
                      url: item.link,
                      quality,
                      size: "Unknown",
                      headers: cleanPlayHeaders,
                      provider: "anichi"
                    });
                  }
                });
              }
            } catch (e) {
              console.error(`[Anichi] Error fetching clock URL: ${e.message}`);
            }
          } else {
            let streamUrl = rawUrl.startsWith("//") ? `https:${rawUrl}` : rawUrl;
            const quality = extractQuality(streamUrl);
            const cleanHeaders = {
              "User-Agent": HEADERS["User-Agent"]
            };
            let extractedUrl = null;
            let extractedQuality = quality;
            let playHeaders = cleanHeaders;
            const isDirect = streamUrl.split("?")[0].endsWith(".m3u8") || streamUrl.split("?")[0].endsWith(".mp4");
            let isMirror = !isDirect;
            if (streamUrl.includes("ok.ru")) {
              isMirror = true;
              try {
                const res = yield extractOkRu(streamUrl);
                if (res && res.url) {
                  extractedUrl = res.url;
                  playHeaders = {
                    "Referer": "https://ok.ru/",
                    "User-Agent": cleanHeaders["User-Agent"]
                  };
                  if (res.quality) {
                    extractedQuality = res.quality;
                  }
                }
              } catch (err) {
                console.error(`[Anichi] OkRu extraction failed: ${err.message}`);
              }
            } else if (streamUrl.includes("mp4upload.com")) {
              isMirror = true;
              try {
                extractedUrl = yield extractMp4Upload(streamUrl);
                if (extractedUrl) {
                  playHeaders = {
                    "Referer": "https://www.mp4upload.com/",
                    "User-Agent": cleanHeaders["User-Agent"]
                  };
                }
              } catch (err) {
                console.error(`[Anichi] Mp4Upload extraction failed: ${err.message}`);
              }
            } else if (streamUrl.includes("streamwish") || streamUrl.includes("swiftplayers")) {
              isMirror = true;
              try {
                extractedUrl = streamUrl.includes("swiftplayers") ? yield extractSwiftplayers(streamUrl) : yield extractStreamWish(streamUrl);
                if (extractedUrl) {
                  const base = streamUrl.includes("swiftplayers") ? "https://swiftplayers.com" : "https://streamwish.to";
                  playHeaders = {
                    "Referer": `${base}/`,
                    "Origin": `${base}/`,
                    "User-Agent": cleanHeaders["User-Agent"]
                  };
                }
              } catch (err) {
                console.error(`[Anichi] Streamwish extraction failed: ${err.message}`);
              }
            } else if (streamUrl.includes("bysekoze.com") || streamUrl.includes("byse.sx")) {
              isMirror = true;
              try {
                extractedUrl = yield extractBysekoze(streamUrl);
                if (extractedUrl) {
                  const base = streamUrl.includes("bysekoze.com") ? "https://bysekoze.com" : "https://byse.sx";
                  playHeaders = {
                    "Referer": `${base}/`,
                    "User-Agent": cleanHeaders["User-Agent"]
                  };
                }
              } catch (err) {
                console.error(`[Anichi] Bysekoze extraction failed: ${err.message}`);
              }
            } else if (streamUrl.includes("filemoon")) {
              isMirror = true;
              try {
                extractedUrl = (yield extractBysekoze(streamUrl)) || (yield extractFilemoon(streamUrl));
                if (extractedUrl) {
                  playHeaders = {
                    "Referer": streamUrl,
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                  };
                }
              } catch (err) {
                console.error(`[Anichi] Filemoon extraction failed: ${err.message}`);
              }
            } else if (streamUrl.includes("allanime.uns.bio") || streamUrl.includes("uns.bio")) {
              isMirror = true;
              try {
                extractedUrl = yield extractAllanimeups(streamUrl);
                if (extractedUrl) {
                  playHeaders = {
                    "Referer": streamUrl,
                    "Origin": "https://allanime.uns.bio",
                    "User-Agent": cleanHeaders["User-Agent"]
                  };
                }
              } catch (err) {
                console.error(`[Anichi] Vidstack extraction failed: ${err.message}`);
              }
            } else if (streamUrl.includes("streamlare.com")) {
              isMirror = true;
              try {
                extractedUrl = yield extractStreamLare(streamUrl);
                if (extractedUrl) {
                  playHeaders = {
                    "Referer": "https://streamlare.com/",
                    "User-Agent": cleanHeaders["User-Agent"]
                  };
                }
              } catch (err) {
                console.error(`[Anichi] Streamlare extraction failed: ${err.message}`);
              }
            }
            if (isMirror) {
              if (extractedUrl) {
                const finalQuality = extractedQuality === "Unknown" ? extractQuality(extractedUrl) : extractedQuality;
                streams.push({
                  name: `Anichi ${source.sourceName} (${type}) - ${finalQuality}`,
                  title: `${match.name} - Episode ${mappedEp}`,
                  url: extractedUrl,
                  quality: finalQuality,
                  size: "Unknown",
                  headers: playHeaders,
                  provider: "anichi"
                });
              }
            } else {
              streams.push({
                name: `Anichi ${source.sourceName} (${type}) - ${quality}`,
                title: `${match.name} - Episode ${mappedEp}`,
                url: streamUrl,
                quality,
                size: "Unknown",
                headers: cleanHeaders,
                provider: "anichi"
              });
            }
          }
        }
      }
      const prioritySources = ["Default", "Luf-Mp4", "Ur-mp4", "Ak"];
      const qualityOrder = { "1080p": 4, "720p": 3, "480p": 2, "360p": 1, "Unknown": 0 };
      streams.sort((a, b) => {
        var _a2, _b2, _c2, _d2;
        const aPri = prioritySources.some((src) => a.name.includes(src)) || a.url.includes("wixmp.com") || a.url.includes("wixstatic.com") || (((_a2 = a.headers) == null ? void 0 : _a2.Referer) || ((_b2 = a.headers) == null ? void 0 : _b2.referer) || "").includes("crunchyroll.com") ? 1 : 0;
        const bPri = prioritySources.some((src) => b.name.includes(src)) || b.url.includes("wixmp.com") || b.url.includes("wixstatic.com") || (((_c2 = b.headers) == null ? void 0 : _c2.Referer) || ((_d2 = b.headers) == null ? void 0 : _d2.referer) || "").includes("crunchyroll.com") ? 1 : 0;
        if (aPri !== bPri) {
          return bPri - aPri;
        }
        const aQ = qualityOrder[a.quality] || 0;
        const bQ = qualityOrder[b.quality] || 0;
        return bQ - aQ;
      });
      console.log(`[Anichi] Total streams found: ${streams.length}`);
      return streams;
    } catch (e) {
      console.error(`[Anichi] Error in getStreams: ${e.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
