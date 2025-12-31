/**
 * UHDMovies - Extractors
 * 
 * Link extractors specific to UHDMovies sources
 */

const cheerio = require('cheerio-without-node-native');

/**
 * Extract direct link from HubCloud
 */
export async function extractHubCloud(url) {
    console.log('[UHDMovies] Extracting HubCloud:', url);

    try {
        // Step 1: Get the hub page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://uhdmovies.rip/'
            }
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        // Step 2: Find the direct download link
        let directUrl = null;

        // Look for various patterns
        $('a[href*=".mkv"], a[href*=".mp4"]').each((_, el) => {
            directUrl = $(el).attr('href');
        });

        // Alternative: look for download button
        if (!directUrl) {
            const downloadBtn = $('a.btn-download, a[class*="download"]').attr('href');
            if (downloadBtn) {
                directUrl = downloadBtn;
            }
        }

        // Alternative: parse from script
        if (!directUrl) {
            const scripts = $('script').text();
            const urlMatch = scripts.match(/https?:\/\/[^"'\s]+\.(mkv|mp4)/i);
            if (urlMatch) {
                directUrl = urlMatch[0];
            }
        }

        if (directUrl) {
            return {
                url: directUrl,
                headers: {
                    'Referer': url,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };
        }

        return null;
    } catch (error) {
        console.error('[UHDMovies] HubCloud extraction failed:', error.message);
        return null;
    }
}

/**
 * Extract from Google Drive links
 */
export async function extractGDrive(url) {
    console.log('[UHDMovies] Extracting GDrive:', url);

    try {
        // Extract file ID from URL
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (!fileIdMatch) return null;

        const fileId = fileIdMatch[1];
        const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

        return {
            url: directUrl,
            headers: {}
        };
    } catch (error) {
        console.error('[UHDMovies] GDrive extraction failed:', error.message);
        return null;
    }
}

/**
 * Extract from PixelDrain
 */
export async function extractPixelDrain(url) {
    const fileId = url.split('/').pop();
    return {
        url: `https://pixeldrain.com/api/file/${fileId}`,
        headers: {}
    };
}
