export function decrypt(str) {
    if (!str.startsWith('--')) return str;
    return str.substring(2).match(/.{2}/g).map(m => String.fromCharCode(parseInt(m, 16) ^ 56)).join('');
}

export function normalize(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '');
}

export function isMatch(title1, title2) {
    if (!title1 || !title2) return false;
    const n1 = normalize(title1);
    const n2 = normalize(title2);
    return n1 === n2 || n1.includes(n2) || n2.includes(n1);
}
