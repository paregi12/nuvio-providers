use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;

const REANIME_BASE: &str = "https://reanime.to";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const FLIX_SEGMENT_MASK_FALLBACK: [u8; 16] = [157, 42, 241, 71, 179, 142, 92, 112, 166, 25, 228, 59, 216, 98, 15, 197];

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

#[link(wasm_import_module = "env")]
extern "C" {
    fn nuvio_fetch(req_ptr: i32, req_len: i32) -> i64;
    fn nuvio_log(level: i32, msg_ptr: i32, msg_len: i32);
}

pub fn log(level: i32, msg: &str) {
    unsafe {
        nuvio_log(level, msg.as_ptr() as i32, msg.len() as i32);
    }
}

#[derive(Serialize)]
struct FetchRequest<'a> {
    url: &'a str,
    method: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    headers: Option<HashMap<&'a str, &'a str>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    body: Option<&'a str>,
}

#[derive(Deserialize)]
struct FetchResponse {
    ok: bool,
    status: u16,
    body: String,
}

fn fetch_request(
    url: &str,
    method: &str,
    headers: Option<HashMap<&str, &str>>,
    body: Option<&str>,
) -> Result<String, String> {
    let req = FetchRequest {
        url,
        method,
        headers,
        body,
    };
    let req_json = serde_json::to_string(&req).map_err(|e| e.to_string())?;

    let packed = unsafe { nuvio_fetch(req_json.as_ptr() as i32, req_json.len() as i32) };

    let ptr = ((packed as u64) >> 32) as *mut u8;
    let len = (packed & 0xFFFFFFFF) as usize;
    if ptr.is_null() || len == 0 {
        return Err("Fetch failed".to_string());
    }

    let resp_bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    let resp: FetchResponse = serde_json::from_slice(resp_bytes).map_err(|e| e.to_string())?;
    nuvio_dealloc(ptr, len);

    if resp.ok {
        Ok(resp.body)
    } else {
        Err(format!("HTTP Error {}", resp.status))
    }
}

fn fetch_get(url: &str, headers: Option<HashMap<&str, &str>>) -> Result<String, String> {
    fetch_request(url, "GET", headers, None)
}

fn fetch_post(url: &str, body: &str, headers: Option<HashMap<&str, &str>>) -> Result<String, String> {
    fetch_request(url, "POST", headers, Some(body))
}

fn pack_json_result<T: Serialize>(value: &T) -> i64 {
    let json_bytes = serde_json::to_vec(value).unwrap_or_default();
    let res_len = json_bytes.len();
    let res_ptr = nuvio_alloc(res_len);
    unsafe {
        std::ptr::copy_nonoverlapping(json_bytes.as_ptr(), res_ptr, res_len);
    }
    (((res_ptr as u64) << 32) | (res_len as u64)) as i64
}

fn read_string_arg(ptr: i32, len: i32) -> String {
    if ptr == 0 || len <= 0 {
        return String::new();
    }
    unsafe {
        let slice = std::slice::from_raw_parts(ptr as *const u8, len as usize);
        std::str::from_utf8(slice).unwrap_or("").to_string()
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StreamSubtitle {
    pub url: String,
    pub language: String,
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StreamTimeRange {
    pub start: f64,
    pub end: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct StreamResult {
    pub name: String,
    pub title: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    pub provider: String,
    #[serde(rename = "type")]
    pub stream_type: String,
    #[serde(rename = "subType", skip_serializing_if = "Option::is_none")]
    pub sub_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub headers: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subtitles: Option<Vec<StreamSubtitle>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub intro: Option<StreamTimeRange>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outro: Option<StreamTimeRange>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnails: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct HomeItem {
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub poster: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rating: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub media_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub episodes: Option<i32>,
    #[serde(rename = "subEpisodes", skip_serializing_if = "Option::is_none")]
    pub sub_episodes: Option<i32>,
    #[serde(rename = "dubEpisodes", skip_serializing_if = "Option::is_none")]
    pub dub_episodes: Option<i32>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct HomeSection {
    pub title: String,
    pub items: Vec<HomeItem>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EpisodeItem {
    pub id: String,
    #[serde(rename = "episodeUrl")]
    pub episode_url: String,
    pub episode: i32,
    pub season: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overview: Option<String>,
    #[serde(rename = "isFiller")]
    pub is_filler: bool,
    #[serde(rename = "isSub")]
    pub is_sub: bool,
    #[serde(rename = "isDub")]
    pub is_dub: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DetailsResult {
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub poster: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub media_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    #[serde(rename = "totalEpisodes", skip_serializing_if = "Option::is_none")]
    pub total_episodes: Option<i32>,
    #[serde(rename = "subEpisodes", skip_serializing_if = "Option::is_none")]
    pub sub_episodes: Option<i32>,
    #[serde(rename = "dubEpisodes", skip_serializing_if = "Option::is_none")]
    pub dub_episodes: Option<i32>,
    #[serde(rename = "ageRating", skip_serializing_if = "Option::is_none")]
    pub age_rating: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    pub genres: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub year: Option<String>,
    pub episodes: Vec<EpisodeItem>,
    pub related: Vec<HomeItem>,
    #[serde(rename = "anilistId", skip_serializing_if = "Option::is_none")]
    pub anilist_id: Option<i64>,
    #[serde(rename = "malId", skip_serializing_if = "Option::is_none")]
    pub mal_id: Option<i64>,
}

fn to_home_item(item: &Value) -> Option<HomeItem> {
    let id = item.get("anime_id")
        .or_else(|| item.get("slug"))
        .or_else(|| item.get("id"))?
        .as_str()?
        .to_string();

    let title = if let Some(title_obj) = item.get("title").and_then(|t| t.as_object()) {
        title_obj.get("english")
            .or_else(|| title_obj.get("romaji"))
            .or_else(|| title_obj.get("native"))
            .and_then(|v| v.as_str())
            .unwrap_or(&id)
            .to_string()
    } else if let Some(title_str) = item.get("title").and_then(|t| t.as_str()) {
        title_str.to_string()
    } else if let Some(name_str) = item.get("name").and_then(|n| n.as_str()) {
        name_str.to_string()
    } else {
        id.clone()
    };

    let poster = item.get("cover_image").and_then(|c| {
        c.get("extra_large")
            .or_else(|| c.get("large"))
            .or_else(|| c.get("medium"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    }).or_else(|| item.get("image").and_then(|v| v.as_str()).map(|s| s.to_string()))
      .or_else(|| item.get("poster").and_then(|v| v.as_str()).map(|s| s.to_string()));

    let banner = item.get("banner_image")
        .or_else(|| item.get("banner"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let description = item.get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let rating = item.get("average_score")
        .and_then(|v| v.as_f64())
        .map(|s| format!("{:.1}", s / 10.0))
        .or_else(|| item.get("score").and_then(|v| v.as_f64()).map(|s| s.to_string()));

    let year = item.get("season_year")
        .and_then(|v| v.as_i64())
        .map(|y| y.to_string())
        .or_else(|| item.get("year").and_then(|v| v.as_str()).map(|s| s.to_string()));

    let episodes = item.get("episodes")
        .and_then(|v| v.as_i64())
        .or_else(|| item.get("totalEpisodes").and_then(|v| v.as_i64()))
        .map(|e| e as i32);

    let sub_episodes = item.get("subbed")
        .and_then(|v| v.as_i64())
        .or_else(|| item.get("subEpisodes").and_then(|v| v.as_i64()))
        .map(|e| e as i32);

    let dub_episodes = item.get("dubbed")
        .and_then(|v| v.as_i64())
        .or_else(|| item.get("dubEpisodes").and_then(|v| v.as_i64()))
        .map(|e| e as i32);

    let raw_format = item.get("format")
        .or_else(|| item.get("type"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_lowercase();

    let media_type = if !raw_format.is_empty() {
        raw_format.clone()
    } else if episodes == Some(1) {
        "movie".to_string()
    } else {
        "tv".to_string()
    };

    Some(HomeItem {
        id,
        title,
        poster,
        banner,
        description,
        rating,
        year,
        media_type: Some(media_type.clone()),
        format: Some(if raw_format.is_empty() { media_type } else { raw_format }),
        episodes,
        sub_episodes,
        dub_episodes,
    })
}

#[no_mangle]
pub extern "C" fn nuvio_settings() -> i64 {
    let settings = json!([
        { "type": "header", "label": "Domain Selection" },
        {
            "type": "select",
            "key": "domain",
            "label": "Preferred Domain",
            "description": "Reanime operates across multiple domains. Choose the one currently working for you.",
            "options": [
                { "label": "reanime.to", "value": "https://reanime.to" },
                { "label": "reanime.cz", "value": "https://reanime.cz" },
                { "label": "reanime.wtf", "value": "https://reanime.wtf" }
            ],
            "defaultValue": "https://reanime.to"
        }
    ]);
    pack_json_result(&settings)
}

#[no_mangle]
pub extern "C" fn nuvio_home() -> i64 {
    let mut sections = Vec::new();

    let headers = {
        let mut h = HashMap::new();
        h.insert("Referer", "https://reanime.to/");
        h.insert("User-Agent", USER_AGENT);
        h
    };

    if let Ok(body) = fetch_get(&format!("{}/api/v1/home/latest-aired?limit=24&lang=sub", REANIME_BASE), Some(headers.clone())) {
        if let Ok(v) = serde_json::from_str::<Value>(&body) {
            let list = v.get("data").or_else(|| v.get("results")).and_then(|d| d.as_array());
            if let Some(items_val) = list {
                let items: Vec<HomeItem> = items_val.iter().filter_map(to_home_item).collect();
                if !items.is_empty() {
                    sections.push(HomeSection {
                        title: "Latest Episodes".to_string(),
                        items,
                    });
                }
            }
        }
    }

    if let Ok(body) = fetch_get(&format!("{}/api/v1/search?sort=popularity_desc&limit=24&offset=0", REANIME_BASE), Some(headers.clone())) {
        if let Ok(v) = serde_json::from_str::<Value>(&body) {
            let list = v.get("results").or_else(|| v.get("data")).and_then(|d| d.as_array());
            if let Some(items_val) = list {
                let items: Vec<HomeItem> = items_val.iter().filter_map(to_home_item).collect();
                if !items.is_empty() {
                    sections.push(HomeSection {
                        title: "Popular Anime".to_string(),
                        items,
                    });
                }
            }
        }
    }

    if let Ok(body) = fetch_get(&format!("{}/api/v1/search?sort=score_desc&limit=24&offset=0", REANIME_BASE), Some(headers)) {
        if let Ok(v) = serde_json::from_str::<Value>(&body) {
            let list = v.get("results").or_else(|| v.get("data")).and_then(|d| d.as_array());
            if let Some(items_val) = list {
                let items: Vec<HomeItem> = items_val.iter().filter_map(to_home_item).collect();
                if !items.is_empty() {
                    sections.push(HomeSection {
                        title: "Top Rated".to_string(),
                        items,
                    });
                }
            }
        }
    }

    pack_json_result(&sections)
}

#[no_mangle]
pub extern "C" fn nuvio_search(arg_ptr: i32, arg_len: i32) -> i64 {
    let arg_str = read_string_arg(arg_ptr, arg_len);
    let (query, page) = if let Ok(val) = serde_json::from_str::<Value>(&arg_str) {
        let q = val.get("query").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let p = val.get("page").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
        (q, p)
    } else {
        (arg_str, 1)
    };

    if query.trim().is_empty() {
        let empty: Vec<HomeSection> = Vec::new();
        return pack_json_result(&empty);
    }

    let limit = 36;
    let offset = (page.max(1) - 1) * limit;
    let encoded_query: String = query
        .bytes()
        .map(|b| {
            if b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'.' || b == b'~' {
                (b as char).to_string()
            } else {
                format!("%{:02X}", b)
            }
        })
        .collect();

    let url = format!(
        "{}/api/v1/search?q={}&limit={}&offset={}&sort=popularity_desc",
        REANIME_BASE, encoded_query, limit, offset
    );

    let mut headers = HashMap::new();
    headers.insert("Referer", "https://reanime.to/");
    headers.insert("User-Agent", USER_AGENT);

    let mut items = Vec::new();
    if let Ok(body) = fetch_get(&url, Some(headers)) {
        if let Ok(v) = serde_json::from_str::<Value>(&body) {
            let list = v.get("results").or_else(|| v.get("data")).and_then(|d| d.as_array());
            if let Some(items_val) = list {
                items = items_val.iter().filter_map(to_home_item).collect();
            }
        }
    }

    let sections = vec![HomeSection {
        title: "Search Results".to_string(),
        items,
    }];
    pack_json_result(&sections)
}

#[no_mangle]
pub extern "C" fn nuvio_details(id_ptr: i32, id_len: i32) -> i64 {
    let content_id = read_string_arg(id_ptr, id_len);
    let mut slug = content_id.trim_start_matches("reanime:").to_string();

    let mut headers = HashMap::new();
    headers.insert("Referer", "https://reanime.to/");
    headers.insert("User-Agent", USER_AGENT);

    if slug.starts_with("anilist:") {
        let al_id = slug.trim_start_matches("anilist:");
        let al_query = json!({
            "query": "query($id:Int){Media(id:$id,type:ANIME){title{english romaji}}}",
            "variables": { "id": al_id.parse::<i64>().unwrap_or(0) }
        });
        let mut al_headers = HashMap::new();
        al_headers.insert("Content-Type", "application/json");
        al_headers.insert("User-Agent", USER_AGENT);
        if let Ok(al_body) = fetch_post("https://graphql.anilist.co", &al_query.to_string(), Some(al_headers)) {
            if let Ok(al_val) = serde_json::from_str::<Value>(&al_body) {
                let media_title = al_val.pointer("/data/Media/title/english")
                    .or_else(|| al_val.pointer("/data/Media/title/romaji"))
                    .and_then(|t| t.as_str());
                if let Some(title) = media_title {
                    let enc: String = title.bytes().map(|b| if b.is_ascii_alphanumeric() { (b as char).to_string() } else { format!("%{:02X}", b) }).collect();
                    if let Ok(s_body) = fetch_get(&format!("{}/api/v1/search?q={}&limit=10", REANIME_BASE, enc), Some(headers.clone())) {
                        if let Ok(sv) = serde_json::from_str::<Value>(&s_body) {
                            if let Some(first_match) = sv.get("results").or_else(|| sv.get("data")).and_then(|d| d.as_array()).and_then(|a| a.first()) {
                                if let Some(matched_slug) = first_match.get("anime_id").or_else(|| first_match.get("slug")).and_then(|s| s.as_str()) {
                                    slug = matched_slug.to_string();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let details_url = format!("{}/api/v1/anime/{}", REANIME_BASE, slug);
    let details_body = match fetch_get(&details_url, Some(headers.clone())) {
        Ok(b) => b,
        Err(_) => return 0,
    };

    let details: Value = match serde_json::from_str(&details_body) {
        Ok(v) => v,
        Err(_) => return 0,
    };

    let anime_id = details.get("anime_id").and_then(|v| v.as_str()).unwrap_or(&slug).to_string();
    let title = details.get("title").and_then(|t| {
        t.get("english")
            .or_else(|| t.get("romaji"))
            .or_else(|| t.get("native"))
            .and_then(|v| v.as_str())
    }).unwrap_or(&anime_id).to_string();

    let poster = details.get("cover_image").and_then(|c| {
        c.get("extra_large")
            .or_else(|| c.get("large"))
            .or_else(|| c.get("medium"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    });

    let banner = details.get("banner_image").and_then(|v| v.as_str()).map(|s| s.to_string());
    let description = details.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());
    let sub_count = details.get("subbed").and_then(|v| v.as_i64()).map(|v| v as i32);
    let dub_count = details.get("dubbed").and_then(|v| v.as_i64()).map(|v| v as i32);
    let anilist_id = details.get("anilist_id").and_then(|v| v.as_i64());
    let mal_id = details.get("mal_id").and_then(|v| v.as_i64());
    let age_rating = details.get("rating").and_then(|v| v.as_str()).map(|s| s.to_string());
    let status = details.get("status").and_then(|v| v.as_str()).map(|s| s.to_string());
    let year = details.get("season_year").and_then(|v| v.as_i64()).map(|y| y.to_string());

    let genres: Vec<String> = details.get("genres")
        .and_then(|g| g.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    let mut thumbnails_map: HashMap<String, String> = HashMap::new();
    if let Some(al) = anilist_id {
        if let Ok(thumb_body) = fetch_get(&format!("{}/api/thumbnails/{}", REANIME_BASE, al), Some(headers.clone())) {
            if let Ok(tv) = serde_json::from_str::<Value>(&thumb_body) {
                if let Some(t_obj) = tv.get("thumbnails").and_then(|t| t.as_object()) {
                    for (k, v) in t_obj {
                        if let Some(url_str) = v.as_str() {
                            thumbnails_map.insert(k.clone(), url_str.to_string());
                        }
                    }
                }
            }
        }
    }

    let mut episodes = Vec::new();
    let episodes_url = format!("{}/api/v1/anime/{}/episodes?limit=2000", REANIME_BASE, slug);
    if let Ok(ep_body) = fetch_get(&episodes_url, Some(headers.clone())) {
        if let Ok(ev) = serde_json::from_str::<Value>(&ep_body) {
            if let Some(raw_eps) = ev.get("data").and_then(|d| d.as_array()) {
                for ep in raw_eps {
                    let ep_num = ep.get("episode_number").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
                    let ep_id = ep.get("episodeId").and_then(|v| v.as_str()).unwrap_or(&format!("ep-{}", ep_num)).to_string();
                    let ep_key = ep_id.trim_start_matches("ep-").to_string();
                    let title_str = ep.get("title")
                        .or_else(|| ep.get("title_romanji"))
                        .and_then(|v| v.as_str())
                        .unwrap_or(&format!("Episode {}", ep_num))
                        .to_string();

                    let is_recap = ep.get("is_recap").and_then(|v| v.as_bool()).unwrap_or(false);
                    let final_title = if is_recap { format!("{} [Recap]", title_str) } else { title_str };

                    let ep_thumb = thumbnails_map.get(&ep_num.to_string())
                        .cloned()
                        .or_else(|| ep.get("thumbnail").and_then(|v| v.as_str()).map(|s| s.to_string()));

                    let has_sub = sub_count.map_or(true, |c| ep_num <= c);
                    let has_dub = dub_count.map_or(false, |c| ep_num <= c);

                    episodes.push(EpisodeItem {
                        id: ep_id,
                        episode_url: format!("{}/watch/{}?ep={}", REANIME_BASE, slug, ep_key),
                        episode: ep_num,
                        season: 1,
                        title: Some(final_title),
                        thumbnail: ep_thumb,
                        overview: ep.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        is_filler: ep.get("is_filler").and_then(|v| v.as_bool()).unwrap_or(false),
                        is_sub: has_sub,
                        is_dub: has_dub,
                        token: ep.get("token").or_else(|| ep.get("data_id")).and_then(|v| v.as_str()).map(|s| s.to_string()),
                    });
                }
            }
        }
    }

    let mut related = Vec::new();
    let recs_url = format!("{}/api/v1/anime/{}/recommendations", REANIME_BASE, slug);
    if let Ok(rec_body) = fetch_get(&recs_url, Some(headers)) {
        if let Ok(rv) = serde_json::from_str::<Value>(&rec_body) {
            let list = rv.get("recommendations").or_else(|| rv.get("data")).and_then(|d| d.as_array());
            if let Some(items_val) = list {
                related = items_val.iter().filter_map(to_home_item).collect();
            }
        }
    }

    let raw_format = details.get("format").or_else(|| details.get("type")).and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
    let detected_type = if !raw_format.is_empty() {
        raw_format.clone()
    } else if episodes.len() == 1 {
        "movie".to_string()
    } else {
        "tv".to_string()
    };

    let total_episodes = if !episodes.is_empty() { Some(episodes.len() as i32) } else { sub_count };

    let result = DetailsResult {
        id: anime_id,
        title,
        poster,
        banner,
        description,
        media_type: Some(detected_type.clone()),
        format: Some(if raw_format.is_empty() { detected_type } else { raw_format }),
        total_episodes,
        sub_episodes: sub_count,
        dub_episodes: dub_count,
        age_rating,
        status,
        genres,
        year,
        episodes,
        related,
        anilist_id,
        mal_id,
    };

    pack_json_result(&result)
}

fn extract_balanced_object(source: &str, start_idx: usize) -> Option<String> {
    let bytes = source.as_bytes();
    let start = source[start_idx..].find('{')? + start_idx;
    let mut depth = 0;
    let mut quote: Option<u8> = None;
    let mut escape = false;

    for i in start..bytes.len() {
        let b = bytes[i];
        if let Some(q) = quote {
            if escape {
                escape = false;
            } else if b == b'\\' {
                escape = true;
            } else if b == q {
                quote = None;
            }
            continue;
        }

        if b == b'"' || b == b'\'' {
            quote = Some(b);
        } else if b == b'{' {
            depth += 1;
        } else if b == b'}' {
            depth -= 1;
            if depth == 0 {
                return Some(source[start..=i].to_string());
            }
        }
    }
    None
}

fn parse_ssr_data(html: &str) -> Option<Value> {
    if let Some(idx) = html.find("type: \"data\", data:") {
        if let Some(obj_str) = extract_balanced_object(html, idx) {
            if let Ok(v) = serde_json::from_str::<Value>(&obj_str) {
                return Some(v);
            }
        }
    }

    let marker = "obfuscation_seed";
    if let Some(marker_idx) = html.find(marker) {
        let mut cur = marker_idx;
        while let Some(open_idx) = html[..cur].rfind('{') {
            if let Some(obj_str) = extract_balanced_object(html, open_idx) {
                if obj_str.contains(marker) {
                    if let Ok(v) = serde_json::from_str::<Value>(&obj_str) {
                        return v.get("data").cloned().or(Some(v));
                    }
                }
            }
            if open_idx == 0 {
                break;
            }
            cur = open_idx - 1;
        }
    }
    None
}

fn extract_segment_mask(html: &str, origin: &str) -> [u8; 16] {
    let script_match = html.split("href=\"").nth(1)
        .and_then(|s| s.split('"').next())
        .or_else(|| html.split("src=\"").find(|s| s.contains("hls.js")).and_then(|s| s.split('"').next()));

    if let Some(script_path) = script_match {
        let script_url = if script_path.starts_with("http") {
            script_path.to_string()
        } else {
            format!("{}/{}", origin.trim_end_matches('/'), script_path.trim_start_matches('/'))
        };

        let mut h = HashMap::new();
        h.insert("Referer", origin);
        if let Ok(script_body) = fetch_get(&script_url, Some(h)) {
            if let Some(idx) = script_body.find("for(var f=[") {
                let rest = &script_body[idx + 11..];
                if let Some(end) = rest.find(']') {
                    let parts: Vec<&str> = rest[..end].split(',').collect();
                    if parts.len() == 16 {
                        let mut mask = [0u8; 16];
                        let mut ok = true;
                        for (i, p) in parts.iter().enumerate() {
                            if let Ok(val) = p.trim().parse::<u8>() {
                                mask[i] = val;
                            } else {
                                ok = false;
                                break;
                            }
                        }
                        if ok {
                            return mask;
                        }
                    }
                }
            }
        }
    }
    FLIX_SEGMENT_MASK_FALLBACK
}

fn resolve_flixcloud_stream(embed_url: &str) -> Result<StreamResult, String> {
    let clean_embed = embed_url.split('&').next().unwrap_or(embed_url);
    let sep = if clean_embed.contains('?') { "&" } else { "?" };
    let page_url = format!("{}{}v=1&autoPlay=true&skI=false&skO=false", clean_embed, sep);
    let origin = "https://flixcloud.cc";

    let mut headers = HashMap::new();
    headers.insert("User-Agent", USER_AGENT);
    headers.insert("Referer", "https://flixcloud.cc/");

    let html = fetch_get(&page_url, Some(headers.clone()))?;
    let data = parse_ssr_data(&html).ok_or("FlixCloud SSR data missing")?;
    let segment_mask = extract_segment_mask(&html, origin);

    let mut cleaned_data = data.clone();
    if let Some(obj) = cleaned_data.as_object_mut() {
        obj.remove("subtitles");
        obj.remove("intro_chapter");
        obj.remove("outro_chapter");
    }

    let mut enc_headers = HashMap::new();
    enc_headers.insert("Content-Type", "application/json");
    enc_headers.insert("User-Agent", USER_AGENT);

    let token_req = json!({ "data": cleaned_data }).to_string();
    let token_resp_body = fetch_post("https://enc-dec.app/api/dec-flixcloud?type=token", &token_req, Some(enc_headers.clone()))?;
    let token_val: Value = serde_json::from_str(&token_resp_body).map_err(|e| e.to_string())?;

    let result = token_val.get("result").unwrap_or(&token_val);
    let token = result.get("token")
        .or_else(|| result.pointer("/context/token"))
        .and_then(|v| v.as_str())
        .ok_or("Missing token in FlixCloud resolve response")?;

    let context = result.get("context").unwrap_or(result);

    let token_url = format!("{}/api/m3u8/{}", origin, token);
    let token_json_str = fetch_get(&token_url, Some(headers.clone()))?;
    let token_json: Value = serde_json::from_str(&token_json_str).map_err(|e| e.to_string())?;

    let stream_req = json!({
        "data": {
            "context": context,
            "stream_response": token_json
        }
    }).to_string();

    let stream_resp_body = fetch_post("https://enc-dec.app/api/dec-flixcloud?type=stream", &stream_req, Some(enc_headers))?;
    let stream_val: Value = serde_json::from_str(&stream_resp_body).map_err(|e| e.to_string())?;

    let stream_result = stream_val.get("result").unwrap_or(&stream_val);
    let raw_stream = stream_result.get("stream")
        .or_else(|| stream_result.get("url"))
        .or_else(|| stream_val.get("result"))
        .and_then(|v| v.as_str())
        .ok_or("No valid stream URL returned")?;

    let clean_stream_url = raw_stream.replace(r"\/", "/").replace("&amp;", "&");
    let w_payload = stream_result.pointer("/context/w_payload")
        .or_else(|| context.get("w_payload"))
        .and_then(|v| v.as_str());

    let final_url = if let Some(wp) = w_payload {
        let profile = json!({
            "version": 1,
            "mode": "hls",
            "url": clean_stream_url,
            "origin": origin,
            "headers": { "Referer": format!("{}/", origin), "User-Agent": USER_AGENT },
            "resolverHeaders": {
                "Content-Type": "application/json",
                "User-Agent": USER_AGENT,
                "Origin": "https://enc-dec.app",
                "Referer": "https://enc-dec.app/"
            },
            "manifest": {
                "resolverUrl": "https://enc-dec.app/api/parse-flixcloud?url={url}&w_payload={w_payload}",
                "resolverInitialOnly": true,
                "inheritQueryParameter": "token"
            },
            "templateValues": { "w_payload": wp },
            "segment": { "stripImageHeader": true, "xorMask": segment_mask }
        });
        let encoded_config: String = profile.to_string().bytes().map(|b| if b.is_ascii_alphanumeric() { (b as char).to_string() } else { format!("%{:02X}", b) }).collect();
        format!("nuvio-proxy://play?config={}", encoded_config)
    } else {
        clean_stream_url
    };

    let mut subtitles = Vec::new();
    let mut thumbnails: Option<String> = None;

    if let Some(tracks) = data.get("subtitles").or_else(|| data.get("tracks")).and_then(|t| t.as_array()) {
        for tr in tracks {
            let kind = tr.get("kind").and_then(|v| v.as_str()).unwrap_or("");
            let file_url = tr.get("url").or_else(|| tr.get("file")).and_then(|v| v.as_str()).unwrap_or("");
            if kind == "thumbnails" || kind == "thumbnail" {
                thumbnails = Some(file_url.to_string());
                continue;
            }
            if !file_url.is_empty() {
                let lang = tr.get("language")
                    .or_else(|| tr.get("lang"))
                    .or_else(|| tr.get("label"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("Unknown")
                    .to_string();

                let mut sub_h = HashMap::new();
                sub_h.insert("Referer".to_string(), format!("{}/", origin));
                sub_h.insert("User-Agent".to_string(), USER_AGENT.to_string());

                subtitles.push(StreamSubtitle {
                    url: file_url.to_string(),
                    language: lang.clone(),
                    name: tr.get("name").or_else(|| tr.get("label")).and_then(|v| v.as_str()).map(|s| s.to_string()).or(Some(lang)),
                    headers: Some(sub_h),
                });
            }
        }
    }

    let parse_chapter = |chapter: Option<&Value>| -> Option<StreamTimeRange> {
        let ch = chapter?;
        if let Some(arr) = ch.as_array() {
            if arr.len() >= 2 {
                let s = arr[0].as_f64()?;
                let e = arr[1].as_f64()?;
                return Some(StreamTimeRange { start: s, end: e });
            }
        }
        if let Some(obj) = ch.as_object() {
            let s = obj.get("start").and_then(|v| v.as_f64())?;
            let e = obj.get("end").and_then(|v| v.as_f64())?;
            return Some(StreamTimeRange { start: s, end: e });
        }
        None
    };

    let intro = parse_chapter(data.get("intro_chapter").or_else(|| data.get("intro")).or_else(|| data.pointer("/skip/intro")));
    let outro = parse_chapter(data.get("outro_chapter").or_else(|| data.get("outro")).or_else(|| data.pointer("/skip/outro")));

    let mut play_headers = HashMap::new();
    play_headers.insert("Referer".to_string(), "https://flixcloud.cc/".to_string());
    play_headers.insert("User-Agent".to_string(), USER_AGENT.to_string());

    Ok(StreamResult {
        name: "Reanime HD-1".to_string(),
        title: "Reanime Stream".to_string(),
        url: final_url,
        quality: Some("Auto".to_string()),
        server: Some("HD-1".to_string()),
        format: Some("sub".to_string()),
        provider: "reanime".to_string(),
        stream_type: "m3u8".to_string(),
        sub_type: Some("SUB".to_string()),
        headers: Some(play_headers),
        subtitles: if subtitles.is_empty() { None } else { Some(subtitles) },
        intro,
        outro,
        thumbnails,
    })
}

#[no_mangle]
pub extern "C" fn nuvio_streams(url_ptr: i32, url_len: i32) -> i64 {
    let episode_url = read_string_arg(url_ptr, url_len);
    if episode_url.trim().is_empty() {
        let empty: Vec<StreamResult> = Vec::new();
        return pack_json_result(&empty);
    }

    // Extract slug from URL pattern /watch/{slug}?ep={ep}
    let slug = episode_url.split("/watch/")
        .nth(1)
        .and_then(|s| s.split('?').next())
        .unwrap_or("")
        .to_string();

    let ep_num = episode_url.split("ep=")
        .nth(1)
        .and_then(|s| s.split('&').next())
        .unwrap_or("1")
        .to_string();

    if slug.is_empty() {
        let empty: Vec<StreamResult> = Vec::new();
        return pack_json_result(&empty);
    }

    let mut headers = HashMap::new();
    headers.insert("Referer", "https://reanime.to/");
    headers.insert("User-Agent", USER_AGENT);

    let mut streams = Vec::new();

    // Fetch details to find anilist_id and mal_id
    let details_url = format!("{}/api/v1/anime/{}", REANIME_BASE, slug);
    if let Ok(details_body) = fetch_get(&details_url, Some(headers.clone())) {
        if let Ok(details) = serde_json::from_str::<Value>(&details_body) {
            let anilist_id = details.get("anilist_id").and_then(|v| v.as_i64()).unwrap_or(0);
            let mal_id = details.get("mal_id").and_then(|v| v.as_i64());
            let show_title = details.pointer("/title/english")
                .or_else(|| details.pointer("/title/romaji"))
                .and_then(|v| v.as_str())
                .unwrap_or(&slug)
                .to_string();

            let is_movie = details.get("format")
                .or_else(|| details.get("type"))
                .and_then(|v| v.as_str())
                .map(|f| f.eq_ignore_ascii_case("movie"))
                .unwrap_or(false);

            let query_mal = mal_id.map(|m| format!("?mal={}", m)).unwrap_or_default();
            let flix_url = format!("{}/api/flix/{}/{}{}", REANIME_BASE, anilist_id, ep_num, query_mal);

            if let Ok(flix_body) = fetch_get(&flix_url, Some(headers.clone())) {
                if let Ok(fv) = serde_json::from_str::<Value>(&flix_body) {
                    if let Some(servers) = fv.get("servers").and_then(|s| s.as_array()) {
                        for s in servers {
                            if let Some(data_link) = s.get("dataLink").and_then(|l| l.as_str()) {
                                if let Ok(mut stream) = resolve_flixcloud_stream(data_link) {
                                    let lang_raw = s.get("dataType").and_then(|v| v.as_str()).unwrap_or("sub").to_uppercase();
                                    let is_dub = lang_raw == "DUB";
                                    let is_soft = s.get("softsub").and_then(|v| v.as_bool()).unwrap_or(false);
                                    let sub_type_str = if is_dub { "DUB" } else if is_soft { "SUB" } else { "HARDSUB" };
                                    let s_name = s.get("serverName").and_then(|v| v.as_str()).unwrap_or("HD-1");
                                    let soft_str = if is_soft { " [Softsub]" } else { "" };

                                    stream.name = format!("Reanime [{}] {}{}", lang_raw, s_name, soft_str);
                                    stream.title = if is_movie {
                                        format!("{} ({})", show_title, lang_raw)
                                    } else {
                                        format!("{} - Episode {} ({})", show_title, ep_num, lang_raw)
                                    };
                                    stream.server = Some(format!("{}{}", s_name, soft_str));
                                    stream.sub_type = Some(sub_type_str.to_string());
                                    stream.format = Some(if is_dub { "dub".to_string() } else if is_soft { "softsub".to_string() } else { "hardsub".to_string() });

                                    streams.push(stream);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Direct fallback if no streams resolved from Flix API
    if streams.is_empty() {
        for lang in &["sub", "dub"] {
            let watch_url = format!("{}/watch/{}?ep={}&lang={}", REANIME_BASE, slug, ep_num, lang);
            if let Ok(watch_html) = fetch_get(&watch_url, Some(headers.clone())) {
                for part in watch_html.split("flixcloud.cc/e/") {
                    if let Some(token) = part.split('"').next().and_then(|p| p.split('\'').next()) {
                        let clean_token = token.split('\\').next().unwrap_or(token);
                        if !clean_token.is_empty() {
                            let embed_url = format!("https://flixcloud.cc/e/{}", clean_token);
                            if let Ok(mut stream) = resolve_flixcloud_stream(&embed_url) {
                                let lang_upper = lang.to_uppercase();
                                let is_dub = *lang == "dub";
                                stream.name = format!("Reanime {} HD-1", lang_upper);
                                stream.title = format!("Episode {} ({})", ep_num, lang_upper);
                                stream.sub_type = Some(if is_dub { "DUB".to_string() } else { "SUB".to_string() });
                                stream.format = Some(lang.to_string());
                                streams.push(stream);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }

    pack_json_result(&streams)
}
