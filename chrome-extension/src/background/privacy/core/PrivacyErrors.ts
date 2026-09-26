/**
 * Privacy error hierarchy for the LOOKUP Privacy Subsystem.
 */

export class PrivacyError extends Error {
  public readonly code: string;
  public readonly timestamp: number;

  constructor(message: string, code = 'PRIVACY_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PrivacyBlockedError extends PrivacyError {
  public readonly reason: string;
  public readonly categories: string[];

  constructor(reason: string, categories: string[] = []) {
    super(`Privacy policy blocked context transmission: ${reason}`, 'PRIVACY_BLOCKED');
    this.reason = reason;
    this.categories = categories;
  }
}

export class PrivacyConsentDeniedError extends PrivacyError {
  public readonly task: string;

  constructor(task: string, reason = 'User denied consent for sensitive context transmission') {
    super(`Consent denied: ${reason} (task: "${task}")`, 'PRIVACY_CONSENT_DENIED');
    this.task = task;
  }
}

export class PrivacyEgressError extends PrivacyError {
  public readonly violations: string[];

  constructor(message: string, violations: string[] = []) {
    super(`Privacy egress gate check failed: ${message}`, 'PRIVACY_EGRESS_VIOLATION');
    this.violations = violations;
  }
}

export class PrivacyPolicyError extends PrivacyError {
  constructor(message: string) {
    super(`Privacy policy engine failure: ${message}`, 'PRIVACY_POLICY_ERROR');
  }
}

export class PrivacyConfigurationError extends PrivacyError {
  constructor(message: string) {
    super(`Invalid privacy configuration: ${message}`, 'PRIVACY_CONFIG_ERROR');
  }
}
