import type { SensitiveCategory, Evidence } from '../core/PrivacyTypes';

export interface PatternMatchResult {
  category: SensitiveCategory;
  confidence: number;
  matchedText: string;
  startIndex: number;
  endIndex: number;
  patternName: string;
}

export function luhnCheck(cardDigits: string): boolean {
  const digits = cardDigits.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * PatternDetector
 * 
 * High-speed pattern matching engine detecting regex and heuristic patterns
 * for credentials, PII, financial identifiers, and authentication secrets.
 */
export class PatternDetector {
  private static readonly PATTERNS: Array<{
    name: string;
    category: SensitiveCategory;
    regex: RegExp;
    baseConfidence: number;
    validator?: (match: string) => boolean;
  }> = [
    // SSN
    {
      name: 'SSN',
      category: 'GOVERNMENT_DOCUMENT',
      regex: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,
      baseConfidence: 0.95,
      validator: (str) => {
        const clean = str.replace(/\D/g, '');
        return clean.length === 9 && !clean.startsWith('000') && !clean.startsWith('666');
      },
    },

    // Credit Cards (with Luhn check)
    {
      name: 'Credit Card',
      category: 'PAYMENT',
      regex: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{15,16}\b/g,
      baseConfidence: 0.75,
      validator: (str) => luhnCheck(str),
    },

    // Masked Credit Cards (e.g. 4111-XXXX-XXXX-1111 or 4111-****-****-1111)
    {
      name: 'Masked Credit Card',
      category: 'PAYMENT',
      regex: /\b\d{4}[ -]?(?:[xX*]{4}[ -]?){2}\d{4}\b/g,
      baseConfidence: 0.95,
    },

    // Masked SSN (e.g. XXX-XX-1234 or ***-**-1234)
    {
      name: 'Masked SSN',
      category: 'GOVERNMENT_DOCUMENT',
      regex: /(?:\b|\B)(?:[xX*]{3}[-\s][xX*]{2}|\d{3}[-\s][xX*]{2}|[xX*]{3}[-\s]\d{2})[-\s]\d{4}\b/g,
      baseConfidence: 0.95,
    },

    // Email
    {
      name: 'Email',
      category: 'CONTACT',
      regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
      baseConfidence: 0.95,
    },

    // Phone Numbers
    {
      name: 'Phone Number',
      category: 'CONTACT',
      regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      baseConfidence: 0.85,
    },

    // OpenAI API Key
    {
      name: 'OpenAI API Key',
      category: 'API_SECRET',
      regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
      baseConfidence: 0.99,
    },

    // AWS Access Key ID
    {
      name: 'AWS Access Key',
      category: 'API_SECRET',
      regex: /\bAKIA[0-9A-Z]{16}\b/g,
      baseConfidence: 0.99,
    },

    // GitHub Personal Access Token
    {
      name: 'GitHub Token',
      category: 'API_SECRET',
      regex: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g,
      baseConfidence: 0.99,
    },

    // JWT Token
    {
      name: 'JWT Token',
      category: 'AUTHENTICATION',
      regex: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g,
      baseConfidence: 0.98,
    },

    // Passwords in text / assignment
    {
      name: 'Password in text',
      category: 'AUTHENTICATION',
      regex: /\b(?:password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]{4,})['"]?\b/gi,
      baseConfidence: 0.92,
    },

    // Generic API Key / Secret assignments
    {
      name: 'Generic API Key',
      category: 'API_SECRET',
      regex: /\b(?:api[_-]?key|secret|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{16,})['"]?\b/gi,
      baseConfidence: 0.90,
    },

    // IBAN Bank Account
    {
      name: 'IBAN',
      category: 'FINANCIAL',
      regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g,
      baseConfidence: 0.90,
    },

    // Street Address
    {
      name: 'Street Address',
      category: 'ADDRESS',
      regex: /\b\d{1,5}\s+(?:[A-Za-z0-9.-]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Way|Parkway|Pkwy)\b/gi,
      baseConfidence: 0.85,
    },
  ];

  public detect(text: string): PatternMatchResult[] {
    if (!text || text.length === 0) return [];

    const results: PatternMatchResult[] = [];

    for (const patternDef of PatternDetector.PATTERNS) {
      patternDef.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = patternDef.regex.exec(text)) !== null) {
        const matchedText = match[0];
        let confidence = patternDef.baseConfidence;

        if (patternDef.validator) {
          const isValid = patternDef.validator(matchedText);
          if (isValid) {
            confidence = Math.min(0.99, confidence + 0.1);
          } else {
            // Failed validation (e.g. Luhn check failed) -> lower confidence or skip
            confidence = Math.max(0.4, confidence - 0.35);
          }
        }

        results.push({
          category: patternDef.category,
          confidence,
          matchedText,
          startIndex: match.index,
          endIndex: match.index + matchedText.length,
          patternName: patternDef.name,
        });
      }
    }

    return results;
  }

  public detectToEvidence(text: string, idPrefix = 'pattern'): Evidence[] {
    const matches = this.detect(text);
    return matches.map((m, idx) => ({
      id: `${idPrefix}-${idx}-${Date.now()}`,
      source: 'pattern',
      category: m.category,
      confidence: m.confidence,
      text: m.matchedText,
      details: `Matched pattern: ${m.patternName}`,
      metadata: {
        startIndex: m.startIndex,
        endIndex: m.endIndex,
        patternName: m.patternName,
      },
    }));
  }
}
