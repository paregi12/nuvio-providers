const { getStreams } = require('./providers/kuudere.js');

async function testKumi() {
    // Suzume Movie - TMDB 976644
    // We already know one Kumi URL from previous steps
    const kumiUrl = "https://kumi.upns.live/#jnlfv&api=all";
    
    console.log("Testing Kuudere provider for Suzume (Movie)...");
    
    try {
        const streams = await getStreams('976644', 'movie', null, 1, { title: "Suzume", year: "2022" });
        console.log(`\n--- Streams Found: ${streams.length} ---`);
        
        const kumiStream = streams.find(s => s.name.includes("Kumi"));
        if (kumiStream) {
            console.log("✅ Kumi Stream Found!");
            console.log(JSON.stringify(kumiStream, null, 2));
        } else {
            console.log("❌ Kumi Stream NOT found in results.");
            console.log("Full results sample:", JSON.stringify(streams.slice(0, 2), null, 2));
        }
    } catch (e) {
        console.error("Test failed:", e);
    }
}

testKumi();
