import type { RawDomElement, BoundingBox } from '../core/PrivacyTypes';
import { DOMElementNode, type DOMBaseNode } from '@src/background/browser/dom/views';

/**
 * Extracts structured RawDomElement array from BrowserState DOM structures
 * (elementTree and selectorMap) so that DOM attributes (such as type="password",
 * autocomplete="cc-number", names, placeholders) can be inspected by the
 * local privacy detection subsystem.
 */
export function extractRawDomElementsFromBrowserState(
  elementTree?: DOMElementNode | null,
  selectorMap?: Map<number, DOMElementNode> | null,
  maxElements = 500,
): RawDomElement[] {
  const elements: RawDomElement[] = [];
  const seenNodes = new Set<DOMElementNode>();

  const convertNode = (node: DOMElementNode): RawDomElement => {
    let bbox: BoundingBox | undefined = undefined;
    if (node.viewportCoordinates?.topLeft) {
      bbox = {
        x: Math.round(node.viewportCoordinates.topLeft.x),
        y: Math.round(node.viewportCoordinates.topLeft.y),
        width: Math.round(node.viewportCoordinates.width),
        height: Math.round(node.viewportCoordinates.height),
      };
    }

    let selector = node.xpath || undefined;
    if (node.highlightIndex !== null && node.highlightIndex !== undefined) {
      selector = `[highlight_index="${node.highlightIndex}"]`;
    }

    let text: string | undefined = undefined;
    if (typeof node.getAllTextTillNextClickableElement === 'function') {
      try {
        text = node.getAllTextTillNextClickableElement();
      } catch {
        text = undefined;
      }
    }

    const safeAttributes: Record<string, string> = {};
    if (node.attributes) {
      for (const [k, v] of Object.entries(node.attributes)) {
        if (v !== undefined && v !== null) {
          safeAttributes[k] = typeof v === 'string' ? v : String(v);
        }
      }
    }

    return {
      tag: (node.tagName || 'div').toLowerCase(),
      selector,
      text: text && text.trim() ? text.trim() : undefined,
      attributes: safeAttributes,
      bbox,
      isVisible: node.isVisible,
    };
  };

  // 1. Prioritize interactive elements from selectorMap
  if (selectorMap) {
    for (const [, node] of selectorMap) {
      if (node && !seenNodes.has(node)) {
        seenNodes.add(node);
        elements.push(convertNode(node));
      }
    }
  }

  // 2. Traverse elementTree to capture other nodes with attributes, inputs, or text
  if (elementTree && elements.length < maxElements) {
    const queue: DOMBaseNode[] = [elementTree];
    while (queue.length > 0 && elements.length < maxElements) {
      const current = queue.shift();
      if (!current) continue;

      if (current instanceof DOMElementNode) {
        if (!seenNodes.has(current)) {
          seenNodes.add(current);
          const hasAttrs = current.attributes && Object.keys(current.attributes).length > 0;
          if (hasAttrs || current.highlightIndex !== null || current.isInteractive) {
            elements.push(convertNode(current));
          }
        }

        if (current.children && Array.isArray(current.children)) {
          for (const child of current.children) {
            queue.push(child);
          }
        }
      }
    }
  }

  return elements;
}
