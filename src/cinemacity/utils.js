// src/cinemacity/utils.js
import { MAIN_URL, HEADERS } from './constants.js';

// Robust atob polyfill for environments where it is missing
export const atobPolyfill = (str) => {
    try {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        let output = '';
        str = String(str).replace(/[=]+$/, '');
        if (str.length % 4 === 1) return '';
        for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
            buffer = chars.indexOf(buffer);
        }
        return output;
    } catch (e) {
        return '';
    }
};

export async function fetchText(url, options = {}) {
    // Note: fetch is a global provided by the Nuvio sandbox
    // cfKiller: true bypasses Cloudflare anti-bot challenges (same pattern as hindmoviez)
    const response = await fetch(url, {
        headers: options.headers || HEADERS,
        skipSizeCheck: true, // Critical for Nuvio not to block HTML/Metadata
        cfKiller: true,
        ...options
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
}

export function extractQuality(url) {
    const low = (url || "").toLowerCase();
    if (low.includes("2160p") || low.includes("4k")) return "4K";
    if (low.includes("1080p")) return "1080p";
    if (low.includes("720p")) return "720p";
    if (low.includes("480p")) return "480p";
    if (low.includes("360p")) return "360p";
    return "HD";
}

const abc = "ABCDEFGHIJKLMabcdefghijklmNOPQRSTUVWXYZnopqrstuvwxyz";
const keyStr = abc + "0123456789+/=";

const sugar = (x) => {
    if (!x) return "";
    const dechar = String.fromCharCode;
    const parts = x.split(dechar(61)); // '='
    let result = '';
    const c1 = dechar(120); // 'x'
    for (const part of parts) {
        let encoded = '';
        for (const char of part) {
            encoded += (char === c1) ? dechar(49) : dechar(48); // '1' : '0'
        }
        if (encoded) {
            const chr = parseInt(encoded, 2);
            result += dechar(chr);
        }
    }
    return result.substring(0, result.length - 1);
};

const pepper = (s, n, yVal) => {
    s = s.replace(/\+/g, "#").replace(/#/g, "+");
    let a = parseInt(sugar(yVal), 10) * n;
    if (n < 0) a += abc.length / 2;
    const r = abc.substring(a * 2) + abc.substring(0, a * 2);
    return s.replace(/[A-Za-z]/g, (c) => {
        return r.charAt(abc.indexOf(c));
    });
};

const saltD = (e) => {
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
    
    // salt._ud implementation
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

export function decodeStream(x, yVal) {
    if (x.startsWith("#1")) {
        return saltD(pepper(x.substring(2), -1, yVal));
    } else if (x.startsWith("#0")) {
        return saltD(x.substring(2));
    } else {
        return x;
    }
}

export function unpackPacker(code) {
    if (!code || !code.includes('eval(function(p,a,c,k,e,d)')) {
        return code;
    }
    try {
        const match = code.match(/}\s*\(\s*(['"])([\s\S]*?)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['"])([\s\S]*?)\5\s*\.split\s*\(\s*(['"])\|\7\s*\)/);
        if (!match) return code;
        
        const p = match[2];
        const a = parseInt(match[3], 10);
        const c = parseInt(match[4], 10);
        const k = match[6].split('|');
        
        const e = function(c) {
            return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
        };
        
        const d = {};
        let count = c;
        while (count--) {
            d[e(count)] = k[count] || e(count);
        }
        
        return p.replace(/\b\w+\b/g, (word) => {
            return d[word] !== undefined ? d[word] : word;
        });
    } catch (err) {
        return code;
    }
}


