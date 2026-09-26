# LOOKUP — Technical Architecture and Privacy Layer Design

## 1. Architectural Objective

Add a privacy enforcement plane to an existing browser-agent system without replacing the underlying agent loop.

The privacy layer owns one non-negotiable responsibility:

> No browser context intended for external AI processing should cross the privacy egress gate unless it has been locally evaluated and approved.

## 2. Main Components

### 2.1 Task Context Analyzer

Input:

- User task.
- Current agent step.
- Current page metadata.
- Previously established task state.

Output:

```ts
interface ContextNeed {
  needsDom: boolean;
  needsScreenshot: boolean;
  screenshotRegions?: Region[];
  needsOcr: boolean;
  needsVision: boolean;
  requiredFields: string[];
  reason: string;
}
```

Purpose:

Do not capture everything by default. Estimate which representation is necessary for the current step.

Example:

- "Click the Login button" → DOM may be enough.
- "Read the error shown in an image" → screenshot + OCR may be needed.
- "Identify which product image matches this instruction" → local vision may be needed.

## 3. Adaptive Context Capture

### DOM channel

Collect only structured elements relevant to the task:

- text nodes.
- links.
- buttons.
- inputs.
- labels.
- ARIA information.
- element bounds.
- attributes needed by the agent.

Before exporting DOM context, run it through privacy filtering as well. DOM is not automatically safe just because it is not an image.

### Screenshot channel

Capture either:

- visible viewport, or
- selected regions.

Preferred order:

```text
full screenshot
      ↓
region selection
      ↓
region-level analysis
```

The privacy layer should prefer region capture whenever the task can be solved from a smaller visual area.

### OCR channel

OCR is useful for text embedded inside images or canvas content where DOM extraction cannot see the text.

Pipeline:

```text
image region
   ↓
OCR
   ↓
recognized text + bounding boxes
   ↓
sensitive-data detection
   ↓
redaction map
```

### Local vision channel

Use a small browser-compatible model only where visual reasoning is needed.

Target execution strategy:

```text
WebGPU
  ↓ unavailable / unsupported
WASM or CPU fallback
```

The model should operate locally and should not be used as the only sensitive-data detector.

## 4. Multi-Signal Sensitive Detection

The detector should combine several signals rather than trusting one detector.

### Signal A — Structured DOM evidence

Examples:

- `<input type=password>`.
- `autocomplete` values.
- Payment/account field names.
- Label text.
- Hidden or metadata fields.
- Form semantics.

### Signal B — Text and pattern evidence

Examples of categories:

- Email addresses.
- Phone numbers.
- Account identifiers.
- Payment-card-like sequences.
- Password/secret fields.
- API keys/tokens.
- URLs containing secrets.
- Access tokens.
- Personal addresses.
- Government/document identifiers.

Rules should output a category and confidence, not directly perform policy decisions.

### Signal C — OCR evidence

Used for text rendered as pixels.

Output example:

```ts
interface OcrFinding {
  text: string;
  bbox: BoundingBox;
  category?: SensitiveCategory;
  confidence: number;
}
```

### Signal D — Local visual evidence

The small local vision model detects categories that pattern matching cannot understand well, such as:

- Identity-document regions.
- Faces.
- Visual account/payment screens.
- Sensitive document layouts.
- Screens containing sensitive visual material without machine-readable text.

The vision detector should output regions and confidence rather than raw natural-language explanations.

## 5. Sensitive Category Model

Use a broad category system rather than a fixed short list.

```ts
type SensitiveCategory =
  | "PERSONAL_IDENTITY"
  | "CONTACT"
  | "ADDRESS"
  | "AUTHENTICATION"
  | "CREDENTIAL"
  | "API_SECRET"
  | "FINANCIAL"
  | "PAYMENT"
  | "HEALTH"
  | "GOVERNMENT_DOCUMENT"
  | "PRIVATE_DOCUMENT"
  | "FACE"
  | "LOCATION"
  | "PRIVATE_MESSAGE"
  | "BUSINESS_CONFIDENTIAL"
  | "OTHER_SENSITIVE";
```

The exact taxonomy should remain configurable.

## 6. Evidence Fusion

Do not immediately mask a region because one signal fired. Combine evidence.

Example decision model:

```text
DOM says password field       + high confidence
OCR sees password text        + high confidence
Vision sees login form        + medium confidence
-----------------------------------------------
Combined risk = very high
Action = mask + block/ask depending on policy
```

Conflict example:

```text
Vision says possible face      + low confidence
DOM provides unrelated image  + strong task relevance
-----------------------------------------------
Action = ask or keep local
```

The key point is that **detection and policy are separate**.

## 7. Redaction Model

Redaction should support several transformations:

### Mask

Replace the sensitive visual region with a neutral block.

Example:

```text
john@example.com
↓
[EMAIL REDACTED]
```

### Token replacement

Useful when the agent needs to distinguish different entities without knowing their actual values.

Example:

```text
john@example.com → [EMAIL_1]
9876543210       → [PHONE_1]
```

### Blur

Use when the visual structure matters but exact content does not.

### Remove

Delete the sensitive item from the outgoing structured context.

### Region exclusion

Do not capture a region in the first place when it is known to be unnecessary.

## 8. Sanitized Context Contract

The remote model should receive a dedicated schema, not an arbitrary browser object.

Example:

```ts
interface SanitizedContext {
  task: string;
  page: {
    url?: string;
    title?: string;
  };
  dom?: SanitizedDom;
  image?: SanitizedImage;
  ocr?: SanitizedOcr[];
  allowedRegions?: Region[];
  redactions: RedactionRecord[];
  privacy: {
    status: "approved" | "user_approved";
    policyVersion: string;
  };
}
```

Important rule:

> Do not place the original raw screenshot, original OCR text, or original sensitive DOM snapshot alongside the sanitized object and accidentally serialize it to the network.

## 9. Privacy Policy Engine

The policy engine decides what to do after detection.

```ts
type PrivacyDecision =
  | "ALLOW"
  | "MINIMIZE"
  | "REDACT"
  | "ASK_USER"
  | "BLOCK";
```

Policy inputs:

- Task requirement.
- Sensitive categories.
- Detection confidence.
- Region relevance.
- Severity.
- Whether the remote model truly needs the data.
- User privacy settings.
- Current workflow state.

## 10. Fail-Closed Egress Gate

The egress gate is the final local checkpoint.

Pseudo-flow:

```ts
const decision = await privacyPipeline.evaluate(context);

switch (decision.type) {
  case "ALLOW":
    return send(decision.sanitizedContext);
  case "MINIMIZE":
  case "REDACT":
    return send(decision.sanitizedContext);
  case "ASK_USER":
    return requestUserDecision(decision.explanation);
  case "BLOCK":
    throw new PrivacyBlockedError(decision.reason);
}
```

There should be no alternate network path that bypasses this gate.

## 11. User Confirmation Model

When user intervention is required, show:

**What was detected**

Example:

> Sensitive information detected: payment/account information.

**What the task needs**

> The agent needs this region to complete the requested task.

**What will be shared**

> Only the selected redacted page context will be sent.

**Decision**

- Allow once.
- Deny.
- Cancel task.

Default action must be deny/block.

## 12. Action Validation

Remote AI may return an action, but the browser should validate it locally before execution.

Checks can include:

- Current page still matches the expected state.
- Target element exists.
- Target is not inside a protected region unless explicitly permitted.
- Action parameters are valid.
- Navigation target is permitted.
- No hidden/privileged action is being executed accidentally.

## 13. Privacy-Safe Telemetry

Telemetry must never contain:

- Raw screenshots.
- Full DOM dumps.
- OCR text containing sensitive values.
- Credentials.
- Tokens.
- Secrets.

Allowed examples:

```json
{
  "taskId": "local-id",
  "decision": "REDACT",
  "categories": ["PAYMENT"],
  "signals": ["DOM", "OCR"],
  "regionCount": 2,
  "modelUsed": "local-vision-small",
  "egressBlocked": false
}
```

## 14. Failure Modes

### WebGPU unavailable

Fallback to WASM/CPU model or reduce to DOM/OCR/rule-based processing.

### Local model unavailable

Do not automatically bypass privacy. Use another local signal or block/ask.

### OCR failure

If OCR is essential to privacy determination and no other reliable signal exists, fail closed.

### DOM unavailable

Use screenshot/OCR/vision if available.

### Detection disagreement

Use conservative policy: minimize, ask, or block.

### Network/API error

No privacy relaxation should occur.

## 15. Browser Runtime Separation

Respect Manifest V3 constraints.

Use separate execution responsibilities:

- Content script: DOM and page-bound operations.
- Offscreen/background processing: heavy or document-oriented local processing where necessary.
- Background service worker: orchestration and messaging.
- UI surface: user controls and privacy decisions.

The privacy subsystem should expose a clean message/API boundary so the agent code does not need to know how detection works internally.

## 16. Suggested Internal Module Structure

```text
chrome-extension/src/

  privacy/
    core/
      PrivacyPipeline.ts
      PrivacyPolicyEngine.ts
      PrivacyEgressGate.ts
      PrivacyTypes.ts
      PrivacyErrors.ts

    context/
      TaskContextAnalyzer.ts
      ContextMinimizer.ts
      DomContextCollector.ts
      ScreenshotCollector.ts
      RegionSelector.ts

    perception/
      OcrEngine.ts
      LocalVisionEngine.ts
      PerceptionRouter.ts
      WebGpuRuntime.ts
      WasmFallback.ts

    detection/
      SensitiveDetector.ts
      PatternDetector.ts
      DomDetector.ts
      OcrDetector.ts
      VisionDetector.ts
      EvidenceFusion.ts

    redaction/
      RedactionEngine.ts
      TextRedactor.ts
      ImageRedactor.ts
      RegionMasker.ts

    consent/
      ConsentManager.ts
      ConsentPrompt.ts
      ConsentStore.ts

    telemetry/
      PrivacyTelemetry.ts
      PrivacyAudit.ts

  agent/
    ...existing agent implementation...
```

The exact final paths should be adjusted to the fork after the first code audit. The key architectural rule is the dependency direction:

```text
Agent → Privacy API → Sanitized Context
```

not:

```text
Privacy Layer → Agent internals everywhere
```

## 17. Privacy Invariants

These should be written as automated tests:

1. No remote request can be created without a privacy decision.
2. A blocked context cannot reach the network client.
3. Raw sensitive fields are absent from `SanitizedContext`.
4. Raw screenshots are never attached to outbound AI payloads.
5. User denial blocks transmission.
6. Low confidence never becomes automatic allow for high-risk categories.
7. Telemetry cannot serialize raw browser context.
