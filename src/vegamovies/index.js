import cheerio from 'cheerio-without-node-native';
import { fetchText } from './http.js';
import { getMetadata } from './tmdb.js';
import { searchProvider } from './search.js';
import { extractVCloud } from './extractor.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        const meta = await getMetadata(tmdbId, mediaType);
        if (!meta) return [];
        
        const { title, year } = meta;
        console.log(`[VegaMovies] Request: ${title} (${year}) S${season}E${episode}`);

        const targetLink = await searchProvider(title, year, mediaType, season);
        if (!targetLink) {
            console.log("[VegaMovies] No results found on provider site.");
            return [];
        }

        console.log(`[VegaMovies] Found page: ${targetLink}`);
        const pageHtml = await fetchText(targetLink);
        const $page = cheerio.load(pageHtml);
        const streams = [];
        
        if (mediaType === 'movie') {
            const downloadLinks = [];
            $page('p > a, h3 > a, h4 > a').each((i, el) => {
                const link = $page(el).attr('href');
                const text = $page(el).text();
                if (link && (text.includes("Download") || text.includes("V-Cloud") || text.includes("480p") || text.includes("720p") || text.includes("1080p"))) {
                    if (link.startsWith("http")) {
                        downloadLinks.push({ text: text, link: link });
                    }
                }
            });

            for (const item of downloadLinks) {
                try {
                     if (item.link.includes("vcloud") || item.link.includes("hubcloud")) {
                          const extracted = await extractVCloud(item.link);
                          streams.push(...extracted);
                     } else {
                         const interHtml = await fetchText(item.link);
                         const $inter = cheerio.load(interHtml);
                         const cloudLinks = [];
                         $inter('a').each((j, el2) => {
                             const sourceLink = $inter(el2).attr('href');
                             const sourceText = $inter(el2).text() || "";
                             if (sourceLink && (sourceText.includes("V-Cloud") || sourceLink.includes('vcloud') || sourceLink.includes('hubcloud'))) {
                                 cloudLinks.push(sourceLink);
                             }
                         });
                         for (const cl of cloudLinks) {
                             const extracted = await extractVCloud(cl);
                             streams.push(...extracted);
                         }
                     }
                } catch (e) {}
            }
        } else {
            const seasonHeaders = $page('h3, h4, h5').filter((i, el) => {
                const text = $page(el).text();
                if (text.includes("Zip")) return false;
                return text.toLowerCase().includes(`season ${season}`) || text.toLowerCase().includes(`season 0${season}`);
            });
            
            const candidateLinks = [];
            seasonHeaders.each((i, header) => {
                let nextNode = $page(header).next();
                let attempts = 0;
                while (nextNode.length && attempts < 5) {
                    if (nextNode.is('h3, h4, h5')) break;
                    const links = nextNode.find('a');
                    links.each((j, link) => {
                        const href = $page(link).attr('href');
                        const text = $page(link).text();
                        if (href && (text.includes("V-Cloud") || text.includes("Episode") || text.includes("Download"))) {
                             candidateLinks.push({ text: text, link: href });
                        }
                    });
                    nextNode = nextNode.next();
                    attempts++;
                }
            });

            for (const item of candidateLinks) {
                try {
                     const interHtml = await fetchText(item.link);
                     const $inter = cheerio.load(interHtml);
                     const vcloudLinks = [];
                     $inter('p > a').each((j, el) => {
                         const href = $inter(el).attr('href');
                         if (href && (href.includes('vcloud') || href.includes('hubcloud'))) {
                             vcloudLinks.push(href);
                         }
                     });
                     
                     const targetIndex = episode - 1;
                     if (targetIndex >= 0 && targetIndex < vcloudLinks.length) {
                         const extracted = await extractVCloud(vcloudLinks[targetIndex]);
                         streams.push(...extracted);
                     }
                } catch (e) {}
            }
        }
        
        return streams;
    } catch (error) {
        console.error(`[VegaMovies] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
