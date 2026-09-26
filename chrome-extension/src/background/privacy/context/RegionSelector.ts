import type { BoundingBox } from '../core/PrivacyTypes';

/**
 * Utility for geometric operations on bounding box regions.
 */
export class RegionSelector {
  public static area(box: BoundingBox): number {
    return Math.max(0, box.width) * Math.max(0, box.height);
  }

  public static intersects(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  public static contains(outer: BoundingBox, inner: BoundingBox): boolean {
    return (
      inner.x >= outer.x &&
      inner.y >= outer.y &&
      inner.x + inner.width <= outer.x + outer.width &&
      inner.y + inner.height <= outer.y + outer.height
    );
  }

  public static union(a: BoundingBox, b: BoundingBox): BoundingBox {
    const minX = Math.min(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxX = Math.max(a.x + a.width, b.x + b.width);
    const maxY = Math.max(a.y + a.height, b.y + b.height);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  public static intersection(a: BoundingBox, b: BoundingBox): BoundingBox | null {
    if (!this.intersects(a, b)) return null;
    const minX = Math.max(a.x, b.x);
    const minY = Math.max(a.y, b.y);
    const maxX = Math.min(a.x + a.width, b.x + b.width);
    const maxY = Math.min(a.y + a.height, b.y + b.height);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  public static pad(box: BoundingBox, padding: number): BoundingBox {
    return {
      x: Math.max(0, box.x - padding),
      y: Math.max(0, box.y - padding),
      width: box.width + padding * 2,
      height: box.height + padding * 2,
    };
  }

  public static mergeOverlapping(boxes: BoundingBox[]): BoundingBox[] {
    if (boxes.length <= 1) return [...boxes];

    const merged: BoundingBox[] = [];
    const remaining = [...boxes];

    while (remaining.length > 0) {
      let current = remaining.pop()!;
      let hasMerged = false;

      for (let i = 0; i < remaining.length; i++) {
        if (this.intersects(current, remaining[i])) {
          current = this.union(current, remaining[i]);
          remaining.splice(i, 1);
          hasMerged = true;
          break;
        }
      }

      if (hasMerged) {
        remaining.push(current);
      } else {
        merged.push(current);
      }
    }

    return merged;
  }
}
