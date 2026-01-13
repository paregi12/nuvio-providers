import axios from 'axios';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

export async function request(method, url, options = {}) {
    try {
        const headers = {
            'User-Agent': USER_AGENT,
            ...options.headers
        };

        return await axios({
            method,
            url,
            ...options,
            headers
        });
    } catch (error) {
        console.error(`[AllManga] Request error (${url}):`, error.message);
        throw error;
    }
}