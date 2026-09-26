import { createLogger } from '@src/background/log';
import type { BrowserState } from '@src/background/browser/views';
import type { AgentContext } from '../types';
import type { SanitizedContext } from '../../privacy/core/PrivacyTypes';

const logger = createLogger('LocalActionValidator');

export interface ActionValidationResult {
  isValid: boolean;
  reason?: string;
  sanitizedAction?: Record<string, unknown>;
  requiresConsent?: boolean;
  consentPayload?: {
    targetIndex: number;
    category: string;
    actionName: string;
    text?: string;
    elementDescription?: string;
  };
}

/**
 * Local Action Validator
 * Enforces local privacy and safety constraints on model-proposed actions
 * before browser execution.
 */
export class LocalActionValidator {
  private static readonly ELEMENT_INTERACTION_ACTIONS = [
    'click_element',
    'input_text',
    'select_dropdown_option',
    'get_dropdown_options',
  ];

  private static readonly DANGEROUS_NAVIGATION_PROTOCOLS = [
    'javascript:',
    'data:',
    'file:',
    'chrome:',
    'chrome-extension:',
    'edge:',
    'view-source:',
    'blob:',
  ];

  /**
   * Validate a single proposed action against the current browser state and privacy context
   */
  static validate(
    actionName: string,
    actionArgs: Record<string, unknown>,
    browserState?: BrowserState | null,
    sanitizedContext?: SanitizedContext | null,
    _agentContext?: AgentContext | null,
  ): ActionValidationResult {
    // 1. Prohibit dangerous navigation schemes
    if (actionName === 'go_to_url' || actionName === 'open_tab') {
      const rawUrl = typeof actionArgs.url === 'string' ? actionArgs.url.trim() : '';
      if (!rawUrl) {
        return { isValid: false, reason: 'URL parameter cannot be empty' };
      }

      const lowerUrl = rawUrl.toLowerCase();
      for (const proto of LocalActionValidator.DANGEROUS_NAVIGATION_PROTOCOLS) {
        if (lowerUrl.startsWith(proto)) {
          logger.warning(`Blocked dangerous navigation protocol: ${proto} in ${rawUrl}`);
          return {
            isValid: false,
            reason: `Navigation to protocol "${proto}" is prohibited for security and privacy.`,
          };
        }
      }

      if (lowerUrl.startsWith('about:') && lowerUrl !== 'about:blank') {
        return {
          isValid: false,
          reason: 'Navigation to internal browser pages is prohibited.',
        };
      }
    }

    // 2. Validate Google Search queries
    if (actionName === 'search_google') {
      const query = typeof actionArgs.query === 'string' ? actionArgs.query.trim() : '';
      if (!query) {
        return { isValid: false, reason: 'Search query cannot be empty' };
      }
      const lower = query.toLowerCase();
      for (const proto of LocalActionValidator.DANGEROUS_NAVIGATION_PROTOCOLS) {
        if (lower.startsWith(proto)) {
          return {
            isValid: false,
            reason: `Search query contains prohibited protocol prefix "${proto}".`,
          };
        }
      }
    }

    // 3. Validate element interaction targets
    const isElementAction = LocalActionValidator.ELEMENT_INTERACTION_ACTIONS.includes(actionName);
    const targetIndex = typeof actionArgs.index === 'number' ? actionArgs.index : undefined;

    if (isElementAction) {
      if (targetIndex === undefined) {
        return { isValid: false, reason: `Element index is required for ${actionName}` };
      }

      // Check if target index exists in current DOM element map if available
      if (browserState?.selectorMap) {
        const targetElement = browserState.selectorMap.get(targetIndex);
        if (!targetElement) {
          logger.warning(`Element at index ${targetIndex} does not exist in current browser state`);
          return {
            isValid: false,
            reason: `Target element at index ${targetIndex} no longer exists on the current page.`,
          };
        }

        // Defense-in-depth: directly reject interactions with password fields
        const elemType = (targetElement.attributes?.type || '').toLowerCase();
        const elemAutocomplete = (targetElement.attributes?.autocomplete || '').toLowerCase();
        if (
          elemType === 'password' ||
          elemAutocomplete.includes('current-password') ||
          elemAutocomplete.includes('new-password')
        ) {
          logger.warning(`LocalActionValidator: blocked interaction with password element index ${targetIndex}`);
          return {
            isValid: false,
            reason: `Interaction with element index ${targetIndex} was blocked: element is an authentication password field.`,
          };
        }

        // Check if element is inside a protected / redacted region
        if (sanitizedContext?.redactions && sanitizedContext.redactions.length > 0) {
          const isTargetRedacted = sanitizedContext.redactions.some(r => {
            if (r.selector) {
              if (
                r.selector.includes(`[highlight_index="${targetIndex}"]`) ||
                r.selector.includes(`highlightIndex='${targetIndex}'`) ||
                r.selector.includes(`highlightIndex="${targetIndex}"`) ||
                r.selector.includes(`=${targetIndex}]`) ||
                r.selector === String(targetIndex)
              ) {
                return true;
              }
            }
            if (r.reason && (r.reason.includes(`[${targetIndex}]`) || r.reason.includes(`index ${targetIndex}`))) {
              return true;
            }
            return false;
          });

          if (isTargetRedacted) {
            // If user already approved this element, allow it
            if (_agentContext?.isElementAllowed(targetIndex)) {
              logger.info(`Element index ${targetIndex} was previously approved by user, allowing action`);
            } else {
              // Find the category from redaction metadata
              const matchingRedaction = sanitizedContext.redactions.find(
                r =>
                  r.selector?.includes(String(targetIndex)) ||
                  r.reason?.includes(`[${targetIndex}]`) ||
                  r.reason?.includes(`index ${targetIndex}`),
              );
              const category = matchingRedaction?.category || 'UNKNOWN';
              const elementDesc = matchingRedaction?.reason || `element index ${targetIndex}`;

              logger.warning(`Element index ${targetIndex} requires user consent (category: ${category})`);
              return {
                isValid: false,
                requiresConsent: true,
                reason: `Interaction with element index ${targetIndex} requires your approval: element contains protected ${category} information.`,
                consentPayload: {
                  targetIndex,
                  category,
                  actionName,
                  text: typeof actionArgs.text === 'string' ? actionArgs.text : undefined,
                  elementDescription: elementDesc,
                },
              };
            }
          }
        }

        // Check if element is marked isRedacted in sanitized DOM
        if (sanitizedContext?.dom?.elements) {
          const matchingSanitizedEl = sanitizedContext.dom.elements.find(
            el =>
              el.isRedacted &&
              el.selector &&
              (el.selector.includes(`[highlight_index="${targetIndex}"]`) ||
                el.selector.includes(`highlightIndex='${targetIndex}'`)),
          );
          if (matchingSanitizedEl) {
            // If user already approved this element, allow it
            if (_agentContext?.isElementAllowed(targetIndex)) {
              logger.info(`Element index ${targetIndex} (isRedacted) was previously approved by user, allowing action`);
            } else {
              return {
                isValid: false,
                requiresConsent: true,
                reason: `Interaction with element index ${targetIndex} requires your approval: element is marked as redacted.`,
                consentPayload: {
                  targetIndex,
                  category: 'REDACTED',
                  actionName,
                  text: typeof actionArgs.text === 'string' ? actionArgs.text : undefined,
                  elementDescription: `redacted element at index ${targetIndex}`,
                },
              };
            }
          }
        }
      }

      // Check input_text for dangerous exfiltration or injection patterns
      if (actionName === 'input_text' && typeof actionArgs.text === 'string') {
        const inputText = actionArgs.text;
        // Verify input does not contain system command overrides or prompt injection
        if (/\[BLOCKED_|nano_untrusted_content|ignore previous instructions|<script|javascript:/i.test(inputText)) {
          return {
            isValid: false,
            reason: 'Input text contains disallowed injection patterns.',
          };
        }
      }
    }

    // 4. Validate keyboard send_keys
    if (actionName === 'send_keys' && typeof actionArgs.keys === 'string') {
      if (/ignore previous instructions|<script|javascript:/i.test(actionArgs.keys)) {
        return {
          isValid: false,
          reason: 'Keys contain disallowed injection patterns.',
        };
      }
    }

    // 5. Validate scroll and wait bounds
    if (actionName === 'wait') {
      const seconds = typeof actionArgs.seconds === 'number' ? actionArgs.seconds : 0;
      if (seconds > 60) {
        actionArgs.seconds = 60; // Clamp excessive wait
      }
      if (seconds < 0) {
        actionArgs.seconds = 0;
      }
    }

    if (actionName === 'scroll_to_percent') {
      const percent = typeof actionArgs.percent === 'number' ? actionArgs.percent : 0;
      if (percent < 0 || percent > 100) {
        return { isValid: false, reason: 'Scroll percentage must be between 0 and 100' };
      }
    }

    return { isValid: true, sanitizedAction: actionArgs };
  }

  /**
   * Validate a batch of actions proposed by the model
   */
  static validateBatch(
    actions: Record<string, unknown>[],
    browserState?: BrowserState | null,
    sanitizedContext?: SanitizedContext | null,
    agentContext?: AgentContext | null,
  ): { validActions: Record<string, unknown>[]; rejectedCount: number; errors: string[] } {
    const validActions: Record<string, unknown>[] = [];
    const errors: string[] = [];
    let rejectedCount = 0;

    for (const actionObj of actions) {
      const actionName = Object.keys(actionObj)[0];
      if (!actionName) {
        rejectedCount++;
        continue;
      }

      const actionArgs = (actionObj[actionName] as Record<string, unknown>) || {};
      const result = this.validate(actionName, actionArgs, browserState, sanitizedContext, agentContext);

      if (result.isValid) {
        validActions.push({ [actionName]: result.sanitizedAction || actionArgs });
      } else {
        rejectedCount++;
        errors.push(`Action [${actionName}]: ${result.reason || 'Validation failed'}`);
        logger.warning(`Action [${actionName}] failed local validation: ${result.reason}`);
      }
    }

    return { validActions, rejectedCount, errors };
  }
}
