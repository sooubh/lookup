import type {
  FusedFinding,
  RedactionRecord,
  RedactionMethod,
  SanitizedDom,
  SanitizedDomElement,
  SanitizedImage,
  SanitizedOcr,
  BoundingBox,
} from '../core/PrivacyTypes';
import type { CollectedDomElement } from '../context/DomContextCollector';
import type { OcrFinding } from '../perception/OcrEngine';
import { TextRedactor } from './TextRedactor';
import { RegionMasker } from './RegionMasker';
import { ImageRedactor } from './ImageRedactor';

export interface RedactionEngineResult {
  dom?: SanitizedDom;
  image?: SanitizedImage;
  ocr?: SanitizedOcr[];
  allowedRegions?: BoundingBox[];
  redactions: RedactionRecord[];
}

/**
 * RedactionEngine
 * 
 * Master orchestrator for multi-modal context sanitization.
 * Coordinates DOM string sanitization, tokenization, OCR masking,
 * and image bounding box pixel masking.
 */
export class RedactionEngine {
  private textRedactor: TextRedactor;
  private regionMasker: RegionMasker;
  private imageRedactor: ImageRedactor;

  constructor(
    textRedactor?: TextRedactor,
    regionMasker?: RegionMasker,
    imageRedactor?: ImageRedactor
  ) {
    this.textRedactor = textRedactor || new TextRedactor();
    this.regionMasker = regionMasker || new RegionMasker();
    this.imageRedactor = imageRedactor || new ImageRedactor();
  }

  public getTextRedactor(): TextRedactor {
    return this.textRedactor;
  }

  public async redactAll(params: {
    domElements?: CollectedDomElement[];
    pageMeta?: { url?: string; title?: string };
    ocrFindings?: OcrFinding[];
    screenshotUrl?: string;
    dimensions?: { width: number; height: number };
    findings: FusedFinding[];
    method?: RedactionMethod;
  }): Promise<RedactionEngineResult> {
    const {
      domElements,
      pageMeta,
      ocrFindings,
      screenshotUrl,
      dimensions = { width: 1280, height: 720 },
      findings,
      method = 'token',
    } = params;

    const allRecords: RedactionRecord[] = [];

    // 1. DOM Redaction
    let sanitizedDom: SanitizedDom | undefined;
    if (domElements && domElements.length > 0) {
      const sanitizedElements: SanitizedDomElement[] = [];

      for (const el of domElements) {
        let isRedacted = false;
        let elementText = el.text;

        if (elementText) {
          const { redactedText, records } = this.textRedactor.redact(elementText, findings, method);
          if (records.length > 0) {
            isRedacted = true;
            elementText = redactedText;
            for (const r of records) {
              allRecords.push({ ...r, selector: el.selector, bbox: el.bbox });
            }
          }
        }

        // Check if element has any matching findings by selector or bbox
        const matchingFindings = findings.filter(
          f => (f.selector && el.selector && f.selector === el.selector) ||
               (f.bbox && el.bbox && f.bbox.x === el.bbox.x && f.bbox.y === el.bbox.y)
        );

        if (matchingFindings.length > 0) {
          isRedacted = true;
          for (const mf of matchingFindings) {
            allRecords.push({
              id: `redact-dom-${el.selector || 'el'}-${mf.category}-${Date.now()}-${allRecords.length}`,
              category: mf.category,
              method,
              selector: el.selector,
              bbox: el.bbox,
              replacementToken: `[${mf.category}_PROTECTED]`,
              reason: `DOM element matched sensitive finding ${mf.category}`,
            });
          }
        }

        // Always protect password inputs
        if (el.attributes?.type === 'password') {
          isRedacted = true;
          if (!allRecords.some(r => r.selector === el.selector && r.category === 'AUTHENTICATION')) {
            allRecords.push({
              id: `redact-attr-pw-${el.selector || 'pw'}-${Date.now()}`,
              category: 'AUTHENTICATION',
              method: 'mask',
              selector: el.selector,
              bbox: el.bbox,
              replacementToken: '[PASSWORD_REDACTED]',
              reason: 'Password input element protected',
            });
          }
        }

        // Redact attributes
        const sanitizedAttributes: Record<string, string> = {};
        for (const [k, v] of Object.entries(el.attributes)) {
          // If password field value or sensitive attribute, redact completely
          if (k.toLowerCase() === 'value' && el.attributes.type === 'password') {
            sanitizedAttributes[k] = '[PASSWORD_REDACTED]';
            isRedacted = true;
          } else {
            const { redactedText, records } = this.textRedactor.redact(v, findings, method);
            sanitizedAttributes[k] = redactedText;
            if (records.length > 0) {
              isRedacted = true;
              for (const r of records) {
                allRecords.push({ ...r, selector: el.selector, bbox: el.bbox });
              }
            }
          }
        }

        sanitizedElements.push({
          selector: el.selector,
          tag: el.tag,
          text: elementText,
          attributes: sanitizedAttributes,
          bbox: el.bbox,
          isInteractive: el.isInteractive,
          isRedacted,
        });
      }

      sanitizedDom = {
        title: pageMeta?.title,
        url: pageMeta?.url,
        elements: sanitizedElements,
      };
    }

    // 2. OCR Redaction
    let sanitizedOcr: SanitizedOcr[] | undefined;
    if (ocrFindings && ocrFindings.length > 0) {
      sanitizedOcr = [];
      for (const item of ocrFindings) {
        const { redactedText, records } = this.textRedactor.redact(item.text, findings, method);
        const wasRedacted = records.length > 0;
        if (wasRedacted) {
          for (const r of records) {
            allRecords.push({ ...r, bbox: item.bbox });
          }
        }

        sanitizedOcr.push({
          text: redactedText,
          bbox: item.bbox,
          confidence: item.confidence,
          isRedacted: wasRedacted,
        });
      }
    }

    // 3. Image Masking
    let sanitizedImage: SanitizedImage | undefined;
    const maskRegions = this.regionMasker.computeMaskRegions(findings);

    if (screenshotUrl) {
      sanitizedImage = await this.imageRedactor.redact(screenshotUrl, dimensions, maskRegions);
    }

    return {
      dom: sanitizedDom,
      image: sanitizedImage,
      ocr: sanitizedOcr,
      allowedRegions: [],
      redactions: allRecords,
    };
  }
}
