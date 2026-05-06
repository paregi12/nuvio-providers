const { getStreams } = require('./providers/netmirror.js');

async function test() {
    console.log("Testing NetMirror...");
    
    // Movie Test (Oppenheimer - 872585)
    console.log("\n--- Testing Movie (Oppenheimer) ---");
    try {
        const movieStreams = await getStreams('872585', 'movie');
        console.log(`Found ${movieStreams.length} movie streams`);
        movieStreams.forEach(s => console.log(`- ${s.title} (${s.quality}): ${s.url.substring(0, 50)}...`));
    } catch (e) {
        console.error("Movie test failed:", e.message);
    }

    // TV Test (The Boys - 76479, S1E1)
    console.log("\n--- Testing TV (The Boys S1E1) ---");
    try {
        const tvStreams = await getStreams('76479', 'tv', 1, 1);
        console.log(`Found ${tvStreams.length} TV streams`);
        tvStreams.forEach(s => console.log(`- ${s.title} (${s.quality}): ${s.url.substring(0, 50)}...`));
    } catch (e) {
        console.error("TV test failed:", e.message);
    }
}

test();
