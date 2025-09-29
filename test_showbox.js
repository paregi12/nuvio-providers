// Test file for ShowBox provider
// Inject UI token for the provider to pick up via SCRAPER_SETTINGS
global.SCRAPER_SETTINGS = {
    uiToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3NTUzNjEyMzQsIm5iZiI6MTc1NTM2MTIzNCwiZXhwIjoxNzg2NDY1MjU0LCJkYXRhIjp7InVpZCI6NzgyNDcwLCJ0b2tlbiI6IjdiYTY5MjU1NjUxNTYyMzkwZTg4NzczYzJiYWVhYjc3In19.ZwPLVjnR3w26MxS6NFP6TDEY93XZUfTW5VrggfPg1VU'
};

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
