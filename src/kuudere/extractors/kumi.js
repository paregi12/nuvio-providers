import axios from 'axios';
import CryptoJS from 'crypto-js';
import { USER_AGENT } from '../constants.js';

/**
 * Kumi Extractor - Decrypts stream information from Kumi servers.
 * Note: Highly environment-sensitive due to dynamic key/IV generation.
 * Falls back to embed URL if extraction fails.
 */

const g = (...m) => String.fromCharCode(...m);
const x = (m, T) => m.charCodeAt(T) || 0;

function getKumiKey(ua) {
    const P = "10", D = 110;
    let F = "";
    const codes = "7519".split("");
    for (let i = 0; i < codes.length; i++) F += g(parseInt(P + codes[i]));
    F += g(x(ua, 1));
    F += F.substring(1, 3);
    F += g(D, D - 1, D + 7);
    return F.padEnd(16, '\0');
}

function getKumiIV(protocol, hostname) {
    const T = protocol.replace(':', '');
    const P = T + "//";
    const H = T.length * P.length;
    const F = 1;
    let $ = "";
    for (let be = F; be < 10; be++) $ += g(be + H);
    
    const se = "111";
    const ue = se.length * x(hostname, 0);
    const Fe = parseInt(se) * F + T.length;
    const R = Fe + 4;
    const X = x(T, F);
    const me = X * F - 2;
    
    $ += g(H, parseInt(se), ue, Fe, R, X, me);
    return $.substring(0, 16);
}

function createWordArray(codes) {
    const words = [];
    for (let i = 0; i < codes.length; i++) {
        words[i >>> 2] |= (codes[i] & 0xff) << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, codes.length);
}

export async function getKumiStream(embedUrl) {
    try {
        const urlObj = new URL(embedUrl);
        const hostname = urlObj.hostname;
        const protocol = urlObj.protocol;
        const id = urlObj.hash.substring(1).split('&')[0];
        
        if (!id) return null;

        const apiUrl = `${protocol}//${hostname}/api/v1/info?id=${id}`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': embedUrl,
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 5000
        });
        
        const encryptedData = response.data;
        if (typeof encryptedData !== 'string') return null;

        const keyStr = getKumiKey(USER_AGENT);
        const ivStr = getKumiIV(protocol, hostname);
        
        const key = createWordArray(Array.from(keyStr).map(c => c.charCodeAt(0)));
        const iv = createWordArray(Array.from(ivStr).map(c => c.charCodeAt(0)));
        
        const ciphertext = CryptoJS.enc.Hex.parse(encryptedData);
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );

        let decryptedText = '';
        try {
            decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            decryptedText = decrypted.toString(CryptoJS.enc.Latin1);
        }

        if (!decryptedText || !decryptedText.includes('sources')) {
            decryptedText = decrypted.toString(CryptoJS.enc.Latin1);
        }

        if (decryptedText && decryptedText.includes('sources')) {
            const cleanJson = decryptedText.substring(decryptedText.indexOf('{'), decryptedText.lastIndexOf('}') + 1);
            const data = JSON.parse(cleanJson);
            
            if (data.sources && data.sources.length > 0) {
                const hlsSource = data.sources.find(s => s.type === 'hls' || (s.file && s.file.includes('.m3u8'))) || data.sources[0];
                return {
                    url: hlsSource.file || hlsSource.src,
                    subtitles: (data.subtitles || []).map(s => ({
                        url: s.file || s.src,
                        lang: s.label || s.language || 'Unknown',
                        label: s.label || s.language || 'Unknown'
                    }))
                };
            }
        }
    } catch (error) {
        // Fallback handled by the caller or returning null here
    }
    return null;
}
