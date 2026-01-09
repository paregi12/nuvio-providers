const axios = require('axios');

const BASE_URL = 'https://kuudere.ru';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function request(method, path) {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    return await axios({
        method,
        url,
        headers: {
            'User-Agent': USER_AGENT,
            'Referer': BASE_URL,
            'X-Requested-With': 'XMLHttpRequest'
        }
    });
}

async function run() {
    // JJK S2 ID found in previous step
    const animeId = '674e0d1000063a647d58'; 
    const episode = 1;

    try {
        console.log(`Fetching links for JJK S2 Ep ${episode}...`);
        const watchResponse = await request('get', `/api/watch/${animeId}/${episode}`);
        const links = watchResponse.data.episode_links;

        if (!links) {
            console.log('No links found.');
            return;
        }

        const uniqueServers = {};
        links.forEach(link => {
            if (!uniqueServers[link.serverName]) {
                uniqueServers[link.serverName] = link.dataLink;
            }
        });

        console.log('\n--- Unique Server Links ---');
        for (const [name, url] of Object.entries(uniqueServers)) {
            console.log(`[${name}]: ${url}`);
        }

    } catch (e) {
        console.error(e);
    }
}

run();
