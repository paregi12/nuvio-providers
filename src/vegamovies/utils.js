/**
 * Utility functions for VegaMovies
 */

export function cleanTitle(title) {
    return title.replace(/Download\s+/i, '').trim();
}
