import axios from 'axios';
import { BASIC_TOKEN, USER_AGENT } from './constants.js';

let accessToken = null;
let tokenExpires = 0;

// Generate a random device ID
const deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

async function getAccessToken() {
    if (accessToken && Date.now() < tokenExpires) {
        return accessToken;
    }

    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_id');
        params.append('scope', 'offline_access');
        params.append('device_id', deviceId);
        params.append('device_type', 'service_python'); // Using a common device type

        const response = await axios.post(`https://www.crunchyroll.com/auth/v1/token`, params.toString(), {
            headers: {
                'Authorization': BASIC_TOKEN,
                'Content-Type': 'application/x-www-form-urlencoded',
                'ETP-Anonymous-ID': deviceId,
                'User-Agent': USER_AGENT
            }
        });

        accessToken = response.data.access_token;
        tokenExpires = Date.now() + (response.data.expires_in * 1000) - 60000;
        return accessToken;
    } catch (error) {
        console.error('[Crunchyroll] Error getting access token:', error.response?.data || error.message);
        throw error;
    }
}

export async function request(method, path, options = {}) {
    const token = await getAccessToken();
    const baseUrl = 'https://www.crunchyroll.com';
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
    
    return axios({
        method,
        url,
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': USER_AGENT,
            ...options.headers
        }
    });
}