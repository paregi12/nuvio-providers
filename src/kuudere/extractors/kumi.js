import axios from 'axios';
import CryptoJS from 'crypto-js';
import { USER_AGENT } from '../constants.js';

/**
 * Kumi Extractor - Optimized with verified logic from dev tools.
 */

const g = (...m) => String.fromCharCode(...m);
const p = (m, T) => m.charCodeAt(T) || 0;

function getKumiKey(protocol) {
    const _ = protocol;
    const k = "10";
    const O = 110;
    const j = 1;
    let N = "";
    // B corresponds to p("ᵟ").toString().split("") -> "7", "5", "1", "9"
    const B = ["7", "5", "1", "9"];
    for (let pe = 0; pe < B.length; pe++) N += g(k + B[pe]);
    N += g(p(_, parseInt(k) / 10));
    N += N.substring(1, 3);
    N += g(O, O - 1, O + 7);
    const oe = ["3", "5", "7", "9"];
    N += g(oe[3] + oe[2], oe[1] + oe[2]);
    const val3 = Number(oe[0]) * j + j + oe[3];
    N += g(val3, val3);
    const val4 = Number(oe[3]) * parseInt(k) + Number(oe[3]) * j;
    // Reverse of "3579" is "9753", substring(0,2) is "97"
    const val5 = "97";
    N += g(val4, val5);
    
    // Low-byte conversion for SubtleCrypto parity
    const bytes = new Uint8Array(N.length);
    for (let i = 0; i < N.length; i++) bytes[i] = N.charCodeAt(i) & 0xFF;
    return CryptoJS.lib.WordArray.create(bytes, bytes.length);
}

function getKumiIV(protocol, hostname) {
    const _ = protocol;
    const k = _ + "//";
    const O = hostname;
    const j = _.length * k.length;
    const N = 1;
    let B = "";
    for (let Le = N; Le < 10; Le++) B += g(Le + j);
    let oe = "111"; // N + oe + N + oe + N where N=1 and oe=""
    const pe = oe.length * p(O, 0);
    const Qe = parseInt(oe) * N + _.length;
    const P = Qe + 4;
    const ie = p(_, N);
    const Se = ie * N - 2;
    B += g(j, parseInt(oe), pe, Qe, P, ie, Se);
    
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = B.charCodeAt(i) & 0xFF;
    return CryptoJS.lib.WordArray.create(bytes, bytes.length);
}

async function decryptData(data, key, iv) {
    try {
        if (!data) return null;
        let ciphertext;
        
        if (typeof data === 'string') {
            ciphertext = CryptoJS.enc.Hex.parse(data);
        } else {
            ciphertext = CryptoJS.lib.WordArray.create(new Uint8Array(data));
        }

        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: ciphertext },
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );

        let decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
        if (!decryptedText) {
            decryptedText = decrypted.toString(CryptoJS.enc.Latin1);
        }

        return JSON.parse(decryptedText);
    } catch (e) {
        return null;
    }
}

export async function getKumiStream(embedUrl) {
    try {
        const urlObj = new URL(embedUrl);
        const hostname = urlObj.hostname;
        const protocol = urlObj.protocol;
        const id = urlObj.hash.substring(1).split('&')[0];
        
        if (!id) return null;

        const key = getKumiKey(protocol);
        const iv = getKumiIV(protocol, hostname);

        const videoUrl = `${protocol}//${hostname}/api/v1/video?id=${id}&w=1920&h=1080&u=kuudere.ru`;
        const response = await axios.get(videoUrl, {
            headers: { 
                'User-Agent': USER_AGENT, 
                'Referer': embedUrl, 
                'X-Requested-With': 'XMLHttpRequest' 
            },
            responseType: 'arraybuffer'
        });

        const videoData = await decryptData(response.data, key, iv);
        
        if (videoData && (videoData.source || videoData.cf)) {
            return {
                url: videoData.source || videoData.cf,
                subtitles: videoData.subtitles || []
            };
        }
    } catch (error) {
        // Fallback or fail
    }
    return null;
}