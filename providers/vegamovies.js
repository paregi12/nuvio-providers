/**
 * vegamovies - Built from src/vegamovies/
 * Generated: 2026-01-08T12:56:11.093Z
 */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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

// src/vegamovies/http.js
var http_exports = {};
__export(http_exports, {
  HEADERS: () => HEADERS,
  fetchJson: () => fetchJson,
  fetchText: () => fetchText
});
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    console.log(`[VegaMovies] Fetching: ${url}`);
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
    return JSON.parse(raw);
  });
}
var HEADERS;
var init_http = __esm({
  "src/vegamovies/http.js"() {
    HEADERS = {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "cookie": "xla=s4t"
      // Specific cookie from VegaMovies code
    };
  }
});

// src/vegamovies/extractor.js
var require_extractor = __commonJS({
  "src/vegamovies/extractor.js"(exports2, module2) {
    var cheerio2 = require("cheerio-without-node-native");
    var { fetchText: fetchText3 } = (init_http(), __toCommonJS(http_exports));
    function extractVCloud2(url) {
      return __async(this, null, function* () {
        console.log(`[VCloud] Extracting: ${url}`);
        try {
          let finalUrl = url;
          let html = yield fetchText3(url);
          let $ = cheerio2.load(html);
          if (url.includes("api/index.php")) {
            const redirect = $("div.main h4 a").attr("href");
            if (redirect) {
              finalUrl = redirect;
              html = yield fetchText3(finalUrl);
              $ = cheerio2.load(html);
            }
          }
          const scriptContent = $('script:contains("var url =")').html();
          let nextUrl = null;
          if (scriptContent) {
            const match = scriptContent.match(/var url = '([^']+)'/);
            if (match) {
              nextUrl = match[1];
            }
          }
          if (!nextUrl) {
            console.log("[VCloud] Could not find redirect URL in script.");
            return [];
          }
          console.log(`[VCloud] Following redirect: ${nextUrl}`);
          const finalHtml = yield fetchText3(nextUrl);
          const $final = cheerio2.load(finalHtml);
          const extractedLinks = [];
          const quality = $final("div.card-header").text().trim() || "Unknown";
          $final("div.card-body h2 a.btn").each((i, el) => {
            const link = $(el).attr("href");
            const text = $(el).text();
            console.log(`[VCloud] Found button: ${text} -> ${link}`);
            const lowerText = text.toLowerCase();
            if (lowerText.includes("fsl") || lowerText.includes("server") || lowerText.includes("original") || lowerText.includes("cloud")) {
              extractedLinks.push({
                name: "V-Cloud",
                title: text.trim(),
                url: link,
                quality
              });
            } else if (lowerText.includes("pixeldrain")) {
              extractedLinks.push({
                name: "Pixeldrain",
                title: text.trim(),
                url: link,
                quality
              });
            } else if (link.endsWith(".mkv") || link.endsWith(".mp4")) {
              extractedLinks.push({
                name: "Direct",
                title: text.trim(),
                url: link,
                quality
              });
            }
          });
          return extractedLinks;
        } catch (e) {
          console.error(`[VCloud] Error: ${e.message}`);
          return [];
        }
      });
    }
    module2.exports = { extractVCloud: extractVCloud2 };
  }
});

// src/vegamovies/index.js
var cheerio = require("cheerio-without-node-native");
var { fetchText: fetchText2, fetchJson: fetchJson2 } = (init_http(), __toCommonJS(http_exports));
var { extractVCloud } = require_extractor();
var URLS_JSON = "https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json";
var TMDB_API_KEY = "1a7373301961d03f97f853a876dd1212";
function getBaseUrl() {
  return __async(this, null, function* () {
    try {
      const data = yield fetchJson2(URLS_JSON);
      return data.vegamovies || "https://m.vegamovies.cricket";
    } catch (e) {
      console.error("[VegaMovies] Failed to fetch base URL, using default.", e);
      return "https://m.vegamovies.cricket";
    }
  });
}
function getMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      return yield fetchJson2(url);
    } catch (e) {
      console.error("[VegaMovies] Failed to fetch metadata", e);
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const baseUrl = yield getBaseUrl();
      const meta = yield getMetadata(tmdbId, mediaType);
      if (!meta)
        return [];
      const title = meta.title || meta.name;
      const year = (meta.release_date || meta.first_air_date || "").substring(0, 4);
      console.log(`[VegaMovies] Searching for: ${title} (${year})`);
      let searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title + " Season " + season)}`;
      let searchHtml = yield fetchText2(searchUrl);
      let $ = cheerio.load(searchHtml);
      let targetLink = null;
      let bestMatch = null;
      $("article.entry").each((i, el) => {
        const itemTitle = $(el).find("h2 > a").text() || "";
        const itemLink = $(el).find("a").attr("href");
        const lowerTitle = itemTitle.toLowerCase();
        const lowerQuery = title.toLowerCase();
        if (lowerTitle.includes(lowerQuery)) {
          if (mediaType !== "movie") {
            const seasonStr = `season ${season}`;
            const s0SeasonStr = `season 0${season}`;
            const sStr = `s${season}`;
            if (lowerTitle.includes(seasonStr) || lowerTitle.includes(s0SeasonStr)) {
              if (!bestMatch || !bestMatch.title.includes(seasonStr) && !bestMatch.title.includes(s0SeasonStr)) {
                bestMatch = { link: itemLink, title: lowerTitle, priority: 10 };
              }
            } else if (lowerTitle.includes("series") || lowerTitle.includes("complete")) {
              if (!bestMatch || bestMatch.priority < 5) {
                bestMatch = { link: itemLink, title: lowerTitle, priority: 5 };
              }
            }
          } else {
            if (year && lowerTitle.includes(year)) {
              bestMatch = { link: itemLink, title: lowerTitle, priority: 10 };
            } else if (!bestMatch) {
              bestMatch = { link: itemLink, title: lowerTitle, priority: 1 };
            }
          }
        }
      });
      if (bestMatch)
        targetLink = bestMatch.link;
      if (!targetLink) {
        console.log(`[VegaMovies] Strict search failed, trying general search...`);
        searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title)}`;
        searchHtml = yield fetchText2(searchUrl);
        $ = cheerio.load(searchHtml);
        $("article.entry").each((i, el) => {
          if (targetLink)
            return;
          const itemTitle = $(el).find("h2 > a").text() || "";
          const itemLink = $(el).find("a").attr("href");
          if (itemTitle.toLowerCase().includes(title.toLowerCase())) {
            if (mediaType === "movie") {
              if (itemTitle.includes(year)) {
                targetLink = itemLink;
              }
            } else {
              if (itemTitle.toLowerCase().includes(`season ${season}`) || itemTitle.toLowerCase().includes(`season 0${season}`)) {
                targetLink = itemLink;
              }
            }
          }
        });
      }
      if (!targetLink) {
        console.log("[VegaMovies] No results found.");
        return [];
      }
      console.log(`[VegaMovies] Found page: ${targetLink}`);
      const pageHtml = yield fetchText2(targetLink);
      const $page = cheerio.load(pageHtml);
      const streams = [];
      if (mediaType === "movie") {
        const downloadLinks = [];
        $page("p > a, h3 > a, h4 > a").each((i, el) => {
          const link = $(el).attr("href");
          const text = $(el).text();
          if (link && (text.includes("Download") || text.includes("V-Cloud") || text.includes("480p") || text.includes("720p") || text.includes("1080p"))) {
            console.log(`[VegaMovies] Found candidate: ${text.trim()} -> ${link}`);
            if (link.startsWith("http")) {
              downloadLinks.push({
                text,
                link
              });
            }
          }
        });
        console.log(`[VegaMovies] Found ${downloadLinks.length} potential links.`);
        for (const item of downloadLinks) {
          try {
            const isCloud = item.link.includes("vcloud") || item.link.includes("hubcloud") || item.link.includes("cloud");
            if (isCloud) {
              const extracted = yield extractVCloud(item.link);
              streams.push(...extracted);
            } else {
              console.log(`[VegaMovies] Visiting intermediate: ${item.link}`);
              const interHtml = yield fetchText2(item.link);
              const $inter = cheerio.load(interHtml);
              const cloudLinks = [];
              $inter("a").each((j, el2) => {
                const sourceLink = $inter(el2).attr("href");
                const sourceText = $inter(el2).text() || "";
                if (sourceLink && (sourceText.includes("V-Cloud") || sourceLink.includes("vcloud") || sourceLink.includes("hubcloud"))) {
                  cloudLinks.push(sourceLink);
                }
              });
              for (const cl of cloudLinks) {
                console.log(`[VegaMovies] Found Cloud link: ${cl}`);
                const extracted = yield extractVCloud(cl);
                streams.push(...extracted);
              }
            }
          } catch (e) {
          }
        }
      } else {
        console.log(`[VegaMovies] Processing TV Series: S${season} E${episode}`);
        const seasonHeaders = $page("h3, h4, h5").filter((i, el) => {
          const text = $(el).text();
          if (text.includes("Zip"))
            return false;
          return text.toLowerCase().includes(`season ${season}`) || text.toLowerCase().includes(`season 0${season}`);
        });
        console.log(`[VegaMovies] Found ${seasonHeaders.length} season headers.`);
        const candidateLinks = [];
        seasonHeaders.each((i, header) => {
          let nextNode = $(header).next();
          let attempts = 0;
          while (nextNode.length && attempts < 5) {
            if (nextNode.is("h3, h4, h5"))
              break;
            const links = nextNode.find("a");
            links.each((j, link) => {
              const href = $(link).attr("href");
              const text = $(link).text();
              if (href && (text.includes("V-Cloud") || text.includes("Episode") || text.includes("Download"))) {
                candidateLinks.push({ text, link: href });
              }
            });
            nextNode = nextNode.next();
            attempts++;
          }
        });
        console.log(`[VegaMovies] Found ${candidateLinks.length} candidate intermediate pages.`);
        for (const item of candidateLinks) {
          try {
            console.log(`[VegaMovies] Visiting intermediate: ${item.link}`);
            const interHtml = yield fetchText2(item.link);
            const $inter = cheerio.load(interHtml);
            const vcloudLinks = [];
            $inter("p > a").each((j, el) => {
              const href = $(el).attr("href");
              if (href && (href.includes("vcloud") || href.includes("hubcloud"))) {
                vcloudLinks.push(href);
              }
            });
            console.log(`[VegaMovies] Found ${vcloudLinks.length} V-Cloud links on page.`);
            const targetIndex = episode - 1;
            if (targetIndex >= 0 && targetIndex < vcloudLinks.length) {
              const targetUrl = vcloudLinks[targetIndex];
              console.log(`[VegaMovies] Found match for Episode ${episode} at index ${targetIndex}: ${targetUrl}`);
              const extracted = yield extractVCloud(targetUrl);
              streams.push(...extracted);
            } else {
              console.log(`[VegaMovies] No link found for Episode ${episode} (Index ${targetIndex}) in this list.`);
            }
          } catch (e) {
            console.error(`[VegaMovies] Error processing TV link: ${e.message}`);
          }
        }
      }
      return streams;
    } catch (error) {
      console.error(`[VegaMovies] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
