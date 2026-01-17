// API Key Encryption Utilities using Web Crypto API
// Note: For API key storage, prefer using secureKeyStorage.ts which uses
// non-extractable CryptoKeys stored in IndexedDB for better security.

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const PBKDF2_ITERATIONS = 600000;

export interface EncryptedData {
  ciphertext: string; // base64 encoded
  salt: string; // base64 encoded
  iv: string; // base64 encoded
}

const INSTALL_SEED_KEY = 'browser-llm-install-seed';

/**
 * Generate a unique seed on first install (stored in local storage)
 */
export async function generateInstallSeed(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Get or create the installation seed used for key derivation
 */
export async function getInstallSeed(): Promise<string> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(INSTALL_SEED_KEY, async (result) => {
        if (result[INSTALL_SEED_KEY]) {
          resolve(result[INSTALL_SEED_KEY]);
        } else {
          const seed = await generateInstallSeed();
          chrome.storage.local.set({ [INSTALL_SEED_KEY]: seed });
          resolve(seed);
        }
      });
    } else {
      // Fallback for non-extension context (e.g., testing)
      resolve('dev-fallback-seed');
    }
  });
}

/**
 * Get the encryption password (extension ID + install seed)
 */
export async function getEncryptionPassword(): Promise<string> {
  const seed = await getInstallSeed();
  const extensionId = typeof chrome !== 'undefined' ? (chrome.runtime?.id ?? 'local') : 'local';
  return `${extensionId}-${seed}`;
}

/**
 * Derive an AES key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt an API key
 */
export async function encryptApiKey(apiKey: string, password: string): Promise<EncryptedData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    new TextEncoder().encode(apiKey),
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypt an API key
 */
export async function decryptApiKey(encrypted: EncryptedData, password: string): Promise<string> {
  const salt = Uint8Array.from(atob(encrypted.salt), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));

  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);

  return new TextDecoder().decode(plaintext);
}

// Session storage key for decrypted API key
const SESSION_API_KEY = 'decrypted-api-key';

/**
 * Store decrypted API key in session storage (cleared on browser close)
 */
export async function cacheApiKeyInSession(apiKey: string): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    await chrome.storage.session.set({ [SESSION_API_KEY]: apiKey });
  }
}

/**
 * Get cached API key from session storage
 */
export async function getCachedApiKey(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.session) {
      chrome.storage.session.get(SESSION_API_KEY, (result) => {
        resolve(result[SESSION_API_KEY] ?? null);
      });
    } else {
      resolve(null);
    }
  });
}

/**
 * Clear cached API key from session storage
 */
export async function clearCachedApiKey(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    await chrome.storage.session.remove(SESSION_API_KEY);
  }
}
