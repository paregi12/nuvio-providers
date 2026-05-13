import { FLIXCLOUD_BASE, FLIX_HEADERS } from './constants.js';
import { base64ToBytes } from './bytes.js';
import {
    decryptAesCbcUrl,
    deriveFieldMap,
    extractObfuscatedCryptoData,
    runWasmTransform,
    sha256Hex
} from './crypto.js';

function extractBalancedObject(source, key) {
    const keyIndex = source.indexOf(key);
    if (keyIndex < 0) return null;
    const start = source.indexOf("{", keyIndex);
    if (start < 0) return null;

    let depth = 0;
    let quote = null;
    let escape = false;
    for (let i = start; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
            if (escape) escape = false;
            else if (ch === "\\") escape = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
        } else if (ch === "{") {
            depth++;
        } else if (ch === "}") {
            depth--;
            if (depth === 0) return source.substring(start, i + 1);
        }
    }
    return null;
}

function extractDataObjectContaining(source, marker) {
    const markerIndex = source.indexOf(marker);
    if (markerIndex < 0) return null;

    let dataIndex = source.lastIndexOf("data:", markerIndex);
    while (dataIndex >= 0) {
        const start = source.indexOf("{", dataIndex);
        if (start >= 0 && start < markerIndex) {
            const objectText = extractBalancedObject(source.substring(dataIndex), "data:");
            if (objectText && objectText.includes(marker)) return objectText;
        }
        dataIndex = source.lastIndexOf("data:", dataIndex - 1);
    }

    return null;
}

function quoteObjectKeys(text) {
    return text
        .replace(/([{,])\s*([A-Za-z_$][A-Za-z0-9_$]*|[0-9a-f]{4,}(?:_[0-9a-f]{4,})?)\s*:/g, '$1"$2":')
        .replace(/,\s*([}\]])/g, "$1");
}

function parseSsrData(html) {
    const dataObject = extractDataObjectContaining(html, "obfuscation_seed")
        || extractBalancedObject(html, 'data:{subtitles:');
    if (!dataObject) throw new Error("FlixCloud SSR data not found");
    return JSON.parse(quoteObjectKeys(dataObject));
}

export function normalizeFlixEmbedUrl(url, referer) {
    const finalUrl = url.startsWith("http")
        ? url
        : `${FLIXCLOUD_BASE}${url.startsWith("/") ? "" : "/"}${url}`;

    const separator = finalUrl.includes("?") ? "&" : "?";
    return `${finalUrl}${separator}v=1&autoPlay=true&skI=false&skO=false&kuudere_ts=${Date.now()}`;
}

export async function extractFlixCloud(embedUrl, referer) {
    const pageUrl = normalizeFlixEmbedUrl(embedUrl, referer);
    const response = await fetch(pageUrl, {
        headers: {
            ...FLIX_HEADERS,
            "Referer": referer || FLIX_HEADERS.Referer
        }
    });
    if (!response.ok) throw new Error(`FlixCloud embed HTTP ${response.status}`);

    const html = await response.text();
    const data = parseSsrData(html);
    const seed = data.obfuscation_seed;
    const obfuscated = data.obfuscated_crypto_data;
    if (!seed || !obfuscated || !data.w_payload) {
        throw new Error("FlixCloud crypto payload missing");
    }

    const fieldMap = await deriveFieldMap(seed);
    const cryptoParts = extractObfuscatedCryptoData(obfuscated, fieldMap);
    const frag2B64 = data[fieldMap.keyFrag2Field];
    const tokenRef = data[fieldMap.tokenField];
    if (!frag2B64 || !tokenRef) {
        throw new Error("FlixCloud token fields missing");
    }

    const tokenResponse = await fetch(`${FLIXCLOUD_BASE}/api/m3u8/${tokenRef}`, {
        headers: {
            ...FLIX_HEADERS,
            "Accept": "application/json",
            "Referer": pageUrl
        }
    });
    if (!tokenResponse.ok) throw new Error(`FlixCloud token HTTP ${tokenResponse.status}`);

    const tokenJson = await tokenResponse.json();
    const videoKey = (await sha256Hex(tokenRef + "vid")).substring(0, 10);
    const keyKey = (await sha256Hex(tokenRef + "key")).substring(0, 10);
    const encryptedUrlB64 = tokenJson && tokenJson[videoKey];
    const tokenKeyB64 = tokenJson && tokenJson[keyKey];
    if (!encryptedUrlB64 || !tokenKeyB64) {
        throw new Error("FlixCloud token response incomplete");
    }

    const wasmKey = await runWasmTransform(
        data.w_payload,
        base64ToBytes(cryptoParts.frag1B64),
        base64ToBytes(frag2B64),
        base64ToBytes(tokenKeyB64),
        parseInt(seed.substring(0, 8), 16)
    );

    const streamUrl = await decryptAesCbcUrl(wasmKey, cryptoParts.ivB64, encryptedUrlB64, seed);
    if (!streamUrl || !streamUrl.includes(".m3u8")) {
        throw new Error("FlixCloud decrypted URL invalid");
    }

    return {
        url: streamUrl,
        videoId: data.video_id,
        title: data.video_title,
        subtitles: data.subtitles || [],
        headers: {
            "Referer": pageUrl,
            "Origin": FLIXCLOUD_BASE,
            "User-Agent": FLIX_HEADERS["User-Agent"]
        }
    };
}
