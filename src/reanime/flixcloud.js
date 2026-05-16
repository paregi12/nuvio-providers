/**
 * FlixCloud Extractor for Nuvio
 * Decrypts stream URLs locally using a JavaScript-based WASM interpreter.
 */

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseBytes(val) {
    if (!val) return new Uint8Array(0);
    if (/^[0-9a-f]+$/i.test(val) && val.length % 2 === 0) {
        const out = new Uint8Array(val.length / 2);
        for (let i = 0; i < val.length; i += 2) {
            out[i / 2] = parseInt(val.substring(i, i + 2), 16);
        }
        return out;
    }
    try {
        const bin = atob(val);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    } catch (e) {
        return new Uint8Array(0);
    }
}

export async function extractFlixCloud(embedUrl, referer) {
    const pageUrl = normalizeFlixEmbedUrl(embedUrl, referer);
    const origin = new URL(pageUrl).origin;
    
    const response = await fetch(pageUrl, {
        headers: {
            "User-Agent": USER_AGENT,
            "Referer": referer || "https://reanime.to/"
        }
    });

    if (!response.ok) throw new Error(`FlixCloud embed HTTP ${response.status}`);
    const html = await response.text();

    const data = parseSsrData(html);
    const seed = data.obfuscation_seed;
    const obfuscated = data.obfuscated_crypto_data;
    const wPayload = data.w_payload;

    if (!seed || !obfuscated || !wPayload) {
        throw new Error("FlixCloud crypto payload missing");
    }

    const fields = await deriveFieldMap(seed);
    const cryptoParts = extractObfuscatedCryptoData(obfuscated, fields);
    
    const frag2Val = data[fields.keyFrag2Field];
    const tokenRef = data[fields.tokenField];

    if (!frag2Val || !tokenRef) {
        throw new Error("FlixCloud token fields missing");
    }

    const tokenResponse = await fetch(`${origin}/api/m3u8/${tokenRef}`, {
        headers: {
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
            "Referer": pageUrl
        }
    });

    if (!tokenResponse.ok) throw new Error(`FlixCloud token HTTP ${tokenResponse.status}`);
    const tokenJson = await tokenResponse.json();

    const videoKey = (await sha256Hex(tokenRef + "vid")).substring(0, 10);
    const keyKey = (await sha256Hex(tokenRef + "key")).substring(0, 10);
    
    const encryptedUrlB64 = tokenJson[videoKey];
    const tokenKeyVal = tokenJson[keyKey];

    if (!encryptedUrlB64 || !tokenKeyVal) {
        throw new Error("FlixCloud token response incomplete");
    }

    const wasmKey = await _runInterpretedWasmTransform(
        wPayload,
        parseBytes(cryptoParts.frag1B64),
        parseBytes(frag2Val),
        parseBytes(tokenKeyVal),
        parseInt(seed.substring(0, 8), 16)
    );

    const streamUrl = await decryptAesCbcUrl(wasmKey, cryptoParts.ivB64, encryptedUrlB64, seed);
    
    return {
        url: streamUrl,
        videoId: data.video_id,
        title: data.video_title,
        subtitles: data.subtitles || [],
        headers: {
            "Referer": pageUrl,
            "Origin": origin,
            "User-Agent": USER_AGENT
        }
    };
}

function normalizeFlixEmbedUrl(url, referer) {
    const finalUrl = url.startsWith("http") ? url : `https://flixcloud.cc${url.startsWith("/") ? "" : "/"}${url}`;
    const separator = finalUrl.includes("?") ? "&" : "?";
    return `${finalUrl}${separator}v=1&autoPlay=true&skI=false&skO=false&kuudere_ts=${Date.now()}`;
}

function extractBalancedObject(source, startIdx) {
    const start = source.indexOf("{", startIdx);
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

function parseSsrData(html) {
    const marker = "obfuscation_seed";
    const markerIdx = html.indexOf(marker);
    if (markerIdx < 0) throw new Error("FlixCloud SSR data marker not found");
    let dataIdx = html.lastIndexOf("{", markerIdx);
    while (dataIdx >= 0) {
        const obj = extractBalancedObject(html, dataIdx);
        if (obj && obj.includes(marker)) {
            try {
                const jsonText = obj
                    .replace(/([{,])\s*([A-Za-z_$][A-Za-z0-9_$]*|[0-9a-f]{4,}(?:_[0-9a-f]{4,})?)\s*:/g, '$1"$2":')
                    .replace(/,\s*([}\]])/g, "$1");
                const parsed = JSON.parse(jsonText);
                return parsed.data || parsed;
            } catch (e) {}
        }
        dataIdx = html.lastIndexOf("{", dataIdx - 1);
    }
    throw new Error("Failed to extract valid SSR data object");
}

async function deriveFieldMap(seed) {
    let first = seed;
    for (let i = 0; i < 3; i++) first = await sha256Hex(first + String(i));
    let second = first;
    for (let i = 0; i < 3; i++) second = await sha256Hex(second + String(i));
    const fields = {
        keyField: `kf_${first.substring(8, 16)}`,
        ivField: `ivf_${first.substring(16, 24)}`,
        containerName: `cd_${first.substring(24, 32)}`,
        arrayName: `ad_${first.substring(32, 40)}`,
        objectName: `od_${first.substring(40, 48)}`,
        tokenField: `${first.substring(48, 64)}_${first.substring(56, 64)}`,
        keyFrag2Field: `${second.substring(0, 16)}_${second.substring(16, 24)}`
    };
    return fields;
}

function extractObfuscatedCryptoData(data, fields) {
    const container = data[fields.containerName];
    const arr = container?.[fields.arrayName];
    const obj = arr?.[0]?.[fields.objectName];
    if (!obj) throw new Error("Invalid FlixCloud crypto data structure");
    return { frag1B64: obj[fields.keyField], ivB64: obj[fields.ivField] };
}

async function _runInterpretedWasmTransform(payloadB64, frag1, frag2, tokenKey, seedInt) {
    const wasmBytes = parseBytes(payloadB64);
    if (typeof WebAssembly !== "undefined" && typeof WebAssembly.instantiate === "function") {
        try {
            const { instance } = await WebAssembly.instantiate(wasmBytes);
            const memory = instance.exports.memory;
            if (memory) {
                if (memory.buffer.byteLength === 0 && memory.grow) memory.grow(1);
                const mem = new Uint8Array(memory.buffer);
                const len = frag1.length;
                const p1 = 1000, p2 = p1 + len, p3 = p2 + len, out = p3 + len;
                mem.set(frag1, p1); mem.set(frag2, p2); mem.set(tokenKey, p3);
                instance.exports._s(seedInt);
                instance.exports._r(p1, p2, p3, out, len);
                const result = new Uint8Array(len);
                result.set(mem.subarray(out, out + len));
                return result;
            }
        } catch (e) {
            console.warn("[FlixCloud] Native WASM failed:", e.message);
        }
    }
    console.log("[FlixCloud] Using WASM interpreter");
    const bodies = _wasmFunctionBodies(wasmBytes);
    const len = frag1.length;
    const memory = new Uint8Array(4096 + len * 4);
    const p1 = 1000, p2 = p1 + len, p3 = p2 + len, out = p3 + len;
    memory.set(frag1, p1); memory.set(frag2, p2); memory.set(tokenKey, p3);
    const ok = _executeWasmBody(bodies[1], [p1, p2, p3, out, len], [seedInt], memory);
    if (!ok) throw new Error("WASM execution failed");
    const result = new Uint8Array(len);
    result.set(memory.subarray(out, out + len));
    return result;
}

function _wasmFunctionBodies(bytes) {
    const bodies = []; let cursor = 8;
    const readUleb = () => {
        let res = 0, shift = 0;
        while (cursor < bytes.length) {
            const b = bytes[cursor++];
            res |= (b & 0x7f) << shift;
            if ((b & 0x80) === 0) break;
            shift += 7;
        }
        return res;
    };
    while (cursor < bytes.length) {
        const id = bytes[cursor++];
        const size = readUleb();
        const end = cursor + size;
        if (id === 10) {
            const count = readUleb();
            for (let i = 0; i < count; i++) {
                const bSize = readUleb();
                bodies.push(bytes.subarray(cursor, cursor + bSize));
                cursor += bSize;
            }
            break;
        }
        cursor = end;
    }
    return bodies;
}

function _executeWasmBody(body, params, globals, memory) {
    let pc = 0;
    const readUleb = () => {
        let res = 0, shift = 0;
        while (pc < body.length) {
            const b = body[pc++];
            res |= (b & 0x7f) << shift;
            if ((b & 0x80) === 0) break;
            shift += 7;
        }
        return res;
    };
    const readSleb = () => {
        let res = 0, shift = 0, b = 0;
        do { b = body[pc++]; res |= (b & 0x7f) << shift; shift += 7; } while ((b & 0x80) !== 0);
        if (shift < 32 && (b & 0x40) !== 0) res |= (~0 << shift);
        return res | 0;
    };
    const locals = params.slice();
    const lCount = readUleb();
    for (let i = 0; i < lCount; i++) {
        const c = readUleb(); pc++;
        for (let j = 0; j < c; j++) locals.push(0);
    }
    const stack = []; const cStack = []; let steps = 0;
    while (pc < body.length && steps++ < 100000) {
        const op = body[pc++];
        switch (op) {
            case 0x02: case 0x03: pc++; cStack.push({ isLoop: op === 0x03, startPc: pc }); break;
            case 0x0b: if (cStack.length === 0) return true; cStack.pop(); break;
            case 0x20: stack.push(locals[readUleb()] | 0); break;
            case 0x21: locals[readUleb()] = stack.pop() || 0; break;
            case 0x23: stack.push(globals[readUleb()] | 0); break;
            case 0x41: stack.push(readSleb()); break;
            case 0x2d: { readUleb(); const off = readUleb(); const addr = (stack.pop() || 0) + off; stack.push(memory[addr] || 0); break; }
            case 0x3a: { readUleb(); const off = readUleb(); const val = stack.pop() || 0; const addr = (stack.pop() || 0) + off; memory[addr] = val & 0xff; break; }
            case 0x4f: { const r = (stack.pop() || 0) >>> 0, l = (stack.pop() || 0) >>> 0; stack.push(l >= r ? 1 : 0); break; }
            case 0x6a: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push((l + r) | 0); break; }
            case 0x6b: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push((l - r) | 0); break; }
            case 0x6c: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push(Math.imul(l, r)); break; }
            case 0x71: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push(l & r); break; }
            case 0x72: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push(l | r); break; }
            case 0x73: { const r = stack.pop() || 0, l = stack.pop() || 0; stack.push(l ^ r); break; }
            case 0x74: { const s = (stack.pop() || 0) & 31, v = stack.pop() || 0; stack.push(v << s); break; }
            case 0x76: { const s = (stack.pop() || 0) & 31, v = stack.pop() || 0; stack.push(v >>> s); break; }
        }
    }
    return true;
}

function uint8ArrayToWordArray(arr) {
    const CryptoJS = require('crypto-js');
    const words = [];
    for (let i = 0; i < arr.length; i++) {
        words[i >>> 2] |= (arr[i] & 0xff) << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, arr.length);
}

async function decryptAesCbcUrl(rawKey, ivVal, cipherB64, seed) {
    const CryptoJS = require('crypto-js');
    const salt = CryptoJS.enc.Utf8.parse(seed);
    const passphrase = uint8ArrayToWordArray(rawKey);
    const ivBytes = parseBytes(ivVal);
    const iv = uint8ArrayToWordArray(ivBytes);
    
    const derivedKey = CryptoJS.PBKDF2(passphrase, salt, {
        keySize: 256 / 32,
        iterations: 1000,
        hasher: CryptoJS.algo.SHA256
    });

    const keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        keyBytes[i] = (derivedKey.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }

    for (let i = 0; i < 32; i++) {
        keyBytes[i] ^= seed.charCodeAt(i % seed.length);
    }

    const finalKey = CryptoJS.SHA256(uint8ArrayToWordArray(keyBytes));

    const decrypted = CryptoJS.AES.decrypt(cipherB64, finalKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) throw new Error("Decryption failed (result empty)");
    return result.trim();
}

async function sha256Hex(text) {
    const CryptoJS = require('crypto-js');
    return CryptoJS.SHA256(text).toString(CryptoJS.enc.Hex);
}
