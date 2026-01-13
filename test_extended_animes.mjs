import { getStreams } from './src/kuudere/index.js';

// Extended list of anime to test various edge cases
const testCases = [
    { title: "Demon Slayer: Kimetsu no Yaiba", year: 2019, type: "tv", season: 1, episode: 1 },
    { title: "Solo Leveling", year: 2024, type: "tv", season: 1, episode: 1 },
    { title: "Spirited Away", year: 2001, type: "movie", season: 1, episode: 1 },
    { title: "Bleach", year: 2004, type: "tv", season: 1, episode: 1 },
    { title: "Black Clover", year: 2017, type: "tv", season: 1, episode: 1 },
    { title: "My Hero Academia", year: 2016, type: "tv", season: 1, episode: 1 },
    { title: "Hunter x Hunter", year: 2011, type: "tv", season: 1, episode: 1 },
    { title: "Death Note", year: 2006, type: "tv", season: 1, episode: 1 },
    { title: "Fullmetal Alchemist: Brotherhood", year: 2009, type: "tv", season: 1, episode: 1 },
    { title: "Sword Art Online", year: 2012, type: "tv", season: 1, episode: 1 }
];

async function runTests() {
    console.log("Starting Extended Robustness Tests...\n");

    for (const test of testCases) {
        console.log(`\n--------------------------------------------------`);
        console.log(`Testing: ${test.title}`);
        console.log(`--------------------------------------------------`);

        try {
            const streams = await getStreams(
                '00000', 
                test.type, 
                test.season, 
                test.episode, 
                { title: test.title, year: test.year }
            );

            console.log(`Total Streams Found: ${streams.length}`);
            
            let directCount = 0;
            let embedCount = 0;

            streams.forEach(s => {
                const type = s.title.includes('Direct') ? 'DIRECT' : 'EMBED';
                if (type === 'DIRECT') directCount++;
                else embedCount++;
                
                // console.log(`[${type}] ${s.name} - ${s.quality}`);
            });

            console.log(`Summary for ${test.title}:`);
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
