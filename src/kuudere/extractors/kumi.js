import axios from 'axios';
import CryptoJS from 'crypto-js';
import { USER_AGENT } from '../constants.js';

/**
 * Kumi Extractor - Decrypts stream information from Kumi servers.
 */

const g = (...m) => String.fromCharCode(...m);
const p = (m, T) => m.charCodeAt(T) || 0;

function getKumiKey(protocol) {
    const k = "10";
    const O = 110;
    const j = 1;
    let N = "";
    const B = ["7", "5", "1", "9"];
    for (let pe = 0; pe < B.length; pe++) N += g(k + B[pe]);
    N += g(p(protocol, parseInt(k) / 10));
    N += N.substring(1, 3);
    N += g(O, O - 1, O + 7);
    const oe = ["3", "5", "7", "9"];
    N += g(oe[3] + oe[2], oe[1] + oe[2]);
    const val3 = Number(oe[0]) * j + j + oe[3];
    N += g(val3, val3);
    const val4 = Number(oe[3]) * parseInt(k) + Number(oe[3]) * j;
    const val5 = oe.slice().reverse().join("").substring(0, 2);
    N += g(val4, val5);
    
    // Low-byte conversion ensures parity with browser SubtleCrypto behavior
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
    let oe = "";
    oe = N + oe + N + oe + N;
    const pe = oe.length * p(O, 0);
    const Qe = parseInt(oe) * N + _.length;
    const P = Qe + 4;
    const ie = p(_, N);
    const Se = ie * N - 2;
    B += g(j, parseInt(oe), pe, Qe, P, ie, Se);
    
    // SubtleCrypto only uses first 16 bytes. Low-byte conversion handles Unicode chars like Ł.
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = B.charCodeAt(i) & 0xFF;
    return CryptoJS.lib.WordArray.create(bytes, bytes.length);
}

async function decryptData(data, key, iv) {
    try {
        if (!data) return null;
        let ciphertext;
        
        if (typeof data === 'string') {
            if (/^[0-9a-fA-F]+$/.test(data)) {
                ciphertext = CryptoJS.enc.Hex.parse(data);
            } else {
                return null;
            }
        } else {
            ciphertext = CryptoJS.lib.WordArray.create(new Uint8Array(data));
        }

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

        // Verify if we actually got a JSON structure back
        if (decryptedText && (decryptedText.includes('source') || decryptedText.includes('sources') || decryptedText.includes('player'))) {
            const cleanJson = decryptedText.substring(decryptedText.indexOf('{'), decryptedText.lastIndexOf('}') + 1);
            return JSON.parse(cleanJson);
        }
    } catch (e) {}
    return null;
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

        // 1. Fetch /info primarily for subtitles
        const infoRes = await axios.get(`${protocol}//${hostname}/api/v1/info?id=${id}`, {
            headers: { 
                'User-Agent': USER_AGENT, 
                'Referer': embedUrl, 
                'X-Requested-With': 'XMLHttpRequest' 
            },
            timeout: 5000,
            responseType: 'arraybuffer'
        });
        const infoData = await decryptData(infoRes.data, key, iv);

        // 2. Fetch /video for the direct stream link
        // 'kuudere.ru' is the expected 'u' parameter for authorization across most instances
        const authorizedDomains = ['kuudere.ru', hostname, 'kuudere.to'];
        let videoData = null;

        for (const u of authorizedDomains) {
            try {
                const apiUrl = `${protocol}//${hostname}/api/v1/video?id=${id}&w=1920&h=1080&u=${u}`;
                const response = await axios.get(apiUrl, {
                    headers: { 
                        'User-Agent': USER_AGENT, 
                        'Referer': embedUrl, 
                        'X-Requested-With': 'XMLHttpRequest' 
                    },
                    timeout: 5000,
                    responseType: 'arraybuffer'
                });
                videoData = await decryptData(response.data, key, iv);
                if (videoData && (videoData.source || videoData.cf)) break;
            } catch (e) {}
        }

        if (videoData && (videoData.source || videoData.cf)) {
            const subtitles = [];
            const dataToExtractSubsFrom = infoData || videoData;
            
            if (dataToExtractSubsFrom.subtitles) {
                for (const sub of dataToExtractSubsFrom.subtitles) {
                    subtitles.push({
                        url: sub.url || sub.file || sub.src,
                        lang: sub.language || sub.label || 'Unknown',
                        label: sub.label || sub.language || 'Unknown'
                    });
                }
            } else if (dataToExtractSubsFrom.tracks) {
                for (const track of dataToExtractSubsFrom.tracks) {
                    if (track.kind === 'captions' || track.kind === 'subtitles') {
                        subtitles.push({
                            url: track.file || track.src,
                            lang: track.label || 'Unknown',
                            label: track.label || 'Unknown'
                        });
                    }
                }
            }

            return {
                url: videoData.source || videoData.cf,
                subtitles: subtitles
            };
        }
    } catch (error) {
        // Silently fail to allow other extractors or embed fallback
    }
    return null;
}
