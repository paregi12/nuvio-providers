import { NEW_TV_BASE_HEADERS, NEW_TV_DOMAINS } from './constants.js';

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

let cookieValue = "";
let cookieTimestamp = 0;

export async function bypass(ott) {
    if (cookieValue && (Date.now() - cookieTimestamp < 54000000)) {
        return cookieValue;
    }

    const newUrl = 'https://net52.cc';
    const userAgent = "Mozilla/5.0 (Linux; Android 12; RMX2117 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/147.0.7727.55 Mobile Safari/537.36 /OS.Gatu v3.0";

    try {
        console.log("[NetMirror] Running NetMirror Mobile bypass...");

        // 1. Fetch home page to extract addhash
        const homeResponse = await fetch(`${newUrl}/mobile/home?app=1`, {
            headers: {
                "User-Agent": userAgent,
                "X-Requested-With": "app.netmirror.netmirrornew"
            }
        });
        const homeHtml = await homeResponse.text();
        const match = homeHtml.match(/<body[^>]*data-addhash=["']([^"']+)["']/i);
        if (!match) {
            console.error("[NetMirror] Failed to extract data-addhash from home page");
            return "";
        }
        const addhash = match[1];
        console.log("[NetMirror] Extracted addhash:", addhash);

        // 2. Trigger verification helper server
        const triggerUrl = `https://userver.net52.cc/?jjoii=${encodeURIComponent(addhash)}&a=y&t=${Math.floor(Date.now() / 1000)}`;
        await fetch(triggerUrl, {
            headers: {
                "User-Agent": userAgent
            }
        });

        // 3. Poll verify2.php until "All Done" (max 7 attempts, 10s delay)
        const verifyUrl = `${newUrl}/mobile/verify2.php`;
        for (let count = 1; count <= 7; count++) {
            // Wait 10 seconds (10000ms)
            await new Promise(resolve => setTimeout(resolve, 10000));

            console.log(`[NetMirror] Polling verify2.php (attempt ${count}/7)...`);
            const verifyResponse = await fetch(verifyUrl, {
                method: 'POST',
                headers: {
                    "User-Agent": userAgent,
                    "X-Requested-With": "XMLHttpRequest",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: `verify=${encodeURIComponent(addhash)}`
            });

            const verifyText = await verifyResponse.text();
            console.log("[NetMirror] Poll response:", verifyText);

            if (verifyText.includes('"statusup":"All Done"')) {
                let newCookie = "";
                const headers = verifyResponse.headers;
                if (headers) {
                    // Case-insensitive header check
                    let setCookie = headers.get('set-cookie') || headers.get('Set-Cookie') || headers.get('SET-COOKIE');
                    if (setCookie) {
                        const match = setCookie.match(/t_hash_t=([^;]+)/);
                        if (match) newCookie = match[1];
                    }
                    if (!newCookie && headers.entries) {
                        try {
                            for (const [key, val] of headers.entries()) {
                                if (key.toLowerCase() === 'set-cookie') {
                                    const match = val.match(/t_hash_t=([^;]+)/);
                                    if (match) { newCookie = match[1]; break; }
                                }
                            }
                        } catch (e) {}
                    }
                    if (!newCookie && headers.forEach) {
                        try {
                            headers.forEach((val, key) => {
                                if (key.toLowerCase() === 'set-cookie') {
                                    const match = val.match(/t_hash_t=([^;]+)/);
                                    if (match) newCookie = match[1];
                                }
                            });
                        } catch (e) {}
                    }
                }
                cookieValue = newCookie;
                cookieTimestamp = Date.now();
                console.log("[NetMirror] Verification completed successfully. Cookie:", cookieValue);
                return cookieValue;
            }
        }
        console.error("[NetMirror] Verification timed out");
    } catch (e) {
        cookieValue = "";
        console.error("[NetMirror] Polling bypass failed:", e.message);
    }
    return "";
}


export function buildNewTvHeaders(ott, extra = {}) {
    return {
        ...NEW_TV_BASE_HEADERS,
        'Ott': ott,
        ...extra
    };
}
