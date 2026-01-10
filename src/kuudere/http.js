import axios from 'axios';
import { BASE_URL, USER_AGENT } from './constants.js';

export async function request(method, path, options = {}) {
    const baseURL = options.baseURL || BASE_URL;
    const url = path.startsWith('http') ? path : `${baseURL}${path}`;
    
    try {
        return await axios({
            method,
            url,
            ...options,
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': baseURL,
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            }
        });
    } catch (error) {
        console.error(`[Kuudere] Request error (${url}):`, error.message);
        throw error;
    }
}
