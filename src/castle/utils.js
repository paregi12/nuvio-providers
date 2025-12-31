/**
 * Castle Provider - Utility Functions
 */

/**
 * Get quality value for sorting (higher = better)
 */
export function getQualityValue(quality) {
    if (!quality) return 0;

    const cleanQuality = quality.toString().toLowerCase()
        .replace(/^(sd|hd|fhd|uhd|4k)\s*/i, '')
        .replace(/p$/, '')
        .trim();

    const qualityMap = {
        '4k': 2160,
        '2160': 2160,
        '1440': 1440,
        '1080': 1080,
        '720': 720,
        '480': 480,
        '360': 360,
        '240': 240
    };

    if (qualityMap[cleanQuality]) {
        return qualityMap[cleanQuality];
    }

    const numQuality = parseInt(cleanQuality);
    if (!isNaN(numQuality) && numQuality > 0) {
        return numQuality;
    }

    return 0;
}

/**
 * Format file size from bytes
 */
export function formatSize(sizeValue) {
    if (typeof sizeValue !== 'number' || sizeValue <= 0) {
        return 'Unknown';
    }

    if (sizeValue > 1000000000) {
        return `${(sizeValue / 1000000000).toFixed(2)} GB`;
    }

    return `${(sizeValue / 1000000).toFixed(0)} MB`;
}

/**
 * Map resolution number to quality string
 */
export function resolutionToQuality(resolution) {
    const qualityMap = {
        1: '480p',
        2: '720p',
        3: '1080p'
    };

    return qualityMap[resolution] || `${resolution}p`;
}
