import type { SensitiveCategory, RedactionRecord, RedactionMethod, FusedFinding } from '../core/PrivacyTypes';
import { PatternDetector } from '../detection/PatternDetector';

export interface TextRedactionResult {
  redactedText: string;
  records: RedactionRecord[];
  redactions: RedactionRecord[];
}

/**
 * TextRedactor
 *
 * Replaces sensitive textual values with masked placeholders or deterministic
 * anonymous tokens (e.g. [EMAIL_1], [PHONE_1]) to preserve agent relational reasoning
 * without exposing raw private data to external models.
 */
export class TextRedactor {
  private patternDetector: PatternDetector;
  private tokenCounters: Map<SensitiveCategory, number> = new Map();
  private tokenMap: Map<string, string> = new Map();

  constructor(patternDetector?: PatternDetector) {
    this.patternDetector = patternDetector || new PatternDetector();
  }

  public resetTokens(): void {
    this.tokenCounters.clear();
    this.tokenMap.clear();
  }

  public redact(text: string, findings?: FusedFinding[], method: RedactionMethod = 'token'): TextRedactionResult {
    if (!text || typeof text !== 'string' || text.length === 0) {
      return { redactedText: typeof text === 'string' ? text : '', records: [], redactions: [] };
    }

    const records: RedactionRecord[] = [];
    let redactedText = text;

    // 1. Gather all sensitive strings to replace
    const targets: Array<{
      category: SensitiveCategory;
      text: string;
      reason: string;
    }> = [];

    if (findings && findings.length > 0) {
      for (const f of findings) {
        if (f.text && text.includes(f.text)) {
          targets.push({
            category: f.category,
            text: f.text,
            reason: `Fused finding: ${f.category} (${f.sources.join('+')})`,
          });
        }
      }
    }

    // Also run pattern detection to catch any unanchored sensitive patterns in text
    const patternMatches = this.patternDetector.detect(redactedText);
    for (const pm of patternMatches) {
      if (!targets.some(t => t.text === pm.matchedText)) {
        targets.push({
          category: pm.category,
          text: pm.matchedText,
          reason: `Pattern match: ${pm.patternName}`,
        });
      }
    }

    // Sort targets by descending length to prevent partial sub-string replacements
    targets.sort((a, b) => b.text.length - a.text.length);

    for (const target of targets) {
      if (!redactedText.includes(target.text)) continue;

      const replacement = this.getReplacementToken(target.category, target.text, method);

      const startIndex = redactedText.indexOf(target.text);
      const endIndex = startIndex + target.text.length;

      // Replace all occurrences of target.text
      redactedText = redactedText.split(target.text).join(replacement);

      records.push({
        id: `redact-${target.category.toLowerCase()}-${Date.now()}-${records.length}`,
        category: target.category,
        method,
        originalRange: startIndex >= 0 ? { start: startIndex, end: endIndex } : undefined,
        replacementToken: replacement,
        reason: target.reason,
      });
    }

    return { redactedText, records, redactions: records };
  }

  private getReplacementToken(category: SensitiveCategory, rawValue: string, method: RedactionMethod): string {
    if (method === 'mask') {
      return `[${category}_REDACTED]`;
    }

    // Token mode: preserve consistency for identical values
    const cacheKey = `${category}::${rawValue}`;
    if (this.tokenMap.has(cacheKey)) {
      return this.tokenMap.get(cacheKey)!;
    }

    const currentCount = (this.tokenCounters.get(category) || 0) + 1;
    this.tokenCounters.set(category, currentCount);

    const token = `[${category}_${currentCount}]`;
    this.tokenMap.set(cacheKey, token);
    return token;
  }
}
