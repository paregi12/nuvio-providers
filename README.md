# Nuvio Providers

A collection of streaming providers for the Nuvio app. Providers are JavaScript modules that fetch streams from various sources.

##  Quick Start

### Using in Nuvio App

1. Open **Nuvio** → **Settings** → **Plugins**
2. Add this repository URL:
   ```
   https://raw.githubusercontent.com/tapframe/nuvio-providers/refs/heads/main
   ```
3. Refresh and enable the providers you want

---

## 📁 Project Structure

```
nuvio-providers/
├── src/                    # Source files (multi-file development)
│   ├── vixsrc/
│   │   ├── index.js        # Main entry point
│   │   ├── extractor.js    # Stream extraction
│   │   ├── http.js         # HTTP utilities
│   │   └── ...
│   └── uhdmovies/
│       └── ...
│
├── providers/              # Built output (single files)
│   ├── vixsrc.js           # ← Bundled from src/vixsrc/
│   ├── uhdmovies.js
│   └── ...
│
├── manifest.json           # Provider registry
├── build.js                # Build script
└── package.json
```

---

## 🛠️ Development

### Two Approaches

| Approach | Complexity | Build Required? |
|----------|------------|-----------------|
| **Simple (single-file)** | Low | ❌ No |
| **Multi-file** | Advanced | ✅ Yes |

---

### Option 1: Simple Single-File Provider (No Build)

For straightforward providers, just create a single file directly in `providers/`:

```javascript
// providers/myprovider.js

function getStreams(tmdbId, mediaType, season, episode) {
  console.log(`[MyProvider] Fetching ${mediaType} ${tmdbId}`);
  
  return fetch(`https://api.example.com/streams/${tmdbId}`)
    .then(response => response.json())
    .then(data => {
      return data.streams.map(s => ({
        name: "MyProvider",
        title: s.title,
        url: s.url,
        quality: s.quality
      }));
    })
    .catch(error => {
      console.error('[MyProvider] Error:', error.message);
      return [];
    });
}

module.exports = { getStreams };
```

Then add to `manifest.json`:
```json
{
  "id": "myprovider",
  "name": "My Provider",
  "filename": "providers/myprovider.js",
  "supportedTypes": ["movie", "tv"],
  "enabled": true
}
```

**Done!** No build step needed.

> ⚠️ **Note about async/await**: Single-file providers should use **Promise chains** (`.then()`) 
> instead of `async/await`. If you prefer async/await, run the transpiler:
> ```bash
> node build.js --transpile myprovider
> ```

---

### Option 2: Multi-File Provider (With Build)

For complex providers with shared utilities, use the `src/` folder:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create provider folder:**
   ```bash
   mkdir -p src/myprovider
   ```

3. **Create entry point** (`src/myprovider/index.js`):
   ```javascript
   import { fetchPage } from './http.js';
   import { extractStreams } from './extractor.js';

   async function getStreams(tmdbId, mediaType, season, episode) {
     console.log(`[MyProvider] Fetching ${mediaType} ${tmdbId}`);
     
     const page = await fetchPage(tmdbId, mediaType, season, episode);
     const streams = extractStreams(page);
     
     return streams;
   }

   module.exports = { getStreams };
   ```

4. **Add helper modules** as needed:
   - `src/myprovider/http.js` — HTTP utilities
   - `src/myprovider/extractor.js` — Extraction logic
   - `src/myprovider/utils.js` — Helper functions

5. **Build:**
   ```bash
   node build.js myprovider
   ```

6. **Add to manifest.json** (same as simple approach)

---

## 📦 Building

### Build All Providers

```bash
npm run build
```

### Build Specific Provider

```bash
node build.js vixsrc
node build.js vixsrc uhdmovies showbox
```

### Watch Mode (Auto-rebuild)

```bash
npm run build:watch
```

---

## 🧪 Testing

### Test a Built Provider

```bash
# Create a test file
cat > test-myprovider.js << 'EOF'
const { getStreams } = require('./providers/myprovider.js');

async function test() {
  // Test movie (Oppenheimer)
  const movieStreams = await getStreams('872585', 'movie');
  console.log('Movie streams:', movieStreams.length);

  // Test TV (Breaking Bad S1E1)
  const tvStreams = await getStreams('1396', 'tv', 1, 1);
  console.log('TV streams:', tvStreams.length);
}

test().catch(console.error);
EOF

node test-myprovider.js
```

### Run Existing Tests

```bash
node test-vixsrc.js
```

---

## 📋 Stream Object Format

Providers must return an array of stream objects:

```javascript
{
  name: "Provider Name",           // Provider identifier
  title: "1080p Stream",           // Stream description
  url: "https://...",              // Direct stream URL (m3u8, mp4, mkv)
  quality: "1080p",                // Quality label
  size: "2.5 GB",                  // Optional file size
  headers: {                       // Optional headers for playback
    "Referer": "https://source.com",
    "User-Agent": "Mozilla/5.0..."
  }
}
```

---

## 🔧 Available Modules

Providers have access to these modules via `require()`:

| Module | Usage |
|--------|-------|
| `cheerio-without-node-native` | HTML parsing |
| `crypto-js` | Encryption/decryption |
| `axios` | HTTP requests |

Native `fetch` is also available globally.

---

## 📝 Manifest Options

```json
{
  "id": "unique-id",
  "name": "Display Name",
  "description": "What this provider does",
  "version": "1.0.0",
  "author": "Your Name",
  "supportedTypes": ["movie", "tv"],
  "filename": "providers/file.js",
  "enabled": true,
  "logo": "https://url/to/logo.png",
  "contentLanguage": ["en", "hi"],
  "formats": ["mkv", "mp4"],
  "limited": false,
  "disabledPlatforms": ["ios"],
  "supportsExternalPlayer": true
}
```

| Field | Description |
|-------|-------------|
| `enabled` | Default enabled state (user can override) |
| `limited` | Shows "Limited" badge (depends on external APIs) |
| `disabledPlatforms` | Disable on specific platforms (`ios`, `android`) |
| `supportsExternalPlayer` | Whether streams work in external players |
| `formats` | Output formats (`mkv`, `mp4`, `m3u8`) |

---

## 🤝 Contributing

1. Fork the repository
2. Create a branch: `git checkout -b add-myprovider`
3. Develop and test your provider
4. Build: `node build.js myprovider`
5. Commit: `git commit -m "Add MyProvider"`
6. Push and create a Pull Request

---

## 📄 License

[![GNU GPLv3](https://www.gnu.org/graphics/gplv3-127x51.png)](http://www.gnu.org/licenses/gpl-3.0.en.html)

This project is licensed under the **GNU General Public License v3.0**.

---

## ⚠️ Disclaimer

- **No content is hosted by this repository.**
- Providers fetch publicly available content from third-party websites.
- Users are responsible for compliance with local laws.
- For DMCA concerns, contact the actual content hosts.

---

<p align="center">
  <b>Thank you for using Nuvio Providers!</b>
</p>
