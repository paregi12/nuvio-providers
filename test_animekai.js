// Test script for AnimeKai provider (TV only)
// Usage examples:
//   node test_animekai.js                  # defaults to TMDB 1429 S1E1
//   node test_animekai.js 1429 1 2         # TMDB 1429, Season 1, Episode 2
//   node test_animekai.js 60625 1 1        # TMDB 60625 (Rick and Morty), S1E1

const { getStreams } = require('./providers/animekai.js');

function parseArgs() {
    const args = process.argv.slice(2);
    const tmdbId = args[0] || '1429'; // Attack on Titan
    const season = args[1] ? parseInt(args[1]) : 1;
    const episode = args[2] ? parseInt(args[2]) : 1;
    return { tmdbId, season, episode };
}

function run() {
    const { tmdbId, season, episode } = parseArgs();
    console.log('============================================================');
    console.log('AnimeKai Provider Test');
    console.log('============================================================');
    console.log('TMDB ID:', tmdbId);
    console.log('Type   : tv');
    console.log('Season :', season);
    console.log('Episode:', episode);
    console.log('------------------------------------------------------------');

    getStreams(tmdbId, 'tv', season, episode)
        .then(function(streams) {
            console.log('Found', streams.length, 'streams');
            if (streams.length > 0) {
                // Show a quick summary grouped by quality
                const byQuality = {};
                for (var i = 0; i < streams.length; i++) {
                    var q = streams[i].quality || 'Unknown';
                    byQuality[q] = (byQuality[q] || 0) + 1;
                }
                console.log('Quality summary:', byQuality);

                // Print top 5
                console.log('\nSample (up to 5):');
                console.log(JSON.stringify(streams.slice(0, 5), null, 2));
            }
        })
        .catch(function(err) {
            console.error('Error:', err.message);
            process.exit(1);
        });
}

run();


