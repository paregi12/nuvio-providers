import CryptoJS from 'crypto-js';

// Ported minimal AES-GCM implementation for environments without crypto.subtle (like Hermes)
// This implementation uses CryptoJS for the underlying AES-CTR and implements GHASH for GCM.

const KEY = new Uint8Array([1,83,160,158,58,198,82,210,133,247,202,33,80,94,227,179,162,130,9,101,19,111,180,220,156,145,144,6,150,65,25,14]);
const AT = new Uint8Array([166,215,77,130,106,46,255,237,4,39,65,214,6,17,101,113,101,252,253,240,204,202,234,19,69,132,45,76,82,15,17,205,14,190,42,67,116,216,73,243,79,171,41,4,233,158,71,45,3,227,49,8,130,167,70,179,211,169,152,21,255,230,7,100]);
const AU = new Uint8Array([38,87,230,128,78,56,110,153,220,39,166,236,176,8,95,103,21,153,47,238,168,225,185,232,198,117,74,158,160,219,128,105,70,224,21,162,220,23,217,99,14,142,214,41,71,216,230,252]);

const b = (() => {
    const f = n => (n ^ 1553869343) + (n << 7 ^ n >>> 11) & 4294967295;
    const g = n => n * 2654435769 >>> 0;
    const x = n => { let o = n; o ^= o << 13; o ^= o >>> 17; o ^= o << 5; return (o >>> 0) % 256 };
    const u = (n, o) => (n << o | n >>> 8 - o) & 255;
    const n = new Uint8Array(256);
    for (let o = 0; o < 256; o++) {
        const e = o ^ 170, c = x(e), t = g(e + 23130), s = f(o + c) & 255;
        n[o] = (c ^ t & 255 ^ s ^ o * 19) & 255
    }
    for (let o = 0; o < 11; o++)
        for (let e = 0; e < 256; e++) {
            const c = n[e], t = n[(e + 37) % 256], s = n[(e + 73) % 256], a = n[(e + 139) % 256], r = u(c, 3) ^ u(t, 5) ^ u(s, 7), _ = f(c + o) & 255;
            n[e] = (r ^ a ^ _ ^ o * 17 + e * 23) & 255
        }
    for (let o = 0; o < 128; o++) {
        const e = 255 - o, c = n[o] + n[e] & 255, t = (n[o] ^ n[e]) & 255;
        n[o] = (u(c, 2) ^ t) & 255, n[e] = (u(t, 3) ^ c) & 255
    }
    return n;
})();

const T = (n, o, e) => {
    const c = new Uint8Array(n.length);
    for (let t = 0; t < n.length; t++) {
        const s = o[t % o.length], a = o[(t + 7) % o.length], r = o[(t + 13) % o.length], _ = e[t % e.length], i = e[(t + 11) % e.length], h = b[t * 7 % 256];
        c[t] = (n[t] ^ s ^ a ^ r ^ _ ^ i ^ h ^ t * 23) & 255
    }
    return c
};

const q = n => {
    const o = new Uint8Array(n.length);
    for (let e = 0; e < n.length; e++) {
        const c = n[e], t = e * 23 & 255;
        o[e] = (c << 4 | c >>> 4) ^ t & 255
    }
    return o
};

const m = n => btoa(n).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

// Simple polyfill for AES-GCM encryption using CryptoJS CTR and manual GHASH calculation.
// Note: This is specifically optimized for encryption required by the AnimeX provider.
async function encryptGCM(data, key, iv) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-GCM" }, false, ["encrypt"]);
        const result = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, data);
        return new Uint8Array(result);
    }

    // Fallback using CryptoJS
    const keyWA = CryptoJS.lib.WordArray.create(key);
    const ivWA = CryptoJS.lib.WordArray.create(iv);
    const dataWA = CryptoJS.lib.WordArray.create(data);

    // AES-GCM starts with CTR encryption
    // The counter starts at IV || 00000002
    const counter = new Uint8Array(16);
    counter.set(iv);
    counter[15] = 2;
    const counterWA = CryptoJS.lib.WordArray.create(counter);

    const encrypted = CryptoJS.AES.encrypt(dataWA, keyWA, {
        iv: counterWA,
        mode: CryptoJS.mode.CTR,
        padding: CryptoJS.pad.NoPadding
    });

    const cipherBuffer = encrypted.ciphertext;
    const cipherBytes = wordToByteArray(cipherBuffer.words, cipherBuffer.sigBytes);

    // GCM also requires a MAC (Auth Tag)
    // For AnimeX sources API, the tag is appended to the ciphertext.
    // In our simplified version, we calculate the tag using GHASH logic.
    const hBuffer = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(new Uint8Array(16)), keyWA, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.NoPadding
    }).ciphertext;
    
    const hBytes = wordToByteArray(hBuffer.words, hBuffer.sigBytes);
    const tag = calculateTag(cipherBytes, hBytes, iv, keyWA);

    const finalResult = new Uint8Array(cipherBytes.length + tag.length);
    finalResult.set(cipherBytes);
    finalResult.set(tag, cipherBytes.length);
    
    return finalResult;
}

function wordToByteArray(words, length) {
    const array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        array[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return array;
}

function calculateTag(ciphertext, h, iv, keyWA) {
    // Simplified GHASH for 128-bit tag
    let y = new Uint8Array(16);
    
    const blocks = Math.ceil(ciphertext.length / 16);
    for (let i = 0; i < blocks; i++) {
        const block = new Uint8Array(16);
        block.set(ciphertext.slice(i * 16, (i + 1) * 16));
        for (let j = 0; j < 16; j++) y[j] ^= block[j];
        y = gmultiply(y, h);
    }
    
    // Final block: bit lengths
    const lenBlock = new Uint8Array(16);
    const cipherLenBits = ciphertext.length * 8;
    // We only care about low 32 bits for most use cases
    lenBlock[15] = cipherLenBits & 0xff;
    lenBlock[14] = (cipherLenBits >>> 8) & 0xff;
    lenBlock[13] = (cipherLenBits >>> 16) & 0xff;
    lenBlock[12] = (cipherLenBits >>> 24) & 0xff;
    
    for (let j = 0; j < 16; j++) y[j] ^= lenBlock[j];
    y = gmultiply(y, h);
    
    // Encrypt J0 (IV || 00000001) to get the final tag masking
    const j0 = new Uint8Array(16);
    j0.set(iv);
    j0[15] = 1;
    
    const ej0Buffer = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(j0), keyWA, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.NoPadding
    }).ciphertext;
    const ej0 = wordToByteArray(ej0Buffer.words, ej0Buffer.sigBytes);
    
    for (let j = 0; j < 16; j++) y[j] ^= ej0[j];
    return y;
}

function gmultiply(x, y) {
    const res = new Uint8Array(16);
    const v = new Uint8Array(y);
    for (let i = 0; i < 128; i++) {
        if ((x[i >>> 3] >>> (7 - (i % 8))) & 1) {
            for (let j = 0; j < 16; j++) res[j] ^= v[j];
        }
        const msb = v[15] & 1;
        for (let j = 15; j > 0; j--) {
            v[j] = (v[j] >>> 1) | ((v[j - 1] & 1) << 7);
        }
        v[0] >>>= 1;
        if (msb) v[0] ^= 0xe1;
    }
    return res;
}

export async function encrypt(n) {
    const iv = (typeof crypto !== 'undefined' && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(12)) : new Uint8Array(12).map(() => Math.floor(Math.random() * 256)));
    const s = new TextEncoder().encode(n);
    const a = q(s);
    const r = T(a, AT, AU);
    const encrypted = await encryptGCM(r, KEY, iv);
    const i = new Uint8Array(iv.length + encrypted.length);
    i.set(iv);
    i.set(encrypted, iv.length);
    
    // Fix: Avoid spread operator for potentially large arrays
    return m(Array.from(i).map(b => String.fromCharCode(b)).join(''));
}

export async function generateId(n, o = {}) {
    const e = { id: n, ...o, timestamp: Date.now() };
    return await encrypt(JSON.stringify(e));
}

export function normalize(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function isMatch(title1, title2) {
    const n1 = normalize(title1);
    const n2 = normalize(title2);
    return n1.includes(n2) || n2.includes(n1);
}
