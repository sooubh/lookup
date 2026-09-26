import type { RawBrowserContext, ContextNeed } from '../core/PrivacyTypes';
import type { CollectedDomElement } from '../context/DomContextCollector';
import { DomContextCollector } from '../context/DomContextCollector';
import type { OcrFinding } from './OcrEngine';
import { OcrEngine } from './OcrEngine';
import type { VisionFinding } from './LocalVisionEngine';
import { LocalVisionEngine } from './LocalVisionEngine';

export interface PerceptionBundle {
  domElements: CollectedDomElement[];
  ocrFindings: OcrFinding[];
  visionFindings: VisionFinding[];
  screenshotUrl?: string;
}

/**
 * PerceptionRouter
 * 
 * Implements adaptive context capture. Evaluates task sensory requirements
 * and activates OCR or Local Vision only when strictly necessary, preferring
 * lightweight DOM inspection first.
 */
export class PerceptionRouter {
  private domCollector: DomContextCollector;
  private ocrEngine: OcrEngine;
  private visionEngine: LocalVisionEngine;

  constructor(
    domCollector?: DomContextCollector,
    ocrEngine?: OcrEngine,
    visionEngine?: LocalVisionEngine
  ) {
    this.domCollector = domCollector || new DomContextCollector();
    this.ocrEngine = ocrEngine || new OcrEngine();
    this.visionEngine = visionEngine || new LocalVisionEngine();
  }

  public getOcrEngine(): OcrEngine {
    return this.ocrEngine;
  }

  public getVisionEngine(): LocalVisionEngine {
    return this.visionEngine;
  }

  public async route(
    context: RawBrowserContext,
    need: ContextNeed
  ): Promise<PerceptionBundle> {
    const bundle: PerceptionBundle = {
      domElements: [],
      ocrFindings: [],
      visionFindings: [],
      screenshotUrl: need.needsScreenshot ? context.screenshot : undefined,
    };

    // 1. DOM channel - preferred first tier
    if (need.needsDom && context.dom && context.dom.length > 0) {
      bundle.domElements = this.domCollector.collect(context.dom);
    }

    // 2. OCR channel - invoked only when image/canvas text extraction is needed
    if (need.needsOcr && context.screenshot) {
      bundle.ocrFindings = await this.ocrEngine.recognize(
        context.screenshot,
        need.screenshotRegions
      );
    }

    // 3. Vision channel - invoked when visual semantics (faces, layouts, cards) are needed
    if (need.needsVision && context.screenshot) {
      bundle.visionFindings = await this.visionEngine.analyze(context.screenshot);
    }

    return bundle;
  }
}
