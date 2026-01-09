import axios from 'axios';
import CryptoJS from 'crypto-js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const kumiStrings = [
  "getTime",
  "--media-slider-track-progress-bg",
  "prev-slide-1",
  "join",
  "zIndex",
  "cfStream",
  "resume-dialog",
  "CONTENT_PAUSE_REQUESTED",
  "codePointAt",
  "--media-tooltip-font-size",
  "tagName",
  "ima",
  ".vds-airplay-tooltip.vds-tooltip",
  "cfExpire",
  "error",
  "Getting download link...",
  "encrypt",
  "Watch",
  "poster",
  "getAdsManager",
  "max-width: ",
  "mouseout",
  "defaultAudio",
  "touchend",
  "AdsRequest",
  "aria-pressed",
  "source",
  "z-index: 2",
  "click",
  "Resume",
  "menuSection",
  "shadow-box",
  "right",
  "appendChild",
  "--media-slider-track-bg",
  "position: absolute; right: calc(50% - ",
  "--media-tooltip-font-weight",
  "&reportCurrentTime=1",
  "AD_ERROR",
  "Ready",
  "htmlContainer",
  "floor",
  "init",
  "abs",
  "cover",
  "trim",
  "--media-time-color",
  "media-tooltip-trigger",
  "null",
  "media-tooltip",
  "backgroundColor",
  "ttdata",
  "reload",
  "adTagUrl",
  "restrictCountry",
  "setItem",
  "raw",
  "Download is unavailable",
  "logo",
  "insertBefore",
  "<div class=\"dot-pulse\"></div>",
  "Sorry, this video is not available",
  ".resume-dialog-accept",
  "resumeRejectButton",
  "iframe",
  "screen",
  "ready",
  "stringify",
  "autoAlign",
  "Opss! Sandboxed our player is not allowed",
  "subtitle",
  "iframeApi",
  "adBlock",
  "ttStream",
  "&r=",
  "&api=",
  "duration-resolution",
  "searchParams",
  "querySelector",
  "px; height: min-content; position: absolute; border: 0px; overflow: hidden;",
  "selected",
  "CLICK",
  "adId",
  "--media-resumable-reject-button",
  "visibilitychange",
  "sliderLoadColor",
  "http",
  "Media source is not playable",
  "paused",
  "&folder=",
  "prev-slide-2",
  "direct://",
  "tiktok",
  "846862YgRHAn",
  "height",
  "textTracks",
  "aria-label",
  "Please use a modern browser to download this video",
  "414110dJZDji",
  "direct",
  "6532057yKbkHm",
  "postMessage",
  "AES-CBC",
  "replaceChild",
  "isSmallLayout",
  "applyDynamicConfig",
  "previousElementSibling",
  "media-video-layout",
  "resumePlayback",
  "platform",
  "Verifying human...",
  "substring",
  "allowDownload",
  "div",
  "Text",
  "observe",
  "subtle",
  "ipp",
  "sendBeacon",
  "black",
  "volume",
  "url(\"",
  "next-slide-1",
  "--media-resumable-text-color",
  "1217355btiHyy",
  " to download this video",
  "media-toggle-button",
  "_blank",
  "maxWidth",
  "unshift",
  "mode",
  "downloader-button-container",
  "startsWith",
  "removeEventListener",
  "hls",
  "5001800LIZocH",
  "no-download",
  "--video-font-family",
  "adsResponse",
  "player",
  "parentNode",
  "<div class=\"toast\">",
  "pop",
  "translations",
  "subtitleFontSize",
  "custom",
  "",
  "<span></span>",
  "httpStream",
  "translation",
  "metric",
  "keys",
  "--media-menu-top-bar-bg",
  "text",
  "vds-tooltip",
  "startLoadingPoster",
  "play",
  "injectMixin",
  "--media-time-font-weight",
  "&dl=1",
  "top",
  "--media-tooltip-bg-color",
  "Unknown error",
  "now",
  "fromCodePoint",
  "DIV",
  "Onclick Ads",
  "button",
  "menuSecondary",
  "STARTED",
  "preload.m3u8",
  "linearAdSlotHeight",
  "bottom",
  "You were watching this video at {{TIME}}. Do you want to resume?",
  "parent",
  "100%",
  "offsetHeight",
  "resumeAcceptButton",
  "tooltipColor",
  "Push Ads",
  "tooltipFontWeight",
  "classList",
  "firstChild",
  "hidden",
  "p2pStream",
  "length",
  "--media-cue-font-weight",
  "Watch Online",
  "some",
  "",
  "is-hidden",
  "currentTime",
  "config",
  "playlist-container",
  "default_audio",
  "disabled",
  "thumbnails",
  "backgroundImage",
  "transform",
  "/api/v1/info?id=",
  "pause",
  "padStart",
  "downloader-button",
  "attributes",
  "translateX(",
  "restoreCustomPlaybackStateOnAdBreakComplete",
  "</p>",
  "subtitles",
  "margin: 0px; padding: 0px; display: flex; justify-content: center; align-items: flex-end; height: 100%;",
  "--media-tooltip-color",
  "type",
  "duration",
  "impression",
  "downloadLink",
  "getAttribute",
  "getItem",
  "children",
  "70px",
  "player-loading",
  "object",
  "match",
  "timeColor",
  "span",
  "closed",
  "clientX",
  "Sorry download is not available for this video",
  "Sorry there is no download link for this video",
  "Type",
  "",
  "map",
  "name",
  "from",
  "quality-change",
  "label",
  "decode",
  "cloudflare",
  "contentDocument",
  "margin-top: 8px;",
  "allowAdblock",
  "px); top: -20px; color: white; cursor: pointer; z-index: 5; background-color: black; padding: 0px 6px; border-radius: 4px;",
  "vds-tooltip-content",
  "title",
  "webdriver",
  "sliderTimeBackground",
  "userAgent",
  "1799632semJsk",
  "library",
  "Failed to setup player, please try again later.",
  "slice",
  "2324214ueCxcO",
  "src",
  "subtitleColor",
  "showing",
  "sliderTimeColor",
  "data-id",
  "ancestorOrigins",
  "onload",
  "media-player",
  "Banner Ads",
  "p2pEngine",
  "",
  "resume:",
  "parentElement",
  "menuTopBar",
  "application/x-mpegurl",
  "hls-error",
  "subtitleFontWeight",
  "https://imasdk.googleapis.com/js/sdkloader/ima3.js",
  "qualities",
  "/cf-master.",
  "setAttribute",
  "is-shown",
  "bytesLength",
  "target",
  "stop",
  "allowExternal",
  "assign",
  "player-button",
  "ttDomain",
  "placement",
  "initialize",
  "isLinear",
  "visitorCountry",
  "NORMAL",
  "crypto",
  "6ePIkbe",
  "detail",
  "getAd",
  "preload",
  "add",
  ".vds-menu-button.vds-button",
  "&w=",
  "ADS_MANAGER_LOADED",
  "show",
  "resumeTextColor",
  "ViewMode",
  ".vds-download-button.vds-button",
  "body",
  "content",
  "time-update",
  "getHeight",
  "download",
  "display",
  "left: 0; bottom: 70px; z-index: 5; width: 100%; max-height: ",
  "set",
  "pointerdown",
  "media-provider",
  "sandboxed",
  "cfDomain",
  "current-slide",
  "</div>",
  "ads",
  "thumbnail",
  "FULLSCREEN",
  "CONTENT_RESUME_REQUESTED",
  "preventDefault",
  "reverse",
  "languages",
  "getElementById",
  "playlist-items",
  "onClick",
  "asset",
  "vds-playlist-tooltip",
  "country",
  "provider-setup",
  "&h=",
  "browser",
  "loadVideoTimeout",
  "defaultSubtitle",
  "subtitleBackground",
  "forEach",
  "resize",
  "sandbox",
  "--media-menu-text-color",
  ":root",
  "true",
  "url",
  "No videoId found",
  "adsLoader",
  "provider-change",
  "189GwYcgZ",
  "started",
  "Opss! Headless Browser is not allowed",
  "nonLinearAdSlotWidth",
  "coder",
  "setVolume",
  "startLoading",
  "Playlist",
  "split",
  "decrypt",
  "nextElementSibling",
  "Switch quality",
  "/api/v1/log?t=",
  "block",
  "blur",
  "linearAdSlotWidth",
  "banner",
  "randomUUID",
  "pickSubtitle",
  "Sandbox Detected",
  "audioTracks",
  "then",
  "Vast Tag",
  "Please go to ",
  "slot",
  "message",
  "className",
  "Video is not ready yet",
  "data",
  "Adblock Detected",
  "/tt/master.",
  "style",
  "img",
  ".current-slide",
  "background-color: #03A9F4; cursor: pointer; pointer-events: auto;",
  "video",
  "pointermove",
  "hash",
  "getWidth",
  "superPlayer",
  "AdsManagerLoadedEvent",
  "--media-menu-section-bg",
  "inhouse",
  "timeFontSize",
  "addEventListener",
  "AdDisplayContainer",
  "toString",
  "fragLoadError",
  "AD_ATTRIBUTION",
  "position",
  "tooltipBackground",
  "vds-quality-button",
  "Please use a modern browser to watch this video",
  "findIndex",
  "replace",
  "menuPrimary",
  "playerAds",
  "menuBackground",
  "format",
  "removeItem",
  "<p style=\"font-size: 28px\">",
  "Close Ad",
  "protocol",
  "innerHTML",
  "destroy",
  "restrictEmbed",
  "www.",
  "AdEvent",
  "position: absolute; right: calc(50% - 40px); top: 0px; color: white; cursor: pointer; z-index: 5; background-color: black; padding: 0px 6px; border-radius: 4px; display: none",
  "tooltipFontSize",
  "requestAds",
  "UiElements",
  "width",
  "--media-menu-text-secondary-color",
  "vds-button",
  "AdsRenderingSettings",
  "fontFamily",
  "branding",
  "downloadSource",
  "onclick",
  "open",
  "--video-controls-color",
  "downloader-toast-container",
  "media-tooltip-content",
  "requestPointerLock",
  "innerWidth",
  "href",
  "textContent",
  "navigator",
  "offsetWidth",
  "setProperty",
  "--media-time-font-size",
  "toISOString",
  "createElement",
  "language",
  "player-loading-text",
  "controlbarTitle",
  "test",
  "location",
  "/api/v1/folder?id=",
  "referrerPolicy",
  "ALL_ADS_COMPLETED",
  "--video-brand",
  "fullscreen-change",
  "shift",
  "Start from beginning",
  "startTime",
  "Please disable AdBlock to watch this video",
  "userId",
  "includes",
  "displayContainer",
  ".resume-dialog-abort",
  "mp4",
  "origin",
  "domain",
  "playing",
  "sliderTrackColor",
  "https://",
  "innerHeight",
  "script",
  "document",
  "start",
  "Show playlist",
  "value",
  "&poster=",
  "referrer",
  "contains",
  "{{videoId}}",
  "Download",
  "getStatus",
  "hls-unsupported",
  "timeFontWeight",
  "remove",
  "auto",
  "px; width: min-content; max-height: 100%; height: min-content; position: relative; overflow: hidden; cursor: pointer;",
  "parse",
  "",
  "left",
  "width: 100%; height: 100%; z-index: 2; overflow: hidden;",
  "mute",
  "uiElements",
  "hostname",
  "iconColor"
];

function he(n) {
    return kumiStrings[n - 414];
}

const g = (...m) => String.fromCharCode(...m);
const x = (m, T) => (m && m.codePointAt(T)) || 0;

// Helper to resolve Zen values
function resolveValue(idx, dataArray, visited = new Set()) {
    if (visited.has(idx)) return null;
    visited.add(idx);

    const val = dataArray[idx];
    if (typeof val === 'number') {
        if (dataArray[val] !== undefined) return resolveValue(val, dataArray, visited);
        return val;
    }
    if (Array.isArray(val)) return val.map(i => typeof i === 'number' ? resolveValue(i, dataArray, new Set(visited)) : i);
    if (val && typeof val === 'object') {
        const obj = {};
        for (const [k, v] of Object.entries(val)) {
            obj[k] = typeof v === 'number' ? resolveValue(v, dataArray, new Set(visited)) : v;
        }
        return obj;
    }
    return val;
}

function findKeyInObj(obj, key) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj[key]) return obj[key];
    for (const k in obj) {
        const res = findKeyInObj(obj[k], key);
        if (res) return res;
    }
    return null;
}

// --- Zen Extractor ---
async function getZenStream(embedUrl) {
    try {
        const urlObj = new URL(embedUrl);
        const dataUrl = `${urlObj.origin}${urlObj.pathname.replace(/\/e\//, '/e/')}/__data.json${urlObj.search}`;
        
        const response = await axios.get(dataUrl, {
            headers: {
                'Referer': 'https://kuudere.ru/',
                'User-Agent': USER_AGENT
            }
        });
        const data = response.data;

        const node = data.nodes.find(n => n && n.data && n.data.some(item => item && item.obfuscation_seed));
        if (!node) return null;

        const dataArray = node.data;
        const metaIdx = dataArray.findIndex(item => item && item.obfuscation_seed);
        const meta = dataArray[metaIdx];
        const seed = dataArray[meta.obfuscation_seed];
        
        const hash = CryptoJS.SHA256(seed).toString();
        const fields = {
            keyField: `kf_${hash.substring(8, 16)}`,
            ivField: `ivf_${hash.substring(16, 24)}`,
            tokenField: `${hash.substring(48, 64)}_${hash.substring(56, 64)}`
        };

        const resolvedMeta = resolveValue(metaIdx, dataArray);
        const encryptedKey = findKeyInObj(resolvedMeta, fields.keyField);
        const encryptedIv = findKeyInObj(resolvedMeta, fields.ivField);
        const token = resolvedMeta[fields.tokenField];

        if (!token || !encryptedKey || !encryptedIv) return null;

        const manifestRes = await axios.get(`${urlObj.origin}/api/m3u8/${token}`, {
            headers: {
                'Referer': embedUrl,
                'User-Agent': USER_AGENT,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        const encryptedB64 = manifestRes.data.video_b64;

        const key = CryptoJS.enc.Base64.parse(encryptedKey);
        const iv = CryptoJS.enc.Base64.parse(encryptedIv);
        const ciphertext = CryptoJS.enc.Base64.parse(encryptedB64);

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );

        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        return null;
    }
}

// --- StreamWish / Vidhide ---
async function getStreamWish(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: {
                'Referer': 'https://kuudere.to/',
                'User-Agent': USER_AGENT
            }
        });
        const html = response.data;
        
        // Match m3u8 file
        const m3u8Match = html.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/) || 
                          html.match(/file\s*:\s*"([^"]+\.txt[^"]*)"/) ||
                          html.match(/sources\s*:\s*\[\s*{\s*file\s*:\s*"([^"]+)"/) ;
        
        if (m3u8Match) return m3u8Match[1];

        // Match Packed
        const packedMatch = html.match(/eval\(function\(p,a,c,k,e,d\).+?\)\)/);
        if (packedMatch) {
            // Very basic unpack or regex on packed content is hard.
            // But often the m3u8 url is inside.
            // We can try to regex the packed string for .m3u8
            const innerM3u8 = packedMatch[0].match(/https?:\/\/[^"']+\.m3u8/);
            if (innerM3u8) return innerM3u8[0];
        }

        return null;
    } catch (error) {
        return null;
    }
}

// --- Doodstream Extractor ---
async function getDoodstream(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const html = response.data;
        
        const md5Match = html.match(/\/pass_md5\/([^']*)/);
        if (!md5Match) return null;
        
        const token = md5Match[1];
        const md5Url = `${new URL(embedUrl).origin}/pass_md5/${token}`;
        
        const md5Res = await axios.get(md5Url, {
            headers: { 'Referer': embedUrl, 'User-Agent': USER_AGENT }
        });
        const urlPart = md5Res.data;
        
        // Random string suffix logic from Doodstream player
        const randomString = (length) => {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return result;
        };
        
        return `${urlPart}${randomString(10)}?token=${token}&expiry=${Date.now()}`;
    } catch (error) {
        return null;
    }
}

// --- Mp4Upload Extractor ---
async function getMp4Upload(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const html = response.data;
        
        const srcMatch = html.match(/src\s*:\s*"([^"]+\.mp4)"/) ;
        return srcMatch ? srcMatch[1] : null;
    } catch (error) {
        return null;
    }
}

// --- Kumi Extractor (Tentative) ---
function generateKumiKey(location) {
    // Tentative logic based on analysis.
    // Updated indices for current array.
    const m = he;
    const T = location.hash;
    const P = "10";
    const D = 110;
    const H = 1;
    let F = "";
    
    // Indices based on analysis:
    // split -> 857
    // length -> 782
    // substring -> 521 (guess)
    // magic -> 506 (guess)
    // reverse -> 710
    // join -> 417
    
    try {
        const $ = x("ᵟ").toString()[m(857)]("");
        for (let ue = 0; ue < $[m(782)]; ue++) F += g(P + $[ue]);
        F += g(x(T, P / 10));
        F += F[m(521)](1, 3);
        F += g(D, D - 1, D + 7);
        
        // Tentative magic string index
        const se = m(506)[m(857)](""); 
        
        F += g(se[3] + se[2], se[1] + se[2]);
        F += g(se[0] * H + H + se[3], se[0] * H + H + se[3]);
        
        // Complex part: se.reverse().join("").substring(0,2)
        const complexPart = se[m(710)]()[m(417)]("")[m(521)](0, 2);
        
        F += g(se[3] * P + se[3] * H, complexPart);
        return CryptoJS.enc.Utf8.parse(F);
    } catch (e) {
        return null;
    }
}

function generateKumiIV(location) {
    try {
        const m = he;
        const T = location.protocol;
        const P = T + "//";
        const D = location.hostname;
        const H = T[m(782)] * P.length; // length
        const F = 1;
        let $ = "";
        for (let be = F; be < 10; be++) $ += g(be + H);
        let se = "";
        se = F + se + F + se + F;
        const ue = se[m(782)] * x(D);
        const Fe = se * F + T[m(782)];
        const R = Fe + 4;
        const X = x(T, F);
        const me = X * F - 2;
        $ += g(H, se, ue, Fe, R, X, me);
        return CryptoJS.enc.Utf8.parse($);
    } catch (e) {
        return null;
    }
}

async function getKumiStream(embedUrl) {
    try {
        const urlObj = new URL(embedUrl);
        const location = {
            hash: urlObj.hash,
            protocol: urlObj.protocol,
            hostname: urlObj.hostname,
            href: embedUrl,
            origin: urlObj.origin
        };

        const id = urlObj.hash.substring(1).split('&')[0];
        const apiUrl = `${urlObj.origin}/api/v1/video?id=${id}`;

        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://kuudere.ru/',
                'Origin': urlObj.origin
            }
        });

        const encryptedData = response.data;
        if (!encryptedData || typeof encryptedData !== 'string') return null;

        const key = generateKumiKey(location);
        const iv = generateKumiIV(location);
        
        if (!key || !iv) return null;

        const hexToBytes = (hex) => {
            const bytes = [];
            for (let c = 0; c < hex.length; c += 2)
                bytes.push(parseInt(hex.substr(c, 2), 16));
            return CryptoJS.lib.WordArray.create(new Uint8Array(bytes));
        };

        const encryptedWA = hexToBytes(encryptedData);

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encryptedWA },
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );

        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedStr) return null;

        const jsonData = JSON.parse(decryptedStr);
        return jsonData.url || jsonData.data || null;

    } catch (error) {
        // console.error('Kumi error:', error.message);
        return null;
    }
}

// --- Main Extraction Function ---
export async function extractStreams(links) {
    const streams = [];
    
    for (const link of links) {
        try {
            const serverName = link.serverName;
            const embedUrl = link.dataLink;

            if (serverName.startsWith('Zen')) {
                const directUrl = await getZenStream(embedUrl);
                if (directUrl) {
                    streams.push({
                        name: `Kuudere (${serverName})`,
                        title: `${link.dataType.toUpperCase()} - Direct`,
                        url: directUrl,
                        quality: "1080p",
                        headers: { "Referer": "https://zencloudz.cc/" }
                    });
                    continue;
                }
            } else if (serverName.startsWith('Kumi')) {
                const directUrl = await getKumiStream(embedUrl);
                if (directUrl) {
                    streams.push({
                        name: `Kuudere (${serverName})`,
                        title: `${link.dataType.toUpperCase()} - Direct`,
                        url: directUrl,
                        quality: "Auto",
                        headers: { "Referer": new URL(embedUrl).origin }
                    });
                    continue;
                }
            } else if (serverName.includes('Wish') || serverName === 'Streamwish') {
                const directUrl = await getStreamWish(embedUrl);
                if (directUrl) {
                    streams.push({
                        name: `Kuudere (${serverName})`,
                        title: `${link.dataType.toUpperCase()} - Direct`,
                        url: directUrl,
                        quality: "Auto",
                        headers: { "Referer": new URL(embedUrl).origin }
                    });
                    continue;
                }
            } else if (serverName.includes('Hide') || serverName === 'Vidhide') {
                const directUrl = await getStreamWish(embedUrl); // Vidhide often same structure
                if (directUrl) {
                    streams.push({
                        name: `Kuudere (${serverName})`,
                        title: `${link.dataType.toUpperCase()} - Direct`,
                        url: directUrl,
                        quality: "Auto",
                        headers: { "Referer": new URL(embedUrl).origin }
                    });
                    continue;
                }
            } else if (serverName.includes('Dood') || serverName === 'Doodstream') {
                const directUrl = await getDoodstream(embedUrl);
                if (directUrl) {
                    streams.push({
                        name: `Kuudere (${serverName})`,
                        title: `${link.dataType.toUpperCase()} - Direct`,
                        url: directUrl,
                        quality: "Auto",
                        headers: { "Referer": "https://dood.li/" }
                    });
                    continue;
                }
            } else if (serverName.includes('Mp4') || serverName === 'Mp4upload') {
                const directUrl = await getMp4Upload(embedUrl);
                if (directUrl) {
                    streams.push({
                        name: `Kuudere (${serverName})`,
                        title: `${link.dataType.toUpperCase()} - Direct`,
                        url: directUrl,
                        quality: "Auto",
                        headers: { "Referer": "https://www.mp4upload.com/" }
                    });
                    continue;
                }
            }
            
            // Fallback for others
            streams.push({
                name: `Kuudere (${serverName})`,
                title: `${link.dataType.toUpperCase()} - Embed`,
                url: embedUrl,
                quality: "Auto",
                headers: { "Referer": "https://kuudere.ru/" }
            });
        } catch (error) {
            console.error(`[Kuudere] Extraction error for ${link.serverName}:`, error.message);
        }
    }
    
    return streams;
}
