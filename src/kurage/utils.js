import { DEFAULT_HEADERS, TMDB_API_KEY, ANILIST_URL, ARM_BASE, CINEMETA_URL } from './constants.js';

export async function fetchText(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...DEFAULT_HEADERS,
            ...(options.headers || {})
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${url}`);
    }
    return await response.text();
}

export async function fetchJson(url, options = {}) {
    const text = await fetchText(url, options);
    return JSON.parse(text);
}

export async function getTmdbInfo(tmdbId, mediaType) {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    try {
        const data = await fetchJson(url);
        return {
            title: data.name || data.title || data.original_name || data.original_title || "",
            year: ((data.first_air_date || data.release_date || "").match(/\d{4}/) || [null])[0],
            imdbId: data.external_ids && data.external_ids.imdb_id
        };
    } catch (e) {
        return { title: "", year: null, imdbId: null };
    }
}

export async function getSyncInfo(id, mediaType, season, episode) {
    const getCinemetaInfo = async (imdbId) => {
        const type = (mediaType === 'movie') ? 'movie' : 'series';
        const url = `${CINEMETA_URL}/${type}/${imdbId}.json`;
        try {
            const data = await fetchJson(url);
            const meta = data.meta;
            if (!meta) throw new Error('No Cinemata metadata');
            if (mediaType === 'movie') return { date: meta.released ? meta.released.split('T')[0] : null, title: meta.name, dayIndex: 1 };
            
            const videos = meta.videos || [];
            const target = videos.find(v => v.season == season && v.episode == episode);
            if (!target || !target.released) return { date: null, title: null, dayIndex: 1 };

            const targetDate = target.released.split('T')[0];
            const dayIndex = videos.filter(v => v.season == season && v.released && v.released.split('T')[0] === targetDate && parseInt(v.episode) < parseInt(episode)).length + 1;

            return { date: targetDate, title: target.name || null, dayIndex };
        } catch (e) {
            return { date: null, title: null, dayIndex: 1 };
        }
    };

    const tmdbBase = `https://api.themoviedb.org/3/${mediaType === 'movie' ? 'movie' : 'tv'}/${id}`;
    const [details, base] = await Promise.all([
        fetchJson(tmdbBase + (mediaType === 'movie' ? '' : '/external_ids') + `?api_key=${TMDB_API_KEY}`),
        fetchJson(tmdbBase + `?api_key=${TMDB_API_KEY}`)
    ]);

    let imdbId = details.imdb_id || null;
    const title = base.name || base.title || null;

    if (!imdbId) {
        try {
            const armData = await fetchJson(`${ARM_BASE}/themoviedb?id=${id}`);
            imdbId = (Array.isArray(armData) && armData.length > 0) ? armData[0].imdb : null;
        } catch (e) {}
    }

    if (!imdbId) throw new Error(`No IMDb ID found for TMDB ${id}`);
    
    const cMeta = await getCinemetaInfo(imdbId);
    let finalDate = cMeta.date;
    if (mediaType === 'movie' && base.release_date) finalDate = base.release_date;

    if (!finalDate) throw new Error(`Could not find release date for ID ${imdbId}`);

    return {
        imdbId,
        tmdbId: id,
        releaseDate: finalDate,
        title,
        episodeTitle: cMeta.title,
        dayIndex: cMeta.dayIndex,
        episode
    };
}

export async function resolveAnilistId(syncInfo) {
    const { releaseDate, title, episode, episodeTitle, dayIndex } = syncInfo;
    if (!releaseDate || !/^\d{4}-\d{2}-\d{2}/.test(releaseDate)) return null;

    const query = 'query($search:String){Page(perPage:20){media(search:$search,type:ANIME){id type format title{romaji english}startDate{year month day}endDate{year month day}episodes streamingEpisodes{title}}}}';
    
    try {
        const json = await fetchJson(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { search: title } })
        });

        const candidates = json.data?.Page?.media || [];
        if (candidates.length === 0) return null;


        const targetDate = new Date(releaseDate);

        for (const anime of candidates) {
            const s = anime.startDate;
            const startStr = (s.year && s.month && s.day) ? `${s.year}-${String(s.month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}` : null;
            if (!startStr) continue;

            const startDate = new Date(startStr);
            const diffDays = Math.ceil(Math.abs(targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

            let isMatch = false;
            if (anime.format === 'MOVIE' || anime.format === 'SPECIAL' || anime.episodes === 1) {
                if (diffDays <= 2) isMatch = true;
            } else {
                const startLimit = new Date(startDate);
                startLimit.setDate(startLimit.getDate() - 2);
                if (targetDate >= startLimit) {
                    if (anime.endDate && anime.endDate.year) {
                        const endDate = new Date(anime.endDate.year, (anime.endDate.month || 12) - 1, (anime.endDate.day || 31));
                        endDate.setDate(endDate.getDate() + 2);
                        if (targetDate <= endDate) isMatch = true;
                    } else {
                        isMatch = true;
                    }
                }
            }

            if (isMatch) {
                const isTV = anime.format !== 'MOVIE' && anime.format !== 'SPECIAL' && anime.episodes !== 1;
                let episodeNum = (isTV && episode) ? episode : (dayIndex || 1);
                
                const episodes = anime.streamingEpisodes || [];
                if (episodes.length > 1 && episodeTitle) {
                    const cleanTarget = episodeTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
                    for (let j = 0; j < episodes.length; j++) {
                        const cleanAl = (episodes[j].title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (cleanAl && (cleanAl.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(cleanAl) !== -1)) {
                            episodeNum = j + 1;
                            break;
                        }
                    }
                }
                return { alId: anime.id, episode: episodeNum };
            }
        }
    } catch (e) {}
    return null;
}
