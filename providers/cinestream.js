/**
 * cinestream - Built from src/cinestream/
 * Generated: 2026-01-08T10:39:21.579Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

// src/cinestream/http.js
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
  "src/cinestream/http.js"() {
    HEADERS = {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "cookie": "xla=s4t"
      // Specific cookie from VegaMovies code
    };
  }
});

// src/cinestream/extractors/vcloud.js
var require_vcloud = __commonJS({
  "src/cinestream/extractors/vcloud.js"(exports2, module2) {
    var cheerio = require("cheerio-without-node-native");
    var { fetchText: fetchText2 } = (init_http(), __toCommonJS(http_exports));
    function extractVCloud(url) {
      return __async(this, null, function* () {
        console.log(`[VCloud] Extracting: ${url}`);
        try {
          let finalUrl = url;
          let html = yield fetchText2(url);
          let $ = cheerio.load(html);
          if (url.includes("api/index.php")) {
            const redirect = $("div.main h4 a").attr("href");
            if (redirect) {
              finalUrl = redirect;
              html = yield fetchText2(finalUrl);
              $ = cheerio.load(html);
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
          const finalHtml = yield fetchText2(nextUrl);
          const $final = cheerio.load(finalHtml);
          const extractedLinks = [];
          const quality = $final("div.card-header").text().trim() || "Unknown";
          $final("div.card-body h2 a.btn").each((i, el) => {
            const link = $(el).attr("href");
            const text = $(el).text();
            console.log(`[VCloud] Found button: ${text} -> ${link}`);
            if (text.includes("FSL Server") || text.includes("Server : 1") || text.includes("Original")) {
              extractedLinks.push({
                name: "V-Cloud (Original)",
                title: text.trim(),
                url: link,
                quality
              });
            } else if (text.includes("Pixeldrain")) {
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
    module2.exports = { extractVCloud };
  }
});

// src/cinestream/providers/vegamovies.js
var require_vegamovies = __commonJS({
  "src/cinestream/providers/vegamovies.js"(exports2, module2) {
    var cheerio = require("cheerio-without-node-native");
    var { fetchText: fetchText2, fetchJson: fetchJson3 } = (init_http(), __toCommonJS(http_exports));
    var { extractVCloud } = require_vcloud();
    var URLS_JSON = "https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json";
    function getBaseUrl() {
      return __async(this, null, function* () {
        try {
          const data = yield fetchJson3(URLS_JSON);
          return data.vegamovies || "https://m.vegamovies.cricket";
        } catch (e) {
          return "https://m.vegamovies.cricket";
        }
      });
    }
    function getVegaMoviesStreams2(tmdbId, mediaType, season, episode, meta) {
      return __async(this, null, function* () {
        try {
          const baseUrl = yield getBaseUrl();
          if (!meta)
            return [];
          const title = meta.title || meta.name;
          const year = (meta.release_date || meta.first_air_date || "").substring(0, 4);
          console.log(`[CineStream:VegaMovies] Searching for: ${title} (${year})`);
          const searchUrl = `${baseUrl}/page/1/?s=${encodeURIComponent(title)}`;
          const searchHtml = yield fetchText2(searchUrl);
          const $ = cheerio.load(searchHtml);
          let targetLink = null;
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
                targetLink = itemLink;
              }
            }
          });
          if (!targetLink)
            return [];
          console.log(`[CineStream:VegaMovies] Found page: ${targetLink}`);
          const pageHtml = yield fetchText2(targetLink);
          const $page = cheerio.load(pageHtml);
          const streams = [];
          if (mediaType === "movie") {
            const downloadLinks = [];
            $page("p > a, h3 > a, h4 > a").each((i, el) => {
              const link = $(el).attr("href");
              const text = $(el).text();
              if (link && (text.includes("Download") || text.includes("V-Cloud") || text.includes("480p") || text.includes("720p") || text.includes("1080p"))) {
                if (link.startsWith("http")) {
                  downloadLinks.push({
                    text,
                    link
                  });
                }
              }
            });
            for (const item of downloadLinks) {
              try {
                const isCloud = item.link.includes("vcloud") || item.link.includes("hubcloud") || item.link.includes("cloud");
                if (isCloud) {
                  const extracted = yield extractVCloud(item.link);
                  streams.push(...extracted);
                } else {
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
                    const extracted = yield extractVCloud(cl);
                    streams.push(...extracted);
                  }
                }
              } catch (e) {
              }
            }
          }
          return streams.map((s) => __spreadProps(__spreadValues({}, s), { name: "VegaMovies" }));
        } catch (error) {
          console.error(`[VegaMovies] Error: ${error.message}`);
          return [];
        }
      });
    }
    module2.exports = { getVegaMoviesStreams: getVegaMoviesStreams2 };
  }
});

// src/cinestream/providers/moviesmod.js
var require_moviesmod = __commonJS({
  "src/cinestream/providers/moviesmod.js"(exports2, module2) {
    var cheerio = require("cheerio-without-node-native");
    var { fetchText: fetchText2, fetchJson: fetchJson3 } = (init_http(), __toCommonJS(http_exports));
    var { extractVCloud } = require_vcloud();
    var URLS_JSON = "https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json";
    function getBaseUrl() {
      return __async(this, null, function* () {
        try {
          const data = yield fetchJson3(URLS_JSON);
          return data.moviesmod || "https://moviesmod.plus";
        } catch (e) {
          return "https://moviesmod.plus";
        }
      });
    }
    function getMoviesModStreams2(tmdbId, mediaType, season, episode, meta) {
      return __async(this, null, function* () {
        try {
          const baseUrl = yield getBaseUrl();
          if (!meta)
            return [];
          const title = meta.title || meta.name;
          const year = (meta.release_date || meta.first_air_date || "").substring(0, 4);
          console.log(`[CineStream:MoviesMod] Searching for: ${title} (${year})`);
          const searchUrl = `${baseUrl}/search/${encodeURIComponent(title)}/page/1`;
          const searchHtml = yield fetchText2(searchUrl);
          const $ = cheerio.load(searchHtml);
          let targetLink = null;
          $("div.post-cards > article").each((i, el) => {
            if (targetLink)
              return;
            const itemTitle = $(el).find("a").attr("title") || "";
            const itemLink = $(el).find("a").attr("href");
            if (itemTitle.toLowerCase().includes(title.toLowerCase())) {
              if (mediaType === "movie") {
                if (itemTitle.includes(year)) {
                  targetLink = itemLink;
                }
              } else {
                targetLink = itemLink;
              }
            }
          });
          if (!targetLink)
            return [];
          const pageHtml = yield fetchText2(targetLink);
          const $page = cheerio.load(pageHtml);
          const streams = [];
          if (mediaType === "movie") {
            const downloadLinks = [];
            $page("a").each((i, el) => {
              const cls = $(el).attr("class") || "";
              const text = $(el).text() || "";
              let link = $(el).attr("href");
              if (!link)
                return;
              if (cls.includes("maxbutton-download-links") || cls.includes("maxbutton-g-drive") || cls.includes("maxbutton-af-download") || cls.includes("maxbutton") && text.toLowerCase().includes("download")) {
                if (link.includes("url=")) {
                  const base64Part = link.split("url=")[1];
                  try {
                    if (typeof atob === "function") {
                      link = atob(base64Part);
                    } else {
                      link = Buffer.from(base64Part, "base64").toString("utf-8");
                    }
                  } catch (e) {
                  }
                }
                if (link.startsWith("http")) {
                  downloadLinks.push({
                    text: text.trim() || "Download",
                    link
                  });
                }
              }
            });
            for (const item of downloadLinks) {
              try {
                const prePageHtml = yield fetchText2(item.link);
                const $pre = cheerio.load(prePageHtml);
                const cloudLinks = [];
                $pre("a").each((j, el2) => {
                  const sourceLink = $pre(el2).attr("href");
                  const sourceText = $pre(el2).text() || "";
                  if (sourceLink && (sourceText.includes("V-Cloud") || sourceText.includes("Download") || sourceLink.includes("vcloud") || sourceLink.includes("hubcloud") || sourceLink.includes("links.modpro.blog"))) {
                    cloudLinks.push(sourceLink);
                  }
                });
                for (const cl of cloudLinks) {
                  if (cl.includes("vcloud") || cl.includes("hubcloud")) {
                    const extracted = yield extractVCloud(cl);
                    streams.push(...extracted);
                  } else if (cl.endsWith(".mp4") || cl.endsWith(".mkv")) {
                    streams.push({
                      name: "MoviesMod (Direct)",
                      title: item.text.trim(),
                      url: cl,
                      quality: item.text
                    });
                  }
                }
              } catch (e) {
              }
            }
          }
          return streams.map((s) => __spreadProps(__spreadValues({}, s), { name: "MoviesMod" }));
        } catch (error) {
          console.error(`[MoviesMod] Error: ${error.message}`);
          return [];
        }
      });
    }
    module2.exports = { getMoviesModStreams: getMoviesModStreams2 };
  }
});

// src/cinestream/providers/uhdmovies.js
var require_uhdmovies = __commonJS({
  "src/cinestream/providers/uhdmovies.js"(exports2, module2) {
    var cheerio = require("cheerio-without-node-native");
    var { fetchText: fetchText2, fetchJson: fetchJson3 } = (init_http(), __toCommonJS(http_exports));
    var { extractVCloud } = require_vcloud();
    var URLS_JSON = "https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json";
    function getBaseUrl() {
      return __async(this, null, function* () {
        try {
          const data = yield fetchJson3(URLS_JSON);
          return data.uhdmovies || "https://uhdmovies.fun";
        } catch (e) {
          return "https://uhdmovies.fun";
        }
      });
    }
    function getUHDMoviesStreams2(tmdbId, mediaType, season, episode, meta) {
      return __async(this, null, function* () {
        try {
          const baseUrl = yield getBaseUrl();
          if (!meta)
            return [];
          const title = meta.title || meta.name;
          const year = (meta.release_date || meta.first_air_date || "").substring(0, 4);
          console.log(`[CineStream:UHDMovies] Searching for: ${title} (${year})`);
          const searchUrl = `${baseUrl}/search/${encodeURIComponent(title + " " + year)}`;
          const searchHtml = yield fetchText2(searchUrl);
          const $ = cheerio.load(searchHtml);
          let targetLink = $("article div.entry-image a").first().attr("href");
          if (!targetLink) {
            const searchUrl2 = `${baseUrl}/search/${encodeURIComponent(title)}`;
            const searchHtml2 = yield fetchText2(searchUrl2);
            const $2 = cheerio.load(searchHtml2);
            targetLink = $2("article div.entry-image a").first().attr("href");
          }
          if (!targetLink)
            return [];
          console.log(`[CineStream:UHDMovies] Found page: ${targetLink}`);
          const pageHtml = yield fetchText2(targetLink);
          const $page = cheerio.load(pageHtml);
          const streams = [];
          if (mediaType === "movie") {
            const downloadLinks = [];
            $page("div.entry-content a").each((i, el) => {
              const text = $(el).text();
              let link = $(el).attr("href");
              if (text.includes("Download") || text.includes("480p") || text.includes("720p") || text.includes("1080p") || text.includes("2160p")) {
                if (link) {
                  if (link.includes("href.li")) {
                    link = link.substring(link.indexOf("?") + 1);
                  }
                  downloadLinks.push({
                    text,
                    link
                  });
                }
              }
            });
            for (const item of downloadLinks) {
              try {
                if (item.link.includes("vcloud") || item.link.includes("hubcloud")) {
                  const extracted = yield extractVCloud(item.link);
                  streams.push(...extracted);
                } else if (item.link.endsWith(".mp4") || item.link.endsWith(".mkv")) {
                  streams.push({
                    name: "UHDMovies (Direct)",
                    title: item.text.trim(),
                    url: item.link,
                    quality: item.text
                  });
                }
              } catch (e) {
              }
            }
          }
          return streams.map((s) => __spreadProps(__spreadValues({}, s), { name: "UHDMovies" }));
        } catch (error) {
          console.error(`[UHDMovies] Error: ${error.message}`);
          return [];
        }
      });
    }
    module2.exports = { getUHDMoviesStreams: getUHDMoviesStreams2 };
  }
});

// src/cinestream/index.js
var { fetchJson: fetchJson2 } = (init_http(), __toCommonJS(http_exports));
var { getVegaMoviesStreams } = require_vegamovies();
var { getMoviesModStreams } = require_moviesmod();
var { getUHDMoviesStreams } = require_uhdmovies();
var TMDB_API_KEY = "1a7373301961d03f97f853a876dd1212";
function getMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}`;
      return yield fetchJson2(url);
    } catch (e) {
      console.error("[CineStream] Failed to fetch metadata", e);
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[CineStream] Request: ${mediaType} ${tmdbId}`);
      const meta = yield getMetadata(tmdbId, mediaType);
      if (!meta) {
        console.error("[CineStream] Metadata not found, aborting.");
        return [];
      }
      const results = yield Promise.allSettled([
        getVegaMoviesStreams(tmdbId, mediaType, season, episode, meta),
        getMoviesModStreams(tmdbId, mediaType, season, episode, meta),
        getUHDMoviesStreams(tmdbId, mediaType, season, episode, meta)
      ]);
      const streams = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          streams.push(...result.value);
        } else {
          console.error(`[CineStream] Provider ${index} failed:`, result.reason);
        }
      });
      console.log(`[CineStream] Total streams found: ${streams.length}`);
      return streams;
    } catch (error) {
      console.error(`[CineStream] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
