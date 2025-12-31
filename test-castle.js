/**
 * Test script for Castle provider
 */

const { getStreams } = require('./providers/castle.js');

// Test movie: Oppenheimer (TMDB ID: 872585)
const MOVIE_ID = '872585';

// Test TV: Breaking Bad S1E1 (TMDB ID: 1396)
const TV_ID = '1396';

async function testMovie() {
    console.log('='.repeat(60));
    console.log(`Testing MOVIE: TMDB ID ${MOVIE_ID} (Oppenheimer)`);
    console.log('='.repeat(60));

    try {
        const streams = await getStreams(MOVIE_ID, 'movie');

        if (streams && streams.length > 0) {
            console.log(`\n✅ SUCCESS! Found ${streams.length} stream(s):\n`);
            streams.forEach((stream, i) => {
                console.log(`Stream ${i + 1}: ${stream.name}`);
                console.log(`  Quality: ${stream.quality}`);
                console.log(`  Size: ${stream.size}`);
                console.log(`  URL: ${stream.url?.substring(0, 60)}...`);
                console.log('');
            });
        } else {
            console.log('\n❌ No streams found');
        }

        return streams;
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        return [];
    }
}

async function testTV() {
    console.log('\n' + '='.repeat(60));
    console.log(`Testing TV: TMDB ID ${TV_ID} (Breaking Bad S1E1)`);
    console.log('='.repeat(60));

    try {
        const streams = await getStreams(TV_ID, 'tv', 1, 1);

        if (streams && streams.length > 0) {
            console.log(`\n✅ SUCCESS! Found ${streams.length} stream(s):\n`);
            streams.forEach((stream, i) => {
                console.log(`Stream ${i + 1}: ${stream.name}`);
                console.log(`  Quality: ${stream.quality}`);
                console.log(`  Size: ${stream.size}`);
                console.log(`  URL: ${stream.url?.substring(0, 60)}...`);
                console.log('');
            });
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
    console.log('\n🏰 CASTLE PROVIDER TEST\n');

    await testMovie();
    await testTV();

    console.log('='.repeat(60));
    console.log('Test complete!');
    console.log('='.repeat(60));
}

main();
