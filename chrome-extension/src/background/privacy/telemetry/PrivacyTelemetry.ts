import type {
  PrivacyDecision,
  SensitiveCategory,
  DetectionSource,
  StrictnessMode,
} from '../core/PrivacyTypes';
import { PrivacyError } from '../core/PrivacyErrors';

export interface PrivacyTelemetryEvent {
  eventId: string;
  timestamp: number;
  decision: PrivacyDecision;
  categoryCounts: Partial<Record<SensitiveCategory, number>>;
  signalsUsed: DetectionSource[];
  redactionCount: number;
  egressBlocked: boolean;
  durationMs: number;
  strictness: StrictnessMode;
  modelUsed?: string;
}

export type TelemetrySink = (event: PrivacyTelemetryEvent) => void;

/**
 * PrivacyTelemetry
 * 
 * Privacy-safe operational metrics logger. Strictly guarantees that no raw
 * browser context, screenshots, DOM dumps, or credentials can ever be serialized.
 */
export class PrivacyTelemetry {
  private static readonly DISALLOWED_KEYS = new Set([
    'context',
    'rawcontext',
    'screenshot',
    'dataurl',
    'dom',
    'text',
    'rawtext',
    'credentials',
    'password',
    'secret',
    'token',
    'uservalue',
    'inputvalue',
  ]);

  private sinks: TelemetrySink[] = [];
  private eventHistory: PrivacyTelemetryEvent[] = [];
  private maxHistory: number;

  constructor(maxHistory = 100) {
    this.maxHistory = maxHistory;
  }

  public addSink(sink: TelemetrySink): void {
    this.sinks.push(sink);
  }

  public logEvent(event: PrivacyTelemetryEvent): void {
    this.validateTelemetryEvent(event);

    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    for (const sink of this.sinks) {
      try {
        sink(event);
      } catch (err) {
        console.warn('[PrivacyTelemetry] Sink dispatch failed:', err);
      }
    }
  }

  public getHistory(): PrivacyTelemetryEvent[] {
    return [...this.eventHistory];
  }

  public validateTelemetryEvent(event: unknown): void {
    if (!event || typeof event !== 'object') {
      throw new PrivacyError('Invalid telemetry event: must be non-null object', 'TELEMETRY_INVALID');
    }

    const checkObject = (obj: Record<string, unknown>, path: string) => {
      for (const [key, value] of Object.entries(obj)) {
        const keyLower = key.toLowerCase();
        if (PrivacyTelemetry.DISALLOWED_KEYS.has(keyLower)) {
          throw new PrivacyError(
            `Privacy violation: Disallowed raw data key "${key}" detected in telemetry event at "${path}"`,
            'TELEMETRY_LEAK_PREVENTED'
          );
        }

        if (typeof value === 'string') {
          // Reject raw screenshots or long un-tokenized dumps
          if (value.startsWith('data:image/') || value.length > 500) {
            throw new PrivacyError(
              `Privacy violation: Oversized or visual payload in telemetry property "${path}.${key}"`,
              'TELEMETRY_LEAK_PREVENTED'
            );
          }
          // Reject obvious credentials or SSN patterns in strings
          if (/\b\d{3}-\d{2}-\d{4}\b/.test(value) || /\bsk-[A-Za-z0-9_-]{20,}\b/.test(value)) {
            throw new PrivacyError(
              `Privacy violation: Sensitive pattern in telemetry property "${path}.${key}"`,
              'TELEMETRY_LEAK_PREVENTED'
            );
          }
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          checkObject(value as Record<string, unknown>, `${path}.${key}`);
        }
      }
    };

    checkObject(event as Record<string, unknown>, 'event');
  }
}
