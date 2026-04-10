import { Injectable } from '@angular/core';
import { v4 as uuid } from 'uuid';

export interface ImportVector {
  id: string;
  name: string;
  format: 'json' | 'xml' | 'csv';
  itemsPath: string;
  fieldMappings: Record<string, string>;
  /** Flat key list from first parsed record — used for auto-detection */
  sampleKeys: string[];
  createdAt: number;
}

const DB_NAME    = 'vulnrepo-vectors-db';
const DB_VERSION = 1;
const STORE      = 'import_vectors';

@Injectable({ providedIn: 'root' })
export class ImportVectorService {

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async getAll(): Promise<ImportVector[]> {
    const db  = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => { db.close(); resolve(req.result ?? []); };
      req.onerror   = () => { db.close(); reject(req.error); };
    });
  }

  async save(vector: Omit<ImportVector, 'id' | 'createdAt'>): Promise<ImportVector> {
    const db  = await this.openDB();
    const rec: ImportVector = { ...vector, id: uuid(), createdAt: Date.now() };
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).put(rec);
      req.onsuccess = () => { db.close(); resolve(rec); };
      req.onerror   = () => { db.close(); reject(req.error); };
    });
  }

  async delete(id: string): Promise<void> {
    const db  = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(id);
      req.onsuccess = () => { db.close(); resolve(); };
      req.onerror   = () => { db.close(); reject(req.error); };
    });
  }

  /**
   * Score a vector against a set of keys from a parsed file.
   * Returns a 0–1 overlap score.
   */
  score(vector: ImportVector, fileKeys: string[]): number {
    if (!vector.sampleKeys.length || !fileKeys.length) return 0;
    const setA = new Set(vector.sampleKeys);
    const matches = fileKeys.filter(k => setA.has(k)).length;
    return matches / Math.max(vector.sampleKeys.length, fileKeys.length);
  }

  /**
   * Find the best-matching vector for the given file keys.
   * Returns null if no vector scores above the threshold.
   */
  findBestMatch(vectors: ImportVector[], fileKeys: string[], threshold = 0.5): ImportVector | null {
    let best: ImportVector | null = null;
    let bestScore = 0;
    for (const v of vectors) {
      const s = this.score(v, fileKeys);
      if (s > bestScore) { bestScore = s; best = v; }
    }
    return bestScore >= threshold ? best : null;
  }
}
