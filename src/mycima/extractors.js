import cheerio from 'cheerio-without-node-native';
import CryptoJS from 'crypto-js';
import { HEADERS } from './constants.js';
import { atob, jsUnpack } from './utils.js';

export function hexDecode(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

function getEmbedUrl(url) {
    if (url.includes("/d/")) return url.replace("/d/", "/v/");
    if (url.includes("/download/")) return url.replace("/download/", "/v/");
    if (url.includes("/file/")) return url.replace("/file/", "/v/");
    if (url.includes("/f/")) return url.replace("/f/", "/v/");
    if (url.includes("/e/")) return url.replace("/e/", "/v/");
    if (url.includes("/embed/")) return url.replace("/embed/", "/v/");
    return url;
}

export async function vidStackExtractor(url) {
    try {
        let hash = "";
        if (url.includes("#")) {
            hash = url.split("#").pop();
        } else {
            hash = url.split('/').filter(Boolean).pop();
        }
        if (!hash) return [];

        const urlObj = new URL(url);
        const baseurl = `${urlObj.protocol}//${urlObj.hostname}`;
        const apiUrl = `${baseurl}/api/v1/video?id=${hash}`;
        
        const response = await fetch(apiUrl, { headers: { ...HEADERS, Referer: url } });
        if (!response.ok) {
            // Some use different API path
            const altApiUrl = `${baseurl}/api/video?id=${hash}`;
            const altRes = await fetch(altApiUrl, { headers: { ...HEADERS, Referer: url } });
            if (!altRes.ok) return [];
            const encoded = (await altRes.text()).trim();
            return await decryptVidStack(encoded, url);
        }
        const encoded = (await response.text()).trim();
        return await decryptVidStack(encoded, url);
    } catch (e) {
        return [];
    }
}

async function decryptVidStack(encoded, url) {
    const key = CryptoJS.enc.Utf8.parse("kiemtienmua911ca");
    const ivs = ["1234567890oiuytr", "0123456789abcdef"];
    
    for (const ivStr of ivs) {
        try {
            const iv = CryptoJS.enc.Utf8.parse(ivStr);
            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: CryptoJS.enc.Hex.parse(encoded) },
                key,
                { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
            );
            const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
            if (decryptedText && decryptedText.includes("source")) {
                const m3u8 = decryptedText.match(/"source":"(.*?)"/)?.[1]?.replace(/\\/g, '');
                if (m3u8) {
                    return [{ 
                        source: "Vidstack", 
                        quality: "M3U8", 
                        url: m3u8,
                        headers: { "Referer": url }
                    }];
                }
            }
        } catch (e) {}
    }
    return [];
}

export async function vidHideExtractor(url) {
    try {
        const embedUrl = getEmbedUrl(url);
        const res = await fetch(embedUrl, { headers: { ...HEADERS, Referer: url } });
        if (!res.ok) return [];
        const html = await res.text();
        
        if (html.includes("File is no longer available")) return [];

        let content = html;
        if (html.includes("eval(function(p,a,c,k,e,d)")) {
            content = jsUnpack(html);
        }

        const m3u8Matches = [...content.matchAll(/:\s*["'](.*?m3u8.*?)["']/g)];
        const streams = [];
        for (const match of m3u8Matches) {
            let m3u8Url = match[1];
            if (m3u8Url.startsWith("//")) m3u8Url = "https:" + m3u8Url;
            streams.push({
                source: "VidHide",
                quality: "Unknown",
                url: m3u8Url,
                headers: { ...HEADERS, Referer: embedUrl }
            });
        }

        if (streams.length > 0) return streams;

        // Try form POST if present (X-Upload pattern)
        const $ = cheerio.load(html);
        const form = $("form#F1");
        if (form.length > 0) {
            const action = form.attr("action");
            const formData = new URLSearchParams();
            form.find("input[type=hidden]").each((i, el) => {
                formData.append($(el).attr("name"), $(el).attr("value"));
            });
            // Try to set file_code if empty
            if (!formData.get("file_code")) {
                const code = embedUrl.split('/').filter(Boolean).pop();
                formData.set("file_code", code);
            }

            const urlObj = new URL(embedUrl);
            const postUrl = action.startsWith("http") ? action : `${urlObj.protocol}//${urlObj.hostname}${action}`;
            
            const postRes = await fetch(postUrl, {
                method: "POST",
                headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded", Referer: embedUrl },
                body: formData.toString()
            });
            
            if (postRes.ok) {
                const postHtml = await postRes.text();
                return await genericExtractor(postHtml, postUrl);
            }
        }

        return [];
    } catch (e) {
        return [];
    }
}

export async function doodStreamExtractor(url) {
    try {
        const res = await fetch(url, { headers: HEADERS });
        const html = await res.text();
        const md5 = html.match(/\/pass_md5\/([^'"]+)/)?.[1];
        if (!md5) return [];

        const passRes = await fetch(`https://dood.re/pass_md5/${md5}`, { headers: { ...HEADERS, Referer: url } });
        const passContent = await passRes.text();
        
        const finalUrl = passContent + "abc?token=" + md5 + "&expiry=" + Date.now();
        
        return [{
            source: "DoodStream",
            quality: "Unknown",
            url: finalUrl,
            headers: { ...HEADERS, Referer: url }
        }];
    } catch (e) { return []; }
}

export async function streamTapeExtractor(url) {
    try {
        const res = await fetch(url, { headers: HEADERS });
        const html = await res.text();
        const match = html.match(/id="videolink">([^<]+)/);
        if (match) {
            let videoUrl = "https:" + match[1];
            return [{
                source: "StreamTape",
                quality: "Unknown",
                url: videoUrl,
                headers: { ...HEADERS, Referer: url }
            }];
        }
        return [];
    } catch (e) { return []; }
}

export async function mixDropExtractor(url) {
    try {
        const res = await fetch(url, { headers: HEADERS });
        const html = await res.text();
        if (html.includes("eval(function(p,a,c,k,e,d)")) {
            const unpacked = jsUnpack(html);
            const match = unpacked.match(/wurl="([^"]+)"/);
            if (match) {
                let videoUrl = match[1];
                if (videoUrl.startsWith("//")) videoUrl = "https:" + videoUrl;
                return [{
                    source: "MixDrop",
                    quality: "Unknown",
                    url: videoUrl,
                    headers: { ...HEADERS, Referer: url }
                }];
            }
        }
        return [];
    } catch (e) { return []; }
}

export async function filemoonExtractor(url) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, Referer: url } });
        const html = await res.text();
        
        let content = html;
        if (html.includes("eval(function(p,a,c,k,e,d)")) {
            content = jsUnpack(html);
        }

        const fileMatch = content.match(/file\s*:\s*["'](http[^"']+)["']/);
        if (fileMatch) {
            return [{ source: "Filemoon", quality: "Unknown", url: fileMatch[1], headers: { ...HEADERS, Referer: url } }];
        }
        return [];
    } catch (e) {
        return [];
    }
}

export async function govidExtractor(url) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, Referer: url } });
        const html = await res.text();
        
        const hexMatch = html.match(/const\s+\w+\s*=\s*["']([0-9a-f]{20,})["']/i);
        if (hexMatch) {
            const decodedUrl = hexDecode(hexMatch[1]);
            if (decodedUrl.startsWith("http")) {
                return [{ source: "Govid", quality: "Unknown", url: decodedUrl, headers: { ...HEADERS, Referer: url } }];
            }
        }
        return [];
    } catch (e) {
        return [];
    }
}

export async function genericExtractor(html, url) {
    try {
        let content = html;
        if (!content && url) {
            const res = await fetch(url, { headers: { ...HEADERS, Referer: url } });
            content = await res.text();
        }
        
        if (content.includes("eval(function(p,a,c,k,e,d)")) {
            content = jsUnpack(content);
        }

        const m3u8Match = content.match(/["'](http[^"']+\.m3u8[^"']*)["']/);
        if (m3u8Match) {
            return [{ source: "Generic HLS", quality: "Unknown", url: m3u8Match[1], headers: { ...HEADERS, Referer: url } }];
        }
        const mp4Match = content.match(/["'](http[^"']+\.mp4[^"']*)["']/);
        if (mp4Match) {
            return [{ source: "Generic MP4", quality: "Unknown", url: mp4Match[1], headers: { ...HEADERS, Referer: url } }];
        }
        return [];
    } catch (e) { return []; }
}

export async function loadExtractor(url) {
    try {
        const domain = new URL(url).hostname;
        
        if (domain.includes("fsdcmo") || domain.includes("hglink") || domain.includes("dingtezuni") || domain.includes("vidhide") || domain.includes("earnvids") || domain.includes("filelions") || domain.includes("smoothpre") || domain.includes("dhtpre") || domain.includes("peytonepre") || domain.includes("ryderjet") || domain.includes("abstream")) {
            return await vidHideExtractor(url);
        }
        if (domain.includes("vidstack") || domain.includes("hubstream") || domain.includes("bigwarp") || domain.includes("mxdrop") || domain.includes("wasuytm") || domain.includes("upn.one") || domain.includes("server1.uns") || domain.includes("kumi.uns")) {
            return await vidStackExtractor(url);
        }
        if (domain.includes("dood")) return await doodStreamExtractor(url);
        if (domain.includes("streamtape")) return await streamTapeExtractor(url);
        if (domain.includes("mixdrop")) return await mixDropExtractor(url);
        if (domain.includes("filemoon")) return await filemoonExtractor(url);
        if (domain.includes("govid")) return await govidExtractor(url);
        
        return await genericExtractor(null, url);
    } catch (e) {
        return [];
    }
}
