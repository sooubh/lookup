import type { PrivacyDecision, SensitiveCategory, StrictnessMode } from '../core/PrivacyTypes';

export interface PrivacyAuditRecord {
  id: string;
  timestamp: number;
  task: string;
  decision: PrivacyDecision;
  reason: string;
  detectedCategories: SensitiveCategory[];
  redactionCount: number;
  strictness: StrictnessMode;
  egressAuthorized: boolean;
}

/**
 * PrivacyAudit
 * 
 * In-memory circular audit buffer for local inspection and UI transparency.
 * Stores decision summaries and counts without storing raw confidential payloads.
 */
export class PrivacyAudit {
  private records: PrivacyAuditRecord[] = [];
  private maxRecords: number;

  constructor(maxRecords = 200) {
    this.maxRecords = maxRecords;
  }

  public record(audit: PrivacyAuditRecord): void {
    this.records.push(audit);
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }
  }

  public getRecords(limit?: number): PrivacyAuditRecord[] {
    if (limit && limit > 0) {
      return this.records.slice(-limit);
    }
    return [...this.records];
  }

  public clear(): void {
    this.records = [];
  }
}
