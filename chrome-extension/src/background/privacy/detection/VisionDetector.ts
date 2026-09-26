import type { Evidence } from '../core/PrivacyTypes';
import type { VisionFinding } from '../perception/LocalVisionEngine';

/**
 * VisionDetector
 * 
 * Transforms visual semantic findings from the LocalVisionEngine into
 * standardized privacy Evidence items.
 */
export class VisionDetector {
  public detect(visionFindings: VisionFinding[]): Evidence[] {
    const evidenceList: Evidence[] = [];

    for (let i = 0; i < visionFindings.length; i++) {
      const vf = visionFindings[i];
      evidenceList.push({
        id: `vision-${i}-${vf.category}`,
        source: 'vision',
        category: vf.category,
        confidence: vf.confidence,
        bbox: vf.bbox,
        details: `Local visual inference detected "${vf.label}"`,
        metadata: {
          label: vf.label,
        },
      });
    }

    return evidenceList;
  }
}
