# Nuvio Anime Providers

A collection of high-performance anime streaming providers for the Nuvio app. Providers are compiled WebAssembly (`.wasm`) modules written in Rust, running cross-platform on both Android and iOS via the native KMP Chasm WASM engine.

📖 **[Read the Full Developer Guide](DOCUMENTATION.md)**

---

## Active Providers

| Provider | Description | Formats | Languages | Binary |
| :--- | :--- | :--- | :--- | :--- |
| **Reanime** (`reanime`) | High-definition anime streaming with AniList mapping, skip times, server categorization (`SUB`, `DUB`, `HARDSUB`), and subtitle support | HLS (`m3u8`) | Sub, Dub | `providers/reanime.wasm` |

---

## Quick Start

### Using in Nuvio App

1. Open **Nuvio** > **Settings** > **Plugins**
2. Add this repository manifest URL:
   ```
   https://raw.githubusercontent.com/paregi12/nuvio-providers/refs/heads/main/manifest.json
   ```
3. Refresh and enable **Reanime**.

---

## Architecture & How It Works

Nuvio executes anime scrapers inside an isolated, cross-platform WebAssembly runtime:

- **Universal Support**: Runs on both Android and iOS without native C++ compilation or JavaScript overhead.
- **AniList Enrichment ON**: The app resolves anime titles, cast, voice actors, trailers, and studios from AniList, while querying active WASM providers for playable video streams and episode lists.
- **AniList Enrichment OFF**: The app queries the provider directly via `nuvio_details` to fetch the title, synopsis, poster, age rating, episode lists (with sub/dub counts and filler badges), and recommendations directly from the source.
- **Categorized Server Selection**: Providers categorize streams into `SUB`, `DUB`, and `HARDSUB` so the player automatically matches user preferences.

---

## WebAssembly ABI Specification

Every provider is compiled to `wasm32-unknown-unknown` and exports standard C-FFI entrypoints. Pointers and lengths are exchanged via a packed 64-bit integer (`(ptr << 32) | len`).

### 1. Memory Management Exports

- `nuvio_alloc(size: usize) -> *mut u8`: Allocates heap memory for arguments passed from the host.
- `nuvio_dealloc(ptr: *mut u8, size: usize)`: Frees memory allocated by the host or plugin.

### 2. Provider API Exports

- `nuvio_streams(url_ptr: i32, url_len: i32) -> i64`: Resolves playable streams for the selected episode URL.
- `nuvio_home() -> i64` *(Optional)*: Returns catalog sections (`Latest Episodes`, `Popular Anime`, `Top Rated`) for the home screen.
- `nuvio_search(arg_ptr: i32, arg_len: i32) -> i64` *(Optional)*: Searches anime catalog with `{ "query": "...", "page": 1 }`.
- `nuvio_details(id_ptr: i32, id_len: i32) -> i64` *(Optional)*: Returns detailed anime metadata and episode catalog.
- `nuvio_settings() -> i64` *(Optional)*: Returns configuration UI layout (e.g. domain selector).

### 3. Host Imports (`env` / `nuvio`)

- `nuvio_fetch(req_ptr: i32, req_len: i32) -> i64`: Executes asynchronous HTTP requests via the host's networking engine. Takes JSON `{ "url": "...", "method": "GET", "headers": {...}, "body": "..." }` and returns `{ "ok": bool, "status": u16, "body": String, "headers": {...} }`.
- `nuvio_log(level: i32, msg_ptr: i32, msg_len: i32)`: Logs messages to the host logging framework (`0`=Debug, `1`=Info, `2`=Warn, `3`=Error).

---

## Stream Return Format

`nuvio_streams` returns a JSON array of stream objects:

```json
[
  {
    "name": "Reanime [SUB] HD-1",
    "title": "Jujutsu Kaisen - Episode 1 (SUB)",
    "url": "https://.../master.m3u8",
    "quality": "Auto",
    "server": "HD-1",
    "provider": "reanime",
    "type": "m3u8",
    "subType": "SUB",
    "format": "softsub",
    "intro": { "start": 85.5, "end": 175.0 },
    "outro": { "start": 1320.0, "end": 1410.0 },
    "thumbnails": "https://.../thumbnails.vtt",
    "headers": {
      "Referer": "https://flixcloud.cc/",
      "User-Agent": "Mozilla/5.0..."
    },
    "subtitles": [
      {
        "url": "https://.../en.vtt",
        "language": "English",
        "name": "English"
      }
    ]
  }
]
```

---

## Project Structure

```
nuvio-providers/
├── scrapers/               # Rust source crates for each provider
│   └── reanime/
│       ├── Cargo.toml      # Scraper manifest (crate-type = ["cdylib"])
│       └── src/
│           └── lib.rs      # Stream extraction, FlixCloud decoding, ABI exports
│
├── providers/              # Compiled WebAssembly binaries
│   └── reanime.wasm
│
├── Cargo.toml              # Workspace Cargo configuration
├── manifest.json           # Plugin repository manifest
├── build.js                # Build automation script
└── package.json
```

---

## Building & Developing

### Prerequisites

- **Rust**: 1.75 or newer
- **wasm32 Target**:
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
  *(On Termux: `pkg install rust rust-std-wasm32-unknown-unknown`)*
- **Node.js**: v18+ (for `build.js` runner)

### Build Commands

```bash
# Build all WASM scrapers and copy to providers/
npm run build
# or: node build.js

# Build only a specific scraper
node build.js reanime

# Direct Cargo build
cargo build --target wasm32-unknown-unknown --release
```

---

## License

This project is licensed under the **GNU General Public License v3.0**.
