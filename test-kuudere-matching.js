const { getStreams } = require('./providers/kuudere.js');

async function testMatching(title, tmdbId, year) {
    console.log(`\n--- Testing Match: "${title}" (${year}) ---`);
    const mockTmdbData = { title, year };
    
    try {
        // We use getStreams because it contains the matching logic
        // We only care if it finds the "Found match:" log or returns streams
        const streams = await getStreams(tmdbId, 'movie', null, 1, mockTmdbData);
        if (streams.length > 0) {
            console.log(`✅ Success: Found ${streams.length} streams.`);
        } else {
            console.log(`❌ Failed: No match or no streams found.`);
        }
    } catch (e) {
        console.error("Test error:", e.message);
    }
}

async function runTests() {
    // 1. Title with symbols (dot)
    await testMatching("Your Name.", "372058", "2016");
    
    // 2. Simple title
    await testMatching("Suzume", "976644", "2022");
    
    // 3. Long title with symbols/colons
    await testMatching("Demon Slayer: Kimetsu no Yaiba – The Movie: Mugen Train", "635302", "2020");
    
    // 4. Title that might have different variations
    await testMatching("The First Slam Dunk", "820067", "2022");
}

runTests();
