const { getStreams, search } = require('./providers/crunchyroll.js');

async function testSearch() {
    console.log('--- Testing Search ---');
    const results = await search('One Piece');
    console.log(`Found ${results.length} results`);
    if (results.length > 0) {
        console.log('First result:', JSON.stringify(results[0], null, 2));
    }
}

async function testGetStreams() {
    console.log('\n--- Testing Get Streams (One Piece S1E1) ---');
    // One Piece TMDB ID: 37854
    const streams = await getStreams('37854', 'tv', '1', '1');
    console.log(`Found ${streams.length} streams`);
    streams.forEach(s => {
        console.log(`[${s.quality}] ${s.title}: ${s.url.substring(0, 50)}...`);
    });
}

async function run() {
    try {
        await testSearch();
        await testGetStreams();
    } catch (err) {
        console.error('Test failed:', err);
    }
}

run();
