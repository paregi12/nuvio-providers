# Anime Synchronization & Mapping Guide

This document describes how anime titles, seasonal structures, and episode numbering are mapped between **AniList** and third-party anime streaming sources in Nuvio.

---

## The Challenge in Anime Streaming

Anime releases often differ in structure across platforms:
1. **Seasonal Splits vs Continuous Numbering**: AniList frequently lists seasons as separate entries (e.g., *Bleach: Thousand-Year Blood War - The Separation* as a distinct series), while streaming sites often list all episodes under a single continuous entry (*Bleach: TYBW* episodes 1–26).
2. **Title Variations**: Titles may appear in Romaji (*Boku no Hero Academia*), English (*My Hero Academia*), or Native Japanese (*僕のヒーローアカデミア*).
3. **Specials, OVAs & Movies**: Non-standard episodes and canon movies may be indexed separately from main TV runs.
4. **Filler Episodes**: Long-running anime (such as *Naruto*, *One Piece*, *Bleach*) contain non-canon filler episodes that need clear visual labeling.

---

## The Nuvio Sync Architecture

### 1. AniList as the Central Source of Truth
Nuvio uses **AniList** as its primary metadata provider when AniList Enrichment is enabled:
- Each anime has a distinct integer `alId` (AniList ID).
- The AniList GraphQL API provides Romaji, English, Native titles, synonyms, episode counts, air dates, studios, voice actors, and relation trees.

### 2. Title & Synonym Resolution
When a provider receives a search query or AniList ID:
1. It retrieves the primary titles (English, Romaji, and synonyms).
2. It queries the streaming site's search endpoint with normalized titles (stripping special characters, punctuation, and season tags).
3. Candidate matches are verified by matching release year, format (TV / Movie / OVA), or cross-referencing external identifiers (e.g., MyAnimeList or AniList links embedded on the source page).

### 3. Smart Episode Normalization
To map episodes accurately:
- Standard TV series with continuous numbering map directly to the target episode index.
- Multi-cour or multi-season entries calculate the offset:
  $$\text{SourceEpisode} = \text{SeasonEpisodeOffset} + \text{TargetEpisode}$$
- For OVAs and specials, episode mapping falls back to title similarity matching and air date alignment.

### 4. Filler Episode Detection (`isFiller`)
Source sites often flag episodes as filler (non-manga content). When a provider parses episodes:
- Set `isFiller: true` on filler episodes.
- Nuvio displays an amber **FILLER** badge on the episode card in both grid and list views.

### 5. Dual-Mode Independence
- **Enrichment ON:** Nuvio matches the provider's streams to the active AniList entry.
- **Enrichment OFF:** Nuvio loads all titles, episode lists, sub/dub counts, and artwork directly from the provider's `getAnimeInfo(contentId)` / `getDetails(contentId)` implementation, requiring zero external metadata calls.
