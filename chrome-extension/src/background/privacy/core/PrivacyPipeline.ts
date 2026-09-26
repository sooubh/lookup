import type {
  RawBrowserContext,
  SanitizedContext,
  StrictnessMode,
  RedactionMethod,
  SensitiveCategory,
} from './PrivacyTypes';
import {
  PrivacyBlockedError,
  PrivacyConsentDeniedError,
} from './PrivacyErrors';
import { TaskContextAnalyzer } from '../context/TaskContextAnalyzer';
import { ContextMinimizer } from '../context/ContextMinimizer';
import { PerceptionRouter } from '../perception/PerceptionRouter';
import { SensitiveDetector } from '../detection/SensitiveDetector';
import { PrivacyPolicyEngine } from './PrivacyPolicyEngine';
import { ConsentManager } from '../consent/ConsentManager';
import { RedactionEngine } from '../redaction/RedactionEngine';
import { PrivacyEgressGate } from './PrivacyEgressGate';
import { PrivacyTelemetry } from '../telemetry/PrivacyTelemetry';
import { PrivacyAudit } from '../telemetry/PrivacyAudit';

export interface PrivacyPipelineOptions {
  strictness?: StrictnessMode;
  redactionMethod?: RedactionMethod;
  userAllowedCategories?: SensitiveCategory[];
}

/**
 * PrivacyPipeline
 * 
 * Central coordinator of the LOOKUP local privacy enforcement plane.
 * Coordinates task analysis, adaptive perception, multi-signal detection,
 * policy evaluation, consent resolution, redaction, fail-closed egress gating,
 * and privacy-safe telemetry.
 */
export class PrivacyPipeline {
  private contextAnalyzer: TaskContextAnalyzer;
  private minimizer: ContextMinimizer;
  private perceptionRouter: PerceptionRouter;
  private sensitiveDetector: SensitiveDetector;
  private policyEngine: PrivacyPolicyEngine;
  private consentManager: ConsentManager;
  private redactionEngine: RedactionEngine;
  private egressGate: PrivacyEgressGate;
  private telemetry: PrivacyTelemetry;
  private audit: PrivacyAudit;

  constructor(deps?: {
    contextAnalyzer?: TaskContextAnalyzer;
    minimizer?: ContextMinimizer;
    perceptionRouter?: PerceptionRouter;
    sensitiveDetector?: SensitiveDetector;
    policyEngine?: PrivacyPolicyEngine;
    consentManager?: ConsentManager;
    redactionEngine?: RedactionEngine;
    egressGate?: PrivacyEgressGate;
    telemetry?: PrivacyTelemetry;
    audit?: PrivacyAudit;
  }) {
    this.contextAnalyzer = deps?.contextAnalyzer || new TaskContextAnalyzer();
    this.minimizer = deps?.minimizer || new ContextMinimizer();
    this.perceptionRouter = deps?.perceptionRouter || new PerceptionRouter();
    this.sensitiveDetector = deps?.sensitiveDetector || new SensitiveDetector();
    this.policyEngine = deps?.policyEngine || new PrivacyPolicyEngine();
    this.consentManager = deps?.consentManager || new ConsentManager();
    this.redactionEngine = deps?.redactionEngine || new RedactionEngine();
    this.egressGate = deps?.egressGate || new PrivacyEgressGate();
    this.telemetry = deps?.telemetry || new PrivacyTelemetry();
    this.audit = deps?.audit || new PrivacyAudit();
  }

  // Accessors for configuring subsystems
  public getPolicyEngine(): PrivacyPolicyEngine {
    return this.policyEngine;
  }

  public getConsentManager(): ConsentManager {
    return this.consentManager;
  }

  public getPerceptionRouter(): PerceptionRouter {
    return this.perceptionRouter;
  }

  public getTelemetry(): PrivacyTelemetry {
    return this.telemetry;
  }

  public getAudit(): PrivacyAudit {
    return this.audit;
  }

  public getRedactionEngine(): RedactionEngine {
    return this.redactionEngine;
  }

  public getEgressGate(): PrivacyEgressGate {
    return this.egressGate;
  }

  public async process(
    rawContext: RawBrowserContext,
    options?: PrivacyPipelineOptions
  ): Promise<SanitizedContext> {
    const startTime = Date.now();
    const strictness: StrictnessMode = options?.strictness || 'balanced';
    const redactionMethod: RedactionMethod = options?.redactionMethod || 'token';

    // 1. Task Context Analysis: determine minimal sensory needs
    const contextNeed = this.contextAnalyzer.analyze(rawContext.task, {
      step: rawContext.step,
      pageUrl: rawContext.pageUrl,
      pageTitle: rawContext.pageTitle,
    });

    // 2. Context Minimization: trim unnecessary nodes, hidden tags, inactive tabs
    const minimizedContext = this.minimizer.minimize(rawContext, contextNeed);

    // 3. Adaptive Perception Routing: collect DOM, run OCR / Vision only if needed
    const perceptionBundle = await this.perceptionRouter.route(
      minimizedContext,
      contextNeed
    );

    // 4. Multi-Signal Sensitive Detection & Evidence Fusion
    const detectionResult = this.sensitiveDetector.detect(perceptionBundle);
    const { fusedFindings, rawEvidence } = detectionResult;

    // Check existing stored consent
    const storedAllowed = this.consentManager
      .getStore()
      .getAllowed(rawContext.task, rawContext.pageUrl);
    const combinedAllowed = Array.from(
      new Set([...(options?.userAllowedCategories || []), ...storedAllowed])
    );

    // 5. Privacy Policy Evaluation
    const policyResult = await this.policyEngine.evaluate({
      task: rawContext.task,
      findings: fusedFindings,
      contextNeed,
      strictness,
      userAllowedCategories: combinedAllowed,
      domain: rawContext.pageUrl,
    });

    let approvedStatus: 'approved' | 'user_approved' = 'approved';

    // 6. User Consent Resolution if required
    if (policyResult.decision === 'ASK_USER') {
      const consentDecision = await this.consentManager.requestConsent({
        id: `consent-${Date.now()}`,
        task: rawContext.task,
        domain: rawContext.pageUrl,
        detectedCategories: policyResult.highRiskCategories,
        explanation: policyResult.userPromptExplanation || policyResult.reason,
        timestamp: Date.now(),
      });

      if (consentDecision !== 'allow_once') {
        this.audit.record({
          id: `audit-${Date.now()}`,
          timestamp: Date.now(),
          task: rawContext.task,
          decision: 'BLOCK',
          reason: 'User denied consent for sensitive context transmission',
          detectedCategories: policyResult.highRiskCategories,
          redactionCount: 0,
          strictness,
          egressAuthorized: false,
        });

        this.telemetry.logEvent({
          eventId: `telem-${Date.now()}`,
          timestamp: Date.now(),
          decision: 'BLOCK',
          categoryCounts: this.countCategories(fusedFindings),
          signalsUsed: Array.from(new Set(rawEvidence.map((e) => e.source))),
          redactionCount: 0,
          egressBlocked: true,
          durationMs: Date.now() - startTime,
          strictness,
        });

        throw new PrivacyConsentDeniedError(rawContext.task);
      }

      approvedStatus = 'user_approved';
    }

    // 7. Policy BLOCK check
    if (policyResult.decision === 'BLOCK') {
      this.audit.record({
        id: `audit-${Date.now()}`,
        timestamp: Date.now(),
        task: rawContext.task,
        decision: 'BLOCK',
        reason: policyResult.reason,
        detectedCategories: policyResult.highRiskCategories,
        redactionCount: 0,
        strictness,
        egressAuthorized: false,
      });

      this.telemetry.logEvent({
        eventId: `telem-${Date.now()}`,
        timestamp: Date.now(),
        decision: 'BLOCK',
        categoryCounts: this.countCategories(fusedFindings),
        signalsUsed: Array.from(new Set(rawEvidence.map((e) => e.source))),
        redactionCount: 0,
        egressBlocked: true,
        durationMs: Date.now() - startTime,
        strictness,
      });

      throw new PrivacyBlockedError(
        policyResult.reason,
        policyResult.highRiskCategories
      );
    }

    // 8. Multi-modal Redaction & Masking
    const redactionResult = await this.redactionEngine.redactAll({
      domElements: perceptionBundle.domElements,
      pageMeta: { url: rawContext.pageUrl, title: rawContext.pageTitle },
      ocrFindings: perceptionBundle.ocrFindings,
      screenshotUrl: perceptionBundle.screenshotUrl,
      dimensions: rawContext.screenshotDimensions,
      findings: fusedFindings,
      method: redactionMethod,
    });

    // 9. Assemble Candidate Sanitized Context
    const egressToken = this.generateEgressToken();
    const candidateContext: SanitizedContext = {
      task: rawContext.task,
      page: {
        url: rawContext.pageUrl,
        title: rawContext.pageTitle,
      },
      dom: redactionResult.dom,
      image: redactionResult.image,
      ocr: redactionResult.ocr,
      allowedRegions: redactionResult.allowedRegions,
      redactions: redactionResult.redactions,
      privacy: {
        status: approvedStatus,
        policyVersion: '1.0.0',
        strictness,
        timestamp: Date.now(),
        egressToken,
      },
    };

    // 10. Fail-Closed Egress Gate Authorization
    const egressDecision = await this.egressGate.authorize(candidateContext);
    const authorizedContext = egressDecision.sanitizedContext!;

    // 11. Privacy-Safe Telemetry & Audit Logging
    const detectedCategoryCounts = this.countCategories(fusedFindings);
    this.audit.record({
      id: `audit-${Date.now()}`,
      timestamp: Date.now(),
      task: rawContext.task,
      decision: policyResult.decision,
      reason: policyResult.reason,
      detectedCategories: Array.from(new Set(fusedFindings.map((f) => f.category))),
      redactionCount: redactionResult.redactions.length,
      strictness,
      egressAuthorized: true,
    });

    this.telemetry.logEvent({
      eventId: `telem-${Date.now()}`,
      timestamp: Date.now(),
      decision: policyResult.decision,
      categoryCounts: detectedCategoryCounts,
      signalsUsed: Array.from(new Set(rawEvidence.map((e) => e.source))),
      redactionCount: redactionResult.redactions.length,
      egressBlocked: false,
      durationMs: Date.now() - startTime,
      strictness,
    });

    return authorizedContext;
  }

  private countCategories(
    findings: { category: SensitiveCategory }[]
  ): Partial<Record<SensitiveCategory, number>> {
    const counts: Partial<Record<SensitiveCategory, number>> = {};
    for (const f of findings) {
      counts[f.category] = (counts[f.category] || 0) + 1;
    }
    return counts;
  }

  private generateEgressToken(): string {
    const randomBytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < randomBytes.length; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
