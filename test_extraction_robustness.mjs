import { getStreams } from './src/kuudere/index.js';

// Mock TMDB data to bypass external API calls for metadata
const testCases = [
    { title: "One Piece", year: 1999, type: "tv", season: 1, episode: 1 },
    { title: "Naruto: Shippuden", year: 2007, type: "tv", season: 1, episode: 1 },
    { title: "Your Name.", year: 2016, type: "movie", season: 1, episode: 1 },
    { title: "Jujutsu Kaisen", year: 2020, type: "tv", season: 1, episode: 1 },
    { title: "Attack on Titan", year: 2013, type: "tv", season: 1, episode: 1 }
];

async function runTests() {
    console.log("Starting Robustness Tests...\n");

    for (const test of testCases) {
        console.log(`\n--------------------------------------------------`);
        console.log(`Testing: ${test.title}`);
        console.log(`--------------------------------------------------`);

        try {
            // Passing mock TMDB data as the 5th argument
            const streams = await getStreams(
                '00000', // Fake ID
                test.type,
                test.season,
                test.episode,
                { title: test.title, year: test.year } // Mock TMDB Data
            );

            console.log(`Total Streams Found: ${streams.length}`);
            
            let directCount = 0;
            let embedCount = 0;

            streams.forEach(s => {
                const type = s.title.includes('Direct') ? 'DIRECT' : 'EMBED';
                if (type === 'DIRECT') directCount++;
                else embedCount++;
                
                console.log(`[${type}] ${s.name} - ${s.quality}`);
            });

            console.log(`\nSummary for ${test.title}:`);
            console.log(`  Direct: ${directCount}`);
            console.log(`  Embed:  ${embedCount}`);
            
            if (directCount > 0) {
                console.log("  ✅ SUCCESS: Direct links extracted.");
            } else {
                console.log("  ⚠️ WARNING: Only embeds found.");
            }

        } catch (error) {
            console.error(`Error testing ${test.title}:`, error.message);
        }
    }
}

runTests();
