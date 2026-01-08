const { getStreams } = require('./providers/animepahe.js');

async function test() {
  console.log('Testing AnimePahe...');
  // One Piece - TMDB ID: 37854
  const tmdbId = '37854'; 
  const season = 1;
  const episode = 1;
  
  console.log(`Fetching streams for TMDB ID: ${tmdbId} S${season}E${episode}`);
  
  try {
      const streams = await getStreams(tmdbId, 'tv', season, episode);
      console.log('Streams found:', streams.length);
      streams.forEach((s, i) => {
          console.log(`[${i}] ${s.title} -> ${s.url}`);
      });
  } catch (e) {
      console.error("Test failed:", e);
  }
}

test();
