var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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
const cheerio = require("cheerio-without-node-native");
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
let MAIN_URL = "https://hdhub4u.frl";
const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const DOMAIN_CACHE_TTL = 4 * 60 * 60 * 1e3;
let domainCacheTimestamp = 0;
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  "Cookie": "xla=s4t",
  "Referer": `${MAIN_URL}/`
};
function formatBytes(bytes) {
  if (!bytes || bytes === 0)
    return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
function extractServerName(source) {
  if (!source)
    return "Unknown";
  if (source.startsWith("HubCloud")) {
    const serverMatch = source.match(/HubCloud(?:\s*-\s*([^[\]]+))?/);
    return serverMatch ? serverMatch[1] || "Download" : "HubCloud";
  }
  if (source.startsWith("Pixeldrain"))
    return "Pixeldrain";
  if (source.startsWith("StreamTape"))
    return "StreamTape";
  if (source.startsWith("HubCdn"))
    return "HubCdn";
  if (source.startsWith("HbLinks"))
    return "HbLinks";
  if (source.startsWith("Hubstream"))
    return "Hubstream";
  return source.replace(/^www\./, "").split(".")[0];
}
function rot13(value) {
  return value.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  });
}
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
function atob(value) {
  if (!value)
    return "";
  let input = String(value).replace(/=+$/, "");
  let output = "";
  let bc = 0, bs, buffer, idx = 0;
  while (buffer = input.charAt(idx++)) {
    buffer = BASE64_CHARS.indexOf(buffer);
    if (~buffer) {
      bs = bc % 4 ? bs * 64 + buffer : buffer;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & bs >> (-2 * bc & 6));
      }
    }
  }
  return output;
}
function btoa(value) {
  if (value == null)
    return "";
  let str = String(value);
  let output = "";
  let i = 0;
  while (i < str.length) {
    const chr1 = str.charCodeAt(i++);
    const chr2 = str.charCodeAt(i++);
    const chr3 = str.charCodeAt(i++);
    const enc1 = chr1 >> 2;
    const enc2 = (chr1 & 3) << 4 | chr2 >> 4;
    let enc3 = (chr2 & 15) << 2 | chr3 >> 6;
    let enc4 = chr3 & 63;
    if (isNaN(chr2)) {
      enc3 = 64;
      enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }
    output += BASE64_CHARS.charAt(enc1) + BASE64_CHARS.charAt(enc2) + BASE64_CHARS.charAt(enc3) + BASE64_CHARS.charAt(enc4);
  }
  return output;
}
function cleanTitle(title) {
  const parts = title.split(/[.\-_]/);
  const qualityTags = [
    "WEBRip",
    "WEB-DL",
    "WEB",
    "BluRay",
    "HDRip",
    "DVDRip",
    "HDTV",
    "CAM",
    "TS",
    "R5",
    "DVDScr",
    "BRRip",
    "BDRip",
    "DVD",
    "PDTV",
    "HD"
  ];
  const audioTags = [
    "AAC",
    "AC3",
    "DTS",
    "MP3",
    "FLAC",
    "DD5",
    "EAC3",
    "Atmos"
  ];
  const subTags = [
    "ESub",
    "ESubs",
    "Subs",
    "MultiSub",
    "NoSub",
    "EnglishSub",
    "HindiSub"
  ];
  const codecTags = [
    "x264",
    "x265",
    "H264",
    "HEVC",
    "AVC"
  ];
  const startIndex = parts.findIndex(
    (part) => qualityTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase()))
  );
  const endIndex = parts.findLastIndex(
    (part) => subTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase())) || audioTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase())) || codecTags.some((tag) => part.toLowerCase().includes(tag.toLowerCase()))
  );
  if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
    return parts.slice(startIndex, endIndex + 1).join(".");
  } else if (startIndex !== -1) {
    return parts.slice(startIndex).join(".");
  } else {
    return parts.slice(-3).join(".");
  }
}
function fetchAndUpdateDomain() {
  const now = Date.now();
  if (now - domainCacheTimestamp < DOMAIN_CACHE_TTL) {
    return Promise.resolve();
  }
  console.log("[HDHub4u] Fetching latest domain...");
  return fetch(DOMAINS_URL, {
    method: "GET",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  }).then(function(response) {
    if (response.ok) {
      return response.json().then(function(data) {
        if (data && data.HDHUB4u) {
          const newDomain = data.HDHUB4u;
          if (newDomain !== MAIN_URL) {
            console.log(`[HDHub4u] Updating domain from ${MAIN_URL} to ${newDomain}`);
            MAIN_URL = newDomain;
            HEADERS.Referer = `${MAIN_URL}/`;
            domainCacheTimestamp = now;
          }
        }
      });
    }
  }).catch(function(error) {
    console.error(`[HDHub4u] Failed to fetch latest domains: ${error.message}`);
  });
}
function getCurrentDomain() {
  return fetchAndUpdateDomain().then(function() {
    return MAIN_URL;
  });
}
function getRedirectLinks(url) {
  return fetch(url, { headers: HEADERS }).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.text();
  }).then((doc) => {
    const regex = /s\('o','([A-Za-z0-9+/=]+)'|ck\('_wp_http_\d+','([^']+)'/g;
    let combinedString = "";
    let match;
    while ((match = regex.exec(doc)) !== null) {
      const extractedValue = match[1] || match[2];
      if (extractedValue) {
        combinedString += extractedValue;
      }
    }
    if (!combinedString) {
      console.error("[getRedirectLinks] Could not find encoded strings in page.");
      return url;
    }
    const decodedString = atob(rot13(atob(atob(combinedString))));
    const jsonObject = JSON.parse(decodedString);
    const encodedUrl = atob(jsonObject.o || "").trim();
    if (encodedUrl) {
      return encodedUrl;
    }
    const data = btoa(jsonObject.data || "").trim();
    const wpHttp = (jsonObject.blog_url || "").trim();
    if (wpHttp && data) {
      return fetch(`${wpHttp}?re=${data}`, { headers: HEADERS }).then((directLinkResponse) => directLinkResponse.text()).then((text) => text.trim());
    }
    return url;
  }).catch((e) => {
    console.error(`[getRedirectLinks] Error processing link ${url}:`, e.message);
    return url;
  });
}
function pixelDrainExtractor(link) {
  return Promise.resolve().then(() => {
    let fileId;
    const match = link.match(/(?:file|u)\/([A-Za-z0-9]+)/);
    if (match) {
      fileId = match[1];
    } else {
      fileId = link.split("/").pop();
    }
    if (!fileId) {
      return [{ source: "Pixeldrain", quality: "Unknown", url: link }];
    }
    const infoUrl = `https://pixeldrain.com/api/file/${fileId}/info`;
    let fileInfo = { name: "", quality: "Unknown", size: 0 };
    return fetch(infoUrl, { headers: HEADERS }).then((response) => response.json()).then((info) => {
      if (info && info.name) {
        fileInfo.name = info.name;
        fileInfo.size = info.size || 0;
        const qualityMatch = info.name.match(/(\d{3,4})p/);
        if (qualityMatch) {
          fileInfo.quality = qualityMatch[0];
        }
      }
      const directUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
      return [{
        source: "Pixeldrain",
        quality: fileInfo.quality,
        url: directUrl,
        name: fileInfo.name,
        size: fileInfo.size
      }];
    }).catch((e) => {
      console.warn(`[Pixeldrain] Could not fetch file info for ${fileId}:`, e.message);
      const directUrl = `https://pixeldrain.com/api/file/${fileId}?download`;
      return [{
        source: "Pixeldrain",
        quality: fileInfo.quality,
        url: directUrl,
        name: fileInfo.name,
        size: fileInfo.size
      }];
    });
  }).catch((e) => {
    console.error("[Pixeldrain] extraction failed", e.message);
    return [{ source: "Pixeldrain", quality: "Unknown", url: link }];
  });
}
function streamTapeExtractor(link) {
  const url = new URL(link);
  url.hostname = "streamtape.com";
  const normalizedLink = url.toString();
  return fetch(normalizedLink, { headers: HEADERS }).then((res) => res.text()).then((data) => {
    const match = data.match(/document\.getElementById\('videolink'\)\.innerHTML = (.*?);/);
    if (match && match[1]) {
      const scriptContent = match[1];
      const urlPartMatch = scriptContent.match(/'(\/\/streamtape\.com\/get_video[^']+)'/);
      if (urlPartMatch && urlPartMatch[1]) {
        const videoSrc = "https:" + urlPartMatch[1];
        return [{ source: "StreamTape", quality: "Stream", url: videoSrc }];
      }
    }
    const simpleMatch = data.match(/'(\/\/streamtape\.com\/get_video[^']+)'/);
    if (simpleMatch && simpleMatch[0]) {
      const videoSrc = "https:" + simpleMatch[0].slice(1, -1);
      return [{ source: "StreamTape", quality: "Stream", url: videoSrc }];
    }
    return [];
  }).catch((e) => {
    if (!e.response || e.response.status !== 404) {
      console.error(`[StreamTape] An unexpected error occurred for ${normalizedLink}:`, e.message);
    }
    return [];
  });
}
function hubStreamExtractor(url, referer) {
  return fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) }).then((response) => {
    return [{ source: "Hubstream", quality: "Unknown", url }];
  }).catch((e) => {
    console.error(`[Hubstream] Failed to extract from ${url}:`, e.message);
    return [];
  });
}
function hbLinksExtractor(url, referer) {
  return fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) }).then((response) => response.text()).then((data) => {
    const $ = cheerio.load(data);
    const links = $("h3 a, div.entry-content p a").map((i, el) => $(el).attr("href")).get();
    const finalLinks = [];
    const promises = links.map((link) => loadExtractor(link, url));
    return Promise.all(promises).then((results) => {
      results.forEach((extracted) => finalLinks.push(...extracted));
      return finalLinks;
    });
  });
}
function hubCdnExtractor(url, referer) {
  return fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) }).then((response) => response.text()).then((data) => {
    const encodedMatch = data.match(/r=([A-Za-z0-9+/=]+)/);
    if (encodedMatch && encodedMatch[1]) {
      const m3u8Data = atob(encodedMatch[1]);
      const m3u8Link = m3u8Data.substring(m3u8Data.lastIndexOf("link=") + 5);
      return [{
        source: "HubCdn",
        quality: "M3U8",
        url: m3u8Link
      }];
    }
    return [];
  }).catch(() => []);
}
function hubDriveExtractor(url, referer) {
  return fetch(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) }).then((response) => response.text()).then((data) => {
    const $ = cheerio.load(data);
    const href = $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href");
    if (href) {
      return loadExtractor(href, url);
    }
    return [];
  }).catch(() => []);
}
function hubCloudExtractor(url, referer) {
  let currentUrl = url;
  if (currentUrl.includes("hubcloud.ink")) {
    currentUrl = currentUrl.replace("hubcloud.ink", "hubcloud.dad");
  }
  return fetch(currentUrl, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer }) }).then((pageResponse) => pageResponse.text()).then((pageData) => {
    let finalUrl = currentUrl;
    if (!currentUrl.includes("hubcloud.php")) {
      const scriptUrlMatch = pageData.match(/var url = '([^']*)'/);
      if (scriptUrlMatch && scriptUrlMatch[1]) {
        finalUrl = scriptUrlMatch[1];
        return fetch(finalUrl, { headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: currentUrl }) }).then((secondResponse) => secondResponse.text()).then((secondData) => ({ pageData: secondData, finalUrl }));
      }
    }
    return { pageData, finalUrl };
  }).then(({ pageData, finalUrl }) => {
    const $ = cheerio.load(pageData);
    const size = $("i#size").text().trim();
    const header = $("div.card-header").text().trim();
    const getIndexQuality = (str) => {
      const match = (str || "").match(/(\d{3,4})[pP]/);
      return match ? parseInt(match[1]) : 2160;
    };
    const quality = getIndexQuality(header);
    const headerDetails = cleanTitle(header);
    const labelExtras = (() => {
      let extras = "";
      if (headerDetails)
        extras += `[${headerDetails}]`;
      if (size)
        extras += `[${size}]`;
      return extras;
    })();
    const sizeInBytes = (() => {
      if (!size)
        return 0;
      const sizeMatch = size.match(/([\d.]+)\s*(GB|MB|KB)/i);
      if (!sizeMatch)
        return 0;
      const value = parseFloat(sizeMatch[1]);
      const unit = sizeMatch[2].toUpperCase();
      if (unit === "GB")
        return value * 1024 * 1024 * 1024;
      if (unit === "MB")
        return value * 1024 * 1024;
      if (unit === "KB")
        return value * 1024;
      return 0;
    })();
    const links = [];
    const elements = $("div.card-body h2 a.btn").get();
    const processElements = elements.map((element) => {
      const link = $(element).attr("href");
      const text = $(element).text();
      const sourceName = text.trim();
      const fileName = header || headerDetails || "Unknown";
      if (text.includes("Download File")) {
        links.push({ source: `HubCloud ${labelExtras}`, quality, url: link, size: sizeInBytes, fileName });
        return Promise.resolve();
      } else if (text.includes("FSL Server")) {
        links.push({ source: `HubCloud - FSL Server ${labelExtras}`, quality, url: link, size: sizeInBytes, fileName });
        return Promise.resolve();
      } else if (text.includes("S3 Server")) {
        links.push({ source: `HubCloud - S3 Server ${labelExtras}`, quality, url: link, size: sizeInBytes, fileName });
        return Promise.resolve();
      } else if (text.includes("BuzzServer")) {
        return fetch(`${link}/download`, {
          method: "GET",
          headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: link }),
          redirect: "manual"
          // Do not follow redirects automatically
        }).then((buzzResp) => {
          if (buzzResp.status >= 300 && buzzResp.status < 400) {
            const location = buzzResp.headers.get("location");
            if (location && location.includes("hx-redirect=")) {
              const hxRedirectMatch = location.match(/hx-redirect=([^&]+)/);
              if (hxRedirectMatch) {
                const dlink = decodeURIComponent(hxRedirectMatch[1]);
                links.push({ source: `HubCloud - BuzzServer ${labelExtras}`, quality, url: dlink, size: sizeInBytes, fileName });
              }
            }
          }
        }).catch((e) => {
          console.error("[HubCloud] BuzzServer redirect failed for", link, e.message);
        });
      } else if (link.includes("pixeldra")) {
        links.push({ source: `Pixeldrain ${labelExtras}`, quality, url: link, size: sizeInBytes, fileName });
        return Promise.resolve();
      } else if (text.includes("10Gbps")) {
        let currentRedirectUrl = link;
        let finalLink = null;
        const processRedirects = (i) => {
          if (i >= 5)
            return Promise.resolve(finalLink);
          return fetch(currentRedirectUrl, {
            method: "GET",
            redirect: "manual"
            // Don't follow redirects automatically
          }).then((response) => {
            if (response.status >= 300 && response.status < 400) {
              const location = response.headers.get("location");
              if (location) {
                if (location.includes("link=")) {
                  finalLink = location.substring(location.indexOf("link=") + 5);
                  return finalLink;
                }
                currentRedirectUrl = new URL(location, currentRedirectUrl).toString();
                return processRedirects(i + 1);
              }
            }
            return finalLink;
          }).catch((e) => {
            console.error("[HubCloud] 10Gbps redirect failed for", currentRedirectUrl, e.message);
            return finalLink;
          });
        };
        return processRedirects(0).then((finalLink2) => {
          if (finalLink2) {
            links.push({ source: `HubCloud - 10Gbps ${labelExtras}`, quality, url: finalLink2, size: sizeInBytes, fileName });
          }
        });
      } else {
        return loadExtractor(link, finalUrl).then((extracted) => {
          links.push(...extracted);
        });
      }
    });
    return Promise.all(processElements).then(() => links);
  }).catch(() => []);
}
function loadExtractor(url, referer = MAIN_URL) {
  const hostname = new URL(url).hostname;
  if (url.includes("?id=") || hostname.includes("techyboy4u")) {
    return getRedirectLinks(url).then((finalLink) => {
      if (!finalLink) {
        return [];
      }
      return loadExtractor(finalLink, url);
    });
  }
  if (hostname.includes("hubcloud")) {
    return hubCloudExtractor(url, referer);
  }
  if (hostname.includes("hubdrive")) {
    return hubDriveExtractor(url, referer);
  }
  if (hostname.includes("hubcdn")) {
    return hubCdnExtractor(url, referer);
  }
  if (hostname.includes("hblinks")) {
    return hbLinksExtractor(url, referer);
  }
  if (hostname.includes("hubstream")) {
    return hubStreamExtractor(url, referer);
  }
  if (hostname.includes("pixeldrain")) {
    return pixelDrainExtractor(url);
  }
  if (hostname.includes("streamtape")) {
    return streamTapeExtractor(url);
  }
  if (hostname.includes("hdstream4u")) {
    return Promise.resolve([{ source: "HdStream4u", quality: "Unknown", url }]);
  }
  if (hostname.includes("linkrit")) {
    return Promise.resolve([]);
  }
  const sourceName = hostname.replace(/^www\./, "");
  return Promise.resolve([{ source: sourceName, quality: "Unknown", url }]);
}
function search(query) {
  return getCurrentDomain().then((currentDomain) => {
    const searchUrl = `${currentDomain}/?s=${encodeURIComponent(query)}`;
    return fetch(searchUrl, { headers: HEADERS });
  }).then((response) => response.text()).then((data) => {
    const $ = cheerio.load(data);
    return $(".recent-movies > li.thumb").map((i, el) => {
      const element = $(el);
      const title = element.find("figcaption:nth-child(2) > a:nth-child(1) > p:nth-child(1)").text().trim();
      const yearMatch = title.match(/\((\d{4})\)|\b(\d{4})\b/);
      const year = yearMatch ? parseInt(yearMatch[1] || yearMatch[2]) : null;
      return {
        title,
        url: element.find("figure:nth-child(1) > a:nth-child(2)").attr("href"),
        poster: element.find("figure:nth-child(1) > img:nth-child(1)").attr("src"),
        year
      };
    }).get();
  });
}
function getCinemetaData(imdbId, tvType) {
  if (!imdbId)
    return Promise.resolve(null);
  const cinemetaUrl = `https://v3-cinemeta.strem.io/meta/${tvType}/${imdbId}.json`;
  return fetch(cinemetaUrl).then((response) => response.json()).catch((e) => {
    console.error(`[Cinemeta] Failed to fetch metadata for ${imdbId}:`, e.message);
    return null;
  });
}
function getDownloadLinks(mediaUrl) {
  return getCurrentDomain().then((currentDomain) => {
    HEADERS.Referer = `${currentDomain}/`;
    return fetch(mediaUrl, { headers: HEADERS });
  }).then((response) => response.text()).then((data) => {
    const $ = cheerio.load(data);
    const typeRaw = $("h1.page-title span").text();
    const isMovie = typeRaw.toLowerCase().includes("movie");
    const title = $('.page-body h2[data-ved="2ahUKEwjL0NrBk4vnAhWlH7cAHRCeAlwQ3B0oATAfegQIFBAM"], h2[data-ved="2ahUKEwiP0pGdlermAhUFYVAKHV8tAmgQ3B0oATAZegQIDhAM"]').text();
    const seasonMatch = title.match(/\bSeason\s*(\d+)\b/i);
    const seasonNumber = seasonMatch ? parseInt(seasonMatch[1]) : null;
    let initialLinks = [];
    if (isMovie) {
      const qualityLinks = $("h3 a, h4 a").filter((i, el) => {
        const linkText = $(el).text();
        return linkText.match(/480|720|1080|2160|4K/i);
      });
      initialLinks = qualityLinks.map((i, el) => ({ url: $(el).attr("href") })).get();
      const seen = /* @__PURE__ */ new Set();
      initialLinks = initialLinks.filter((link) => {
        if (!link.url || seen.has(link.url)) {
          return false;
        }
        seen.add(link.url);
        return true;
      });
      console.log(`Found ${initialLinks.length} initial hoster links. Now extracting...`);
      const promises = initialLinks.map(
        (linkInfo) => loadExtractor(linkInfo.url, mediaUrl).then((extractedLinks) => extractedLinks).catch((e) => {
          console.error(`Failed to extract from ${linkInfo.url}:`, e.message);
          return [];
        })
      );
      return Promise.all(promises).then((results) => {
        const allFinalLinks = [];
        results.forEach((res) => allFinalLinks.push(...res));
        const seenUrls = /* @__PURE__ */ new Set();
        const uniqueFinalLinks = allFinalLinks.filter((link) => {
          if (link.url && (link.url.includes(".zip") || link.name && link.name.toLowerCase().includes(".zip"))) {
            return false;
          }
          if (seenUrls.has(link.url)) {
            return false;
          }
          seenUrls.add(link.url);
          return true;
        });
        return { finalLinks: uniqueFinalLinks, isMovie };
      });
    } else {
      const episodeLinksMap = /* @__PURE__ */ new Map();
      $("h3 a, h4 a").each((i, element) => {
        const $el = $(element);
        const text = $el.text();
        const href = $el.attr("href");
        if (text.match(/1080|720|4K|2160/i) && href && href.includes("techyboy4u.com")) {
          initialLinks.push({ url: href, isQualityRedirect: true });
        }
      });
      $("h4").each((i, element) => {
        const $el = $(element);
        const text = $el.text();
        const episodeMatch = text.match(/(?:EPiSODE\s*(\d+)|E(\d+))/i);
        if (episodeMatch) {
          const epNum = parseInt(episodeMatch[1] || episodeMatch[2]);
          if (!episodeLinksMap.has(epNum))
            episodeLinksMap.set(epNum, []);
          const links = $el.find("a").map((i2, a) => $(a).attr("href")).get();
          episodeLinksMap.get(epNum).push(...links);
        }
      });
      if (episodeLinksMap.size === 0) {
        const processElementsPromises = $("h3, h4").get().map((element) => {
          const $el = $(element);
          const title2 = $el.text();
          const episodeMatch = title2.match(/(?:EPiSODE\s*(\d+)|E(\d+))/i);
          const epNum = episodeMatch ? parseInt(episodeMatch[1] || episodeMatch[2]) : null;
          const isDirectLinkBlock = $el.find("a").text().match(/1080|720|4K|2160/i);
          if (isDirectLinkBlock) {
            const redirectLinks = $el.find("a").map((i, a) => $(a).attr("href")).get();
            return Promise.all(redirectLinks.map(
              (redirectLink) => getRedirectLinks(redirectLink).then(
                (resolvedUrl) => fetch(resolvedUrl, { headers: HEADERS }).then((episodeDocPage) => episodeDocPage.text()).then((episodeDocData) => {
                  const $$ = cheerio.load(episodeDocData);
                  $$("h5 a").each((i, linkEl) => {
                    const linkText = $$(linkEl).text();
                    const linkHref = $$(linkEl).attr("href");
                    const innerEpMatch = linkText.match(/Episode\s*(\d+)/i);
                    if (innerEpMatch && linkHref) {
                      const innerEpNum = parseInt(innerEpMatch[1]);
                      if (!episodeLinksMap.has(innerEpNum))
                        episodeLinksMap.set(innerEpNum, []);
                      episodeLinksMap.get(innerEpNum).push(linkHref);
                    }
                  });
                })
              ).catch((e) => {
                console.error(`Error resolving direct link block: ${redirectLink}`, e.message);
              })
            ));
          } else if (epNum) {
            if (!episodeLinksMap.has(epNum))
              episodeLinksMap.set(epNum, []);
            const baseLinks = $el.find("a").map((i, a) => $(a).attr("href")).get();
            episodeLinksMap.get(epNum).push(...baseLinks);
            let nextElement = $el.next();
            while (nextElement.length && nextElement.get(0).tagName !== "hr" && nextElement.get(0).tagName !== "h3" && nextElement.get(0).tagName !== "h4") {
              const siblingLinks = nextElement.find("a").map((i, a) => $(a).attr("href")).get();
              episodeLinksMap.get(epNum).push(...siblingLinks);
              nextElement = nextElement.next();
            }
            return Promise.resolve();
          } else {
            return Promise.resolve();
          }
        });
        return Promise.all(processElementsPromises).then(() => {
          episodeLinksMap.forEach((links, epNum) => {
            const uniqueLinks = [...new Set(links)];
            initialLinks.push(...uniqueLinks.map((link) => ({ url: link, episode: epNum })));
          });
          console.log(`Found ${initialLinks.length} initial hoster links. Now extracting...`);
          const promises = initialLinks.map((linkInfo) => {
            if (linkInfo.isQualityRedirect) {
              return getRedirectLinks(linkInfo.url).then(
                (resolvedUrl) => fetch(resolvedUrl, { headers: HEADERS }).then((episodeDocPage) => episodeDocPage.text()).then((episodeDocData) => {
                  const $$ = cheerio.load(episodeDocData);
                  const episodeLinks = [];
                  $$("h5 a").each((i, linkEl) => {
                    const linkText = $$(linkEl).text();
                    const linkHref = $$(linkEl).attr("href");
                    const episodeMatch = linkText.match(/Episode\s*(\d+)/i);
                    if (episodeMatch && linkHref) {
                      const epNum = parseInt(episodeMatch[1]);
                      episodeLinks.push({ url: linkHref, episode: epNum });
                    }
                  });
                  $$("h3 a").each((i, linkEl) => {
                    const linkHref = $$(linkEl).attr("href");
                    const linkText = $$(linkEl).text();
                    if (linkHref && !linkHref.includes("magnet:") && !linkHref.includes(".zip") && !linkText.toLowerCase().includes("pack")) {
                      episodeLinks.push({ url: linkHref, episode: null });
                    }
                  });
                  const episodePromises = episodeLinks.map(
                    (epLink) => loadExtractor(epLink.url, resolvedUrl).then((extractedLinks) => extractedLinks.map((finalLink) => __spreadProps(__spreadValues({}, finalLink), { episode: epLink.episode }))).catch((e) => {
                      console.error(`Failed to extract episode link ${epLink.url}:`, e.message);
                      return [];
                    })
                  );
                  return Promise.all(episodePromises).then((episodeResults) => episodeResults.flat());
                })
              );
            } else {
              return loadExtractor(linkInfo.url, mediaUrl).then((extractedLinks) => extractedLinks.map((finalLink) => __spreadProps(__spreadValues({}, finalLink), { episode: linkInfo.episode }))).catch((e) => {
                console.error(`Failed to extract from ${linkInfo.url}:`, e.message);
                return [];
              });
            }
          });
          return Promise.all(promises).then((results) => {
            const allFinalLinks = [];
            results.forEach((res) => allFinalLinks.push(...res));
            const seenUrls = /* @__PURE__ */ new Set();
            const uniqueFinalLinks = allFinalLinks.filter((link) => {
              if (link.url && (link.url.includes(".zip") || link.name && link.name.toLowerCase().includes(".zip"))) {
                return false;
              }
              if (seenUrls.has(link.url)) {
                return false;
              }
              seenUrls.add(link.url);
              return true;
            });
            return { finalLinks: uniqueFinalLinks, isMovie };
          });
        });
      } else {
        episodeLinksMap.forEach((links, epNum) => {
          const uniqueLinks = [...new Set(links)];
          initialLinks.push(...uniqueLinks.map((link) => ({ url: link, episode: epNum })));
        });
        console.log(`Found ${initialLinks.length} initial hoster links. Now extracting...`);
        const promises = initialLinks.map((linkInfo) => {
          if (linkInfo.isQualityRedirect) {
            return getRedirectLinks(linkInfo.url).then(
              (resolvedUrl) => fetch(resolvedUrl, { headers: HEADERS }).then((episodeDocPage) => episodeDocPage.text()).then((episodeDocData) => {
                const $$ = cheerio.load(episodeDocData);
                const episodeLinks = [];
                $$("h5 a").each((i, linkEl) => {
                  const linkText = $$(linkEl).text();
                  const linkHref = $$(linkEl).attr("href");
                  const episodeMatch = linkText.match(/Episode\s*(\d+)/i);
                  if (episodeMatch && linkHref) {
                    const epNum = parseInt(episodeMatch[1]);
                    episodeLinks.push({ url: linkHref, episode: epNum });
                  }
                });
                $$("h3 a").each((i, linkEl) => {
                  const linkHref = $$(linkEl).attr("href");
                  const linkText = $$(linkEl).text();
                  if (linkHref && !linkHref.includes("magnet:") && !linkHref.includes(".zip") && !linkText.toLowerCase().includes("pack")) {
                    episodeLinks.push({ url: linkHref, episode: null });
                  }
                });
                const episodePromises = episodeLinks.map(
                  (epLink) => loadExtractor(epLink.url, resolvedUrl).then((extractedLinks) => extractedLinks.map((finalLink) => __spreadProps(__spreadValues({}, finalLink), { episode: epLink.episode }))).catch((e) => {
                    console.error(`Failed to extract episode link ${epLink.url}:`, e.message);
                    return [];
                  })
                );
                return Promise.all(episodePromises).then((episodeResults) => episodeResults.flat());
              })
            );
          } else {
            return loadExtractor(linkInfo.url, mediaUrl).then((extractedLinks) => extractedLinks.map((finalLink) => __spreadProps(__spreadValues({}, finalLink), { episode: linkInfo.episode }))).catch((e) => {
              console.error(`Failed to extract from ${linkInfo.url}:`, e.message);
              return [];
            });
          }
        });
        return Promise.all(promises).then((results) => {
          const allFinalLinks = [];
          results.forEach((res) => allFinalLinks.push(...res));
          const seenUrls = /* @__PURE__ */ new Set();
          const uniqueFinalLinks = allFinalLinks.filter((link) => {
            if (link.url && (link.url.includes(".zip") || link.name && link.name.toLowerCase().includes(".zip"))) {
              return false;
            }
            if (seenUrls.has(link.url)) {
              return false;
            }
            seenUrls.add(link.url);
            return true;
          });
          return { finalLinks: uniqueFinalLinks, isMovie };
        });
      }
    }
  });
}
function getTMDBDetails(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
  return fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
  }).then(function(response) {
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    return response.json();
  }).then(function(data) {
    var _a;
    const title = mediaType === "tv" ? data.name : data.title;
    const releaseDate = mediaType === "tv" ? data.first_air_date : data.release_date;
    const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
    return {
      title,
      year,
      imdbId: ((_a = data.external_ids) == null ? void 0 : _a.imdb_id) || null
    };
  });
}
function normalizeTitle(title) {
  if (!title)
    return "";
  return title.toLowerCase().replace(/\b(the|a|an)\b/g, "").replace(/[:\-_]/g, " ").replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
}
function calculateTitleSimilarity(title1, title2) {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  if (norm1 === norm2)
    return 1;
  if (norm1.includes(norm2) || norm2.includes(norm1))
    return 0.9;
  const words1 = new Set(norm1.split(/\s+/).filter((w) => w.length > 2));
  const words2 = new Set(norm2.split(/\s+/).filter((w) => w.length > 2));
  if (words1.size === 0 || words2.size === 0)
    return 0;
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = /* @__PURE__ */ new Set([...words1, ...words2]);
  return intersection.size / union.size;
}
function findBestTitleMatch(mediaInfo, searchResults, mediaType, season) {
  if (!searchResults || searchResults.length === 0)
    return null;
  let bestMatch = null;
  let bestScore = 0;
  for (const result of searchResults) {
    let score = calculateTitleSimilarity(mediaInfo.title, result.title);
    if (mediaInfo.year && result.year) {
      const yearDiff = Math.abs(mediaInfo.year - result.year);
      if (yearDiff === 0) {
        score += 0.2;
      } else if (yearDiff <= 1) {
        score += 0.1;
      } else if (yearDiff > 5) {
        score -= 0.3;
      }
    }
    if (mediaType === "tv" && season) {
      const titleLower = result.title.toLowerCase();
      const hasSeason = titleLower.includes(`season ${season}`) || titleLower.includes(`s${season}`) || titleLower.includes(`season ${season.toString().padStart(2, "0")}`);
      if (hasSeason) {
        score += 0.3;
      } else {
        score -= 0.2;
      }
    }
    if (result.title.toLowerCase().includes("2160p") || result.title.toLowerCase().includes("4k")) {
      score += 0.05;
    }
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = result;
    }
  }
  if (bestMatch) {
    console.log(`[HDHub4u] Best title match: "${bestMatch.title}" (score: ${bestScore.toFixed(2)})`);
  }
  return bestMatch;
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  console.log(`[HDHub4u] Fetching streams for TMDB ID: ${tmdbId}, Type: ${mediaType}${mediaType === "tv" ? `, S:${season}E:${episode}` : ""}`);
  return getTMDBDetails(tmdbId, mediaType).then(function(mediaInfo) {
    if (!mediaInfo.title) {
      throw new Error("Could not extract title from TMDB response");
    }
    console.log(`[HDHub4u] TMDB Info: "${mediaInfo.title}" (${mediaInfo.year || "N/A"})`);
    const searchQuery = mediaType === "tv" && season ? `${mediaInfo.title} season ${season}` : mediaInfo.title;
    console.log(`[HDHub4u] Searching for: "${searchQuery}"`);
    return search(searchQuery).then(function(searchResults) {
      if (searchResults.length === 0) {
        console.log("[HDHub4u] No search results found");
        return [];
      }
      const bestMatch = findBestTitleMatch(mediaInfo, searchResults, mediaType, season);
      const selectedMedia = bestMatch || searchResults[0];
      console.log(`[HDHub4u] Selected: "${selectedMedia.title}" (${selectedMedia.url})`);
      return getDownloadLinks(selectedMedia.url).then(function(result) {
        const { finalLinks, isMovie } = result;
        let filteredLinks = finalLinks;
        if (mediaType === "tv" && episode !== null) {
          filteredLinks = finalLinks.filter(function(link) {
            return link.episode === episode;
          });
          console.log(`[HDHub4u] Filtered to ${filteredLinks.length} links for episode ${episode}`);
        }
        const streams = filteredLinks.filter(function(link) {
          if (typeof link.quality !== "number" || link.quality === 0) {
            return false;
          }
          return true;
        }).map(function(link) {
          let mediaTitle = link.fileName && link.fileName !== "Unknown" ? link.fileName : mediaInfo.title;
          if (mediaType === "tv" && season && episode && link.episode && !link.fileName) {
            mediaTitle = `${mediaInfo.title} S${String(season).padStart(2, "0")}E${String(link.episode).padStart(2, "0")}`;
          } else if (mediaType === "tv" && season && episode && !link.fileName) {
            mediaTitle = `${mediaInfo.title} S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
          } else if (mediaInfo.year && !link.fileName) {
            mediaTitle = `${mediaInfo.title} (${mediaInfo.year})`;
          }
          const formattedSize = formatBytes(link.size);
          const serverName = extractServerName(link.source);
          let qualityStr = "Unknown";
          if (typeof link.quality === "number") {
            if (link.quality >= 2160)
              qualityStr = "4K";
            else if (link.quality >= 1440)
              qualityStr = "1440p";
            else if (link.quality >= 1080)
              qualityStr = "1080p";
            else if (link.quality >= 720)
              qualityStr = "720p";
            else if (link.quality >= 480)
              qualityStr = "480p";
            else if (link.quality >= 360)
              qualityStr = "360p";
            else
              qualityStr = "240p";
          }
          return {
            name: `HDHub4u ${serverName}`,
            title: mediaTitle,
            url: link.url,
            quality: qualityStr,
            size: formattedSize,
            headers: HEADERS,
            provider: "hdhub4u"
          };
        });
        const qualityOrder = { "4K": 4, "2160p": 4, "1440p": 3, "1080p": 2, "720p": 1, "480p": 0, "360p": -1, "Unknown": -2 };
        streams.sort(function(a, b) {
          return (qualityOrder[b.quality] || -3) - (qualityOrder[a.quality] || -3);
        });
        console.log(`[HDHub4u] Found ${streams.length} streams`);
        return streams;
      });
    });
  }).catch(function(error) {
    console.error(`[HDHub4u] Scraping error: ${error.message}`);
    return [];
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.HDHub4uScraperModule = { getStreams };
}
