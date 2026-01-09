const { getStreams, search } = require('./providers/kuudere.js');

async function testGetStreams() {
    console.log('\n--- Testing Get Streams (Naruto Shippuden S1E1) ---');
    // Naruto Shippuden TMDB ID: 31910
    const streams = await getStreams('31910', 'tv', '1', '1');
    console.log(`Found ${streams.length} streams`);
    streams.forEach(s => {
        console.log(`[${s.quality}] ${s.name} - ${s.title}: ${s.url.substring(0, 100)}...`);
    });
}

async function run() {
    try {
        await testGetStreams();
    } catch (err) {
        console.error('Test failed:', err);
    }
}

run();
