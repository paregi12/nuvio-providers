import axios from 'axios';
import { BASE_URL, USER_AGENT } from './constants.js';

export async function request(method, path, options = {}) {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
    
    try {
        return await axios({
            method,
            url,
            ...options,
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': BASE_URL,
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            }
        });
    } catch (error) {
        console.error(`[Kuudere] Request error (${url}):`, error.message);
        throw error;
    }
}
