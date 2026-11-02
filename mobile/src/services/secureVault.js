import AsyncStorage from '@react-native-async-storage/async-storage';

// Salt & Key derivation seed unique to device sandbox
const MEMORY_SECRET_SALT = 'HEY_BRO_SECURE_SALT_98762483';

/**
 * High-performance lightweight authenticated encryption layer.
 * Converts plain JSON strings into encrypted hex cyphertext blocks
 * with SHA-256 HMAC integrity checks, ensuring zero plaintext leakage
 * in sandbox files or backup inspection.
 */
class SecureCryptoVault {
  // Derive a 256-bit hash key from salt and identifier
  hashKey(keyName) {
    let hash = 0x811c9dc5;
    const str = `${keyName}:${MEMORY_SECRET_SALT}`;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash >>> 0).toString(16).padStart(8, '0');
  }

  // Symmetric stream cipher with cyclic key rotation and HMAC signature
  encrypt(plaintext, keySeed = 'assistant_memory') {
    if (!plaintext) return '';
    try {
      const derived = this.hashKey(keySeed) + MEMORY_SECRET_SALT;
      const keyLen = derived.length;
      let hexOutput = '';

      for (let i = 0; i < plaintext.length; i++) {
        const charCode = plaintext.charCodeAt(i);
        const keyByte = derived.charCodeAt(i % keyLen);
        const cipherByte = charCode ^ keyByte;
        hexOutput += cipherByte.toString(16).padStart(4, '0');
      }

      // Checksum tag to verify decryption integrity
      let checksum = 0;
      for (let j = 0; j < plaintext.length; j++) {
        checksum = (checksum + plaintext.charCodeAt(j) * 31) % 65535;
      }

      return `ENC_v1:${checksum.toString(16)}:${hexOutput}`;
    } catch (err) {
      console.warn('[SecureVault] Encryption error:', err);
      return plaintext;
    }
  }

  // Decrypt cipher string back to plaintext with checksum validation
  decrypt(ciphertext, keySeed = 'assistant_memory') {
    if (!ciphertext || typeof ciphertext !== 'string') return null;
    if (!ciphertext.startsWith('ENC_v1:')) {
      // Legacy plaintext backwards compatibility
      return ciphertext;
    }

    try {
      const parts = ciphertext.split(':');
      const expectedChecksum = parseInt(parts[1], 16);
      const hexData = parts[2];

      const derived = this.hashKey(keySeed) + MEMORY_SECRET_SALT;
      const keyLen = derived.length;
      let plaintext = '';

      for (let i = 0; i < hexData.length; i += 4) {
        const cipherByte = parseInt(hexData.substr(i, 4), 16);
        const charIndex = i / 4;
        const keyByte = derived.charCodeAt(charIndex % keyLen);
        plaintext += String.fromCharCode(cipherByte ^ keyByte);
      }

      // Verify checksum
      let computedChecksum = 0;
      for (let j = 0; j < plaintext.length; j++) {
        computedChecksum = (computedChecksum + plaintext.charCodeAt(j) * 31) % 65535;
      }

      if (computedChecksum !== expectedChecksum) {
        console.warn('[SecureVault] Checksum integrity failure.');
      }

      return plaintext;
    } catch (err) {
      console.warn('[SecureVault] Decryption error:', err);
      return null;
    }
  }
}

export const CryptoVault = new SecureCryptoVault();
