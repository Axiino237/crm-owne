// Helper to convert an ArrayBuffer to a Base64 string
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert a Base64 string to an ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate RSA-OAEP 2048 key pair
export async function generateE2EEKeys() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  return { publicKeyJwk, privateKeyJwk };
}

// Import RSA Public Key from JWK
async function importPublicKey(jwk) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

// Import RSA Private Key from JWK
async function importPrivateKey(jwk) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

// Encrypt plaintext with AES-GCM and encrypt the AES key with both recipients' RSA public keys
export async function encryptE2EEMessage(text, receiverPubKeyJwk, senderPubKeyJwk) {
  // Generate random 256-bit AES key for AES-GCM
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // Encrypt the plaintext text
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const cipherText = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    enc.encode(text)
  );

  // Export AES raw key bytes
  const aesRaw = await window.crypto.subtle.exportKey("raw", aesKey);

  // Encrypt AES raw key with Bob's (receiver) public key
  const bobKey = await importPublicKey(receiverPubKeyJwk);
  const encAesForBob = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    bobKey,
    aesRaw
  );

  // Encrypt AES raw key with Alice's (sender) public key
  const aliceKey = await importPublicKey(senderPubKeyJwk);
  const encAesForAlice = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    aliceKey,
    aesRaw
  );

  // Package payload into JSON format
  const payload = {
    encryptedPayload: arrayBufferToBase64(cipherText),
    iv: arrayBufferToBase64(iv),
    keyForReceiver: arrayBufferToBase64(encAesForBob),
    keyForSender: arrayBufferToBase64(encAesForAlice)
  };

  return JSON.stringify(payload);
}

// Decrypt message using the recipient's RSA private key and AES-GCM parameters
export async function decryptE2EEMessage(encryptedTextJson, privateKeyJwk, isSender) {
  let payload;
  try {
    payload = JSON.parse(encryptedTextJson);
  } catch (e) {
    // If not valid JSON, it's a plain-text message, so return it as-is
    return encryptedTextJson;
  }

  try {
    if (!payload || !payload.encryptedPayload || !payload.iv) {
      // Return as plain text if it does not have the encrypted structure
      return encryptedTextJson;
    }

    const encryptedAesKeyBase64 = isSender ? payload.keyForSender : payload.keyForReceiver;
    if (!encryptedAesKeyBase64) {
      return "🔑 [Encrypted Message - Key not found]";
    }

    // Import private key
    const privateKey = await importPrivateKey(privateKeyJwk);

    // Decrypt the AES raw key
    const encAesKey = base64ToArrayBuffer(encryptedAesKeyBase64);
    const aesRaw = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encAesKey
    );

    // Import the decrypted AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      aesRaw,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );

    // Decrypt the ciphertext using AES key
    const cipherText = base64ToArrayBuffer(payload.encryptedPayload);
    const iv = base64ToArrayBuffer(payload.iv);
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      aesKey,
      cipherText
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    return "🔑 [Encrypted Message - Decryption failed]";
  }
}
