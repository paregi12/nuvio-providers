const { getStreams } = require('./providers/vegamovies.js');

async function test() {
  console.log('Testing VegaMovies...');
  // Deadpool & Wolverine (2024) - TMDB ID: 533535
  const tmdbId = '533535'; 
  const mediaType = 'movie';
  
  console.log(`Fetching streams for TMDB ID: ${tmdbId}`);
  
  try {
      const streams = await getStreams(tmdbId, mediaType);
      console.log('Streams found:', streams.length);
      streams.forEach((s, i) => {
          console.log(`[${i}] ${s.title} -> ${s.url}`);
      });
  } catch (e) {
      console.error("Test failed:", e);
  }
}

test();
