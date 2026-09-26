import type {
  Evidence,
  FusedFinding,
  FindingSeverity,
  DetectionSource,
} from '../core/PrivacyTypes';
import { CATEGORY_SEVERITY_MAP } from '../core/PrivacyPolicyEngine';
import { RegionSelector } from '../context/RegionSelector';

/**
 * EvidenceFusion
 * 
 * Fuses multi-source signals (DOM, Pattern, OCR, Vision) to compute cross-signal
 * confirmation, aggregate confidence scores, and determine holistic risk severity.
 */
export class EvidenceFusion {
  public fuse(evidenceList: Evidence[]): FusedFinding[] {
    if (evidenceList.length === 0) return [];

    // Group evidence by category and spatial / target proximity
    const clusters: Evidence[][] = [];

    for (const ev of evidenceList) {
      let matchedCluster: Evidence[] | null = null;

      for (const cluster of clusters) {
        if (this.shouldCluster(cluster, ev)) {
          matchedCluster = cluster;
          break;
        }
      }

      if (matchedCluster) {
        matchedCluster.push(ev);
      } else {
        clusters.push([ev]);
      }
    }

    // Convert each cluster into a FusedFinding
    return clusters.map((cluster, idx) => this.buildFusedFinding(cluster, idx));
  }

  private shouldCluster(cluster: Evidence[], candidate: Evidence): boolean {
    const leader = cluster[0];

    // Must be same category or related category
    if (leader.category !== candidate.category) {
      const areRelated =
        (leader.category === 'AUTHENTICATION' && candidate.category === 'CREDENTIAL') ||
        (leader.category === 'CREDENTIAL' && candidate.category === 'AUTHENTICATION') ||
        (leader.category === 'PAYMENT' && candidate.category === 'FINANCIAL') ||
        (leader.category === 'FINANCIAL' && candidate.category === 'PAYMENT');
      if (!areRelated) return false;
    }

    // If both have selectors and they match
    if (leader.selector && candidate.selector && leader.selector === candidate.selector) {
      return true;
    }

    // If both have bounding boxes and they intersect
    if (leader.bbox && candidate.bbox && RegionSelector.intersects(leader.bbox, candidate.bbox)) {
      return true;
    }

    // If both have identical matched text
    if (leader.text && candidate.text && leader.text.trim() === candidate.text.trim()) {
      return true;
    }

    return false;
  }

  private buildFusedFinding(cluster: Evidence[], index: number): FusedFinding {
    const primaryCategory = cluster[0].category;
    const sources = Array.from(new Set(cluster.map((e) => e.source))) as DetectionSource[];

    // Calculate probabilistic combined confidence: 1 - product(1 - c_i)
    let invProduct = 1.0;
    for (const ev of cluster) {
      invProduct *= 1.0 - Math.min(0.99, Math.max(0.1, ev.confidence));
    }
    let combinedConfidence = Number((1.0 - invProduct).toFixed(2));

    // Cross-signal confirmation bonus: if 2+ distinct detection channels agreed
    if (sources.length >= 2) {
      combinedConfidence = Math.min(0.99, Number((combinedConfidence + 0.1).toFixed(2)));
    }

    // Determine bounding box: union of all bboxes in cluster
    let fusedBbox = cluster[0].bbox;
    for (let i = 1; i < cluster.length; i++) {
      if (cluster[i].bbox) {
        fusedBbox = fusedBbox
          ? RegionSelector.union(fusedBbox, cluster[i].bbox!)
          : cluster[i].bbox;
      }
    }

    // Determine selector and representative text
    const selector = cluster.find((e) => e.selector)?.selector;
    const text = cluster.find((e) => e.text)?.text;

    // Determine severity
    let severity: FindingSeverity = CATEGORY_SEVERITY_MAP[primaryCategory] || 'medium';
    if (sources.length >= 2 && combinedConfidence >= 0.85 && severity === 'high') {
      severity = 'critical';
    }

    return {
      id: `fused-${primaryCategory.toLowerCase()}-${index}-${Date.now()}`,
      category: primaryCategory,
      confidence: combinedConfidence,
      severity,
      sources,
      text,
      bbox: fusedBbox,
      selector,
      evidenceList: cluster,
    };
  }
}
