import { base64ToBytes, bytesToHex, utf8Decode, utf8Encode } from './bytes.js';

function requireWebCrypto() {
    if (typeof crypto === "undefined" || !crypto.subtle) {
        throw new Error("Web Crypto is required for FlixCloud extraction");
    }
}

export async function sha256Hex(text) {
    requireWebCrypto();
    const digest = await crypto.subtle.digest("SHA-256", utf8Encode(text));
    return bytesToHex(new Uint8Array(digest));
}

export async function deriveFieldMap(seed) {
    let first = seed;
    for (let i = 0; i < 3; i++) {
        first = await sha256Hex(first + String(i));
    }

    let second = first;
    for (let i = 0; i < 3; i++) {
        second = await sha256Hex(second + String(i));
    }

    return {
        videoField: `vf_${first.substring(0, 8)}`,
        keyField: `kf_${first.substring(8, 16)}`,
        ivField: `ivf_${first.substring(16, 24)}`,
        containerName: `cd_${first.substring(24, 32)}`,
        arrayName: `ad_${first.substring(32, 40)}`,
        objectName: `od_${first.substring(40, 48)}`,
        tokenField: `${first.substring(48, 64)}_${first.substring(56, 64)}`,
        keyFrag2Field: `${second.substring(0, 16)}_${second.substring(16, 24)}`
    };
}

export function extractObfuscatedCryptoData(data, fieldMap) {
    const container = data && data[fieldMap.containerName];
    const arr = container && container[fieldMap.arrayName];
    const obj = arr && arr[0] && arr[0][fieldMap.objectName];
    if (!obj || !obj[fieldMap.keyField] || !obj[fieldMap.ivField]) {
        throw new Error("Invalid FlixCloud crypto data");
    }
    return {
        frag1B64: obj[fieldMap.keyField],
        ivB64: obj[fieldMap.ivField]
    };
}

export async function runWasmTransform(payloadB64, frag1, frag2, tokenKey, seedInt) {
    if (typeof WebAssembly === "undefined" || typeof WebAssembly.instantiate !== "function") {
        throw new Error("WebAssembly.instantiate is required for FlixCloud extraction");
    }

    const wasmBytes = base64ToBytes(payloadB64);
    const instance = (await WebAssembly.instantiate(wasmBytes, {})).instance;
    const exports = instance.exports;
    const memory = exports.memory;
    if (!memory) throw new Error("FlixCloud WASM memory missing");
    if (memory.buffer.byteLength === 0 && memory.grow) memory.grow(1);

    const inputLength = frag1.length;
    const p1 = 1000;
    const p2 = p1 + inputLength;
    const p3 = p2 + inputLength;
    const out = p3 + inputLength;
    const mem = new Uint8Array(memory.buffer);

    mem.set(frag1, p1);
    mem.set(frag2, p2);
    mem.set(tokenKey, p3);
    exports._s(seedInt);
    exports._r(p1, p2, p3, out, inputLength);

    const result = new Uint8Array(inputLength);
    result.set(mem.subarray(out, out + inputLength));
    return result;
}

export async function decryptAesCbcUrl(rawKey, ivB64, cipherB64, seed) {
    requireWebCrypto();

    const pbkdf2Key = await crypto.subtle.importKey(
        "raw",
        rawKey,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: utf8Encode(seed),
            iterations: 1000,
            hash: "SHA-256"
        },
        pbkdf2Key,
        256
    );

    const keyBytes = new Uint8Array(derivedBits);
    for (let i = 0; i < 32; i++) {
        keyBytes[i] ^= seed.charCodeAt(i % seed.length);
    }

    const digest = await crypto.subtle.digest("SHA-256", keyBytes);
    const aesKey = await crypto.subtle.importKey(
        "raw",
        new Uint8Array(digest),
        { name: "AES-CBC" },
        false,
        ["decrypt"]
    );

    const plain = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv: base64ToBytes(ivB64) },
        aesKey,
        base64ToBytes(cipherB64)
    );

    return utf8Decode(new Uint8Array(plain)).trim();
}
