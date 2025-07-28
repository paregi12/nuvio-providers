#!/usr/bin/env node

// Test script for MyFlixer scraper
const { getStreams } = require('./myflixer.js');

function testMyFlixer() {
    console.log('🧪 Testing MyFlixer Scraper');
    console.log('===========================\n');

    // Test cases
    const testCases = [
        {
            name: 'Popular Movie',
            title: 'Avengers Endgame',
            year: 2019,
            imdbId: 'tt4154796'
        },
        {
            name: 'TV Show Episode',
            title: 'Breaking Bad',
            year: 2008,
            season: 1,
            episode: 1,
            imdbId: 'tt0903747'
        },
        {
            name: 'Recent Movie',
            title: 'Dune',
            year: 2021,
            imdbId: 'tt1160419'
        }
    ];

    // Process test cases sequentially to avoid overwhelming the server
    function runNextTest(index) {
        if (index >= testCases.length) {
            console.log('\n✅ MyFlixer scraper testing completed');
            return Promise.resolve();
        }

        const testCase = testCases[index];
        console.log(`\n🎬 Testing: ${testCase.name}`);
        console.log(`📝 Title: ${testCase.title} (${testCase.year})`);
        
        if (testCase.season && testCase.episode) {
            console.log(`📺 Season ${testCase.season}, Episode ${testCase.episode}`);
        }
        
        console.log('⏳ Fetching streams...\n');

        const startTime = Date.now();
        
        return getStreams(
            testCase.title,
            testCase.year,
            testCase.season,
            testCase.episode,
            testCase.imdbId
        )
        .then(streams => {
            const endTime = Date.now();

            console.log(`⏱️  Time taken: ${endTime - startTime}ms`);
            console.log(`📊 Found ${streams.length} streams\n`);

            if (streams.length > 0) {
                console.log('🔗 Available streams:');
                streams.forEach((stream, index) => {
                    console.log(`   ${index + 1}. ${stream.name}`);
                    console.log(`      Quality: ${stream.quality}`);
                    console.log(`      Size: ${stream.size}`);
                    console.log(`      URL: ${stream.url.substring(0, 80)}...`);
                    
                    if (stream.headers && Object.keys(stream.headers).length > 0) {
                        console.log(`      Headers: ${Object.keys(stream.headers).length} headers`);
                    }
                    
                    if (stream.subtitles && stream.subtitles.length > 0) {
                        console.log(`      Subtitles: ${stream.subtitles.length} available`);
                    }
                    console.log('');
                });
            } else {
                console.log('❌ No streams found');
            }

            console.log('─'.repeat(50));
            
            // Add delay between tests
            return new Promise(resolve => {
                setTimeout(() => {
                    runNextTest(index + 1).then(resolve);
                }, 2000); // 2 second delay
            });
        })
        .catch(error => {
            console.error(`❌ Test failed: ${error.message}`);
            console.log('─'.repeat(50));
            
            // Continue with next test even if this one failed
            return new Promise(resolve => {
                setTimeout(() => {
                    runNextTest(index + 1).then(resolve);
                }, 2000);
            });
        });
    }

    return runNextTest(0);
}

// Run tests if called directly
if (require.main === module) {
    testMyFlixer().catch(console.error);
}

module.exports = { testMyFlixer };