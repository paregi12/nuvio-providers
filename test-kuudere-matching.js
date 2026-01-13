const { getStreams } = require('./providers/kuudere.js');

async function testMatching(title, tmdbId, year, mediaType = 'movie') {
    console.log(`\n--- Testing Match: "${title}" (${year}) [${mediaType}] ---`);
    const mockTmdbData = { title, year };
    
    try {
        const streams = await getStreams(tmdbId, mediaType, null, 1, mockTmdbData);
        if (streams.length > 0) {
            console.log(`✅ Success: Found ${streams.length} streams.`);
        } else {
            console.log(`❌ Failed: No match found on any domain.`);
        }
    } catch (e) {
        console.error("Test error:", e.message);
    }
}

async function runTests() {
    await testMatching("Suzume", "976644", "2022");
    await testMatching("Naruto", "46261", "tv");
}

runTests();
