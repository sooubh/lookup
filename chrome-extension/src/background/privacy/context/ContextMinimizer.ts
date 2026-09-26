import type { RawBrowserContext, RawDomElement, ContextNeed } from '../core/PrivacyTypes';

/**
 * ContextMinimizer
 *
 * Enforces the "Minimum Disclosure" principle by filtering out non-essential
 * DOM elements, non-active tabs, and volatile/irrelevant element attributes
 * before sending to perception/detection pipelines.
 */
export class ContextMinimizer {
  private static readonly DISALLOWED_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'link', 'meta', 'iframe']);

  private static readonly ALLOWED_ATTRIBUTES = new Set([
    'id',
    'name',
    'class',
    'role',
    'type',
    'placeholder',
    'aria-label',
    'aria-labelledby',
    'aria-hidden',
    'aria-role',
    'title',
    'href',
    'value',
    'autocomplete',
    'alt',
    'data-testid',
  ]);

  public minimize(context: RawBrowserContext, need: ContextNeed, maxElements = 250): RawBrowserContext {
    const minimized: RawBrowserContext = {
      task: context.task,
      step: context.step,
      pageUrl: context.pageUrl,
      pageTitle: context.pageTitle,
      metadata: context.metadata ? { ...context.metadata } : undefined,
    };

    // 1. Tab minimization: keep only the active tab
    if (context.tabs && context.tabs.length > 0) {
      const activeTab = context.tabs.find(t => t.active) || context.tabs[0];
      minimized.tabs = [activeTab];
    }

    // 2. DOM minimization if DOM is needed
    if (need.needsDom && context.dom) {
      minimized.dom = this.filterDomElements(context.dom, maxElements);
    }

    // 3. Screenshot minimization
    if (need.needsScreenshot && context.screenshot) {
      minimized.screenshot = context.screenshot;
      minimized.screenshotDimensions = context.screenshotDimensions;
    }

    return minimized;
  }

  private filterDomElements(elements: RawDomElement[], maxElements: number): RawDomElement[] {
    const result: RawDomElement[] = [];

    const recurse = (node: RawDomElement) => {
      if (result.length >= maxElements) return;

      const tagLower = (node.tag || '').toLowerCase();
      if (ContextMinimizer.DISALLOWED_TAGS.has(tagLower)) {
        return;
      }

      if (node.isVisible === false) {
        return;
      }

      // Filter attributes
      const filteredAttributes: Record<string, string> = {};
      if (node.attributes) {
        for (const [key, value] of Object.entries(node.attributes)) {
          const keyLower = key.toLowerCase();
          if (ContextMinimizer.ALLOWED_ATTRIBUTES.has(keyLower)) {
            // Cap attribute value length safely to prevent payload bloat or undefined crashes
            if (value !== undefined && value !== null) {
              const strVal = typeof value === 'string' ? value : String(value);
              filteredAttributes[key] = strVal.length > 200 ? strVal.substring(0, 200) + '...' : strVal;
            }
          }
        }
      }

      const cleanedNode: RawDomElement = {
        tag: node.tag,
        selector: node.selector,
        text: node.text?.trim() ? node.text.trim().substring(0, 500) : undefined,
        attributes: Object.keys(filteredAttributes).length > 0 ? filteredAttributes : undefined,
        bbox: node.bbox,
        isVisible: node.isVisible,
      };

      result.push(cleanedNode);

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          recurse(child);
        }
      }
    };

    for (const el of elements) {
      recurse(el);
      if (result.length >= maxElements) break;
    }

    return result;
  }
}
