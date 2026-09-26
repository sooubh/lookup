import type { BoundingBox, FusedFinding } from '../core/PrivacyTypes';
import { RegionSelector } from '../context/RegionSelector';

/**
 * RegionMasker
 * 
 * Computes bounding box mask regions and exclusion maps for visual surfaces.
 */
export class RegionMasker {
  private padding: number;

  constructor(padding = 4) {
    this.padding = padding;
  }

  public computeMaskRegions(findings: FusedFinding[]): BoundingBox[] {
    const rawBoxes: BoundingBox[] = [];

    for (const f of findings) {
      if (f.bbox) {
        // Apply safety padding to avoid leaving exposed pixel edges
        rawBoxes.push(RegionSelector.pad(f.bbox, this.padding));
      }
    }

    return RegionSelector.mergeOverlapping(rawBoxes);
  }

  public isRegionSensitive(candidate: BoundingBox, maskRegions: BoundingBox[]): boolean {
    for (const mask of maskRegions) {
      if (RegionSelector.intersects(candidate, mask)) {
        return true;
      }
    }
    return false;
  }

  public filterAllowedRegions(
    allRegions: BoundingBox[],
    maskRegions: BoundingBox[]
  ): BoundingBox[] {
    return allRegions.filter((r) => !this.isRegionSensitive(r, maskRegions));
  }
}
