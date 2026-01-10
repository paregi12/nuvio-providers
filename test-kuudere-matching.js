const { getStreams } = require('./providers/kuudere.js');

async function testMatching(title, tmdbId, year, mediaType = 'movie') {
    console.log(`\n--- Testing Match: "${title}" (${year}) [${mediaType}] ---`);
    const mockTmdbData = { title, year };
    
    try {
        const streams = await getStreams(tmdbId, mediaType, null, 1, mockTmdbData);
        if (streams.length > 0) {
            console.log(`✅ Success: Found ${streams.length} streams.`);
        } else {
            console.log(`❌ Failed: No match found.`);
        }
    } catch (e) {
        console.error("Test error:", e.message);
    }
}

async function runTests() {
    await testMatching("Your Name.", "372058", "2016");
    await testMatching("Suzume", "976644", "2022");
    await testMatching("Demon Slayer: Kimetsu no Yaiba - The Movie: Mugen Train", "635302", "2020");
}

runTests();
