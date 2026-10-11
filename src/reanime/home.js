import { fetchJson } from './client.js';

export function toHomeItem(item) {
    if (!item) return null;
    const id = item.anime_id || item.slug || item.id;
    if (!id) return null;

    let title = "";
    if (typeof item.title === 'object' && item.title !== null) {
        title = item.title.english || item.title.romaji || item.title.native || "";
    } else if (typeof item.title === 'string') {
        title = item.title;
    } else if (item.name) {
        title = item.name;
    }
    if (!title) title = String(id);

    let poster = null;
    if (item.cover_image) {
        poster = item.cover_image.extra_large || item.cover_image.large || item.cover_image.medium || null;
    } else if (item.image) {
        poster = item.image;
    } else if (item.poster) {
        poster = item.poster;
    }

    const banner = item.banner_image || item.banner || null;
    const description = item.description || null;
    const rating = item.average_score ? (item.average_score / 10).toFixed(1) : (item.score ? String(item.score) : null);
    const year = item.season_year ? String(item.season_year) : (item.year ? String(item.year) : null);
    const episodes = item.episodes != null ? Number(item.episodes) : (item.totalEpisodes != null ? Number(item.totalEpisodes) : null);
    const subEpisodes = item.subbed != null ? Number(item.subbed) : null;
    const dubEpisodes = item.dubbed != null ? Number(item.dubbed) : null;
    const rawFormat = (item.format || item.type || "").toLowerCase();
    const type = rawFormat || (episodes === 1 ? "movie" : "tv");

    return {
        id: String(id),
        title,
        poster,
        banner,
        description,
        rating,
        year,
        type,
        format: rawFormat || type,
        episodes,
        subEpisodes,
        dubEpisodes
    };
}

export async function fetchPopular(limit = 24, page = 1) {
    const offset = (page - 1) * limit;
    return await fetchJson(`/api/v1/search?sort=popularity_desc&limit=${limit}&offset=${offset}`);
}

export async function fetchLatestAired(limit = 24, lang = "sub") {
    return await fetchJson(`/api/v1/home/latest-aired?limit=${limit}&lang=${lang}`);
}

export async function fetchTopRated(limit = 24, page = 1) {
    const offset = (page - 1) * limit;
    return await fetchJson(`/api/v1/search?sort=score_desc&limit=${limit}&offset=${offset}`);
}

export async function getHome() {
    try {
        const [latestRes, popularRes, topRatedRes] = await Promise.allSettled([
            fetchLatestAired(24, "sub"),
            fetchPopular(24, 1),
            fetchTopRated(24, 1)
        ]);

        const sections = [];

        if (latestRes.status === "fulfilled" && latestRes.value) {
            const list = latestRes.value.data || latestRes.value.results || [];
            const items = list.map(toHomeItem).filter(Boolean);
            if (items.length > 0) {
                sections.push({
                    title: "Latest Episodes",
                    items
                });
            }
        }

        if (popularRes.status === "fulfilled" && popularRes.value) {
            const list = popularRes.value.results || popularRes.value.data || [];
            const items = list.map(toHomeItem).filter(Boolean);
            if (items.length > 0) {
                sections.push({
                    title: "Popular Anime",
                    items
                });
            }
        }

        if (topRatedRes.status === "fulfilled" && topRatedRes.value) {
            const list = topRatedRes.value.results || topRatedRes.value.data || [];
            const items = list.map(toHomeItem).filter(Boolean);
            if (items.length > 0) {
                sections.push({
                    title: "Top Rated",
                    items
                });
            }
        }

        return sections;
    } catch (_) {
        return [];
    }
}
