# Nuvio Anime Provider Developer Guide

This guide covers everything required to develop anime streaming providers for the Nuvio app.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Runtime Environment](#runtime-environment)
4. [Provider API Specification](#provider-api-specification)
   - [1. getStreams](#1-getstreams)
   - [2. getAnimeInfo / getDetails](#2-getanimeinfo--getdetails)
   - [3. getHome / getMainPage](#3-gethome--getmainpage)
   - [4. onSettings](#4-onsettings)
   - [5. search / searchAnime](#5-search--searchanime)
5. [AniList Enrichment Dual-Mode](#anilist-enrichment-dual-mode)
6. [Filler Episodes & Episode Indicators](#filler-episodes--episode-indicators)
7. [Subtitles & Playback Headers](#subtitles--playback-headers)
8. [Tutorial: Creating an Anime Provider](#tutorial-creating-an-anime-provider)
9. [Building & Testing](#building--testing)

---

## Introduction

A **Provider** in Nuvio is a JavaScript module that interfaces directly with anime streaming websites to locate playable video streams, episode catalogs, and metadata.

Providers execute locally inside Nuvio's QuickJS runtime.

---

## Prerequisites

- **Node.js**: v18 or higher.
- **npm**: Package manager for build tools.
- **Knowledge**: JavaScript (ES6+), async/await, Cheerio (DOM parsing), and HTTP networking.

---

## Runtime Environment

Nuvio runs provider code inside a lightweight QuickJS JavaScript engine with built-in polyfills:
- Global `fetch(url, options)` with automatic header and redirect support.
- Global `setTimeout`, `clearTimeout`, `setInterval`, `clearInterval`.
- Global `atob`, `btoa`, `URL`, and `URLSearchParams`.
- `cheerio-without-node-native` (HTML selector engine).
- `crypto-js` and `aes-js` (Encryption/decryption).

---

## Provider API Specification

Every provider must export `getStreams`. To support full direct streaming when AniList enrichment is off, it should also export `getAnimeInfo` (or `getDetails`).

### 1. `getStreams`

Fetches direct video URLs for playback.

```javascript
async function getStreams(contentId, mediaType, season, episode)
```

**Parameters:**
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `contentId` | String | Anime identifier (AniList ID or source anime slug/ID). |
| `mediaType` | String | `"tv"` or `"movie"`. |
| `season` | Number \| null | Season number (typically `null` or `1` for anime). |
| `episode` | Number \| null | Absolute episode number (e.g., `1`, `24`, `500`). |

**Return Value:** Array of stream objects.
```javascript
[
  {
    "name": "Server Alpha (1080p Sub)",
    "title": "Episode 1",
    "url": "https://stream.example/master.m3u8",
    "quality": "1080p",
    "headers": {
      "Referer": "https://source.example/",
      "User-Agent": "Mozilla/5.0..."
    },
    "subtitles": [
      {
        "url": "https://stream.example/sub.vtt",
        "language": "en",
        "name": "English"
      }
    ]
  }
]
```

---

### 2. `getAnimeInfo` / `getDetails`

Supplies anime metadata and the episode list directly from the source site.

```javascript
async function getAnimeInfo(contentId)
```

**Return Value:**
```javascript
{
  "id": "jujutsu-kaisen",
  "title": "Jujutsu Kaisen",
  "description": "A boy fights curses...",
  "poster": "https://.../poster.jpg",
  "banner": "https://.../banner.jpg",
  "status": "Completed",
  "genres": ["Action", "Supernatural"],
  "rating": 8.5,
  "ageRating": "R - 17+",
  "totalEpisodes": 24,
  "subEpisodes": 24,
  "dubEpisodes": 24,
  "episodes": [
    {
      "id": "jujutsu-kaisen-ep-1",
      "number": 1,
      "title": "Ryomen Sukuna",
      "thumbnail": "https://.../thumb1.jpg",
      "isFiller": false,
      "isSub": true,
      "isDub": true
    }
  ],
  "relations": [
    {
      "id": "jujutsu-kaisen-0",
      "title": "Jujutsu Kaisen 0",
      "type": "movie",
      "poster": "https://.../jk0.jpg",
      "relationType": "Prequel"
    }
  ]
}
```

---

### 3. `getHome` / `getMainPage`

Supplies home screen catalog sections.

```javascript
async function getHome()
```

**Return Value:**
```javascript
[
  {
    "title": "Top Airing Anime",
    "items": [
      {
        "id": "bleach-tybw",
        "title": "Bleach: Thousand-Year Blood War",
        "poster": "https://.../bleach.jpg",
        "type": "tv",
        "episodes": 13,
        "subEpisodes": 13,
        "dubEpisodes": 13,
        "ageRating": "TV-14"
      }
    ]
  }
]
```

---

### 4. `onSettings`

Defines custom configuration options for the provider settings dialog.

```javascript
async function onSettings() {
  return [
    { type: "header", label: "Server Options" },
    {
      type: "select",
      key: "preferred_server",
      label: "Default Server",
      options: [
        { label: "Fast HLS (Kwik)", value: "kwik" },
        { label: "Direct MP4", value: "mp4" }
      ],
      defaultValue: "kwik"
    }
  ];
}
```

### 5. `search` / `searchAnime`

Enables in-app searching for anime directly from the provider.

```javascript
async function search(query, page = 1)
```

**Parameters:**
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `query` | String | Search keyword or title query. |
| `page` | Number | Page number (defaults to 1). |

**Return Value:** Array of anime items (or `{ results: [...] }` / `{ data: [...] }`).
```javascript
[
  {
    "id": "jujutsu-kaisen",
    "title": "Jujutsu Kaisen",
    "poster": "https://.../poster.jpg",
    "banner": "https://.../banner.jpg",
    "description": "A boy fights curses...",
    "rating": "8.5",
    "year": "2020",
    "episodes": 24,
    "subEpisodes": 24,
    "dubEpisodes": 24,
    "ageRating": "R - 17+"
  }
]
```

---

## AniList Enrichment Dual-Mode

Nuvio includes native **AniList Enrichment**:

1. **Enrichment ON (Default):**
   - Nuvio queries the AniList GraphQL API for official English/Romaji titles, voice actors, character artwork, YouTube trailers, studios, and official synopses.
   - The provider supplies the video streams and episode list. Episode counts and filler indicators from the provider enrich the AniList view.
2. **Enrichment OFF:**
   - Nuvio disables AniList network calls.
   - The app relies 100% on the provider's `getAnimeInfo(contentId)` / `getDetails(contentId)` method for title, poster, episode count, sub/dub counts, age rating, episode lists, and relations.

---

## Filler Episodes & Episode Indicators

Nuvio displays an amber **FILLER** badge on episode cards when `isFiller: true`.
- If an anime site marks an episode as filler (or your plugin checks an episode filler database), set `isFiller: true`.
- Supply `isSub: true` and `isDub: true` flags on episode items so the app displays Sub/Dub availability badges.

---

## Subtitles & Playback Headers

- **Subtitles:** You can provide multiple subtitle tracks per stream. Formats supported include `.vtt`, `.srt`, and `.ass`.
- **Headers:** Some video CDNs enforce referer verification. Pass the required `Referer` and `User-Agent` inside the `headers` field of the stream object.

---

## Tutorial: Creating an Anime Provider

1. **Create provider folder:**
   ```bash
   mkdir -p src/myanime
   ```

2. **Implement `src/myanime/index.js`:**
   ```javascript
   import cheerio from 'cheerio-without-node-native';

   async function getStreams(contentId, mediaType, season, episode) {
       const searchUrl = `https://source.example/search?q=${encodeURIComponent(contentId)}`;
       const res = await fetch(searchUrl);
       const html = await res.text();
       const $ = cheerio.load(html);

       // Parse episode stream
       const videoUrl = $('iframe#player').attr('src');
       if (!videoUrl) return [];

       return [{
           name: "MyAnime Server 1",
           title: `Episode ${episode || 1}`,
           url: videoUrl,
           quality: "1080p",
           headers: { "Referer": "https://source.example/" }
       }];
   }

   module.exports = { getStreams };
   ```

3. **Register in `manifest.json`:**
   ```json
   {
     "id": "myanime",
     "name": "MyAnime",
     "description": "Fast anime streaming",
     "version": "1.0.0",
     "supportedTypes": ["tv", "movie"],
     "filename": "providers/myanime.js",
     "enabled": true
   }
   ```

4. **Build:**
   ```bash
   node build.js myanime
   ```

---

## Building & Testing

- **Build all:** `node build.js`
- **Watch:** `npm run build:watch`
- Bundled output is saved to `providers/<id>.js`.
