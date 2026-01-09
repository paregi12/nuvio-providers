import axios from 'axios';
import { USER_AGENT } from '../constants.js';

export async function getMp4Upload(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const html = response.data;
        
        const srcMatch = html.match(/src\s*:\s*"([^"]+\.mp4)"/);
        return srcMatch ? srcMatch[1] : null;
    } catch (error) {
        return null;
    }
}
