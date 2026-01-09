const { getStreams } = require('./providers/kuudere.js');
const axios = require('axios');

async function run() {
    try {
        const tmdbId = '88046'; // Fire Force
        console.log(`\n--- Inspecting Streams for Fire Force S3E13 ---`);
        const streams = await getStreams(tmdbId, 'tv', '3', '13');
        
        const zenStreams = streams.filter(s => s.name.includes('Zen'));
        
        if (zenStreams.length === 0) {
            console.log("No Zen streams found.");
            return;
        }

        console.log(`Found ${zenStreams.length} Zen streams.`);
        
        for (const s of zenStreams) {
            console.log(`\n[${s.name} - ${s.title}]`);
            console.log(`URL: ${s.url}`);
            
            // Check if URLs are identical
            const isDuplicate = zenStreams.filter(other => other !== s && other.url === s.url).length > 0;
            if (isDuplicate) {
                console.log("⚠️  Warning: This URL is identical to another stream's URL!");
            }

            // Try to fetch the m3u8 to see audio tracks
            try {
                const response = await axios.get(s.url, { headers: s.headers });
                const m3u8Content = response.data;
                
                const audioTracks = m3u8Content.match(/#EXT-X-MEDIA:TYPE=AUDIO.*/g);
                if (audioTracks) {
                    console.log("Audio Tracks found in manifest:");
                    audioTracks.forEach(t => console.log(t));
                } else {
                    console.log("No explicit #EXT-X-MEDIA:TYPE=AUDIO tags found (might be embedded in variant streams).");
                }
            } catch (e) {
                console.log(`Failed to fetch m3u8: ${e.message}`);
            }
        }

    } catch (err) {
        console.error('Test failed:', err);
    }
}

run();
