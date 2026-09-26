# Privacy Policy for LOOKUP

## Introduction

**LOOKUP** is an open-source, privacy-preserving AI web browser agent. This document explains the privacy architecture and guarantees enforced on your data.

## Core Architectural Principle: Privacy by Construction

Unlike conventional browser agents that send raw, unfiltered screenshots and DOM snapshots directly to remote AI clouds:

> **Raw browser context must be processed locally first. Only task-relevant, sanitized context may cross the trust boundary to an external AI model.**

LOOKUP operates a multi-layer local privacy enforcement plane before any external AI invocation:

```text
Browser Context (DOM, Screenshot, OCR)
                 ↓
       Task Context Analyzer
                 ↓
      Adaptive Local Perception
                 ↓
       Multi-Signal Detector
  (DOM + Regex/Luhn + OCR + Vision)
                 ↓
          Evidence Fusion
                 ↓
       Privacy Policy Engine
                 ↓
      Redaction & Masking Engine
                 ↓
         User Consent Gate
                 ↓
      Fail-Closed Egress Gate
                 ↓
         Sanitized Context Only
                 ↓
         Remote AI Reasoning
                 ↓
        Local Action Validator
                 ↓
        Safe Browser Execution
```

## Open Source and Attribution

LOOKUP is licensed under the Apache License 2.0. The project builds upon open-source browser automation foundations while introducing the local privacy plane, adaptive perception, and fail-closed egress architecture.

## Local Processing & Privacy Guarantees

1. **Zero Raw Screenshot Egress**: Raw screenshots are never attached to remote AI payloads. Only task-required visual regions that have been inspected and redacted/masked are permitted.
2. **Deterministic Redaction**: Pattern detectors (with Luhn checksum validation for payment cards, SSN validation, API key patterns, emails, phone numbers, and addresses) redact sensitive text before serialization.
3. **Fail-Closed Egress Gate**: If safety or policy cannot be verified, or if the user denies consent, transmission is strictly blocked.
4. **Local Action Validation**: AI-generated actions are validated locally against protected regions, element existence, and dangerous protocols (`javascript:`, `file:`, etc.) before browser execution.
5. **No Secret Telemetry**: Operational metrics record only sanitized counts and categories—never raw context, full DOM dumps, credentials, or screenshots.

## API Keys & User Control

- API keys for LLM providers remain encrypted in your local browser storage.
- You can configure the privacy mode (Strict, Balanced, Custom) in Extension Settings.
- You can inspect real-time redaction and egress audit logs in the extension side panel.

---
*LOOKUP — Privacy-First AI Browser Agent*