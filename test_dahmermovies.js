#!/usr/bin/env node

// Test script for Dahmer Movies scraper
const { getStreams } = require('./dahmermovies.js');

// Test cases
const testCases = [
    {
        name: "Movie Test - John Wick (2014)",
        tmdbId: 245891,
        mediaType: 'movie'
    },
    {
        name: "Movie Test - The Dark Knight (2008)",
        tmdbId: 155,
        mediaType: 'movie'
    },
    {
        name: "TV Show Test - Breaking Bad S01E01",
        tmdbId: 1396,
        mediaType: 'tv',
        season: 1,
        episode: 1
    },
    {
        name: "TV Show Test - Game of Thrones S01E01",
        tmdbId: 1399,
        mediaType: 'tv',
        season: 1,
        episode: 1
    }
];

async function runTests() {
    console.log('🧪 Testing Dahmer Movies Scraper');
    console.log('================================\n');

    for (const testCase of testCases) {
        console.log(`\n🎬 ${testCase.name}`);
        console.log('─'.repeat(50));
        
        try {
            const streams = await getStreams(
                testCase.tmdbId,
                testCase.mediaType,
                testCase.season,
                testCase.episode
            );

            if (streams && streams.length > 0) {
                console.log(`✅ Found ${streams.length} stream(s):`);
                streams.forEach((stream, index) => {
                    console.log(`  ${index + 1}. ${stream.title}`);
                    console.log(`     Quality: ${stream.quality}`);
                    console.log(`     URL: ${stream.url}`);
                    if (stream.size) console.log(`     Size: ${stream.size}`);
                });
            } else {
                console.log('❌ No streams found');
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }

    console.log('\n🏁 Test completed');
}

// Run tests if called directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests };