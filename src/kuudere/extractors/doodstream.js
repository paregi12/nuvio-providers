import axios from 'axios';
import { USER_AGENT } from '../constants.js';

export async function getDoodstream(embedUrl) {
    try {
        const response = await axios.get(embedUrl, {
            headers: { 'User-Agent': USER_AGENT }
        });
        const html = response.data;
        
        const md5Match = html.match(/\/pass_md5\/([^']*)/);
        if (!md5Match) return null;
        
        const token = md5Match[1];
        const md5Url = `${new URL(embedUrl).origin}/pass_md5/${token}`;
        
        const md5Res = await axios.get(md5Url, {
            headers: { 'Referer': embedUrl, 'User-Agent': USER_AGENT }
        });
        const urlPart = md5Res.data;
        
        const randomString = (length) => {
            let result = '';
            const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * characters.length));
            }
            return result;
        };
        
        return `${urlPart}${randomString(10)}?token=${token}&expiry=${Date.now()}`;
    } catch (error) {
        return null;
    }
}
