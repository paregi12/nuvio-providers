import axios from 'axios';
import CryptoJS from 'crypto-js';
import { USER_AGENT } from '../constants.js';

/**
 * Kumi Extractor - Updated Logic
 */

const g = (...m) => String.fromCharCode(...m);

function getKumiKey() {
    const lang = "https:"; 
    const k = "10";
    const O = 110;
    const j = 1;
    let N = "";
    
    const B = ["7", "5", "1", "9"];
    for (let pe = 0; pe < B.length; pe++) N += g(k + B[pe]);
    
    // index 1 of 'https:' is 't'
    N += lang[1]; 
    N += N.substring(1, 3);
    N += g(O, O - 1, O + 7);
    
    const oe = ["3", "5", "7", "9"];
    N += g(oe[3] + oe[2], oe[1] + oe[2]);
    const val3 = Number(oe[0]) * j + j + oe[3];
    N += g(val3, val3);
    
    const val4 = Number(oe[3]) * parseInt(k) + Number(oe[3]) * j;
    const val5 = "97"; 
    N += g(val4, val5);
    
    const bytes = new Uint8Array(N.length);
    for (let i = 0; i < N.length; i++) bytes[i] = N.charCodeAt(i) & 0xFF;
    return CryptoJS.lib.WordArray.create(bytes, bytes.length);
}

function getKumiIV(hash) {
    const lang = "https:";
    const _ = lang;
    const k = _ + "//";
    const O = hash;
    const j = _.length * k.length;
    const N = 1;
    let B = "";
    for (let Le = N; Le < 10; Le++) B += g(Le + j);
    
    let oe = "111"; 
    const pe = oe.length * O.charCodeAt(0);
    const Qe = parseInt(oe) * N + _.length;
    const P = Qe + 4;
    const ie = _.charCodeAt(N);
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

        const start = decryptedText.indexOf('{');
        const end = decryptedText.lastIndexOf('}');
        if (start === -1 || end === -1) return null;
        
        return JSON.parse(decryptedText.substring(start, end + 1));
    } catch (e) {
        return null;
    }
}


export async function getKumiStream(embedUrl) {
    try {
        const urlObj = new URL(embedUrl);
        const hostname = urlObj.hostname;
        const protocol = "https:";
        const hash = urlObj.hash;
        const id = hash.substring(1).split('&')[0];
        
        if (!id) return null;

        const key = getKumiKey();
        const iv = getKumiIV(hash);

        // Try different authorized domains
        const authorizedDomains = ['kuudere.ru', hostname];
        
        for (const r of authorizedDomains) {
            try {
                const videoUrl = `${protocol}//${hostname}/api/v1/video?id=${id}&w=1920&h=1080&r=${r}`;
                const response = await axios.get(videoUrl, {
                    headers: { 
                        'User-Agent': USER_AGENT, 
                        'Referer': embedUrl, 
                        'X-Requested-With': 'XMLHttpRequest' 
                    },
                    timeout: 5000
                });

                const videoData = await decryptData(response.data, key, iv);
                
                if (videoData && (videoData.source || videoData.cf)) {
                    const subtitles = [];
                    const rawSubs = videoData.subtitles || videoData.tracks || [];
                    for (const sub of rawSubs) {
                        subtitles.push({
                            url: sub.url || sub.file || sub.src,
                            lang: sub.language || sub.label || 'Unknown',
                            label: sub.label || sub.language || 'Unknown'
                        });
                    }

                    return {
                        url: videoData.source || videoData.cf,
                        subtitles: subtitles
                    };
                }
            } catch (e) {}
        }
    } catch (error) {
        // console.log('[KumiDebug] Error:', error.message);
    }
    return null;
}