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