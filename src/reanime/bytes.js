export function utf8Encode(input) {
    const text = String(input || "");
    const out = [];
    for (let i = 0; i < text.length; i++) {
        let code = text.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
            const next = text.charCodeAt(i + 1);
            if (next >= 0xdc00 && next <= 0xdfff) {
                code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
                i++;
            }
        }
        if (code < 0x80) out.push(code);
        else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
    return new Uint8Array(out);
}

export function utf8Decode(bytes) {
    if (typeof TextDecoder !== "undefined") {
        return new TextDecoder().decode(bytes);
    }

    let out = "";
    for (let i = 0; i < bytes.length;) {
        const b0 = bytes[i++];
        if (b0 < 0x80) {
            out += String.fromCharCode(b0);
        } else if (b0 >= 0xc0 && b0 < 0xe0) {
            const b1 = bytes[i++] & 0x3f;
            out += String.fromCharCode(((b0 & 0x1f) << 6) | b1);
        } else if (b0 >= 0xe0 && b0 < 0xf0) {
            const b1 = bytes[i++] & 0x3f;
            const b2 = bytes[i++] & 0x3f;
            out += String.fromCharCode(((b0 & 0x0f) << 12) | (b1 << 6) | b2);
        } else {
            const b1 = bytes[i++] & 0x3f;
            const b2 = bytes[i++] & 0x3f;
            const b3 = bytes[i++] & 0x3f;
            let code = ((b0 & 0x07) << 18) | (b1 << 12) | (b2 << 6) | b3;
            code -= 0x10000;
            out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
        }
    }
    return out;
}

export function base64ToBytes(value) {
    const binary = atob(String(value || "").replace(/\s+/g, ""));
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        out[i] = binary.charCodeAt(i) & 0xff;
    }
    return out;
}

export function bytesToHex(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length; i++) {
        out += bytes[i].toString(16).padStart(2, "0");
    }
    return out;
}
