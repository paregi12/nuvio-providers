/**
 * Test script for vixsrc provider
 * Usage: node test-vixsrc.js
 */

const { getStreams } = require('./providers/vixsrc.js');

// Test with a known movie (e.g., Oppenheimer - TMDB ID: 872585)
const TMDB_ID = '872585';
const MEDIA_TYPE = 'movie';

// Test with a TV show (e.g., Breaking Bad - TMDB ID: 1396, S1E1)
const TV_TMDB_ID = '1396';
const SEASON = 1;
const EPISODE = 1;

async function testMovie() {
    console.log('='.repeat(60));
    console.log(`Testing MOVIE: TMDB ID ${TMDB_ID}`);
    console.log('='.repeat(60));

    try {
        const streams = await getStreams(TMDB_ID, 'movie');

        if (streams && streams.length > 0) {
            console.log(`\n✅ SUCCESS! Found ${streams.length} stream(s):\n`);
            streams.forEach((stream, i) => {
                console.log(`Stream ${i + 1}:`);
                console.log(`  Name: ${stream.name}`);
                console.log(`  Title: ${stream.title}`);
                console.log(`  Quality: ${stream.quality}`);
                console.log(`  URL: ${stream.url?.substring(0, 80)}...`);
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
    console.log(`Testing TV: TMDB ID ${TV_TMDB_ID}, S${SEASON}E${EPISODE}`);
    console.log('='.repeat(60));

    try {
        const streams = await getStreams(TV_TMDB_ID, 'tv', SEASON, EPISODE);

        if (streams && streams.length > 0) {
            console.log(`\n✅ SUCCESS! Found ${streams.length} stream(s):\n`);
            streams.forEach((stream, i) => {
                console.log(`Stream ${i + 1}:`);
                console.log(`  Name: ${stream.name}`);
                console.log(`  Title: ${stream.title}`);
                console.log(`  Quality: ${stream.quality}`);
                console.log(`  URL: ${stream.url?.substring(0, 80)}...`);
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
    console.log('\n🎬 VIXSRC PROVIDER TEST\n');

    await testMovie();
    await testTV();

    console.log('='.repeat(60));
    console.log('Test complete!');
    console.log('='.repeat(60));
}

main();
