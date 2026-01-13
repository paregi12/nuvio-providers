import axios from 'axios';
import { BASE_URL } from './constants.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

export async function request(method, url, options = {}) {
    try {
        return await axios({
            method,
            url,
            ...options,
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': BASE_URL,
                'Origin': BASE_URL,
                ...options.headers
            }
        });
    } catch (error) {
        console.error(`[AllManga] Request error (${url}):`, error.message);
        throw error;
    }
}
