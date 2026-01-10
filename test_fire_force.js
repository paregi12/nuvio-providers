const kuudere = require('./providers/kuudere.js');

async function test() {
    const tmdbId = '88046';
    const mediaType = 'tv';
    const season = 3;
    const episode = 13;

    console.log(`Testing Kuudere for TMDB ID: ${tmdbId}, Season: ${season}, Episode: ${episode}`);
    
    try {
        const streams = await kuudere.getStreams(tmdbId, mediaType, season, episode);
        console.log('--- Streams Found ---');
        console.log(JSON.stringify(streams, null, 2));
        console.log('----------------------');
        
        if (streams.length === 0) {
            console.log('No streams found. It might be because season 3 is not yet released or indexed on Kuudere.');
        }
    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

test();
