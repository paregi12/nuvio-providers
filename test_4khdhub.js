/* Test script for providers/4khdhub.js
 * Requires Node 18+ (for global fetch) and cheerio-without-node-native installed locally:
 *   npm i cheerio-without-node-native
 */

// Disable URL validation for faster tests
global.DISABLE_4KHDHUB_URL_VALIDATION = true;

const { getStreams } = require('./providers/4khdhub.js');

function runTestCase(name, tmdbId, type, season, episode) {
  console.log(`\n=== ${name} ===`);
  console.log(`TMDB: ${tmdbId}, Type: ${type}${type === 'tv' ? `, S${season}E${episode}` : ''}`);

  return getStreams(tmdbId, type, season, episode)
    .then(function (streams) {
      console.log(`Found ${streams.length} streams`);
      streams.slice(0, 10).forEach(function (s, i) {
        console.log(`${i + 1}. ${s.name} | ${s.quality}`);
        console.log(`   Title: ${s.title}`);
        console.log(`   URL: ${s.url.substring(0, 150)}${s.url.length > 150 ? '...' : ''}`);
      });
    })
    .catch(function (err) {
      console.error('Test failed:', err && err.message);
    });
}

(function () {
  const tests = [
    { name: 'Movie: Fight Club', tmdbId: '550', type: 'movie' },
    { name: 'TV: Breaking Bad S01E01', tmdbId: '1396', type: 'tv', season: 1, episode: 1 }
  ];

  // Run sequentially to avoid getting blocked by the source
  function runSequential(index) {
    if (index >= tests.length) return Promise.resolve();
    var t = tests[index];
    return runTestCase(t.name, t.tmdbId, t.type, t.season, t.episode)
      .then(function () { return new Promise(function (r) { setTimeout(r, 1000); }); })
      .then(function () { return runSequential(index + 1); });
  }

  runSequential(0).then(function () {
    console.log('\nAll tests complete.');
  });
})();


