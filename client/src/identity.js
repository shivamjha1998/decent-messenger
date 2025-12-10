// 1. Generate RSA Key Pair (Public & Private)
export async function generateKeys() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
    return keyPair;
}

// 2. Export Key to Base64
export async function exportKey(key) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    const exportedKeyBuffer = new Uint8Array(exported);
    let binaryString = "";
    for (let i = 0; i < exportedKeyBuffer.byteLength; i++) {
        binaryString += String.fromCharCode(exportedKeyBuffer[i]);
    }
    return window.btoa(binaryString);
}

// 3. Import Key from Base64
export async function importKey(pem) {
    const binaryString = window.atob(pem);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return await window.crypto.subtle.importKey(
        "spki",
        bytes.buffer,
        {
            name: "RSA-OAEP",
            hash: "SHA-256",
        },
        true,
        ["encrypt"]
    );
}
