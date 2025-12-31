/**
 * UHDMovies - Utility Functions
 */

/**
 * Parse quality from text
 * @param {string} text - Text containing quality info
 * @returns {string} Normalized quality string
 */
export function parseQuality(text) {
    const normalized = text.toUpperCase();

    if (normalized.includes('2160') || normalized.includes('4K') || normalized.includes('UHD')) {
        return '2160p';
    }
    if (normalized.includes('1080')) {
        return '1080p';
    }
    if (normalized.includes('720')) {
        return '720p';
    }
    if (normalized.includes('480')) {
        return '480p';
    }
    if (normalized.includes('HDR')) {
        return 'HDR';
    }

    return 'Unknown';
}

/**
 * Clean title for matching
 * @param {string} title - Raw title
 * @returns {string} Cleaned title
 */
export function cleanTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract year from title
 * @param {string} title - Title possibly containing year
 * @returns {number|null} Year or null
 */
export function extractYear(title) {
    const match = title.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0]) : null;
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Delay execution
 * @param {number} ms - Milliseconds to wait
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
