import { request } from './http.js';

function parseSvelteData(data) {
    if (!data || !data.nodes) return [];
    
    const animeNode = data.nodes.find(n => n && n.data && n.data.some(item => item && item.animeData));
    if (!animeNode) return [];

    const dataArray = animeNode.data;
    const meta = dataArray.find(item => item && item.animeData);
    const animeIndices = dataArray[dataArray.indexOf(meta) + 1];
    
    const animeList = [];
    
    if (Array.isArray(animeIndices)) {
        for (const idx of animeIndices) {
            const item = dataArray[idx];
            if (item && typeof item === 'object') {
                const anime = {};
                for (const [key, val] of Object.entries(item)) {
                    if (typeof val === 'number' && dataArray[val] !== undefined) {
                        anime[key] = dataArray[val];
                    } else {
                        anime[key] = val;
                    }
                }
                
                animeList.push({
                    id: anime.id,
                    title: anime.english || anime.title || anime.romaji || anime.native,
                    poster: anime.cover || anime.coverImage,
                    year: anime.year,
                    type: String(anime.type).toLowerCase().includes('movie') ? 'movie' : 'tv'
                });
            }
        }
    }

    return animeList;
}

export async function search(query, baseURL = null) {
    try {
        const response = await request('get', `/search/__data.json?keyword=${encodeURIComponent(query)}`, { baseURL });
        let results = parseSvelteData(response.data);

        if (results.length === 0) {
            const quickResponse = await request('get', `/api/search?q=${encodeURIComponent(query)}`, { baseURL });
            if (quickResponse.data && quickResponse.data.results) {
                results = quickResponse.data.results.map(item => ({
                    title: item.title,
                    id: item.id,
                    poster: item.coverImage,
                    type: item.details.toLowerCase().includes('movie') ? 'movie' : 'tv'
                }));
            }
        }
        
        return results.map(item => ({
            name: "Kuudere",
            title: item.title,
            url: item.id,
            poster: item.poster,
            year: item.year,
            type: item.type,
            baseURL: baseURL // Keep track of which domain found it
        }));
    } catch (error) {
        // Silently fail for specific domain
        return [];
    }
}
