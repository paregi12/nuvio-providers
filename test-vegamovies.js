const { getStreams } = require('./providers/vegamovies.js');

async function test() {
  console.log('Testing VegaMovies...');
  // Deadpool & Wolverine (2024) - TMDB ID: 533535
  const tmdbId = '533535'; 
  console.log(`Fetching streams for TMDB ID: ${tmdbId}`);
  
  try {
      const streams = await getStreams(tmdbId, 'movie');
      console.log('Streams found:', streams.length);
      if (streams.length > 0) {
          streams.forEach((s, i) => {
              console.log(`[${i}] ${s.title} (${s.quality}) -> ${s.url.substring(0, 50)}...`);
          });
      }
  } catch (e) {
      console.error("Test failed:", e);
  }
}

test();
