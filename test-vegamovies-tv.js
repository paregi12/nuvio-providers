const { getStreams } = require('./providers/vegamovies.js');

async function test() {
  console.log('Testing VegaMovies TV...');
  // Fallout (2024) - TMDB ID: 106379
  const tmdbId = '106379'; 
  const season = 1;
  const episode = 1;
  
  console.log(`Fetching streams for TMDB ID: ${tmdbId} S${season}E${episode}`);
  
  try {
      const streams = await getStreams(tmdbId, 'tv', season, episode);
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
