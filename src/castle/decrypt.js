/**
 * Castle Provider - Decryption
 */

/**
 * Decrypt Castle API response using remote decryption server
 */
export async function decryptCastle(encryptedB64, securityKeyB64) {
    console.log('[Castle] Starting AES-CBC decryption...');

    const response = await fetch('https://aesdec.nuvioapp.space/decrypt-castle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            encryptedData: encryptedB64,
            securityKey: securityKeyB64
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error);
    }

    console.log('[Castle] Decryption successful');
    return data.decrypted;
}
