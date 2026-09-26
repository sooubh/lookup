/**
 * Core type definitions for the LOOKUP Privacy Subsystem.
 * 
 * Defines categories, decisions, contracts, and evidence structures
 * used across perception, detection, policy, redaction, and egress gating.
 */

export type SensitiveCategory =
  | 'PERSONAL_IDENTITY'
  | 'CONTACT'
  | 'ADDRESS'
  | 'AUTHENTICATION'
  | 'CREDENTIAL'
  | 'API_SECRET'
  | 'FINANCIAL'
  | 'PAYMENT'
  | 'HEALTH'
  | 'GOVERNMENT_DOCUMENT'
  | 'PRIVATE_DOCUMENT'
  | 'FACE'
  | 'LOCATION'
  | 'PRIVATE_MESSAGE'
  | 'BUSINESS_CONFIDENTIAL'
  | 'OTHER_SENSITIVE';

export type PrivacyDecision =
  | 'ALLOW'
  | 'MINIMIZE'
  | 'REDACT'
  | 'ASK_USER'
  | 'BLOCK';

export type StrictnessMode = 'strict' | 'balanced' | 'permissive' | 'custom';

export type DetectionSource = 'dom' | 'pattern' | 'ocr' | 'vision';

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Evidence {
  id: string;
  source: DetectionSource;
  category: SensitiveCategory;
  confidence: number;
  text?: string;
  bbox?: BoundingBox;
  selector?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

export interface FusedFinding {
  id: string;
  category: SensitiveCategory;
  confidence: number;
  severity: FindingSeverity;
  sources: DetectionSource[];
  text?: string;
  bbox?: BoundingBox;
  selector?: string;
  evidenceList: Evidence[];
}

export interface ContextNeed {
  needsDom: boolean;
  needsScreenshot: boolean;
  screenshotRegions?: BoundingBox[];
  needsOcr: boolean;
  needsVision: boolean;
  requiredFields: string[];
  reason: string;
}

export type RedactionMethod =
  | 'mask'
  | 'token'
  | 'blur'
  | 'remove'
  | 'region_exclusion';

export interface RedactionRecord {
  id: string;
  category: SensitiveCategory;
  method: RedactionMethod;
  originalRange?: { start: number; end: number };
  bbox?: BoundingBox;
  selector?: string;
  replacementToken: string;
  reason: string;
}

export interface SanitizedDomElement {
  selector?: string;
  tag: string;
  text?: string;
  attributes?: Record<string, string>;
  bbox?: BoundingBox;
  isInteractive?: boolean;
  isRedacted?: boolean;
}

export interface SanitizedDom {
  title?: string;
  url?: string;
  elements: SanitizedDomElement[];
  summary?: string;
}

export interface SanitizedImage {
  dataUrl?: string;
  width: number;
  height: number;
  redactedRegions: BoundingBox[];
  mimeType?: string;
}

export interface SanitizedOcr {
  text: string;
  bbox: BoundingBox;
  confidence: number;
  isRedacted?: boolean;
}

export interface SanitizedContext {
  task: string;
  page: {
    url?: string;
    title?: string;
  };
  dom?: SanitizedDom;
  image?: SanitizedImage;
  ocr?: SanitizedOcr[];
  allowedRegions?: BoundingBox[];
  redactions: RedactionRecord[];
  privacy: {
    status: 'approved' | 'user_approved';
    policyVersion: string;
    strictness: StrictnessMode;
    timestamp: number;
    egressToken: string;
  };
}

export interface RawDomElement {
  tag: string;
  selector?: string;
  text?: string;
  attributes?: Record<string, string>;
  bbox?: BoundingBox;
  isVisible?: boolean;
  children?: RawDomElement[];
}

export interface RawBrowserContext {
  task: string;
  step?: number;
  pageUrl?: string;
  pageTitle?: string;
  dom?: RawDomElement[];
  screenshot?: string;
  screenshotDimensions?: { width: number; height: number };
  tabs?: Array<{ id: number; url: string; title: string; active: boolean }>;
  metadata?: Record<string, unknown>;
}

export interface PolicyInput {
  task: string;
  findings: FusedFinding[];
  contextNeed: ContextNeed;
  strictness: StrictnessMode;
  userAllowedCategories?: SensitiveCategory[];
  domain?: string;
}

export interface PolicyEvaluationResult {
  decision: PrivacyDecision;
  reason: string;
  highRiskCategories: SensitiveCategory[];
  redactionRequired: boolean;
  userPromptExplanation?: string;
}

export type UserConsentDecision = 'allow_once' | 'deny' | 'cancel_task';

export interface ConsentRequest {
  id: string;
  task: string;
  domain?: string;
  detectedCategories: SensitiveCategory[];
  explanation: string;
  timestamp: number;
}

export interface EgressDecision {
  authorized: boolean;
  sanitizedContext?: SanitizedContext;
  reason?: string;
  egressTimestamp: number;
}
