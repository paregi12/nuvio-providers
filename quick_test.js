const { getStreams } = require('./dahmermovies.js');

async function quickTest() {
    console.log('Testing one movie...');
    const streams = await getStreams(245891, 'movie'); // John Wick
    
    if (streams.length > 0) {
        console.log(`\n✅ Found ${streams.length} streams`);
        console.log(`First stream URL: ${streams[0].url}`);
        console.log(`URL is valid: ${streams[0].url.startsWith('https://a.111477.xyz/')}`);
    }
}

quickTest().catch(console.error);