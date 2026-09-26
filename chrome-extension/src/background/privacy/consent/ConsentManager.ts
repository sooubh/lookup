import type { ConsentRequest, UserConsentDecision } from '../core/PrivacyTypes';
import { ConsentStore } from './ConsentStore';

export type ConsentPromptHandler = (
  request: ConsentRequest
) => Promise<UserConsentDecision>;

/**
 * ConsentManager
 * 
 * Manages user confirmation prompts for uncertain or high-risk context transmissions.
 * Employs a fail-closed default: if no handler is registered or user dismisses,
 * the decision is strictly DENIED.
 */
export class ConsentManager {
  private store: ConsentStore;
  private promptHandler?: ConsentPromptHandler;

  constructor(store?: ConsentStore, promptHandler?: ConsentPromptHandler) {
    this.store = store || new ConsentStore();
    this.promptHandler = promptHandler;
  }

  public getStore(): ConsentStore {
    return this.store;
  }

  public setPromptHandler(handler: ConsentPromptHandler): void {
    this.promptHandler = handler;
  }

  public async requestConsent(request: ConsentRequest): Promise<UserConsentDecision> {
    // If prompt handler is not registered, fail-closed to DENY
    if (!this.promptHandler) {
      console.warn(
        '[ConsentManager] No UI consent prompt handler registered; defaulting to DENY'
      );
      this.store.deny(request.task, request.detectedCategories, request.domain);
      return 'deny';
    }

    try {
      const decision = await this.promptHandler(request);

      if (decision === 'allow_once') {
        this.store.allow(request.task, request.detectedCategories, request.domain);
      } else {
        this.store.deny(request.task, request.detectedCategories, request.domain);
      }

      return decision;
    } catch (err) {
      console.error('[ConsentManager] Consent prompt failed, failing closed to DENY:', err);
      this.store.deny(request.task, request.detectedCategories, request.domain);
      return 'deny';
    }
  }
}
