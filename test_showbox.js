// Test file for ShowBox provider
const { getStreams } = require('./providers/showbox.js');

console.log('🧪 Testing ShowBox Provider (README stream format)...\n');

function printAsReadmeFormat(streams) {
    console.log(`Found ${streams.length} streams`);
    streams.forEach(function(stream, index) {
        const out = {
            name: stream.name,
            title: stream.title,
            url: stream.url,
            quality: stream.quality,
            size: stream.size || 'Unknown',
            provider: stream.provider
        };
        console.log(`\n${index + 1}.`);
        console.log(JSON.stringify(out, null, 2));
    });
}

// Test with tt3402138 (provided example)
console.log('📽️ Testing Movie: tt3402138');
getStreams('3402138', 'movie')
  .then(function(streams) {
      printAsReadmeFormat(streams);
  })
  .catch(function(error) {
      console.error(`❌ Error: ${error.message}`);
  })
  .finally(function() {
      console.log('\n🏁 Test completed.');
  });
