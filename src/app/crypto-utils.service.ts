import { Injectable } from '@angular/core';

interface PendingOp {
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
}

@Injectable({ providedIn: 'root' })
export class CryptoUtilsService {
  private readonly worker: Worker;
  private readonly pending = new Map<string, PendingOp>();

  constructor() {
    this.worker = new Worker(
      new URL('./crypto.worker', import.meta.url),
      { type: 'module' }
    );
    this.worker.addEventListener('message', ({ data }: MessageEvent) => {
      const op = this.pending.get(data.id);
      if (!op) return;
      this.pending.delete(data.id);
      if (data.error !== undefined) {
        op.reject(new Error(data.error));
      } else {
        op.resolve(data.result);
      }
    });
    this.worker.addEventListener('error', (ev: ErrorEvent) => {
      const msg = ev.message ?? 'crypto worker error';
      for (const op of this.pending.values()) op.reject(new Error(msg));
      this.pending.clear();
    });
  }

  encrypt(plaintext: string, password: string): Promise<string> {
    return this._dispatch('encrypt', plaintext, password);
  }

  decrypt(data: string, password: string): Promise<string> {
    return this._dispatch('decrypt', data, password);
  }

  private _dispatch(op: 'encrypt' | 'decrypt', data: string, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, op, data, password });
    });
  }
}
