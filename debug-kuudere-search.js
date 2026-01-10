const { search } = require('./providers/kuudere.js');

async function debugSearch(query) {
    console.log(`\n--- Debug Search for: "${query}" ---`);
    try {
        const results = await search(query);
        console.log(`Found ${results.length} results:`);
        results.forEach((r, i) => {
            console.log(`[${i}] Title: ${r.title} | Year: ${r.year} | Session: ${r.url}`);
        });
    } catch (e) {
        console.error("Search failed:", e.message);
    }
}

debugSearch("Demon Slayer");

