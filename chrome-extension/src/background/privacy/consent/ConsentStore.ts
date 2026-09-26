import type { SensitiveCategory } from '../core/PrivacyTypes';

export interface ConsentRecord {
  task: string;
  domain?: string;
  allowedCategories: Set<SensitiveCategory>;
  deniedCategories: Set<SensitiveCategory>;
  timestamp: number;
  expiresAt: number;
}

/**
 * ConsentStore
 * 
 * In-memory and optional storage-backed manager for per-task and per-domain
 * user consent permissions.
 */
export class ConsentStore {
  private records: Map<string, ConsentRecord> = new Map();
  private defaultTtlMs: number;

  constructor(defaultTtlMs = 15 * 60 * 1000) {
    // 15 minutes default consent validity
    this.defaultTtlMs = defaultTtlMs;
  }

  private makeKey(task: string, domain?: string): string {
    return `${domain || 'global'}::${task}`;
  }

  public allow(
    task: string,
    categories: SensitiveCategory[],
    domain?: string,
    ttlMs?: number
  ): void {
    const key = this.makeKey(task, domain);
    const existing = this.records.get(key) || {
      task,
      domain,
      allowedCategories: new Set<SensitiveCategory>(),
      deniedCategories: new Set<SensitiveCategory>(),
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
    };

    for (const cat of categories) {
      existing.allowedCategories.add(cat);
      existing.deniedCategories.delete(cat);
    }
    existing.expiresAt = Date.now() + (ttlMs || this.defaultTtlMs);
    this.records.set(key, existing);
  }

  public deny(task: string, categories: SensitiveCategory[], domain?: string): void {
    const key = this.makeKey(task, domain);
    const existing = this.records.get(key) || {
      task,
      domain,
      allowedCategories: new Set<SensitiveCategory>(),
      deniedCategories: new Set<SensitiveCategory>(),
      timestamp: Date.now(),
      expiresAt: Date.now() + this.defaultTtlMs,
    };

    for (const cat of categories) {
      existing.deniedCategories.add(cat);
      existing.allowedCategories.delete(cat);
    }
    this.records.set(key, existing);
  }

  public getAllowed(task: string, domain?: string): SensitiveCategory[] {
    const key = this.makeKey(task, domain);
    const record = this.records.get(key);
    if (!record) return [];

    if (Date.now() > record.expiresAt) {
      this.records.delete(key);
      return [];
    }

    return Array.from(record.allowedCategories);
  }

  public isAllowed(task: string, category: SensitiveCategory, domain?: string): boolean {
    const allowed = this.getAllowed(task, domain);
    return allowed.includes(category);
  }

  public clear(task?: string, domain?: string): void {
    if (task) {
      const key = this.makeKey(task, domain);
      this.records.delete(key);
    } else {
      this.records.clear();
    }
  }
}
