/**
 * LOOKUP Privacy Subsystem
 *
 * Local privacy enforcement plane ensuring raw browser context never crosses
 * to the remote AI tier without evaluation, redaction, and egress gate authorization.
 */

// Core
export * from './core/PrivacyTypes';
export * from './core/PrivacyErrors';
export * from './core/PrivacyPolicyEngine';
export * from './core/PrivacyEgressGate';
export * from './core/PrivacyPipeline';

// Context
export * from './context/TaskContextAnalyzer';
export * from './context/ContextMinimizer';
export * from './context/DomContextCollector';
export * from './context/DomExtractor';
export * from './context/ScreenshotCollector';
export * from './context/RegionSelector';

// Perception
export * from './perception/WebGpuRuntime';
export * from './perception/WasmFallback';
export * from './perception/OcrEngine';
export * from './perception/LocalVisionEngine';
export * from './perception/LocalSemanticEngine';
export * from './perception/PerceptionRouter';

// Detection
export * from './detection/PatternDetector';
export * from './detection/DomDetector';
export * from './detection/OcrDetector';
export * from './detection/VisionDetector';
export * from './detection/SemanticDetector';
export * from './detection/EvidenceFusion';
export * from './detection/SensitiveDetector';

// Redaction
export * from './redaction/TextRedactor';
export * from './redaction/ImageRedactor';
export * from './redaction/RegionMasker';
export * from './redaction/RedactionEngine';

// Consent
export * from './consent/ConsentStore';
export * from './consent/ConsentManager';

// Telemetry
export * from './telemetry/PrivacyTelemetry';
export * from './telemetry/PrivacyAudit';
