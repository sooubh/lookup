import type { RawBrowserContext, ContextNeed } from '../core/PrivacyTypes';
import type { CollectedDomElement } from '../context/DomContextCollector';
import { DomContextCollector } from '../context/DomContextCollector';
import type { OcrFinding } from './OcrEngine';
import { OcrEngine } from './OcrEngine';
import type { VisionFinding } from './LocalVisionEngine';
import { LocalVisionEngine } from './LocalVisionEngine';
import type { SemanticFinding } from './LocalSemanticEngine';
import { LocalSemanticEngine } from './LocalSemanticEngine';

export interface PerceptionBundle {
  domElements: CollectedDomElement[];
  ocrFindings: OcrFinding[];
  visionFindings: VisionFinding[];
  semanticFindings?: SemanticFinding[];
  screenshotUrl?: string;
}

/**
 * PerceptionRouter
 *
 * Implements adaptive context capture. Evaluates task sensory requirements
 * and activates OCR, Local Vision, or Local Semantic PII models only when
 * necessary, preferring lightweight DOM inspection first.
 */
export class PerceptionRouter {
  private domCollector: DomContextCollector;
  private ocrEngine: OcrEngine;
  private visionEngine: LocalVisionEngine;
  private semanticEngine: LocalSemanticEngine;

  constructor(
    domCollector?: DomContextCollector,
    ocrEngine?: OcrEngine,
    visionEngine?: LocalVisionEngine,
    semanticEngine?: LocalSemanticEngine,
  ) {
    this.domCollector = domCollector || new DomContextCollector();
    this.ocrEngine = ocrEngine || new OcrEngine();
    this.visionEngine = visionEngine || new LocalVisionEngine();
    this.semanticEngine = semanticEngine || new LocalSemanticEngine();
  }

  public getOcrEngine(): OcrEngine {
    return this.ocrEngine;
  }

  public getVisionEngine(): LocalVisionEngine {
    return this.visionEngine;
  }

  public getSemanticEngine(): LocalSemanticEngine {
    return this.semanticEngine;
  }

  public async route(context: RawBrowserContext, need: ContextNeed): Promise<PerceptionBundle> {
    const bundle: PerceptionBundle = {
      domElements: [],
      ocrFindings: [],
      visionFindings: [],
      semanticFindings: [],
      screenshotUrl: need.needsScreenshot ? context.screenshot : undefined,
    };

    // 1. DOM channel - preferred first tier
    if (need.needsDom && context.dom && context.dom.length > 0) {
      bundle.domElements = this.domCollector.collect(context.dom);
    }

    // 2. OCR channel - invoked only when image/canvas text extraction is needed
    if (need.needsOcr && context.screenshot) {
      bundle.ocrFindings = await this.ocrEngine.recognize(context.screenshot, need.screenshotRegions);
    }

    // 3. Vision channel - invoked when visual semantics (faces, layouts, cards) are needed
    if (need.needsVision && context.screenshot) {
      bundle.visionFindings = await this.visionEngine.analyze(context.screenshot);
    }

    // 4. Semantic model channel - invoked on DOM textual snippets & task text
    const textPieces: string[] = [];
    if (context.task) {
      textPieces.push(context.task);
    }
    if (bundle.domElements && bundle.domElements.length > 0) {
      for (const el of bundle.domElements) {
        if (el.text && el.text.trim().length > 0) {
          textPieces.push(el.text);
        }
        if (el.attributes.placeholder) {
          textPieces.push(el.attributes.placeholder);
        }
        if (el.attributes.value) {
          textPieces.push(el.attributes.value);
        }
      }
    }
    // Also include text extracted by OCR if any
    if (bundle.ocrFindings && bundle.ocrFindings.length > 0) {
      for (const ocr of bundle.ocrFindings) {
        if (ocr.text && ocr.text.trim().length > 0) {
          textPieces.push(ocr.text);
        }
      }
    }

    if (textPieces.length > 0) {
      const combinedText = textPieces.join('\n');
      bundle.semanticFindings = await this.semanticEngine.analyzeText(combinedText);
    }

    return bundle;
  }
}
