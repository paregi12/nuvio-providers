#!/usr/bin/env node

// Test script for Sinners (2025) with MyFlixer scraper
const { getStreams } = require('./watch32.js');

function testSinners() {
    console.log('🧪 Testing MyFlixer Scraper - Sinners (2025)');
    console.log('==============================================\n');

    const testCase = {
        name: 'Sinners (2025)',
        tmdbId: '1233413',
        mediaType: 'movie'
    };

    console.log(`🎬 Testing: ${testCase.name}`);
    console.log('⏳ Fetching streams...\n');

    const startTime = Date.now();
    
    return getStreams(
        testCase.tmdbId,
        testCase.mediaType
    )
    .then(streams => {
        const endTime = Date.now();

        console.log(`⏱️  Time taken: ${endTime - startTime}ms`);
        console.log(`📊 Found ${streams.length} streams\n`);

        if (streams.length > 0) {
            console.log('🔗 Available streams:');
            streams.forEach((stream, index) => {
                console.log(`   ${index + 1}. ${stream.name}`);
                if (stream.title) {
                    console.log(`      Title: ${stream.title}`);
                }
                console.log(`      Quality: ${stream.quality}`);
                console.log(`      URL: ${stream.url}`);
                
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
        console.log('✅ Sinners (2025) test completed');
    })
    .catch(error => {
        console.error(`❌ Test failed: ${error.message}`);
        console.log('─'.repeat(50));
    });
}

// Run test if called directly
if (require.main === module) {
    testSinners().catch(console.error);
}

module.exports = { testSinners };