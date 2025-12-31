/**
 * 4KHDHub Provider - Extractor Functions
 */

const cheerio = require('cheerio-without-node-native');
import { fetchText } from './http.js';
import { atob, rot13Cipher, parseBytes, formatBytes } from './utils.js';

/**
 * Resolve redirect URL (decode obfuscated links)
 */
export async function resolveRedirectUrl(redirectUrl) {
    const redirectHtml = await fetchText(redirectUrl);
    if (!redirectHtml) return null;

    try {
        const redirectDataMatch = redirectHtml.match(/'o','(.*?)'/);
        if (!redirectDataMatch) return null;

        const step1 = atob(redirectDataMatch[1]);
        const step2 = atob(step1);
        const step3 = rot13Cipher(step2);
        const step4 = atob(step3);
        const redirectData = JSON.parse(step4);

        if (redirectData && redirectData.o) {
            return atob(redirectData.o);
        }
    } catch (e) {
        console.log(`[4KHDHub] Error resolving redirect: ${e.message}`);
    }

    return null;
}

/**
 * Extract source results from download item
 */
export async function extractSourceResults($, el) {
    const localHtml = $(el).html();
    const sizeMatch = localHtml.match(/([\d.]+ ?[GM]B)/);
    const heightMatch = localHtml.match(/\d{3,}p/);
    const title = $(el).find('.file-title, .episode-file-title').text().trim();

    let height = heightMatch ? parseInt(heightMatch[0]) : 0;

    // Check for 4K in title
    if (height === 0 && (title.includes('4K') || title.includes('4k') || localHtml.includes('4K') || localHtml.includes('4k'))) {
        height = 2160;
    }

    const meta = {
        bytes: sizeMatch ? parseBytes(sizeMatch[1]) : 0,
        height,
        title
    };

    // Try HubCloud link first
    const hubCloudLink = $(el).find('a')
        .filter((_, a) => $(a).text().includes('HubCloud'))
        .attr('href');

    if (hubCloudLink) {
        const resolved = await resolveRedirectUrl(hubCloudLink);
        return { url: resolved, meta };
    }

    // Try HubDrive link
    const hubDriveLink = $(el).find('a')
        .filter((_, a) => $(a).text().includes('HubDrive'))
        .attr('href');

    if (hubDriveLink) {
        const resolvedDrive = await resolveRedirectUrl(hubDriveLink);
        if (resolvedDrive) {
            const hubDriveHtml = await fetchText(resolvedDrive);
            if (hubDriveHtml) {
                const $2 = cheerio.load(hubDriveHtml);
                const innerCloudLink = $2('a:contains("HubCloud")').attr('href');
                if (innerCloudLink) {
                    return { url: innerCloudLink, meta };
                }
            }
        }
    }

    return null;
}

/**
 * Extract streams from HubCloud page
 */
export async function extractHubCloud(hubCloudUrl, baseMeta) {
    if (!hubCloudUrl) return [];

    const redirectHtml = await fetchText(hubCloudUrl, { headers: { Referer: hubCloudUrl } });
    if (!redirectHtml) return [];

    const redirectUrlMatch = redirectHtml.match(/var url ?= ?'(.*?)'/);
    if (!redirectUrlMatch) return [];

    const finalLinksUrl = redirectUrlMatch[1];
    const linksHtml = await fetchText(finalLinksUrl, { headers: { Referer: hubCloudUrl } });
    if (!linksHtml) return [];

    const $ = cheerio.load(linksHtml);
    const results = [];

    const sizeText = $('#size').text();
    const titleText = $('title').text().trim();

    const currentMeta = {
        ...baseMeta,
        bytes: parseBytes(sizeText) || baseMeta.bytes,
        title: titleText || baseMeta.title
    };

    $('a').each((_, el) => {
        const text = $(el).text();
        const href = $(el).attr('href');
        if (!href) return;

        if (text.includes('FSL') || text.includes('Download File')) {
            results.push({
                source: 'FSL',
                url: href,
                meta: currentMeta
            });
        } else if (text.includes('PixelServer')) {
            const pixelUrl = href.replace('/u/', '/api/file/');
            results.push({
                source: 'PixelServer',
                url: pixelUrl,
                meta: currentMeta
            });
        }
    });

    return results;
}

// Re-export utils for index.js
export { parseBytes, formatBytes };
