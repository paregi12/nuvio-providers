/**
 * Test script for 4KHDHub provider
 */

const { getStreams } = require('./providers/4khdhub.js');

// Test movie: Oppenheimer (TMDB ID: 872585)
const MOVIE_ID = '872585';

async function testMovie() {
    console.log('='.repeat(60));
    console.log(`Testing MOVIE: TMDB ID ${MOVIE_ID} (Oppenheimer)`);
    console.log('='.repeat(60));

    try {
        const streams = await getStreams(MOVIE_ID, 'movie');

        if (streams && streams.length > 0) {
            console.log(`\n✅ SUCCESS! Found ${streams.length} stream(s):\n`);
            streams.slice(0, 5).forEach((stream, i) => {
                console.log(`Stream ${i + 1}: ${stream.name}`);
                console.log(`  Quality: ${stream.quality || 'N/A'}`);
                console.log(`  URL: ${stream.url?.substring(0, 60)}...`);
                console.log('');
            });
            if (streams.length > 5) {
                console.log(`  ... and ${streams.length - 5} more`);
            }
        } else {
            console.log('\n❌ No streams found');
        }

        return streams;
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        return [];
    }
}

async function main() {
    console.log('\n📺 4KHDHUB PROVIDER TEST\n');
    await testMovie();
    console.log('='.repeat(60));
    console.log('Test complete!');
    console.log('='.repeat(60));
}

main();
