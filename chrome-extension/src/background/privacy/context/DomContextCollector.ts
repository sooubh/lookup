import type { RawDomElement, BoundingBox } from '../core/PrivacyTypes';

export interface CollectedDomElement {
  selector: string;
  tag: string;
  text?: string;
  attributes: Record<string, string>;
  bbox?: BoundingBox;
  isInteractive: boolean;
}

/**
 * DomContextCollector
 * 
 * Collects, normalizes, and cleans DOM elements into structured representations
 * ready for sensitive detection and task planning.
 */
export class DomContextCollector {
  private static readonly INTERACTIVE_TAGS = new Set([
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'details',
    'summary',
  ]);

  private static readonly INTERACTIVE_ROLES = new Set([
    'button',
    'link',
    'checkbox',
    'radio',
    'textbox',
    'combobox',
    'tab',
    'menuitem',
  ]);

  public collect(elements: RawDomElement[]): CollectedDomElement[] {
    const collected: CollectedDomElement[] = [];

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      const tag = (el.tag || 'div').toLowerCase();
      const attributes = el.attributes || {};
      const role = (attributes.role || '').toLowerCase();

      const isInteractive =
        DomContextCollector.INTERACTIVE_TAGS.has(tag) ||
        DomContextCollector.INTERACTIVE_ROLES.has(role) ||
        attributes['onclick'] !== undefined ||
        attributes['tabindex'] !== undefined;

      const selector = el.selector || this.buildFallbackSelector(el, i);

      collected.push({
        selector,
        tag,
        text: el.text?.trim() || undefined,
        attributes,
        bbox: el.bbox ? this.normalizeBbox(el.bbox) : undefined,
        isInteractive,
      });
    }

    return collected;
  }

  private buildFallbackSelector(el: RawDomElement, index: number): string {
    if (el.attributes?.id) {
      return `#${el.attributes.id}`;
    }
    if (el.attributes?.name) {
      return `${el.tag}[name="${el.attributes.name}"]`;
    }
    return `${el.tag}:nth-of-type(${index + 1})`;
  }

  private normalizeBbox(bbox: BoundingBox): BoundingBox {
    return {
      x: Math.max(0, Math.round(bbox.x)),
      y: Math.max(0, Math.round(bbox.y)),
      width: Math.max(0, Math.round(bbox.width)),
      height: Math.max(0, Math.round(bbox.height)),
    };
  }
}
