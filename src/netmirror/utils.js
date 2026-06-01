import { NETMIRROR_URL, BASE_HEADERS, NEW_TV_BASE_HEADERS, NEW_TV_DOMAINS } from './constants.js';

let globalCookie = "";
let cookieTimestamp = 0;
const COOKIE_EXPIRY = 54000000; // 15 hours

export async function bypass() {
    const now = Date.now();
    if (globalCookie && now - cookieTimestamp < COOKIE_EXPIRY) {
        return globalCookie;
    }

    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

    const headers = {
        ...BASE_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://net22.cc",
        "Referer": "https://net22.cc/verify2",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
    };

    try {
        const response = await fetch(`${NETMIRROR_URL}/verify.php`, {
            method: 'POST',
            headers: { ...headers, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            body: `g-recaptcha-response=${uuid}`,
            redirect: 'manual'
        });

        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
            const match = setCookie.match(/t_hash_t=([^;]+)/);
            if (match) {
                globalCookie = match[1];
                cookieTimestamp = Date.now();
                return globalCookie;
            }
        }
    } catch (error) {
        console.error(`[NetMirror] Bypass Error: ${error.message}`);
    }
    throw new Error("Failed to extract t_hash_t cookie");
}

export function getUnixTime() {
    return Math.floor(Date.now() / 1000);
}

export function convertRuntimeToMinutes(runtime) {
    if (!runtime) return 0;
    let totalMinutes = 0;
    const parts = runtime.toString().split(" ");
    for (const part of parts) {
        if (part.endsWith("h")) {
            totalMinutes += (parseInt(part.replace("h", "")) || 0) * 60;
        } else if (part.endsWith("m")) {
            totalMinutes += parseInt(part.replace("m", "")) || 0;
        }
    }
    return totalMinutes;
}

let resolvedApiUrl = "";

function safeAtob(encoded) {
    if (typeof atob === 'function') {
        return atob(encoded);
    }
    // Simple fallback for environment where atob is missing (like some Node versions or Hermes without polyfill)
    return Buffer.from(encoded, 'base64').toString('binary');
}

export async function resolveApiUrl() {
    if (resolvedApiUrl) return resolvedApiUrl;

    for (const encoded of NEW_TV_DOMAINS) {
        const base = safeAtob(encoded).replace(/\/$/, '');
        try {
            const response = await fetch(`${base}/checknewtv.php`, {
                headers: { ...NEW_TV_BASE_HEADERS, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const data = await response.json();
            const tokenHash = data.token_hash;
            if (tokenHash) {
                resolvedApiUrl = safeAtob(tokenHash).replace(/\/$/, '');
                return resolvedApiUrl;
            }
        } catch (error) {
            // Try next domain
        }
    }
    throw new Error("Failed to resolve NewTV API base URL");
}

export function buildNewTvHeaders(ott, extra = {}) {
    return {
        ...NEW_TV_BASE_HEADERS,
        'Ott': ott,
        ...extra
    };
}
