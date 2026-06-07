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

export function buildNewTvHeaders(ott, extra = {}) {
    return {
        ...NEW_TV_BASE_HEADERS,
        'Ott': ott,
        ...extra
    };
}
