import type { Evidence, FusedFinding, FindingSeverity } from '../core/PrivacyTypes';
import type { PerceptionBundle } from '../perception/PerceptionRouter';
import { PatternDetector } from './PatternDetector';
import { DomDetector } from './DomDetector';
import { OcrDetector } from './OcrDetector';
import { VisionDetector } from './VisionDetector';
import { EvidenceFusion } from './EvidenceFusion';

export interface SensitiveDetectionResult {
  fusedFindings: FusedFinding[];
  rawEvidence: Evidence[];
  maxSeverity: FindingSeverity;
  maxConfidence: number;
}

/**
 * SensitiveDetector
 * 
 * Master coordinator across all sensory detectors.
 * Gathers evidence from DOM, Pattern, OCR, and Vision channels,
 * and fuses them into prioritized, deduplicated findings.
 */
export class SensitiveDetector {
  private patternDetector: PatternDetector;
  private domDetector: DomDetector;
  private ocrDetector: OcrDetector;
  private visionDetector: VisionDetector;
  private evidenceFusion: EvidenceFusion;

  constructor(
    patternDetector?: PatternDetector,
    domDetector?: DomDetector,
    ocrDetector?: OcrDetector,
    visionDetector?: VisionDetector,
    evidenceFusion?: EvidenceFusion
  ) {
    this.patternDetector = patternDetector || new PatternDetector();
    this.domDetector = domDetector || new DomDetector(this.patternDetector);
    this.ocrDetector = ocrDetector || new OcrDetector(this.patternDetector);
    this.visionDetector = visionDetector || new VisionDetector();
    this.evidenceFusion = evidenceFusion || new EvidenceFusion();
  }

  public detect(bundle: PerceptionBundle): SensitiveDetectionResult {
    const rawEvidence: Evidence[] = [];

    // 1. DOM detector
    if (bundle.domElements && bundle.domElements.length > 0) {
      const domEv = this.domDetector.detect(bundle.domElements);
      rawEvidence.push(...domEv);
    }

    // 2. OCR detector
    if (bundle.ocrFindings && bundle.ocrFindings.length > 0) {
      const ocrEv = this.ocrDetector.detect(bundle.ocrFindings);
      rawEvidence.push(...ocrEv);
    }

    // 3. Vision detector
    if (bundle.visionFindings && bundle.visionFindings.length > 0) {
      const visionEv = this.visionDetector.detect(bundle.visionFindings);
      rawEvidence.push(...visionEv);
    }

    // 4. Evidence Fusion
    const fusedFindings = this.evidenceFusion.fuse(rawEvidence);

    // Compute max severity and max confidence
    let maxConfidence = 0;
    const severityRank: Record<FindingSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    let highestRank = 0;
    let maxSeverity: FindingSeverity = 'low';

    for (const f of fusedFindings) {
      if (f.confidence > maxConfidence) {
        maxConfidence = f.confidence;
      }
      if (severityRank[f.severity] > highestRank) {
        highestRank = severityRank[f.severity];
        maxSeverity = f.severity;
      }
    }

    return {
      fusedFindings,
      rawEvidence,
      maxSeverity,
      maxConfidence,
    };
  }
}
