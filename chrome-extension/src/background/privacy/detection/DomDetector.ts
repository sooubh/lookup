import type { Evidence } from '../core/PrivacyTypes';
import type { CollectedDomElement } from '../context/DomContextCollector';
import { PatternDetector } from './PatternDetector';

/**
 * DomDetector
 * 
 * Inspects DOM structural attributes, input types, autocomplete values,
 * accessibility semantics, and field names for privacy-sensitive markers.
 */
export class DomDetector {
  private patternDetector: PatternDetector;

  constructor(patternDetector?: PatternDetector) {
    this.patternDetector = patternDetector || new PatternDetector();
  }

  public detect(elements: CollectedDomElement[]): Evidence[] {
    const evidenceList: Evidence[] = [];

    for (const el of elements) {
      const attrs = el.attributes;
      const type = (attrs.type || '').toLowerCase();
      const autocomplete = (attrs.autocomplete || '').toLowerCase();
      const name = (attrs.name || '').toLowerCase();
      const id = (attrs.id || '').toLowerCase();
      const placeholder = (attrs.placeholder || '').toLowerCase();
      const ariaLabel = (attrs['aria-label'] || '').toLowerCase();
      const allHints = `${name} ${id} ${placeholder} ${ariaLabel}`;

      // 1. Password input type
      if (type === 'password') {
        evidenceList.push({
          id: `dom-pw-${el.selector}`,
          source: 'dom',
          category: 'AUTHENTICATION',
          confidence: 1.0,
          selector: el.selector,
          bbox: el.bbox,
          details: 'Input element has type="password"',
        });
      }

      // 2. Autocomplete attributes
      if (autocomplete.includes('password') || autocomplete.includes('one-time-code')) {
        evidenceList.push({
          id: `dom-auto-pw-${el.selector}`,
          source: 'dom',
          category: 'AUTHENTICATION',
          confidence: 0.98,
          selector: el.selector,
          bbox: el.bbox,
          details: `Input element has autocomplete="${attrs.autocomplete}"`,
        });
      } else if (autocomplete.includes('cc-') || autocomplete.includes('credit-card')) {
        evidenceList.push({
          id: `dom-auto-cc-${el.selector}`,
          source: 'dom',
          category: 'PAYMENT',
          confidence: 0.98,
          selector: el.selector,
          bbox: el.bbox,
          details: `Payment autocomplete detected: "${attrs.autocomplete}"`,
        });
      } else if (autocomplete.includes('street-address') || autocomplete.includes('postal-code')) {
        evidenceList.push({
          id: `dom-auto-addr-${el.selector}`,
          source: 'dom',
          category: 'ADDRESS',
          confidence: 0.95,
          selector: el.selector,
          bbox: el.bbox,
          details: `Address autocomplete detected: "${attrs.autocomplete}"`,
        });
      } else if (autocomplete.includes('email')) {
        evidenceList.push({
          id: `dom-auto-email-${el.selector}`,
          source: 'dom',
          category: 'CONTACT',
          confidence: 0.95,
          selector: el.selector,
          bbox: el.bbox,
          details: `Email autocomplete detected: "${attrs.autocomplete}"`,
        });
      } else if (autocomplete.includes('tel')) {
        evidenceList.push({
          id: `dom-auto-tel-${el.selector}`,
          source: 'dom',
          category: 'CONTACT',
          confidence: 0.95,
          selector: el.selector,
          bbox: el.bbox,
          details: `Phone autocomplete detected: "${attrs.autocomplete}"`,
        });
      }

      // 3. Name / ID / Placeholder semantic hints
      this.checkSemanticHints(allHints, el, evidenceList);

      // 4. Element text pattern matching
      if (el.text) {
        const textMatches = this.patternDetector.detect(el.text);
        for (const tm of textMatches) {
          evidenceList.push({
            id: `dom-text-${el.selector}-${tm.category}-${tm.startIndex}`,
            source: 'dom',
            category: tm.category,
            confidence: tm.confidence,
            text: tm.matchedText,
            selector: el.selector,
            bbox: el.bbox,
            details: `DOM text node matched ${tm.patternName}`,
          });
        }
      }

      // 5. Element value pattern matching if value is in attributes
      if (attrs.value) {
        const valMatches = this.patternDetector.detect(attrs.value);
        for (const vm of valMatches) {
          evidenceList.push({
            id: `dom-val-${el.selector}-${vm.category}`,
            source: 'dom',
            category: vm.category,
            confidence: Math.min(0.99, vm.confidence + 0.05),
            text: vm.matchedText,
            selector: el.selector,
            bbox: el.bbox,
            details: `DOM value attribute matched ${vm.patternName}`,
          });
        }
      }
    }

    return evidenceList;
  }

  private checkSemanticHints(
    hints: string,
    el: CollectedDomElement,
    evidenceList: Evidence[]
  ): void {
    if (/\b(?:card[-_]?num|credit[-_]?card|cvv|cvc|expir|cardholder)\b/i.test(hints)) {
      evidenceList.push({
        id: `dom-hint-payment-${el.selector}`,
        source: 'dom',
        category: 'PAYMENT',
        confidence: 0.88,
        selector: el.selector,
        bbox: el.bbox,
        details: 'Payment/Card keyword detected in element identifier or label',
      });
    }

    if (/\b(?:ssn|social[-_]?sec|national[-_]?id|passport|tax[-_]?id)\b/i.test(hints)) {
      evidenceList.push({
        id: `dom-hint-gov-${el.selector}`,
        source: 'dom',
        category: 'GOVERNMENT_DOCUMENT',
        confidence: 0.90,
        selector: el.selector,
        bbox: el.bbox,
        details: 'Government identifier keyword in element metadata',
      });
    }

    if (/\b(?:api[-_]?key|secret[-_]?token|access[-_]?key|private[-_]?key)\b/i.test(hints)) {
      evidenceList.push({
        id: `dom-hint-api-${el.selector}`,
        source: 'dom',
        category: 'API_SECRET',
        confidence: 0.92,
        selector: el.selector,
        bbox: el.bbox,
        details: 'API secret keyword in element metadata',
      });
    }
  }
}
