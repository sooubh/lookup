import { describe, it, expect, beforeEach } from 'vitest';
import type {
  RawBrowserContext,
  SanitizedContext,
  Evidence,
  ContextNeed,
  PrivacyTelemetryEvent,
} from '../index';
import {
  PatternDetector,
  luhnCheck,
  DomDetector,
  EvidenceFusion,
  SensitiveDetector,
  PrivacyPolicyEngine,
  TextRedactor,
  RegionMasker,
  ImageRedactor,
  RedactionEngine,
  PrivacyEgressGate,
  PrivacyTelemetry,
  PrivacyAudit,
  PrivacyPipeline,
  PrivacyBlockedError,
  PrivacyConsentDeniedError,
  PrivacyEgressError,
  PrivacyError,
} from '../index';

describe('Privacy Subsystem - PatternDetector', () => {
  let detector: PatternDetector;

  beforeEach(() => {
    detector = new PatternDetector();
  });

  it('detects SSN correctly with high confidence', () => {
    const text = 'Customer SSN is 123-45-6789 and valid';
    const matches = detector.detect(text);
    const ssnMatch = matches.find((m) => m.category === 'GOVERNMENT_DOCUMENT');
    expect(ssnMatch).toBeDefined();
    expect(ssnMatch?.matchedText).toBe('123-45-6789');
    expect(ssnMatch?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('detects credit card numbers and verifies Luhn algorithm', () => {
    // Valid Visa test number
    const validCard = '4532 0151 1283 0366';
    expect(luhnCheck(validCard)).toBe(true);

    const matches = detector.detect(`Payment with card: ${validCard}`);
    const cardMatch = matches.find((m) => m.category === 'PAYMENT');
    expect(cardMatch).toBeDefined();
    expect(cardMatch?.confidence).toBeGreaterThanOrEqual(0.85);

    // Invalid card number failing Luhn
    const invalidCard = '4532 0151 1283 0367';
    expect(luhnCheck(invalidCard)).toBe(false);
  });

  it('detects email addresses', () => {
    const text = 'Reach me at privacy.officer@lookup-nano.org today';
    const matches = detector.detect(text);
    const emailMatch = matches.find((m) => m.category === 'CONTACT');
    expect(emailMatch).toBeDefined();
    expect(emailMatch?.matchedText).toBe('privacy.officer@lookup-nano.org');
    expect(emailMatch?.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('detects phone numbers across formats', () => {
    const text = 'Call support at (555) 123-4567 or +1-800-555-0199';
    const matches = detector.detect(text);
    const phoneMatches = matches.filter((m) => m.category === 'CONTACT' && m.patternName === 'Phone Number');
    expect(phoneMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('detects API keys, OpenAI secrets, and AWS credentials', () => {
    const openaiKey = 'sk-proj-1234567890abcdefghijklmnopqrstuvwxyz';
    const awsKey = 'AKIAIOSFODNN7EXAMPLE';
    const text = `Keys: ${openaiKey} and AWS: ${awsKey} and generic api_key="secret-token-abcdef12345678"`;

    const matches = detector.detect(text);
    const apiMatches = matches.filter((m) => m.category === 'API_SECRET');
    expect(apiMatches.length).toBeGreaterThanOrEqual(2);
    expect(apiMatches.some((m) => m.matchedText === openaiKey)).toBe(true);
    expect(apiMatches.some((m) => m.matchedText === awsKey)).toBe(true);
  });

  it('detects passwords in textual assignment', () => {
    const text = 'User config: password = "SuperSecretPassword123!"';
    const matches = detector.detect(text);
    const pwMatch = matches.find((m) => m.category === 'AUTHENTICATION');
    expect(pwMatch).toBeDefined();
  });

  it('detects JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const matches = detector.detect(`Bearer ${jwt}`);
    const jwtMatch = matches.find((m) => m.patternName === 'JWT Token');
    expect(jwtMatch).toBeDefined();
    expect(jwtMatch?.category).toBe('AUTHENTICATION');
  });
});

describe('Privacy Subsystem - DomDetector & EvidenceFusion', () => {
  it('detects password input fields, payment autocomplete, and semantic attributes', () => {
    const domDetector = new DomDetector();
    const evidence = domDetector.detect([
      {
        selector: '#pass-input',
        tag: 'input',
        attributes: { type: 'password', name: 'user_password' },
        isInteractive: true,
      },
      {
        selector: '#card-number',
        tag: 'input',
        attributes: { autocomplete: 'cc-number', placeholder: 'Card Number' },
        isInteractive: true,
      },
    ]);

    const authEv = evidence.find((e) => e.category === 'AUTHENTICATION');
    const paymentEv = evidence.find((e) => e.category === 'PAYMENT');
    expect(authEv).toBeDefined();
    expect(authEv?.confidence).toBe(1.0);
    expect(paymentEv).toBeDefined();
    expect(paymentEv?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('fuses multiple signals and boosts confidence through cross-signal confirmation', () => {
    const fusion = new EvidenceFusion();

    const domSignal: Evidence = {
      id: 'dom-1',
      source: 'dom',
      category: 'AUTHENTICATION',
      confidence: 0.85,
      selector: '#login-pass',
      bbox: { x: 100, y: 100, width: 200, height: 40 },
    };

    const patternSignal: Evidence = {
      id: 'pat-1',
      source: 'pattern',
      category: 'AUTHENTICATION',
      confidence: 0.8,
      text: 'password123',
      selector: '#login-pass',
    };

    const ocrSignal: Evidence = {
      id: 'ocr-1',
      source: 'ocr',
      category: 'AUTHENTICATION',
      confidence: 0.75,
      text: 'password123',
      bbox: { x: 105, y: 105, width: 190, height: 35 },
    };

    const fused = fusion.fuse([domSignal, patternSignal, ocrSignal]);
    expect(fused.length).toBe(1);
    const item = fused[0];
    expect(item.category).toBe('AUTHENTICATION');
    expect(item.sources).toContain('dom');
    expect(item.sources).toContain('pattern');
    expect(item.sources).toContain('ocr');
    // Multi-signal confirmation boosts confidence to very high
    expect(item.confidence).toBeGreaterThanOrEqual(0.95);
    expect(item.severity).toBe('critical');
  });

  it('coordinates multi-channel detection via SensitiveDetector', () => {
    const sensitiveDetector = new SensitiveDetector();
    const result = sensitiveDetector.detect({
      domElements: [
        {
          selector: '#pw',
          tag: 'input',
          attributes: { type: 'password' },
          isInteractive: true,
        },
      ],
      ocrFindings: [],
      visionFindings: [],
    });
    expect(result.fusedFindings.length).toBe(1);
    expect(result.maxSeverity).toBe('critical');
  });
});

describe('Privacy Subsystem - PrivacyPolicyEngine', () => {
  let policy: PrivacyPolicyEngine;
  const mockNeed: ContextNeed = {
    needsDom: true,
    needsScreenshot: false,
    needsOcr: false,
    needsVision: false,
    requiredFields: [],
    reason: 'test',
  };

  beforeEach(() => {
    policy = new PrivacyPolicyEngine();
  });

  it('returns ALLOW when no sensitive data is detected', async () => {
    const result = await policy.evaluate({
      task: 'Compare prices of shoes',
      findings: [],
      contextNeed: mockNeed,
      strictness: 'balanced',
    });
    expect(result.decision).toBe('ALLOW');
    expect(result.redactionRequired).toBe(false);
  });

  it('returns REDACT in balanced mode for general sensitive findings', async () => {
    const result = await policy.evaluate({
      task: 'Check profile details',
      findings: [
        {
          id: 'f-1',
          category: 'CONTACT',
          confidence: 0.9,
          severity: 'medium',
          sources: ['pattern'],
          evidenceList: [],
        },
      ],
      contextNeed: mockNeed,
      strictness: 'balanced',
    });
    expect(result.decision).toBe('REDACT');
    expect(result.redactionRequired).toBe(true);
  });

  it('returns ASK_USER on uncertain high-risk findings or critical categories requiring consent', async () => {
    const result = await policy.evaluate({
      task: 'Review checkout total',
      findings: [
        {
          id: 'f-fin',
          category: 'FINANCIAL',
          confidence: 0.8,
          severity: 'critical',
          sources: ['ocr'],
          evidenceList: [],
        },
      ],
      contextNeed: mockNeed,
      strictness: 'balanced',
    });
    expect(result.decision).toBe('ASK_USER');
    expect(result.highRiskCategories).toContain('FINANCIAL');
  });

  it('blocks high-risk API secrets and hard credentials under balanced and strict modes', async () => {
    const result = await policy.evaluate({
      task: 'Run debug logs',
      findings: [
        {
          id: 'f-secret',
          category: 'API_SECRET',
          confidence: 0.99,
          severity: 'critical',
          sources: ['pattern'],
          evidenceList: [],
        },
      ],
      contextNeed: mockNeed,
      strictness: 'balanced',
    });
    expect(result.decision).toBe('BLOCK');
  });

  it('enforces strict mode: asks user on uncertain findings (0.35 - 0.70 confidence)', async () => {
    const result = await policy.evaluate({
      task: 'Inspect page',
      findings: [
        {
          id: 'f-unc',
          category: 'CONTACT',
          confidence: 0.5,
          severity: 'medium',
          sources: ['pattern'],
          evidenceList: [],
        },
      ],
      contextNeed: mockNeed,
      strictness: 'strict',
    });
    expect(result.decision).toBe('ASK_USER');
  });

  it('supports custom policy rule overrides', async () => {
    policy.addRule({
      name: 'Custom Face Blocking',
      category: 'FACE',
      decision: 'BLOCK',
      reason: 'Biometric faces are strictly forbidden by company policy',
    });

    const result = await policy.evaluate({
      task: 'Scan team directory',
      findings: [
        {
          id: 'f-face',
          category: 'FACE',
          confidence: 0.6,
          severity: 'medium',
          sources: ['vision'],
          evidenceList: [],
        },
      ],
      contextNeed: mockNeed,
      strictness: 'balanced',
    });
    expect(result.decision).toBe('BLOCK');
    expect(result.reason).toContain('Custom rule matched');
  });
});

describe('Privacy Subsystem - RedactionEngine & TextRedactor', () => {
  it('masks text and generates token replacements with zero raw leakage', () => {
    const redactor = new TextRedactor();
    const raw = 'Please contact alice@corp.com or bob@corp.com with phone 555-123-4567';

    const { redactedText, records } = redactor.redact(raw, undefined, 'token');
    expect(records.length).toBeGreaterThanOrEqual(2);
    expect(redactedText).not.toContain('alice@corp.com');
    expect(redactedText).not.toContain('bob@corp.com');
    expect(redactedText).not.toContain('555-123-4567');
    expect(redactedText).toContain('[CONTACT_1]');
    expect(redactedText).toContain('[CONTACT_2]');
  });

  it('preserves token consistency for repeated occurrences of the same sensitive string', () => {
    const redactor = new TextRedactor();
    const raw = 'Sent to user@test.com and forwarded to user@test.com';

    const { redactedText } = redactor.redact(raw, undefined, 'token');
    expect(redactedText).not.toContain('user@test.com');
    const matches = redactedText.match(/\[CONTACT_1\]/g);
    expect(matches?.length).toBe(2);
  });

  it('redacts DOM elements and password attributes completely', async () => {
    const engine = new RedactionEngine();
    const result = await engine.redactAll({
      domElements: [
        {
          selector: '#login-input',
          tag: 'input',
          attributes: { type: 'password', value: 'secretPass123' },
          isInteractive: true,
        },
        {
          selector: '#email-label',
          tag: 'span',
          text: 'Email: support@lookup.internal',
          attributes: {},
          isInteractive: false,
        },
      ],
      findings: [],
    });

    const dom = result.dom!;
    expect(dom.elements[0].attributes?.value).toBe('[PASSWORD_REDACTED]');
    expect(dom.elements[1].text).not.toContain('support@lookup.internal');
    expect(dom.elements[1].text).toContain('[CONTACT_1]');
  });

  it('computes non-overlapping mask regions using RegionMasker', () => {
    const masker = new RegionMasker(4);
    const regions = masker.computeMaskRegions([
      {
        id: '1',
        category: 'PAYMENT',
        confidence: 0.9,
        severity: 'critical',
        sources: ['dom'],
        bbox: { x: 10, y: 10, width: 50, height: 20 },
        evidenceList: [],
      },
    ]);
    expect(regions.length).toBe(1);
    expect(regions[0].x).toBe(6);
    expect(regions[0].width).toBe(58);
  });

  it('redacts image regions using ImageRedactor', async () => {
    const redactor = new ImageRedactor();
    const res = await redactor.redact('data:image/png;base64,mock', { width: 100, height: 100 }, [
      { x: 10, y: 10, width: 20, height: 20 },
    ]);
    expect(res.redactedRegions.length).toBe(1);
  });
});

describe('Privacy Subsystem - Fail-Closed PrivacyEgressGate', () => {
  let gate: PrivacyEgressGate;

  beforeEach(() => {
    gate = new PrivacyEgressGate();
  });

  it('rejects unapproved or tampered contexts', async () => {
    const badContext = {
      task: 'Scrape page',
      page: {},
      privacy: { status: 'unapproved', egressToken: 'token12345678' },
    };

    await expect(gate.authorize(badContext)).rejects.toThrow(PrivacyBlockedError);
  });

  it('rejects contexts missing valid egressToken', async () => {
    const badContext = {
      task: 'Scrape page',
      page: {},
      privacy: { status: 'approved', egressToken: '' },
    };

    await expect(gate.authorize(badContext)).rejects.toThrow(PrivacyBlockedError);
  });

  it('blocks outbound context if raw sensitive leak (e.g. SSN or API key) is detected', async () => {
    const leakedContext = {
      task: 'Scrape page',
      page: { url: 'https://example.com' },
      dom: {
        elements: [
          {
            tag: 'div',
            text: 'Here is leaked SSN: 123-45-6789 in plain text',
          },
        ],
      },
      redactions: [],
      privacy: {
        status: 'approved',
        policyVersion: '1.0.0',
        strictness: 'balanced',
        timestamp: Date.now(),
        egressToken: 'safe-valid-token-12345678',
      },
    };

    await expect(gate.authorize(leakedContext)).rejects.toThrow(PrivacyEgressError);
  });

  it('authorizes clean, sanitized context', async () => {
    const cleanContext: SanitizedContext = {
      task: 'Find shopping cart button',
      page: { url: 'https://store.example.com', title: 'Store' },
      dom: {
        elements: [
          {
            selector: '#cart-btn',
            tag: 'button',
            text: 'Cart (0)',
            isInteractive: true,
          },
        ],
      },
      redactions: [],
      privacy: {
        status: 'approved',
        policyVersion: '1.0.0',
        strictness: 'balanced',
        timestamp: Date.now(),
        egressToken: 'token-validated-87654321',
      },
    };

    const decision = await gate.authorize(cleanContext);
    expect(decision.authorized).toBe(true);
    expect(decision.sanitizedContext).toBeDefined();
  });
});

describe('Privacy Subsystem - PrivacyTelemetry', () => {
  let telemetry: PrivacyTelemetry;

  beforeEach(() => {
    telemetry = new PrivacyTelemetry();
  });

  it('allows privacy-safe metrics event without raw data', () => {
    telemetry.logEvent({
      eventId: 'evt-1',
      timestamp: Date.now(),
      decision: 'REDACT',
      categoryCounts: { CONTACT: 2, PAYMENT: 1 },
      signalsUsed: ['dom', 'pattern'],
      redactionCount: 3,
      egressBlocked: false,
      durationMs: 42,
      strictness: 'balanced',
    });

    const history = telemetry.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].decision).toBe('REDACT');
    expect(history[0].redactionCount).toBe(3);
  });

  it('strictly throws and prevents telemetry serialization of raw context or credentials', () => {
    // Attempting to log raw password or DOM context
    const unsafeEvent = {
      eventId: 'evt-leak',
      timestamp: Date.now(),
      decision: 'ALLOW',
      categoryCounts: {},
      signalsUsed: [],
      redactionCount: 0,
      egressBlocked: false,
      durationMs: 10,
      strictness: 'strict',
      password: 'superSecretPassword', // disallowed key!
    };

    expect(() =>
      telemetry.logEvent(unsafeEvent as unknown as PrivacyTelemetryEvent)
    ).toThrow(PrivacyError);
  });

  it('rejects telemetry containing sensitive regex patterns in values', () => {
    const patternLeakedEvent = {
      eventId: 'evt-leak-2',
      timestamp: Date.now(),
      decision: 'ALLOW',
      categoryCounts: {},
      signalsUsed: [],
      redactionCount: 0,
      egressBlocked: false,
      durationMs: 10,
      strictness: 'strict',
      note: 'Found key sk-proj-1234567890abcdefghijklmnopqrstuvwxyz here',
    };

    expect(() =>
      telemetry.logEvent(patternLeakedEvent as unknown as PrivacyTelemetryEvent)
    ).toThrow(PrivacyError);
  });

  it('records and retrieves events from PrivacyAudit circular buffer', () => {
    const audit = new PrivacyAudit(10);
    audit.record({
      id: 'aud-1',
      timestamp: Date.now(),
      task: 'Test task',
      decision: 'ALLOW',
      reason: 'Safe',
      detectedCategories: [],
      redactionCount: 0,
      strictness: 'balanced',
      egressAuthorized: true,
    });
    const records = audit.getRecords();
    expect(records.length).toBe(1);
    expect(records[0].task).toBe('Test task');
  });
});

describe('Privacy Subsystem - Full PrivacyPipeline Integration', () => {
  let pipeline: PrivacyPipeline;

  beforeEach(() => {
    pipeline = new PrivacyPipeline();
  });

  it('processes raw context, applies detection + redaction, and passes through egress gate', async () => {
    const rawContext: RawBrowserContext = {
      task: 'Fill contact form and proceed',
      pageUrl: 'https://services.lookup.org/form',
      pageTitle: 'Contact Us',
      dom: [
        {
          tag: 'form',
          children: [
            {
              tag: 'input',
              attributes: { type: 'text', name: 'email', value: 'john.doe@corporate.org' },
            },
            {
              tag: 'input',
              attributes: { type: 'tel', name: 'phone', value: '555-432-1098' },
            },
            {
              tag: 'button',
              text: 'Submit Form',
              attributes: { type: 'submit' },
            },
          ],
        },
      ],
    };

    const sanitized = await pipeline.process(rawContext, {
      strictness: 'balanced',
      redactionMethod: 'token',
    });

    expect(sanitized).toBeDefined();
    expect(sanitized.privacy.status).toBe('approved');
    expect(sanitized.redactions.length).toBeGreaterThan(0);

    // Verify raw values were completely eliminated
    const serialized = JSON.stringify(sanitized);
    expect(serialized).not.toContain('john.doe@corporate.org');
    expect(serialized).not.toContain('555-432-1098');
    expect(serialized).toContain('[CONTACT_');
  });

  it('fails closed and throws PrivacyBlockedError when critical API secret is present', async () => {
    const secretContext: RawBrowserContext = {
      task: 'Inspect config page',
      pageUrl: 'https://dev.lookup.org/env',
      dom: [
        {
          tag: 'div',
          text: 'Active API key: sk-proj-1234567890abcdefghijklmnopqrstuvwxyz',
        },
      ],
    };

    await expect(pipeline.process(secretContext, { strictness: 'balanced' })).rejects.toThrow(
      PrivacyBlockedError
    );
  });

  it('fails closed and throws PrivacyConsentDeniedError when user denies consent prompt', async () => {
    // Register prompt handler that denies consent
    pipeline.getConsentManager().setPromptHandler(async () => 'deny');

    const paymentContext: RawBrowserContext = {
      task: 'Submit invoice payment',
      pageUrl: 'https://pay.lookup.org/checkout',
      dom: [
        {
          tag: 'div',
          text: 'Invoice Total: $4,500.00 Wire balance due immediately',
        },
        {
          tag: 'input',
          attributes: { autocomplete: 'cc-number', value: '4532 0151 1283 0366' },
        },
      ],
    };

    await expect(pipeline.process(paymentContext, { strictness: 'balanced' })).rejects.toThrow(
      PrivacyConsentDeniedError
    );
  });

  it('allows processing with user_approved status when user explicitly allows consent prompt', async () => {
    // Register prompt handler that allows once
    pipeline.getConsentManager().setPromptHandler(async () => 'allow_once');

    const paymentContext: RawBrowserContext = {
      task: 'Submit invoice payment',
      pageUrl: 'https://pay.lookup.org/checkout',
      dom: [
        {
          tag: 'div',
          text: 'Invoice Total: $4,500.00 Wire balance due immediately',
        },
        {
          tag: 'input',
          attributes: { autocomplete: 'cc-number', value: '4532 0151 1283 0366' },
        },
      ],
    };

    const sanitized = await pipeline.process(paymentContext, { strictness: 'balanced' });
    expect(sanitized.privacy.status).toBe('user_approved');
    expect(JSON.stringify(sanitized)).not.toContain('4532 0151 1283 0366');
  });
});
