import type { SensitiveCategory } from '../core/PrivacyTypes';
import { WebGpuRuntime } from './WebGpuRuntime';
import { WasmFallback } from './WasmFallback';

export interface SemanticFinding {
  category: SensitiveCategory;
  confidence: number;
  text: string;
  label: string;
  startIndex?: number;
  endIndex?: number;
}

export interface LocalSemanticProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  analyzeText(text: string): Promise<SemanticFinding[]>;
}

/**
 * ChromeBuiltinAiSemanticProvider
 *
 * Leverages Google Chrome's built-in on-device Gemini Nano model via
 * window.ai / chrome.aiOriginTrial.languageModel.
 * Zero-byte bundle download, runs locally on device NPU/GPU with no cloud egress.
 */
export class ChromeBuiltinAiSemanticProvider implements LocalSemanticProvider {
  public name = 'ChromeBuiltinAiSemanticProvider';

  private getAiLanguageModel(): any {
    const globalObj = globalThis as any;
    return globalObj.ai?.languageModel || globalObj.chrome?.aiOriginTrial?.languageModel || null;
  }

  public async isAvailable(): Promise<boolean> {
    try {
      const lm = this.getAiLanguageModel();
      if (!lm || typeof lm.capabilities !== 'function') return false;
      const caps = await lm.capabilities();
      return caps && (caps.available === 'readily' || caps.available === 'after-download');
    } catch {
      return false;
    }
  }

  public async analyzeText(text: string): Promise<SemanticFinding[]> {
    if (!text || text.trim().length === 0) return [];

    try {
      const lm = this.getAiLanguageModel();
      if (!lm) return [];

      const session = await lm.create({
        systemPrompt:
          'You are a privacy detector running locally on-device. Extract Personally Identifiable Information (PII) such as personal names, health details, corporate secrets, or personal relationship details from the user text. Return ONLY a JSON array of objects with keys: "text", "category", "confidence", "label". Categories must be one of: PERSONAL_IDENTITY, HEALTH, BUSINESS_CONFIDENTIAL, PRIVATE_MESSAGE.',
      });

      const responseText = await session.prompt(`Extract PII from this text:\n"${text.substring(0, 1000)}"`);
      session.destroy?.();

      // Parse JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((item: any) => ({
        category: (item.category as SensitiveCategory) || 'PERSONAL_IDENTITY',
        confidence: typeof item.confidence === 'number' ? Math.min(1.0, Math.max(0.1, item.confidence)) : 0.88,
        text: String(item.text || ''),
        label: String(item.label || item.category || 'PII Entity'),
      }));
    } catch {
      return [];
    }
  }
}

/**
 * WebGpuSemanticProvider
 *
 * Hardware-accelerated local in-browser neural token classification provider
 * (Transformers.js / ONNX Runtime Web via WebGPU).
 */
export class WebGpuSemanticProvider implements LocalSemanticProvider {
  public name = 'WebGpuSemanticProvider';
  private customInferenceFn?: (text: string) => Promise<SemanticFinding[]>;

  constructor(customInferenceFn?: (text: string) => Promise<SemanticFinding[]>) {
    this.customInferenceFn = customInferenceFn;
  }

  public async isAvailable(): Promise<boolean> {
    return await WebGpuRuntime.isAvailable();
  }

  public setInferenceFunction(fn: (text: string) => Promise<SemanticFinding[]>): void {
    this.customInferenceFn = fn;
  }

  public async analyzeText(text: string): Promise<SemanticFinding[]> {
    if (this.customInferenceFn) {
      return await this.customInferenceFn(text);
    }
    // WebGPU runtime available; returns empty until a model session is attached
    return [];
  }
}

/**
 * WasmSemanticProvider
 *
 * WebAssembly CPU fallback token classification provider when WebGPU is unavailable.
 */
export class WasmSemanticProvider implements LocalSemanticProvider {
  public name = 'WasmSemanticProvider';
  private customInferenceFn?: (text: string) => Promise<SemanticFinding[]>;

  constructor(customInferenceFn?: (text: string) => Promise<SemanticFinding[]>) {
    this.customInferenceFn = customInferenceFn;
  }

  public async isAvailable(): Promise<boolean> {
    return WasmFallback.isAvailable();
  }

  public setInferenceFunction(fn: (text: string) => Promise<SemanticFinding[]>): void {
    this.customInferenceFn = fn;
  }

  public async analyzeText(text: string): Promise<SemanticFinding[]> {
    if (this.customInferenceFn) {
      return await this.customInferenceFn(text);
    }
    return [];
  }
}

/**
 * HeuristicSemanticProvider
 *
 * Ultra-fast local entity classifier detecting contextual names, health data,
 * and confidential corporate markers that pure regex cannot classify.
 */
export class HeuristicSemanticProvider implements LocalSemanticProvider {
  public name = 'HeuristicSemanticProvider';

  private static readonly NAME_PATTERNS: Array<{ regex: RegExp; confidence: number; label: string }> = [
    {
      regex: /\b(?:[Mm]y name is|[Ii] am|[Ii]'m|[Cc]all me|[Tt]his is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g,
      confidence: 0.9,
      label: 'Self-Identified Person Name',
    },
    {
      regex:
        /\b(?:[Ww]elcome back|[Ll]ogged in as|[Uu]ser|[Aa]ccount holder)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g,
      confidence: 0.88,
      label: 'User Account Name',
    },
    {
      regex:
        /\b(?:[Dd]ear|[Hh]ello|[Hh]i|[Gg]reetings|[Mm]r\.|[Mm]rs\.|[Mm]s\.|[Dd]r\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g,
      confidence: 0.82,
      label: 'Addressed Person Name',
    },
    {
      regex: /\b(?:[Rr]egards|[Ss]incerely|[Cc]heers|[Yy]ours truly)[,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g,
      confidence: 0.85,
      label: 'Sign-off Person Name',
    },
  ];

  private static readonly HEALTH_PATTERNS: Array<{ regex: RegExp; confidence: number; label: string }> = [
    {
      regex:
        /\b(?:diagnosed with|treatment for|prescribed|prescription for|hospitalized for|blood pressure|heart rate|tested positive for)\s+([a-zA-Z\s]{3,35})/gi,
      confidence: 0.88,
      label: 'Health / Medical Condition',
    },
    {
      regex: /\b(?:patient id|medical record(?: number)?|mrn)\s*[:#]?\s*([a-zA-Z0-9-]{4,16})\b/gi,
      confidence: 0.94,
      label: 'Medical Record Identifier',
    },
  ];

  private static readonly CONFIDENTIAL_PATTERNS: Array<{ regex: RegExp; confidence: number; label: string }> = [
    {
      regex:
        /\b(?:CONFIDENTIAL|STRICTLY CONFIDENTIAL|PROPRIETARY|INTERNAL ONLY|NOT FOR DISTRIBUTION|RESTRICTED ACCESS)\b/g,
      confidence: 0.95,
      label: 'Confidentiality Banner',
    },
    {
      regex: /\b(?:internal roadmap|confidential draft|financial audit report|trade secret)\b/gi,
      confidence: 0.9,
      label: 'Internal Enterprise Asset',
    },
  ];

  private static readonly PRIVATE_MSG_PATTERNS: Array<{ regex: RegExp; confidence: number; label: string }> = [
    {
      regex: /\b(?:private message|direct message|dm from|confidential note)\s*[:\-]\s*([^\n\r]{4,80})/gi,
      confidence: 0.85,
      label: 'Private Message Content',
    },
  ];

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async analyzeText(text: string): Promise<SemanticFinding[]> {
    if (!text || text.length === 0) return [];

    const findings: SemanticFinding[] = [];

    // 1. Personal Identity
    for (const pat of HeuristicSemanticProvider.NAME_PATTERNS) {
      pat.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pat.regex.exec(text)) !== null) {
        const captured = match[1] || match[0];
        findings.push({
          category: 'PERSONAL_IDENTITY',
          confidence: pat.confidence,
          text: captured.trim(),
          label: pat.label,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    // 2. Health
    for (const pat of HeuristicSemanticProvider.HEALTH_PATTERNS) {
      pat.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pat.regex.exec(text)) !== null) {
        const captured = match[1] || match[0];
        findings.push({
          category: 'HEALTH',
          confidence: pat.confidence,
          text: captured.trim(),
          label: pat.label,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    // 3. Business Confidential
    for (const pat of HeuristicSemanticProvider.CONFIDENTIAL_PATTERNS) {
      pat.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pat.regex.exec(text)) !== null) {
        findings.push({
          category: 'BUSINESS_CONFIDENTIAL',
          confidence: pat.confidence,
          text: match[0].trim(),
          label: pat.label,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    // 4. Private Message
    for (const pat of HeuristicSemanticProvider.PRIVATE_MSG_PATTERNS) {
      pat.regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pat.regex.exec(text)) !== null) {
        findings.push({
          category: 'PRIVATE_MESSAGE',
          confidence: pat.confidence,
          text: (match[1] || match[0]).trim(),
          label: pat.label,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    return findings;
  }
}

/**
 * LocalSemanticEngine
 *
 * Master coordinator for local semantic PII model perception.
 * Cascades across hardware-accelerated and local on-device tiers:
 * 1. Chrome Built-in AI (Gemini Nano via window.ai)
 * 2. WebGPU Semantic Provider
 * 3. WASM CPU Fallback Provider
 * 4. Heuristic Semantic Provider
 *
 * Enforces Rule E: Failures never cause silent leaks.
 */
export class LocalSemanticEngine {
  private providers: LocalSemanticProvider[];
  private heuristicProvider: HeuristicSemanticProvider;

  constructor(customProviders?: LocalSemanticProvider[]) {
    this.heuristicProvider = new HeuristicSemanticProvider();
    if (customProviders && customProviders.length > 0) {
      this.providers = [...customProviders];
    } else {
      this.providers = [
        new ChromeBuiltinAiSemanticProvider(),
        new WebGpuSemanticProvider(),
        new WasmSemanticProvider(),
        this.heuristicProvider,
      ];
    }
  }

  public getHeuristicProvider(): HeuristicSemanticProvider {
    return this.heuristicProvider;
  }

  public getProviders(): LocalSemanticProvider[] {
    return [...this.providers];
  }

  public registerProvider(provider: LocalSemanticProvider, prepend = false): void {
    if (prepend) {
      this.providers.unshift(provider);
    } else {
      this.providers.push(provider);
    }
  }

  public async analyzeText(text: string): Promise<SemanticFinding[]> {
    if (!text || text.trim().length === 0) return [];

    for (const provider of this.providers) {
      try {
        const available = await provider.isAvailable();
        if (available) {
          const findings = await provider.analyzeText(text);
          if (findings.length > 0) {
            return findings;
          }
        }
      } catch (err) {
        console.warn(`[LocalSemanticEngine] Provider ${provider.name} failed:`, err);
        // Continue to fallback tier (fail-safe)
      }
    }

    return [];
  }
}
