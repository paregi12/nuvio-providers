/**
 * Normalizes a string for comparison.
 * Keeps only lowercase alphanumeric characters and single spaces.
 */
export function normalize(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Replace non-alphanumeric with space
        .replace(/\s+/g, ' ')     // Collapse multiple spaces
        .trim();
}

/**
 * Calculates similarity between two strings using Sorensen-Dice coefficient.
 * Returns a value between 0 and 1.
 */
export function getSimilarity(str1, str2) {
    const s1 = normalize(str1).replace(/\s+/g, '');
    const s2 = normalize(str2).replace(/\s+/g, '');

    if (s1 === s2) return 1;
    if (s1.length < 2 || s2.length < 2) return 0;

    const bigrams1 = new Set();
    for (let i = 0; i < s1.length - 1; i++) {
        bigrams1.add(s1.substring(i, i + 2));
    }

    let intersect = 0;
    for (let i = 0; i < s2.length - 1; i++) {
        const bigram = s2.substring(i, i + 2);
        if (bigrams1.has(bigram)) {
            intersect++;
        }
    }

    return (2 * intersect) / (s1.length + s2.length - 2);
}
