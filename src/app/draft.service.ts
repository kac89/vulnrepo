import { Injectable } from '@angular/core';
import { CryptoUtilsService } from './crypto-utils.service';

// Drafts live in their own database, like report history does, so adding them
// needs no version bump on 'vulnrepo-db' and cannot disturb stored reports.
const DRAFT_DB = 'vulnrepo-db-drafts';
const DRAFT_STORE = 'drafts';

export interface DraftRecord {
  report_id: string;
  // Version of the stored report this draft was taken against. A release bumps
  // the stored version past it, which is how a stale draft is recognised.
  report_version: number;
  saved_at: number;
  encrypted_data: string;
}

/**
 * Recovery store for unsaved report edits.
 *
 * A draft holds the same AES-GCM payload a stored report does, encrypted with
 * the same in-memory report key — no new key material, and nothing readable at
 * rest. It exists so the key vault can honour its auto-lock without taking the
 * user's unreleased work with it; a draft is recovery, never a version.
 */
@Injectable({ providedIn: 'root' })
export class DraftService {

  constructor(private cryptoUtils: CryptoUtilsService) { }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const open = window.indexedDB.open(DRAFT_DB, 1);

      open.onupgradeneeded = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains(DRAFT_STORE)) {
          db.createObjectStore(DRAFT_STORE);
        }
      };

      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error ?? new Error('draft db open failed'));
    });
  }

  /**
   * Encrypt and store the draft for one report, replacing any previous one.
   * `plaintext` is already-serialised JSON: callers on the pre-lock path
   * serialise synchronously, before the vault wipe, and hand the string over.
   * Resolves with the stored timestamp.
   */
  async save(reportId: string, version: number, plaintext: string, pass: string): Promise<number> {
    const ciphertext = await this.cryptoUtils.encrypt(plaintext, pass);
    const record: DraftRecord = {
      report_id: reportId,
      report_version: version,
      saved_at: Date.now(),
      encrypted_data: ciphertext
    };

    const db = await this.openDB();
    return new Promise<number>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      tx.objectStore(DRAFT_STORE).put(record, reportId);
      tx.oncomplete = () => { db.close(); resolve(record.saved_at); };
      tx.onerror = () => { db.close(); reject(tx.error ?? new Error('draft write failed')); };
    });
  }

  /** The stored draft for a report, still encrypted, or null if there is none. */
  async get(reportId: string): Promise<DraftRecord | null> {
    const db = await this.openDB();
    return new Promise<DraftRecord | null>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readonly');
      const request = tx.objectStore(DRAFT_STORE).get(reportId);
      request.onsuccess = () => resolve((request.result as DraftRecord) ?? null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => { db.close(); reject(tx.error ?? new Error('draft read failed')); };
    });
  }

  /** Decrypt a draft. Returns null when the key does not open it. */
  async open(record: DraftRecord, pass: string): Promise<any | null> {
    try {
      return JSON.parse(await this.cryptoUtils.decrypt(record.encrypted_data, pass));
    } catch {
      return null;
    }
  }

  async remove(reportId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DRAFT_STORE, 'readwrite');
      tx.objectStore(DRAFT_STORE).delete(reportId);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error ?? new Error('draft delete failed')); };
    });
  }
}
