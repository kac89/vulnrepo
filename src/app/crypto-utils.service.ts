import { Injectable } from '@angular/core';
import * as Crypto from 'crypto-js';

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
// First two bytes of raw data signal v2 format: ASCII 'v' (0x76) 'z' ... actually 'v2' = [0x76, 0x32]
const V2_MAGIC = [0x76, 0x32];

@Injectable({ providedIn: 'root' })
export class CryptoUtilsService {

  async encrypt(plaintext: string, password: string): Promise<string> {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plaintext)
    );

    // Layout: [0x76, 0x32, ...salt(16), ...iv(12), ...ciphertext]
    const combined = new Uint8Array(2 + SALT_BYTES + IV_BYTES + cipherBuffer.byteLength);
    combined[0] = V2_MAGIC[0];
    combined[1] = V2_MAGIC[1];
    combined.set(salt, 2);
    combined.set(iv, 2 + SALT_BYTES);
    combined.set(new Uint8Array(cipherBuffer), 2 + SALT_BYTES + IV_BYTES);

    return this._uint8ToBase64(combined);
  }

  async decrypt(data: string, password: string): Promise<string> {
    const raw = atob(data);
    if (raw.charCodeAt(0) === V2_MAGIC[0] && raw.charCodeAt(1) === V2_MAGIC[1]) {
      return this._decryptV2(raw, password);
    }
    return this._decryptLegacy(data, password);
  }

  private async _decryptV2(raw: string, password: string): Promise<string> {
    const enc = new TextEncoder();
    const combined = this._rawStringToUint8(raw);

    const salt = combined.slice(2, 2 + SALT_BYTES);
    const iv = combined.slice(2 + SALT_BYTES, 2 + SALT_BYTES + IV_BYTES);
    const cipherBuffer = combined.slice(2 + SALT_BYTES + IV_BYTES);

    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBuffer
    );

    return new TextDecoder().decode(plainBuffer);
  }

  private _decryptLegacy(data: string, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const bytes = Crypto.AES.decrypt(data, password);
        const result = bytes.toString(Crypto.enc.Utf8);
        if (!result) { reject(new Error('wrong pass')); return; }
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Chunked to avoid call-stack overflow on large payloads
  private _uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  private _rawStringToUint8(raw: string): Uint8Array {
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      bytes[i] = raw.charCodeAt(i);
    }
    return bytes;
  }
}
