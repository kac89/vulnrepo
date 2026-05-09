import { Injectable } from '@angular/core';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class ReportSchemaService {

  private readonly MAX_NAME = 512;
  private readonly MAX_ID = 256;
  private readonly MAX_TIME_STR = 64;
  private readonly MAX_ENCRYPTED = 50 * 1024 * 1024;

  private readonly ID_RE = /^[A-Za-z0-9_-]{1,256}$/;
  private readonly B64_RE = /^[A-Za-z0-9+/=_-]+$/;

  validateReportFile(input: unknown): ValidationResult {
    let parsed: any = input;
    if (typeof input === 'string') {
      try {
        parsed = JSON.parse(input);
      } catch {
        return { valid: false, error: 'File is not valid JSON.' };
      }
    }
    return this.validateReportObject(parsed);
  }

  validateReportObject(obj: any): ValidationResult {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return { valid: false, error: 'Report payload must be a JSON object.' };
    }

    const id = obj.report_id;
    if (typeof id !== 'string' || !this.ID_RE.test(id)) {
      return { valid: false, error: 'Invalid or missing report_id.' };
    }

    const name = obj.report_name;
    if (typeof name !== 'string' || name.length === 0 || name.length > this.MAX_NAME) {
      return { valid: false, error: 'Invalid or missing report_name.' };
    }

    const created = obj.report_createdate;
    const createdOk =
      (typeof created === 'number' && Number.isFinite(created) && created >= 0) ||
      (typeof created === 'string' && created.length <= this.MAX_TIME_STR);
    if (!createdOk) {
      return { valid: false, error: 'Invalid report_createdate.' };
    }

    const updated = obj.report_lastupdate;
    const updatedOk =
      updated === '' || updated === 0 || updated === undefined || updated === null ||
      (typeof updated === 'number' && Number.isFinite(updated)) ||
      (typeof updated === 'string' && updated.length <= this.MAX_TIME_STR);
    if (!updatedOk) {
      return { valid: false, error: 'Invalid report_lastupdate.' };
    }

    const enc = obj.encrypted_data;
    if (typeof enc !== 'string' || enc.length === 0 || enc.length > this.MAX_ENCRYPTED) {
      return { valid: false, error: 'Invalid or missing encrypted_data.' };
    }
    if (!this.B64_RE.test(enc)) {
      return { valid: false, error: 'encrypted_data is not base64-formatted.' };
    }

    const data = {
      report_id: id,
      report_name: name,
      report_createdate: created,
      report_lastupdate: updated ?? '',
      encrypted_data: enc
    };
    return { valid: true, data };
  }
}
