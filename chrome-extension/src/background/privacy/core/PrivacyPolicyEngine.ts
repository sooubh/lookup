import type {
  SensitiveCategory,
  PrivacyDecision,
  StrictnessMode,
  FindingSeverity,
  FusedFinding,
  PolicyInput,
  PolicyEvaluationResult,
} from './PrivacyTypes';

export interface PolicyRule {
  name: string;
  category?: SensitiveCategory;
  minConfidence?: number;
  mode?: StrictnessMode;
  decision: PrivacyDecision;
  reason: string;
}

export const CATEGORY_SEVERITY_MAP: Record<SensitiveCategory, FindingSeverity> = {
  CREDENTIAL: 'critical',
  AUTHENTICATION: 'critical',
  API_SECRET: 'critical',
  FINANCIAL: 'critical',
  PAYMENT: 'critical',
  GOVERNMENT_DOCUMENT: 'critical',
  HEALTH: 'critical',
  PRIVATE_DOCUMENT: 'high',
  PRIVATE_MESSAGE: 'high',
  PERSONAL_IDENTITY: 'high',
  BUSINESS_CONFIDENTIAL: 'high',
  CONTACT: 'medium',
  ADDRESS: 'medium',
  LOCATION: 'medium',
  FACE: 'medium',
  OTHER_SENSITIVE: 'low',
};

export class PrivacyPolicyEngine {
  private customRules: PolicyRule[] = [];

  constructor(customRules: PolicyRule[] = []) {
    this.customRules = [...customRules];
  }

  public addRule(rule: PolicyRule): void {
    this.customRules.push(rule);
  }

  public getCategorySeverity(category: SensitiveCategory): FindingSeverity {
    return CATEGORY_SEVERITY_MAP[category] || 'medium';
  }

  public async evaluate(input: PolicyInput): Promise<PolicyEvaluationResult> {
    const { task, findings, strictness, userAllowedCategories = [] } = input;

    // Filter out categories that user has explicitly allowed/whitelisted for this session
    const activeFindings = findings.filter(
      (f) => !userAllowedCategories.includes(f.category)
    );

    // If no findings, safe to ALLOW with basic minimization if needed
    if (activeFindings.length === 0) {
      return {
        decision: 'ALLOW',
        reason: 'No sensitive data detected in context',
        highRiskCategories: [],
        redactionRequired: false,
      };
    }

    // Check custom rules first
    for (const rule of this.customRules) {
      if (rule.mode && rule.mode !== strictness) continue;
      for (const finding of activeFindings) {
        if (!rule.category || rule.category === finding.category) {
          if (!rule.minConfidence || finding.confidence >= rule.minConfidence) {
            return {
              decision: rule.decision,
              reason: `Custom rule matched: ${rule.reason}`,
              highRiskCategories: [finding.category],
              redactionRequired: rule.decision === 'REDACT' || rule.decision === 'MINIMIZE',
              userPromptExplanation:
                rule.decision === 'ASK_USER'
                  ? `Custom policy requires confirmation for ${finding.category}`
                  : undefined,
            };
          }
        }
      }
    }

    const highRiskFindings = activeFindings.filter(
      (f) => f.severity === 'critical' || f.severity === 'high'
    );
    const criticalFindings = activeFindings.filter((f) => f.severity === 'critical');
    const highRiskCategories = Array.from(new Set(highRiskFindings.map((f) => f.category)));

    switch (strictness) {
      case 'strict':
        return this.evaluateStrict(task, activeFindings, criticalFindings, highRiskCategories);

      case 'permissive':
        return this.evaluatePermissive(task, activeFindings, criticalFindings, highRiskCategories);

      case 'custom':
        // If no custom rule matched, default to balanced
        return this.evaluateBalanced(task, activeFindings, criticalFindings, highRiskCategories);

      case 'balanced':
      default:
        return this.evaluateBalanced(task, activeFindings, criticalFindings, highRiskCategories);
    }
  }

  private evaluateStrict(
    task: string,
    findings: FusedFinding[],
    criticalFindings: FusedFinding[],
    highRiskCategories: SensitiveCategory[]
  ): PolicyEvaluationResult {
    // Under strict mode, any critical finding with confidence >= 0.70 is blocked
    const highConfCritical = criticalFindings.filter((f) => f.confidence >= 0.7);
    if (highConfCritical.length > 0) {
      const cats = highConfCritical.map((f) => f.category).join(', ');
      return {
        decision: 'BLOCK',
        reason: `Strict policy prohibits transmission of critical sensitive data: ${cats}`,
        highRiskCategories,
        redactionRequired: false,
      };
    }

    // Any uncertain finding in strict mode requires user confirmation
    const uncertainFindings = findings.filter(
      (f) => f.confidence >= 0.35 && f.confidence < 0.7
    );
    if (uncertainFindings.length > 0) {
      const cats = Array.from(new Set(uncertainFindings.map((f) => f.category))).join(', ');
      return {
        decision: 'ASK_USER',
        reason: `Strict policy requires user confirmation for uncertain sensitive findings: ${cats}`,
        highRiskCategories,
        redactionRequired: true,
        userPromptExplanation: `Potential sensitive content (${cats}) detected. Allow redacted transmission for task "${task}"?`,
      };
    }

    // High confidence non-critical or low confidence critical requires REDACT
    return {
      decision: 'REDACT',
      reason: 'Strict policy requires redaction of all detected sensitive categories',
      highRiskCategories,
      redactionRequired: true,
    };
  }

  private evaluateBalanced(
    task: string,
    findings: FusedFinding[],
    criticalFindings: FusedFinding[],
    highRiskCategories: SensitiveCategory[]
  ): PolicyEvaluationResult {
    // High-confidence credentials or secrets that cannot be safely processed are blocked or prompted
    const hardBlockCategories: SensitiveCategory[] = ['API_SECRET', 'CREDENTIAL'];
    const hardBlockFindings = criticalFindings.filter(
      (f) => hardBlockCategories.includes(f.category) && f.confidence >= 0.85
    );

    if (hardBlockFindings.length > 0) {
      const cats = hardBlockFindings.map((f) => f.category).join(', ');
      return {
        decision: 'BLOCK',
        reason: `High-risk sensitive data detected (${cats}) that cannot leave local trust boundary`,
        highRiskCategories,
        redactionRequired: false,
      };
    }

    // Critical financial or identity findings with high confidence require user confirmation
    const promptCategories: SensitiveCategory[] = [
      'FINANCIAL',
      'PAYMENT',
      'GOVERNMENT_DOCUMENT',
      'HEALTH',
    ];
    const needsPrompt = criticalFindings.some(
      (f) => promptCategories.includes(f.category) && f.confidence >= 0.75
    );

    if (needsPrompt) {
      const cats = highRiskCategories.join(', ');
      return {
        decision: 'ASK_USER',
        reason: `Balanced policy requires user confirmation before processing sensitive context (${cats})`,
        highRiskCategories,
        redactionRequired: true,
        userPromptExplanation: `The agent encountered ${cats}. Do you wish to redact and proceed with task "${task}"?`,
      };
    }

    // If ambiguous high-risk finding, ask user rather than failing open
    const ambiguousHighRisk = findings.some(
      (f) => (f.severity === 'critical' || f.severity === 'high') && f.confidence >= 0.4 && f.confidence < 0.65
    );

    if (ambiguousHighRisk) {
      const cats = highRiskCategories.join(', ');
      return {
        decision: 'ASK_USER',
        reason: `Ambiguous high-risk sensitive finding (${cats}). Asking user for confirmation.`,
        highRiskCategories,
        redactionRequired: true,
        userPromptExplanation: `Possible sensitive information (${cats}) was detected with uncertainty. Allow transfer?`,
      };
    }

    // Standard sensitive items (contact, address, low-severity credentials, etc.) are redacted
    return {
      decision: 'REDACT',
      reason: 'Sensitive data detected; masking/redacting before transmission',
      highRiskCategories,
      redactionRequired: true,
    };
  }

  private evaluatePermissive(
    task: string,
    findings: FusedFinding[],
    criticalFindings: FusedFinding[],
    highRiskCategories: SensitiveCategory[]
  ): PolicyEvaluationResult {
    // Even in permissive mode, critical credentials with very high confidence must be redacted or blocked
    const ultraCritical = criticalFindings.filter(
      (f) => (f.category === 'API_SECRET' || f.category === 'CREDENTIAL') && f.confidence >= 0.95
    );

    if (ultraCritical.length > 0) {
      return {
        decision: 'BLOCK',
        reason: 'Permissive policy: Raw API secret / credential transfer is strictly blocked',
        highRiskCategories,
        redactionRequired: false,
      };
    }

    // Redact any high or critical findings
    if (highRiskCategories.length > 0) {
      return {
        decision: 'REDACT',
        reason: 'Permissive policy: Redacting high-risk sensitive data',
        highRiskCategories,
        redactionRequired: true,
      };
    }

    return {
      decision: 'MINIMIZE',
      reason: 'Permissive policy: Minimizing context without heavy redaction',
      highRiskCategories: [],
      redactionRequired: false,
    };
  }
}
