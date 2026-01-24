import axios from 'axios';
import { BASE_URL, USER_AGENT } from './constants.js';

export async function request(method, path, options = {}) {
    const url = path.startsWith('http') ? path : `${path}`;
    
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
        // console.error(`[UniqueStream] Request error (${url}):`, error.message);
        throw error;
    }
}
