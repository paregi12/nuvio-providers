/**
 * vegamovies - Built from src/vegamovies/
 * Generated: 2026-01-08T14:57:54.672Z
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

// src/vegamovies/index.js
var import_cheerio_without_node_native3 = __toESM(require("cheerio-without-node-native"));

// src/vegamovies/constants.js
var TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
var BASE_URL = "https://vegamovies.gt";
var USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

// src/vegamovies/http.js
var HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "cookie": "xla=s4t"
};
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

// src/vegamovies/tmdb.js
function getMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const isSeries = mediaType === "series" || mediaType === "tv";
    const endpoint = isSeries ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    console.log(`[VegaMovies] Fetching TMDB details from: ${url}`);
    try {
      const data = yield fetchJson(url);
      if (isSeries) {
        return {
          title: data.name,
          year: data.first_air_date ? data.first_air_date.split("-")[0] : ""
        };
      } else {
        return {
          title: data.title,
          year: data.release_date ? data.release_date.split("-")[0] : ""
        };
      }
    } catch (e) {
      console.error("[VegaMovies] Failed to fetch metadata", e);
      return null;
    }
  });
}

// src/vegamovies/search.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
function searchProvider(title, year, mediaType, season) {
  return __async(this, null, function* () {
    let query = mediaType === "movie" ? `${title} ${year}` : `${title} Season ${season}`;
    let searchUrl = `${BASE_URL}/page/1/?s=${encodeURIComponent(query)}`;
    let searchHtml = yield fetchText(searchUrl);
    let $ = import_cheerio_without_node_native.default.load(searchHtml);
    let targetLink = findMatch($, title, year, mediaType, season);
    if (!targetLink) {
      console.log(`[VegaMovies] Strict search failed, trying general search...`);
      searchUrl = `${BASE_URL}/page/1/?s=${encodeURIComponent(title)}`;
      searchHtml = yield fetchText(searchUrl);
      $ = import_cheerio_without_node_native.default.load(searchHtml);
      targetLink = findMatch($, title, year, mediaType, season);
    }
    return targetLink;
  });
}
function findMatch($, title, year, mediaType, season) {
  let bestMatch = null;
  const lowerQuery = title.toLowerCase();
  $("article.entry").each((i, el) => {
    const itemTitle = $(el).find("h2 > a").text() || "";
    const itemLink = $(el).find("a").attr("href");
    const lowerTitle = itemTitle.toLowerCase();
    if (lowerTitle.includes(lowerQuery)) {
      if (mediaType !== "movie") {
        const seasonStr = `season ${season}`;
        const s0SeasonStr = `season 0${season}`;
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
  return bestMatch == null ? void 0 : bestMatch.link;
}

// src/vegamovies/extractor.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));
function extractVCloud(url) {
  return __async(this, null, function* () {
    console.log(`[VCloud] Extracting: ${url}`);
    try {
      let finalUrl = url;
      let html = yield fetchText(url);
      let $ = import_cheerio_without_node_native2.default.load(html);
      if (url.includes("api/index.php")) {
        const redirect = $("div.main h4 a").attr("href");
        if (redirect) {
          finalUrl = redirect;
          html = yield fetchText(finalUrl);
          $ = import_cheerio_without_node_native2.default.load(html);
        }
      }
      const scriptContent = $('script:contains("var url =")').html();
      let nextUrl = null;
      if (scriptContent) {
        const match = scriptContent.match(/var url = '([^']+)'/);
        if (match)
          nextUrl = match[1];
      }
      if (!nextUrl) {
        console.log("[VCloud] Could not find redirect URL in script.");
        return [];
      }
      console.log(`[VCloud] Following redirect: ${nextUrl}`);
      const finalHtml = yield fetchText(nextUrl);
      const $final = import_cheerio_without_node_native2.default.load(finalHtml);
      const extractedLinks = [];
      const quality = $final("div.card-header").text().trim() || "Unknown";
      $final("div.card-body h2 a.btn").each((i, el) => {
        const link = $(el).attr("href");
        const text = $(el).text();
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

// src/vegamovies/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const meta = yield getMetadata(tmdbId, mediaType);
      if (!meta)
        return [];
      const { title, year } = meta;
      console.log(`[VegaMovies] Request: ${title} (${year}) S${season}E${episode}`);
      const targetLink = yield searchProvider(title, year, mediaType, season);
      if (!targetLink) {
        console.log("[VegaMovies] No results found on provider site.");
        return [];
      }
      console.log(`[VegaMovies] Found page: ${targetLink}`);
      const pageHtml = yield fetchText(targetLink);
      const $page = import_cheerio_without_node_native3.default.load(pageHtml);
      const streams = [];
      if (mediaType === "movie") {
        const downloadLinks = [];
        $page("p > a, h3 > a, h4 > a").each((i, el) => {
          const link = $page(el).attr("href");
          const text = $page(el).text();
          if (link && (text.includes("Download") || text.includes("V-Cloud") || text.includes("480p") || text.includes("720p") || text.includes("1080p"))) {
            if (link.startsWith("http")) {
              downloadLinks.push({ text, link });
            }
          }
        });
        for (const item of downloadLinks) {
          try {
            if (item.link.includes("vcloud") || item.link.includes("hubcloud")) {
              const extracted = yield extractVCloud(item.link);
              streams.push(...extracted);
            } else {
              const interHtml = yield fetchText(item.link);
              const $inter = import_cheerio_without_node_native3.default.load(interHtml);
              const cloudLinks = [];
              $inter("a").each((j, el2) => {
                const sourceLink = $inter(el2).attr("href");
                const sourceText = $inter(el2).text() || "";
                if (sourceLink && (sourceText.includes("V-Cloud") || sourceLink.includes("vcloud") || sourceLink.includes("hubcloud"))) {
                  cloudLinks.push(sourceLink);
                }
              });
              for (const cl of cloudLinks) {
                const extracted = yield extractVCloud(cl);
                streams.push(...extracted);
              }
            }
          } catch (e) {
          }
        }
      } else {
        const seasonHeaders = $page("h3, h4, h5").filter((i, el) => {
          const text = $page(el).text();
          if (text.includes("Zip"))
            return false;
          return text.toLowerCase().includes(`season ${season}`) || text.toLowerCase().includes(`season 0${season}`);
        });
        const candidateLinks = [];
        seasonHeaders.each((i, header) => {
          let nextNode = $page(header).next();
          let attempts = 0;
          while (nextNode.length && attempts < 5) {
            if (nextNode.is("h3, h4, h5"))
              break;
            const links = nextNode.find("a");
            links.each((j, link) => {
              const href = $page(link).attr("href");
              const text = $page(link).text();
              if (href && (text.includes("V-Cloud") || text.includes("Episode") || text.includes("Download"))) {
                candidateLinks.push({ text, link: href });
              }
            });
            nextNode = nextNode.next();
            attempts++;
          }
        });
        for (const item of candidateLinks) {
          try {
            const interHtml = yield fetchText(item.link);
            const $inter = import_cheerio_without_node_native3.default.load(interHtml);
            const vcloudLinks = [];
            $inter("p > a").each((j, el) => {
              const href = $inter(el).attr("href");
              if (href && (href.includes("vcloud") || href.includes("hubcloud"))) {
                vcloudLinks.push(href);
              }
            });
            const targetIndex = episode - 1;
            if (targetIndex >= 0 && targetIndex < vcloudLinks.length) {
              const extracted = yield extractVCloud(vcloudLinks[targetIndex]);
              streams.push(...extracted);
            }
          } catch (e) {
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
