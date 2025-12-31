# Nuvio Provider Development Guide

This is a comprehensive guide to developing streaming providers for the Nuvio app. It covers everything from setting up your environment to publishing your first provider.

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Architecture Overview](#architecture-overview)
4. [Setting Up Your Workspace](#setting-up-your-workspace)
5. [Tutorial: Building a Provider from Scratch](#tutorial-building-a-provider-from-scratch)
6. [The Provider API](#the-provider-api)
   - [Input Parameters](#input-parameters)
   - [Output Format](#output-format)
7. [Advanced Topics](#advanced-topics)
   - [Async/Await & Transpilation](#asyncawait--transpilation)
   - [HTML Parsing with Cheerio](#html-parsing-with-cheerio)
   - [Handling Encryption](#handling-encryption)
8. [Testing & Debugging](#testing--debugging)
9. [Publishing](#publishing)

---

## Introduction

A **Provider** in Nuvio is a JavaScript module that finds video streams for movies and TV shows. When a user selects a title (e.g., "Inception"), the app calls your provider with the movie's TMDB ID. Your provider's job is to search the web (programmatically) and return a list of playable video URLs.

Providers run locally on the user's device inside the Nuvio app's JavaScript engine (Hermes).

---

## Prerequisites

To develop providers, you need:
- **Node.js**: Version 16 or higher.
- **Code Editor**: VS Code is recommended.
- **Knowledge**: Basic JavaScript (ES6+), Promises, async/await, and HTTP requests.

---

## Architecture Overview

Nuvio providers operate in a specific environment:
- **Engine**: Hermes (React Native).
- **Environment**: "Neutral" (neither distinct Browser nor Node.js, but supports common APIs like `fetch`).
- **Restrictions**: 
  - Cannot use native Node.js modules like `fs` or `path` inside the provider code.
  - `async/await` has limited support in dynamically loaded code, so we use a build step to transpile it.

### File Structure
- **`src/`**: Where you write your code. One folder per provider (e.g., `src/vidlink/`).
- **`providers/`**: Where the bundled code lives (e.g., `providers/vidlink.js`). **Do not edit these files manually.**
- **`build.js`**: The script that converts your `src` code into the final `providers` file.

---

## Setting Up Your Workspace

1. **Clone the Repository**
   ```bash
   git clone https://github.com/tapframe/nuvio-providers.git
   cd nuvio-providers
   ```

2. **Install Tools**
   Install the build dependencies (esbuild, etc.):
   ```bash
   npm install
   ```

---

## Tutorial: Building a Provider from Scratch

Let's build a fictional provider called **"StreamFlix"**.

### Step 1: Create the Source Directory

Create a folder for your source code:
```bash
mkdir -p src/streamflix
```

### Step 2: Create Utility Modules

It is best practice to split your code. Let's create `src/streamflix/http.js` to handle networking.

**`src/streamflix/http.js`**
```javascript
export const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://streamflix.example/"
};

export async function fetchText(url) {
    console.log(`[StreamFlix] Fetching: ${url}`);
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
}
```

### Step 3: Implement Extraction Logic

Now create `src/streamflix/extractor.js` to find the video.

**`src/streamflix/extractor.js`**
```javascript
import { fetchText, HEADERS } from './http.js';
import cheerio from 'cheerio-without-node-native';

export async function getMovieStream(tmdbId) {
    // 1. Search for the movie
    const searchUrl = `https://streamflix.example/search?id=${tmdbId}`;
    const html = await fetchText(searchUrl);
    
    // 2. Parse HTML
    const $ = cheerio.load(html);
    const videoUrl = $('video#player source').attr('src');
    
    if (!videoUrl) return [];

    // 3. Return a stream object
    return [{
        name: "StreamFlix",
        title: "1080p - Server 1",
        url: videoUrl,
        quality: "1080p",
        headers: HEADERS
    }];
}
```

### Step 4: Create the Entry Point

Every provider needs an `index.js`. This is what the app calls.

**`src/streamflix/index.js`**
```javascript
import { getMovieStream } from './extractor.js';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        if (mediaType === 'movie') {
            return await getMovieStream(tmdbId);
        } else {
            // TV logic would go here
            return [];
        }
    } catch (error) {
        console.error(`[StreamFlix] Error: ${error.message}`);
        return [];
    }
}

module.exports = { getStreams };
```

### Step 5: Register in Manifest

Open `manifest.json` and add your provider:

```json
{
  "id": "streamflix",
  "name": "StreamFlix",
  "filename": "providers/streamflix.js",
  "supportedTypes": ["movie"],
  "enabled": true
}
```

### Step 6: Build

Run the build script to bundle your files into `providers/streamflix.js`:

```bash
node build.js streamflix
```

You should see: `✅ streamflix.js (XX KB)`

---

## The Provider API

Your `index.js` must export a function named `getStreams`.

### Input Parameters

```javascript
async function getStreams(tmdbId, mediaType, season, episode)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tmdbId` | String | The ID from The Movie Database (e.g., "872585"). |
| `mediaType`| String | Either `"movie"` or `"tv"`. |
| `season` | Number | Season number (for TV shows, e.g., 1). `null` for movies. |
| `episode` | Number | Episode number (for TV shows, e.g., 1). `null` for movies. |

### Output Format

Return an **Array** of objects. Each object represents one playable link.

```javascript
[
  {
    "name": "StreamFlix",          // Provider Name
    "title": "My Stream 1080p",    // Display Title
    "url": "https://...",          // The actual video URL (.mp4, .m3u8)
    "quality": "1080p",            // Label: "4K", "1080p", "720p", "CAM"
    "size": 104857600,             // (Optional) Size in bytes
    "headers": {                   // (Optional) Headers valid for playback
      "User-Agent": "...",
      "Referer": "..."
    }
  }
]
```

---

## Advanced Topics

### Async/Await & Transpilation

**The Problem:** The Nuvio app loads plugins dynamically. The Hermes engine does not support `async` functions inside dynamically evaluated code.

**The Solution:** The `build.js` script automatically solves this!
- It converts your `async/await` code into Generator functions.
- This allows you to write modern async code in `src/` without worrying about compatibility.
- **Result:** Always use `src/` folders and the `build.js` script. Do not write complex single files manually in `providers/` unless you know what you are doing.

### HTML Parsing with Cheerio

We use `cheerio-without-node-native`. It implements a subset of jQuery core (like find, attr, text).

```javascript
import cheerio from 'cheerio-without-node-native';

const $ = cheerio.load(htmlContent);
const link = $('a.download-btn').attr('href');
const title = $('.movie-title').text().trim();
```

### Handling Encryption

Many streaming sites obfuscate their links. We include `crypto-js` to help.

```javascript
import CryptoJS from 'crypto-js';

// Decrypt AES
const bytes = CryptoJS.AES.decrypt(encryptedText, secretKey);
const originalText = bytes.toString(CryptoJS.enc.Utf8);
```

---

## Testing & Debugging

### Creating a Test Script

Never rely on the app alone for debugging. Create a local test script:

**`test-streamflix.js`**
```javascript
const { getStreams } = require('./providers/streamflix.js');

async function test() {
    console.log("Testing StreamFlix...");
    
    // Movie Test (Oppenheimer)
    const streams = await getStreams('872585', 'movie');
    console.log(`Found ${streams.length} streams`);
    streams.forEach(s => console.log(`- ${s.title} (${s.quality})`));
}

test();
```

Run it:
```bash
node test-streamflix.js
```

### Debugging Tips
- Use `console.log()` liberally. These logs appear in the terminal when running the test script, and in the Metro bundler output when running in the app.
- Check headers. 90% of failures are due to missing `User-Agent` or `Referer` headers.

---

## Publishing

1. **Verify**: Ensure your test script passes for both Movies and TV shows.
2. **Build**: Run `node build.js streamflix`.
3. **Commit**:
    ```bash
    git add src/streamflix providers/streamflix.js manifest.json
    git commit -m "Add StreamFlix provider"
    ```
4. **Push**: Push your changes to GitHub.
5. **Update App**: Update the repository URL in the Nuvio app settings to point to your branch/repo.

---

Have fun building!
