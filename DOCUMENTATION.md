# Nuvio Anime Provider Developer Guide

This guide covers everything required to develop high-performance anime streaming providers for the Nuvio app using Rust and WebAssembly (`wasm32-unknown-unknown`).

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites & Toolchain](#prerequisites--toolchain)
3. [Runtime Environment & Sandboxing](#runtime-environment--sandboxing)
4. [WebAssembly ABI & Memory Management](#webassembly-abi--memory-management)
5. [Host Imports](#host-imports)
6. [Provider API Specification](#provider-api-specification)
   - [1. nuvio_streams](#1-nuvio_streams)
   - [2. nuvio_home](#2-nuvio_home)
   - [3. nuvio_search](#3-nuvio_search)
   - [4. nuvio_details](#4-nuvio_details)
   - [5. nuvio_settings](#5-nuvio_settings)
7. [Stream Categorization & Player Selection](#stream-categorization--player-selection)
8. [AniList Enrichment Dual-Mode](#anilist-enrichment-dual-mode)
9. [Tutorial: Creating a Rust Anime Provider](#tutorial-creating-a-rust-anime-provider)
10. [Building & Testing](#building--testing)

---

## Introduction

A **Provider** in Nuvio is a compiled WebAssembly module (`.wasm`) that interfaces with anime streaming websites to discover playable video streams, episode catalogs, and metadata.

Providers are executed natively inside Nuvio across all platforms (Android, iOS) via the pure Kotlin Multiplatform WebAssembly runtime (Chasm).

---

## Prerequisites & Toolchain

- **Rust**: Version 1.75 or higher.
- **WASM Target**: `wasm32-unknown-unknown`
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
  *(Termux users can install via: `pkg install rust rust-std-wasm32-unknown-unknown`)*
- **Node.js**: v18+ (used for the `build.js` packaging runner).

---

## Runtime Environment & Sandboxing

Nuvio runs providers in an isolated WebAssembly sandbox:
- **No Direct System Access**: No file system or raw network socket access.
- **Host Networking**: All HTTP/HTTPS requests are delegated to the host via the imported `nuvio_fetch` function.
- **Fast Startup & Low Memory**: Compact WASM binaries (~100-300 KB) start in milliseconds with minimal overhead.

---

## WebAssembly ABI & Memory Management

Because WebAssembly runs with its own linear memory, strings and JSON structures are passed between the host and plugin via memory pointers.

### Memory Allocation Exports

Every provider must export two memory management functions:

```rust
#[no_mangle]
pub extern "C" fn nuvio_alloc(size: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub extern "C" fn nuvio_dealloc(ptr: *mut u8, size: usize) {
    if !ptr.is_null() && size > 0 {
        unsafe {
            let _ = Vec::from_raw_parts(ptr, 0, size);
        }
    }
}
```

### Packed 64-bit Return Values

Functions returning variable-length strings/JSON encode the result pointer and byte length into a single 64-bit integer (`i64`):

```rust
pub fn pack_result(ptr: *mut u8, len: usize) -> i64 {
    (((ptr as u64) << 32) | (len as u64)) as i64
}
```

The host reads the string from `(packed >> 32)` for length `(packed & 0xFFFFFFFF)`, and then calls `nuvio_dealloc` to reclaim memory.

---

## Host Imports

Providers import host capabilities from the `"env"` module:

```rust
#[link(wasm_import_module = "env")]
extern "C" {
    fn nuvio_fetch(req_ptr: i32, req_len: i32) -> i64;
    fn nuvio_log(level: i32, msg_ptr: i32, msg_len: i32);
}
```

### 1. `nuvio_fetch`

Performs HTTP requests with automatic redirect handling and TLS support.

**Request JSON:**
```json
{
  "url": "https://api.example.com/data",
  "method": "GET",
  "headers": {
    "User-Agent": "Mozilla/5.0...",
    "Referer": "https://example.com/"
  },
  "body": "optional request body for POST"
}
```

**Response JSON:**
```json
{
  "ok": true,
  "status": 200,
  "statusText": "OK",
  "url": "https://api.example.com/data",
  "body": "response text...",
  "headers": {
    "content-type": "application/json"
  }
}
```

### 2. `nuvio_log`

Outputs logs to the app's native logging framework.

- `level`: `0` = Debug, `1` = Info, `2` = Warning, `3` = Error.

---

## Provider API Specification

### 1. `nuvio_streams`

Fetches direct video URLs and subtitle tracks for a specific episode watch URL.

```rust
#[no_mangle]
pub extern "C" fn nuvio_streams(url_ptr: i32, url_len: i32) -> i64
```

**Return Value:** JSON array of stream objects:
```json
[
  {
    "name": "Reanime [SUB] HD-1",
    "title": "Jujutsu Kaisen - Episode 1 (SUB)",
    "url": "https://stream.example/master.m3u8",
    "quality": "Auto",
    "server": "HD-1",
    "provider": "reanime",
    "type": "m3u8",
    "subType": "SUB",
    "format": "softsub",
    "intro": { "start": 85.5, "end": 175.0 },
    "outro": { "start": 1320.0, "end": 1410.0 },
    "thumbnails": "https://stream.example/thumbnails.vtt",
    "headers": {
      "Referer": "https://source.example/",
      "User-Agent": "Mozilla/5.0..."
    },
    "subtitles": [
      {
        "url": "https://stream.example/en.vtt",
        "language": "English",
        "name": "English"
      }
    ]
  }
]
```

---

### 2. `nuvio_home`

*(Optional)* Supplies catalog sections to display on the Nuvio home screen.

```rust
#[no_mangle]
pub extern "C" fn nuvio_home() -> i64
```

**Return Value:** JSON array of section objects:
```json
[
  {
    "title": "Latest Episodes",
    "items": [
      {
        "id": "frieren-s1",
        "title": "Frieren: Beyond Journey's End",
        "poster": "https://.../frieren.jpg",
        "type": "tv",
        "episodes": 28,
        "subEpisodes": 28,
        "dubEpisodes": 28,
        "rating": "9.1",
        "year": "2023"
      }
    ]
  }
]
```

---

### 3. `nuvio_search`

*(Optional)* Searches the provider catalog.

```rust
#[no_mangle]
pub extern "C" fn nuvio_search(arg_ptr: i32, arg_len: i32) -> i64
```

**Argument JSON:** `{ "query": "naruto", "page": 1 }`

**Return Value:** JSON array of section objects or direct item array.

---

### 4. `nuvio_details`

*(Optional)* Fetches full anime details, AniList IDs, and episode listings when AniList enrichment is off or for direct plugin browsing.

```rust
#[no_mangle]
pub extern "C" fn nuvio_details(id_ptr: i32, id_len: i32) -> i64
```

**Return Value:**
```json
{
  "id": "jujutsu-kaisen",
  "title": "Jujutsu Kaisen",
  "description": "A boy fights curses...",
  "poster": "https://.../poster.jpg",
  "banner": "https://.../banner.jpg",
  "status": "Completed",
  "genres": ["Action", "Supernatural"],
  "rating": "8.5",
  "ageRating": "R - 17+",
  "totalEpisodes": 24,
  "subEpisodes": 24,
  "dubEpisodes": 24,
  "year": "2020",
  "episodes": [
    {
      "id": "ep-1",
      "episodeUrl": "https://reanime.to/watch/jujutsu-kaisen?ep=1",
      "episode": 1,
      "season": 1,
      "title": "Ryomen Sukuna",
      "thumbnail": "https://.../thumb1.jpg",
      "isFiller": false,
      "isSub": true,
      "isDub": true
    }
  ],
  "related": [],
  "anilistId": 113415
}
```

---

### 5. `nuvio_settings`

*(Optional)* Returns a declarative JSON schema for provider settings in the Nuvio settings modal.

```rust
#[no_mangle]
pub extern "C" fn nuvio_settings() -> i64
```

---

## Stream Categorization & Player Selection

To support the player's audio / subtitle selection UI, each stream object should set:

- `subType`: `"SUB"`, `"DUB"`, or `"HARDSUB"`
- `format`: `"sub"`, `"dub"`, `"softsub"`, or `"hardsub"`
- `server`: Server label (e.g. `"HD-1"`, `"Server 2"`)

---

## AniList Enrichment Dual-Mode

Nuvio operates seamlessly in two modes:

1. **AniList Mode (Default)**: Nuvio resolves show metadata, characters, voice actors, and relation trees from AniList. When the user plays an episode, Nuvio passes the episode watch URL to `nuvio_streams`.
2. **Direct Source Mode**: When AniList enrichment is disabled, Nuvio calls `nuvio_details(id)` directly to retrieve the episode list, banners, posters, and fillers.

---

## Tutorial: Creating a Rust Anime Provider

### Step 1: Create Scraper Directory

Under `scrapers/<name>/`:

```
scrapers/mysite/
├── Cargo.toml
└── src/
    └── lib.rs
```

### Step 2: Configure `Cargo.toml`

```toml
[package]
name = "nuvio_provider_mysite"
version = "1.0.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

### Step 3: Implement `lib.rs`

Implement `nuvio_alloc`, `nuvio_dealloc`, host import `nuvio_fetch`, and `nuvio_streams`.

### Step 4: Register in `manifest.json`

Add your scraper entry to root `manifest.json` pointing to `"providers/mysite.wasm"`.

---

## Building & Testing

Run the build script from the repository root:

```bash
# Build all scrapers
npm run build

# Or using Cargo directly
cargo build --target wasm32-unknown-unknown --release
```

Output `.wasm` binaries are placed in `providers/` and ready for distribution.
