/**
 * Secure API Key Storage Module
 *
 * Uses a non-extractable AES-256-GCM CryptoKey stored in IndexedDB
 * to encrypt API keys before storing them in chrome.storage.local.
 *
 * Security properties:
 * - CryptoKey cannot be exported as raw bytes (non-extractable)
 * - API keys are encrypted at rest
 * - Decrypted keys are cached in session storage (cleared on browser close)
 *
 * LIMITATION: Cannot protect against code running in extension context
 */

const DB_NAME = 'browser-llm-secure-storage';
const DB_VERSION = 1;
const KEY_STORE_NAME = 'encryption-keys';
const ENCRYPTION_KEY_ID = 'api-key-encryption';

const ENCRYPTED_API_KEY_STORAGE_KEY = 'browser-llm-encrypted-api-key';
const SESSION_API_KEY_CACHE = 'decrypted-api-key-cache';

export interface EncryptedData {
  ciphertext: string; // base64 encoded
  iv: string; // base64 encoded
  version: number; // for future migration support
}

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Failed to open IndexedDB'));

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(KEY_STORE_NAME)) {
        db.createObjectStore(KEY_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Store a CryptoKey in IndexedDB
 */
async function storeKeyInIndexedDB(id: string, key: CryptoKey): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(KEY_STORE_NAME);

    const request = store.put({ id, key });
    request.onerror = () => reject(new Error('Failed to store key'));
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Retrieve a CryptoKey from IndexedDB
 */
async function getKeyFromIndexedDB(id: string): Promise<CryptoKey | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE_NAME, 'readonly');
    const store = transaction.objectStore(KEY_STORE_NAME);

    const request = store.get(id);
    request.onerror = () => reject(new Error('Failed to retrieve key'));
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.key : null);
    };

    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete a CryptoKey from IndexedDB
 */
async function deleteKeyFromIndexedDB(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(KEY_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(KEY_STORE_NAME);

    const request = store.delete(id);
    request.onerror = () => reject(new Error('Failed to delete key'));
    request.onsuccess = () => resolve();

    transaction.oncomplete = () => db.close();
  });
}

// ===== Encryption Key Management =====

/**
 * Generate a new non-extractable AES-256-GCM key
 */
async function generateEncryptionKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // NOT extractable - critical for security
    ['encrypt', 'decrypt']
  );
}

/**
 * Get or create the encryption key
 * The key is stored in IndexedDB and is non-extractable
 */
export async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  // Try to retrieve existing key
  let key = await getKeyFromIndexedDB(ENCRYPTION_KEY_ID);

  if (!key) {
    // Generate new key if none exists
    key = await generateEncryptionKey();
    await storeKeyInIndexedDB(ENCRYPTION_KEY_ID, key);
  }

  return key;
}

// ===== API Key Encryption/Decryption =====

/**
 * Encrypt an API key using the stored CryptoKey
 */
export async function encryptApiKey(apiKey: string): Promise<EncryptedData> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(apiKey)
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
    version: 1,
  };
}

/**
 * Decrypt an API key using the stored CryptoKey
 */
export async function decryptApiKey(encrypted: EncryptedData): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

// ===== Chrome Storage Integration =====

/**
 * Save encrypted API key to chrome.storage.local
 */
export async function saveEncryptedApiKey(apiKey: string): Promise<void> {
  if (!apiKey) {
    // Clear the key if empty
    await clearStoredApiKey();
    return;
  }

  const encrypted = await encryptApiKey(apiKey);

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({
      [ENCRYPTED_API_KEY_STORAGE_KEY]: encrypted,
    });
  }

  // Also cache in session for quick access
  await cacheInSession(apiKey);
}

/**
 * Load and decrypt API key from chrome.storage.local
 */
export async function loadDecryptedApiKey(): Promise<string | null> {
  // First check session cache
  const cached = await getCachedApiKey();
  if (cached) {
    return cached;
  }

  // Load from encrypted storage
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(ENCRYPTED_API_KEY_STORAGE_KEY, async (result) => {
        const encrypted = result[ENCRYPTED_API_KEY_STORAGE_KEY] as EncryptedData | undefined;

        if (!encrypted || !encrypted.ciphertext) {
          resolve(null);
          return;
        }

        try {
          const apiKey = await decryptApiKey(encrypted);
          // Cache for future requests
          await cacheInSession(apiKey);
          resolve(apiKey);
        } catch (error) {
          console.error('[SecureKeyStorage] Failed to decrypt API key:', error);
          resolve(null);
        }
      });
    });
  }

  return null;
}

/**
 * Check if an encrypted API key exists (without decrypting)
 */
export async function hasStoredApiKey(): Promise<boolean> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(ENCRYPTED_API_KEY_STORAGE_KEY, (result) => {
        const encrypted = result[ENCRYPTED_API_KEY_STORAGE_KEY] as EncryptedData | undefined;
        resolve(!!encrypted?.ciphertext);
      });
    });
  }
  return false;
}

/**
 * Clear stored API key from all storage locations
 */
export async function clearStoredApiKey(): Promise<void> {
  // Clear encrypted storage
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.remove(ENCRYPTED_API_KEY_STORAGE_KEY);
  }

  // Clear session cache
  await clearSessionCache();
}

// ===== Session Cache =====

/**
 * Cache decrypted API key in session storage (cleared on browser close)
 */
export async function cacheInSession(apiKey: string): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    await chrome.storage.session.set({ [SESSION_API_KEY_CACHE]: apiKey });
  }
}

/**
 * Get cached API key from session storage
 */
export async function getCachedApiKey(): Promise<string | null> {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    return new Promise((resolve) => {
      chrome.storage.session.get(SESSION_API_KEY_CACHE, (result) => {
        resolve(result[SESSION_API_KEY_CACHE] ?? null);
      });
    });
  }
  return null;
}

/**
 * Clear session cache
 */
export async function clearSessionCache(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.session) {
    await chrome.storage.session.remove(SESSION_API_KEY_CACHE);
  }
}

// ===== Migration =====

const LEGACY_STORAGE_KEY = 'browser-llm-config';

/**
 * Migrate plaintext API key from old storage to encrypted storage
 * Returns true if migration was performed
 */
export async function migrateFromPlaintextStorage(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
    return false;
  }

  return new Promise((resolve) => {
    chrome.storage.sync.get(LEGACY_STORAGE_KEY, async (result) => {
      const stored = result[LEGACY_STORAGE_KEY];

      if (!stored) {
        resolve(false);
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        const plaintextApiKey = parsed.state?.provider?.apiKey;

        if (plaintextApiKey && typeof plaintextApiKey === 'string' && plaintextApiKey.length > 0) {
          // Check if we already have an encrypted key
          const hasEncrypted = await hasStoredApiKey();

          if (!hasEncrypted) {
            console.log('[SecureKeyStorage] Migrating plaintext API key to encrypted storage');

            // Encrypt and save
            await saveEncryptedApiKey(plaintextApiKey);

            // Remove plaintext from sync storage
            // We need to update the stored config without the API key
            parsed.state.provider.apiKey = '';
            await chrome.storage.sync.set({ [LEGACY_STORAGE_KEY]: JSON.stringify(parsed) });

            console.log('[SecureKeyStorage] Migration complete');
            resolve(true);
            return;
          }
        }
      } catch (error) {
        console.error('[SecureKeyStorage] Migration error:', error);
      }

      resolve(false);
    });
  });
}

/**
 * Clear all secure storage data (for testing/reset)
 */
export async function clearAllSecureStorage(): Promise<void> {
  await clearStoredApiKey();

  try {
    await deleteKeyFromIndexedDB(ENCRYPTION_KEY_ID);
  } catch {
    // Ignore errors if key doesn't exist
  }
}
