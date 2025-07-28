#!/usr/bin/env node

const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline');
const { URL } = require('url');

// Constants
const DAHMER_MOVIES_API = 'https://a.111477.xyz';
const TIMEOUT = 60000; // 60 seconds

// Quality mapping
const Qualities = {
    Unknown: 0,
    P144: 144,
    P240: 240,
    P360: 360,
    P480: 480,
    P720: 720,
    P1080: 1080,
    P1440: 1440,
    P2160: 2160
};

// Utility functions
function getEpisodeSlug(season = null, episode = null) {
    if (season === null && episode === null) {
        return ['', ''];
    }
    const seasonSlug = season < 10 ? `0${season}` : `${season}`;
    const episodeSlug = episode < 10 ? `0${episode}` : `${episode}`;
    return [seasonSlug, episodeSlug];
}

function getIndexQuality(str) {
    if (!str) return Qualities.Unknown;
    const match = str.match(/(\d{3,4})[pP]/);
    return match ? parseInt(match[1]) : Qualities.Unknown;
}

function getIndexQualityTags(str, fullTag = false) {
    if (!str) return '';
    
    if (fullTag) {
        const match = str.match(/(.*)\.(?:mkv|mp4|avi)/i);
        return match ? match[1].trim() : str;
    } else {
        const match = str.match(/\d{3,4}[pP]\.?(.*?)\.(mkv|mp4|avi)/i);
        return match ? match[1].replace(/\./g, ' ').trim() : str;
    }
}

function encodeUrl(url) {
    try {
        return encodeURI(url);
    } catch (e) {
        return url;
    }
}

function decode(input) {
    try {
        return decodeURIComponent(input);
    } catch (e) {
        return input;
    }
}

// Main Dahmer Movies fetcher function
async function invokeDahmerMovies(title, year, season = null, episode = null) {
    try {
        console.log(`\n🎬 Searching for: ${title} (${year})${season ? ` Season ${season}` : ''}${episode ? ` Episode ${episode}` : ''}`);
        console.log('━'.repeat(60));
        
        // Construct URL based on content type
        const url = season === null 
            ? `${DAHMER_MOVIES_API}/movies/${title.replace(/:/g, '')} (${year})/`
            : `${DAHMER_MOVIES_API}/tvs/${title.replace(/:/g, ' -')}/Season ${season}/`;
        
        console.log(`🔍 Fetching from: ${url}`);
        
        // Make request with timeout
        const response = await axios.get(url, { 
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (response.status !== 200) {
            console.log(`❌ Request failed with status: ${response.status}`);
            return [];
        }
        
        // Parse HTML
        const $ = cheerio.load(response.data);
        
        // Extract all links
        const paths = [];
        $('a').each((index, element) => {
            const text = $(element).text().trim();
            const href = $(element).attr('href');
            if (text && href) {
                paths.push({ text, href });
            }
        });
        
        console.log(`📁 Found ${paths.length} total links`);
        
        // Filter based on content type
        let filteredPaths;
        if (season === null) {
            // For movies, filter by quality (1080p or 2160p)
            filteredPaths = paths.filter(path => 
                /(1080p|2160p)/i.test(path.text)
            );
            console.log(`🎥 Filtered to ${filteredPaths.length} movie links (1080p/2160p only)`);
        } else {
            // For TV shows, filter by season and episode
            const [seasonSlug, episodeSlug] = getEpisodeSlug(season, episode);
            const episodePattern = new RegExp(`S${seasonSlug}E${episodeSlug}`, 'i');
            filteredPaths = paths.filter(path => 
                episodePattern.test(path.text)
            );
            console.log(`📺 Filtered to ${filteredPaths.length} TV episode links (S${seasonSlug}E${episodeSlug})`);
        }
        
        if (filteredPaths.length === 0) {
            console.log('❌ No matching content found');
            return [];
        }
        
        // Process and return results
        const results = filteredPaths.map(path => {
            const quality = getIndexQuality(path.text);
            const tags = getIndexQualityTags(path.text);
            const fullUrl = decode(encodeUrl(url + path.href));
            
            return {
                source: 'DahmerMovies',
                name: `DahmerMovies ${tags}`,
                url: fullUrl,
                quality: quality,
                qualityName: `${quality}p`,
                tags: tags,
                referer: '',
                filename: path.text
            };
        });
        
        console.log(`\n✅ Successfully extracted ${results.length} streaming links:`);
        console.log('━'.repeat(60));
        
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.name}`);
            console.log(`   Quality: ${result.qualityName}`);
            console.log(`   File: ${result.filename}`);
            console.log(`   URL: ${result.url}`);
            console.log('');
        });
        
        return results;
        
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.log('❌ Request timeout - server took too long to respond');
        } else if (error.response) {
            console.log(`❌ Server error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
            console.log('❌ Network error - unable to reach server');
        } else {
            console.log(`❌ Error: ${error.message}`);
        }
        return [];
    }
}

// Browse available content
async function browseMovies(page = 1, limit = 20) {
    try {
        console.log('🎬 Browsing available movies...');
        const response = await axios.get(`${DAHMER_MOVIES_API}/movies/`, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const movies = [];
        
        $('a').each((index, element) => {
            const text = $(element).text().trim();
            const href = $(element).attr('href');
            if (text && href && text !== '../' && text.includes('(') && text.includes(')')) {
                const match = text.match(/^(.+?)\s*\((\d{4})\)\/?$/);
                if (match) {
                    movies.push({
                        title: match[1].trim(),
                        year: parseInt(match[2]),
                        fullName: text.replace('/', ''),
                        href: href
                    });
                }
            }
        });
        
        // Sort by year (newest first) and paginate
        movies.sort((a, b) => b.year - a.year);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedMovies = movies.slice(startIndex, endIndex);
        
        return {
            movies: paginatedMovies,
            total: movies.length,
            page: page,
            totalPages: Math.ceil(movies.length / limit)
        };
    } catch (error) {
        console.log(`❌ Error browsing movies: ${error.message}`);
        return { movies: [], total: 0, page: 1, totalPages: 0 };
    }
}

async function browseTVShows(page = 1, limit = 20) {
    try {
        console.log('📺 Browsing available TV shows...');
        const response = await axios.get(`${DAHMER_MOVIES_API}/tvs/`, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const tvShows = [];
        
        $('a').each((index, element) => {
            const text = $(element).text().trim();
            const href = $(element).attr('href');
            if (text && href && text !== '../' && !text.includes('.')) {
                const cleanName = text.replace('/', '').replace(' -', '');
                if (cleanName.length > 0) {
                    tvShows.push({
                        title: cleanName,
                        fullName: text.replace('/', ''),
                        href: href
                    });
                }
            }
        });
        
        // Sort alphabetically and paginate
        tvShows.sort((a, b) => a.title.localeCompare(b.title));
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedShows = tvShows.slice(startIndex, endIndex);
        
        return {
            tvShows: paginatedShows,
            total: tvShows.length,
            page: page,
            totalPages: Math.ceil(tvShows.length / limit)
        };
    } catch (error) {
        console.log(`❌ Error browsing TV shows: ${error.message}`);
        return { tvShows: [], total: 0, page: 1, totalPages: 0 };
    }
}

async function browseTVSeasons(showName) {
    try {
        console.log(`📺 Browsing seasons for: ${showName}`);
        const url = `${DAHMER_MOVIES_API}/tvs/${showName}/`;
        const response = await axios.get(url, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const seasons = [];
        
        $('a').each((index, element) => {
            const text = $(element).text().trim();
            const href = $(element).attr('href');
            if (text && href && text.startsWith('Season ')) {
                const seasonMatch = text.match(/Season\s+(\d+)/);
                if (seasonMatch) {
                    seasons.push({
                        seasonNumber: parseInt(seasonMatch[1]),
                        name: text.replace('/', ''),
                        href: href
                    });
                }
            }
        });
        
        seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
        return seasons;
    } catch (error) {
        console.log(`❌ Error browsing seasons: ${error.message}`);
        return [];
    }
}

// Interactive CLI interface
function createInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

function askQuestion(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function browseAndSelectContent(rl) {
    const mode = await askQuestion(rl, '🔍 Choose mode:\n1. Browse available movies\n2. Browse available TV shows\n3. Manual search\nEnter choice (1-3): ');
    
    if (mode === '1') {
        return await browseAndSelectMovie(rl);
    } else if (mode === '2') {
        return await browseAndSelectTVShow(rl);
    } else if (mode === '3') {
        return await manualSearch(rl);
    } else {
        console.log('❌ Invalid choice!');
        return null;
    }
}

async function browseAndSelectMovie(rl) {
    let page = 1;
    const limit = 10;
    
    while (true) {
        const movieData = await browseMovies(page, limit);
        
        if (movieData.movies.length === 0) {
            console.log('❌ No movies found!');
            return null;
        }
        
        console.log(`\n🎬 Available Movies (Page ${page}/${movieData.totalPages})`);
        console.log('━'.repeat(50));
        
        movieData.movies.forEach((movie, index) => {
            console.log(`${index + 1}. ${movie.title} (${movie.year})`);
        });
        
        console.log('\n📄 Navigation:');
        console.log('- Enter movie number to select');
        if (page > 1) console.log('- Type "prev" for previous page');
        if (page < movieData.totalPages) console.log('- Type "next" for next page');
        console.log('- Type "search" for manual search');
        console.log('- Type "quit" to exit');
        
        const choice = await askQuestion(rl, '\n👉 Your choice: ');
        
        if (choice.toLowerCase() === 'quit') {
            return null;
        } else if (choice.toLowerCase() === 'search') {
            return await manualSearch(rl);
        } else if (choice.toLowerCase() === 'next' && page < movieData.totalPages) {
            page++;
        } else if (choice.toLowerCase() === 'prev' && page > 1) {
            page--;
        } else {
            const movieIndex = parseInt(choice) - 1;
            if (movieIndex >= 0 && movieIndex < movieData.movies.length) {
                const selectedMovie = movieData.movies[movieIndex];
                return {
                    title: selectedMovie.title,
                    year: selectedMovie.year,
                    isTvShow: false
                };
            } else {
                console.log('❌ Invalid movie number!');
            }
        }
    }
}

async function browseAndSelectTVShow(rl) {
    let page = 1;
    const limit = 10;
    
    while (true) {
        const tvData = await browseTVShows(page, limit);
        
        if (tvData.tvShows.length === 0) {
            console.log('❌ No TV shows found!');
            return null;
        }
        
        console.log(`\n📺 Available TV Shows (Page ${page}/${tvData.totalPages})`);
        console.log('━'.repeat(50));
        
        tvData.tvShows.forEach((show, index) => {
            console.log(`${index + 1}. ${show.title}`);
        });
        
        console.log('\n📄 Navigation:');
        console.log('- Enter show number to select');
        if (page > 1) console.log('- Type "prev" for previous page');
        if (page < tvData.totalPages) console.log('- Type "next" for next page');
        console.log('- Type "search" for manual search');
        console.log('- Type "quit" to exit');
        
        const choice = await askQuestion(rl, '\n👉 Your choice: ');
        
        if (choice.toLowerCase() === 'quit') {
            return null;
        } else if (choice.toLowerCase() === 'search') {
            return await manualSearch(rl);
        } else if (choice.toLowerCase() === 'next' && page < tvData.totalPages) {
            page++;
        } else if (choice.toLowerCase() === 'prev' && page > 1) {
            page--;
        } else {
            const showIndex = parseInt(choice) - 1;
            if (showIndex >= 0 && showIndex < tvData.tvShows.length) {
                const selectedShow = tvData.tvShows[showIndex];
                
                // Browse seasons
                const seasons = await browseTVSeasons(selectedShow.fullName);
                if (seasons.length === 0) {
                    console.log('❌ No seasons found for this show!');
                    continue;
                }
                
                console.log(`\n📺 Available Seasons for ${selectedShow.title}:`);
                console.log('━'.repeat(50));
                seasons.forEach((season, index) => {
                    console.log(`${index + 1}. ${season.name}`);
                });
                
                const seasonChoice = await askQuestion(rl, '\n👉 Select season number: ');
                const seasonIndex = parseInt(seasonChoice) - 1;
                
                if (seasonIndex >= 0 && seasonIndex < seasons.length) {
                    const selectedSeason = seasons[seasonIndex];
                    const episode = await askQuestion(rl, '🔢 Enter episode number: ');
                    
                    if (!episode || isNaN(episode)) {
                        console.log('❌ Valid episode number is required!');
                        continue;
                    }
                    
                    return {
                        title: selectedShow.title,
                        year: new Date().getFullYear(), // Default year for TV shows
                        isTvShow: true,
                        season: selectedSeason.seasonNumber,
                        episode: parseInt(episode)
                    };
                } else {
                    console.log('❌ Invalid season number!');
                }
            } else {
                console.log('❌ Invalid show number!');
            }
        }
    }
}

async function searchMovies(searchTerm) {
    try {
        console.log(`🔍 Searching for movies containing: "${searchTerm}"`);
        const response = await axios.get(`${DAHMER_MOVIES_API}/movies/`, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const movies = [];
        
        $('a').each((index, element) => {
            const text = $(element).text().trim();
            const href = $(element).attr('href');
            if (text && href && text !== '../' && text.includes('(') && text.includes(')')) {
                const match = text.match(/^(.+?)\s*\((\d{4})\)\/?$/);
                if (match) {
                    const title = match[1].trim();
                    // Case-insensitive search
                    if (title.toLowerCase().includes(searchTerm.toLowerCase())) {
                        movies.push({
                            title: title,
                            year: parseInt(match[2]),
                            fullName: text.replace('/', ''),
                            href: href
                        });
                    }
                }
            }
        });
        
        // Sort by relevance (exact matches first, then by year)
        movies.sort((a, b) => {
            const aExact = a.title.toLowerCase() === searchTerm.toLowerCase();
            const bExact = b.title.toLowerCase() === searchTerm.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return b.year - a.year;
        });
        
        return movies;
    } catch (error) {
        console.log(`❌ Error searching movies: ${error.message}`);
        return [];
    }
}

async function searchTVShows(searchTerm) {
    try {
        console.log(`🔍 Searching for TV shows containing: "${searchTerm}"`);
        const response = await axios.get(`${DAHMER_MOVIES_API}/tvs/`, {
            timeout: TIMEOUT,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const tvShows = [];
        
        $('a').each((index, element) => {
            const text = $(element).text().trim();
            const href = $(element).attr('href');
            if (text && href && text !== '../' && !text.includes('.')) {
                const cleanName = text.replace('/', '').replace(' -', '');
                if (cleanName.length > 0 && cleanName.toLowerCase().includes(searchTerm.toLowerCase())) {
                    tvShows.push({
                        title: cleanName,
                        fullName: text.replace('/', ''),
                        href: href
                    });
                }
            }
        });
        
        // Sort by relevance (exact matches first, then alphabetically)
        tvShows.sort((a, b) => {
            const aExact = a.title.toLowerCase() === searchTerm.toLowerCase();
            const bExact = b.title.toLowerCase() === searchTerm.toLowerCase();
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return a.title.localeCompare(b.title);
        });
        
        return tvShows;
    } catch (error) {
        console.log(`❌ Error searching TV shows: ${error.message}`);
        return [];
    }
}

async function manualSearch(rl) {
    const searchTerm = await askQuestion(rl, '🔍 Enter search term (movie/TV show title): ');
    if (!searchTerm) {
        console.log('❌ Search term is required!');
        return null;
    }
    
    const contentType = await askQuestion(rl, '📺 Search for movies (m) or TV shows (t)? (m/t): ');
    const searchTVs = contentType.toLowerCase().startsWith('t');
    
    if (searchTVs) {
        const tvShows = await searchTVShows(searchTerm);
        
        if (tvShows.length === 0) {
            console.log(`❌ No TV shows found matching "${searchTerm}"`);
            return null;
        }
        
        console.log(`\n📺 Found ${tvShows.length} TV show(s) matching "${searchTerm}":`);
        console.log('━'.repeat(50));
        
        tvShows.slice(0, 20).forEach((show, index) => {
            console.log(`${index + 1}. ${show.title}`);
        });
        
        if (tvShows.length > 20) {
            console.log(`... and ${tvShows.length - 20} more`);
        }
        
        const choice = await askQuestion(rl, '\n👉 Select TV show number: ');
        const showIndex = parseInt(choice) - 1;
        
        if (showIndex >= 0 && showIndex < Math.min(tvShows.length, 20)) {
            const selectedShow = tvShows[showIndex];
            
            // Browse seasons
            const seasons = await browseTVSeasons(selectedShow.fullName);
            if (seasons.length === 0) {
                console.log('❌ No seasons found for this show!');
                return null;
            }
            
            console.log(`\n📺 Available Seasons for ${selectedShow.title}:`);
            console.log('━'.repeat(50));
            seasons.forEach((season, index) => {
                console.log(`${index + 1}. ${season.name}`);
            });
            
            const seasonChoice = await askQuestion(rl, '\n👉 Select season number: ');
            const seasonIndex = parseInt(seasonChoice) - 1;
            
            if (seasonIndex >= 0 && seasonIndex < seasons.length) {
                const selectedSeason = seasons[seasonIndex];
                const episode = await askQuestion(rl, '🔢 Enter episode number: ');
                
                if (!episode || isNaN(episode)) {
                    console.log('❌ Valid episode number is required!');
                    return null;
                }
                
                return {
                    title: selectedShow.title,
                    year: new Date().getFullYear(),
                    isTvShow: true,
                    season: selectedSeason.seasonNumber,
                    episode: parseInt(episode)
                };
            } else {
                console.log('❌ Invalid season number!');
                return null;
            }
        } else {
            console.log('❌ Invalid show number!');
            return null;
        }
    } else {
        const movies = await searchMovies(searchTerm);
        
        if (movies.length === 0) {
            console.log(`❌ No movies found matching "${searchTerm}"`);
            return null;
        }
        
        console.log(`\n🎬 Found ${movies.length} movie(s) matching "${searchTerm}":`);
        console.log('━'.repeat(50));
        
        movies.slice(0, 20).forEach((movie, index) => {
            console.log(`${index + 1}. ${movie.title} (${movie.year})`);
        });
        
        if (movies.length > 20) {
            console.log(`... and ${movies.length - 20} more`);
        }
        
        const choice = await askQuestion(rl, '\n👉 Select movie number: ');
        const movieIndex = parseInt(choice) - 1;
        
        if (movieIndex >= 0 && movieIndex < Math.min(movies.length, 20)) {
            const selectedMovie = movies[movieIndex];
            return {
                title: selectedMovie.title,
                year: selectedMovie.year,
                isTvShow: false
            };
        } else {
            console.log('❌ Invalid movie number!');
            return null;
        }
    }
}

async function main() {
    console.log('🎬 Dahmer Movies Fetcher');
    console.log('========================\n');
    
    const rl = createInterface();
    
    try {
        const contentInfo = await browseAndSelectContent(rl);
        
        if (!contentInfo) {
            console.log('👋 Goodbye!');
            rl.close();
            return;
        }
        
        // Fetch content
        const results = await invokeDahmerMovies(
            contentInfo.title, 
            contentInfo.year, 
            contentInfo.season, 
            contentInfo.episode
        );
        
        if (results.length > 0) {
            console.log(`\n🎉 Found ${results.length} streaming link(s) for "${contentInfo.title}"!`);
            
            // Ask if user wants to save results to file
            const saveToFile = await askQuestion(rl, '\n💾 Save results to JSON file? (y/n): ');
            if (saveToFile.toLowerCase().startsWith('y')) {
                const fs = require('fs');
                const filename = `dahmer-movies-${contentInfo.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
                fs.writeFileSync(filename, JSON.stringify(results, null, 2));
                console.log(`✅ Results saved to: ${filename}`);
            }
        } else {
            console.log(`\n😞 No streaming links found for "${contentInfo.title}".`);
            console.log('💡 Try checking:');
            console.log('   - Spelling of the title');
            console.log('   - Year is correct');
            console.log('   - Content exists on Dahmer Movies');
        }
        
    } catch (error) {
        console.log(`\n❌ Unexpected error: ${error.message}`);
    } finally {
        rl.close();
    }
}

// Export for use as module
module.exports = {
    invokeDahmerMovies,
    browseMovies,
    browseTVShows,
    browseTVSeasons,
    searchMovies,
    searchTVShows,
    getEpisodeSlug,
    getIndexQuality,
    getIndexQualityTags
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}