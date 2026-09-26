import type { Evidence } from '../core/PrivacyTypes';
import type { SemanticFinding } from '../perception/LocalSemanticEngine';

/**
 * SemanticDetector
 *
 * Transforms semantic model findings from the LocalSemanticEngine into
 * standardized privacy Evidence items with source: 'model'.
 */
export class SemanticDetector {
  public detect(semanticFindings: SemanticFinding[]): Evidence[] {
    const evidenceList: Evidence[] = [];

    for (let i = 0; i < semanticFindings.length; i++) {
      const sf = semanticFindings[i];
      evidenceList.push({
        id: `model-${i}-${sf.category}`,
        source: 'model',
        category: sf.category,
        confidence: sf.confidence,
        text: sf.text,
        details: `Local semantic model inference detected "${sf.label}"`,
        metadata: {
          label: sf.label,
          startIndex: sf.startIndex,
          endIndex: sf.endIndex,
        },
      });
    }

    return evidenceList;
  }
}
