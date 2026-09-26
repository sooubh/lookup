import type { Evidence } from '../core/PrivacyTypes';
import type { OcrFinding } from '../perception/OcrEngine';
import { PatternDetector } from './PatternDetector';

/**
 * OcrDetector
 * 
 * Inspects OCR recognized text extracted from image/canvas regions,
 * detecting patterns and textual markers mapped to their visual bounding boxes.
 */
export class OcrDetector {
  private patternDetector: PatternDetector;

  private static readonly OCR_KEYWORD_RULES = [
    { regex: /\b(?:passport|national\s*id|driver'?s?\s*licen[sc]e)\b/i, category: 'GOVERNMENT_DOCUMENT', conf: 0.90 },
    { regex: /\b(?:patient|diagnosis|rx|prescription|medical\s*record)\b/i, category: 'HEALTH', conf: 0.88 },
    { regex: /\b(?:confidential|internal\s*use\s*only|strictly\s*private)\b/i, category: 'BUSINESS_CONFIDENTIAL', conf: 0.85 },
    { regex: /\b(?:balance|routing\s*number|wire\s*transfer|invoice\s*total)\b/i, category: 'FINANCIAL', conf: 0.85 },
  ] as const;

  constructor(patternDetector?: PatternDetector) {
    this.patternDetector = patternDetector || new PatternDetector();
  }

  public detect(ocrFindings: OcrFinding[]): Evidence[] {
    const evidenceList: Evidence[] = [];

    for (let i = 0; i < ocrFindings.length; i++) {
      const item = ocrFindings[i];
      if (!item.text || item.text.trim().length === 0) continue;

      // 1. Run pattern detector on OCR text
      const patternMatches = this.patternDetector.detect(item.text);
      for (const pm of patternMatches) {
        // Combined confidence: OCR recognition confidence * pattern confidence
        const combinedConf = Math.min(0.99, Number((item.confidence * pm.confidence).toFixed(2)));
        evidenceList.push({
          id: `ocr-pat-${i}-${pm.category}`,
          source: 'ocr',
          category: pm.category,
          confidence: combinedConf,
          text: pm.matchedText,
          bbox: item.bbox,
          details: `OCR text match: ${pm.patternName} in recognized text`,
          metadata: {
            fullOcrText: item.text,
            ocrConfidence: item.confidence,
          },
        });
      }

      // 2. Keyword heuristic checks
      for (const rule of OcrDetector.OCR_KEYWORD_RULES) {
        if (rule.regex.test(item.text)) {
          evidenceList.push({
            id: `ocr-kw-${i}-${rule.category}`,
            source: 'ocr',
            category: rule.category,
            confidence: Math.min(0.95, Number((item.confidence * rule.conf).toFixed(2))),
            text: item.text,
            bbox: item.bbox,
            details: `OCR keyword match: ${rule.category}`,
          });
        }
      }
    }

    return evidenceList;
  }
}
