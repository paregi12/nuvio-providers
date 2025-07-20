# Nuvio Local Scrapers Repository

This repository contains local scrapers for the Nuvio streaming application. These scrapers allow you to fetch streams from various sources directly within the app.

## Repository Structure

```
├── manifest.json          # Repository manifest with scraper definitions
├── uhdmovies.js           # UHD Movies scraper
└── README.md              # This file
```

## How to Use

1. **Add Repository to Nuvio:**
   - Open Nuvio app
   - Go to Settings → Local Scrapers
   - Add this repository URL
   - Enable the scrapers you want to use

2. **GitHub Repository URL:**
   ```
   https://raw.githubusercontent.com/YOUR_USERNAME/nuvio-local-scrapers/main/
   ```

## Available Scrapers

### UHD Movies
- **Source:** UHD Movies website
- **Content:** High-quality movies and TV shows
- **Formats:** Various qualities (480p to 4K)
- **Status:** Active

## Scraper Development

### Creating a New Scraper

1. **Create the scraper file** (e.g., `newscraper.js`):
```javascript
// Main function that Nuvio will call
async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // Your scraping logic here
    // Return array of stream objects
    return [
      {
        name: "Stream Name",
        url: "stream_url",
        quality: "1080p",
        size: "2.5 GB",
        type: "direct" // or "torrent"
      }
    ];
  } catch (error) {
    console.error(`[YourScraper] Error: ${error.message}`);
    return [];
  }
}

// Export for React Native
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
```

2. **Update manifest.json:**
```json
{
  "version": "1.0.0",
  "scrapers": [
    {
      "id": "newscraper",
      "name": "New Scraper",
      "description": "Description of your scraper",
      "version": "1.0.0",
      "author": "Your Name",
      "types": ["movie", "tv"],
      "file": "newscraper.js",
      "enabled": true
    }
  ]
}
```

### Scraper Function Parameters

- `tmdbId` (string): The Movie Database ID
- `mediaType` (string): Either "movie" or "tv"
- `season` (number): Season number (for TV shows)
- `episode` (number): Episode number (for TV shows)

### Stream Object Format

```javascript
{
  name: "Display name for the stream",
  url: "Direct stream URL or magnet link",
  quality: "Video quality (e.g., 1080p, 720p, 4K)",
  size: "File size (e.g., 2.5 GB)",
  type: "direct" // or "torrent" for magnet links
}
```

### Best Practices

1. **Error Handling:** Always wrap your code in try-catch blocks
2. **Logging:** Use console.log with your scraper name prefix
3. **Rate Limiting:** Be respectful to source websites
4. **User Agent:** Use realistic browser user agents
5. **Caching:** Cache results when possible to reduce requests

### React Native Compatibility

- Use `fetch()` instead of `axios` or `request`
- Avoid Node.js specific modules (fs, path, etc.)
- Use global variables for caching instead of file system
- Handle CORS and SSL issues appropriately

## Publishing to GitHub

1. **Create a new repository on GitHub:**
   - Go to github.com
   - Click "New repository"
   - Name it `nuvio-local-scrapers`
   - Make it public
   - Don't initialize with README (we already have one)

2. **Upload files:**
   ```bash
   cd /path/to/local-scrapers-repo
   git init
   git add .
   git commit -m "Initial commit with UHD Movies scraper"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/nuvio-local-scrapers.git
   git push -u origin main
   ```

3. **Get the raw URL:**
   ```
   https://raw.githubusercontent.com/YOUR_USERNAME/nuvio-local-scrapers/main/
   ```

## Contributing

1. Fork this repository
2. Create a new branch for your scraper
3. Add your scraper file and update manifest.json
4. Test thoroughly
5. Submit a pull request

## Legal Notice

This repository is for educational purposes. Users are responsible for ensuring they comply with all applicable laws and terms of service when using these scrapers. The authors are not responsible for any misuse of this software.

## Support

For issues or questions:
- Open an issue on GitHub
- Check the Nuvio app documentation
- Join the community discussions

---

**Note:** Replace `YOUR_USERNAME` with your actual GitHub username when publishing.