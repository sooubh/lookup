# LOOKUP — Terms, Interfaces and Coding-Agent Roadmap

## 1. Purpose of This Document

This document gives the implementation team and an AI coding agent a common vocabulary and an execution order.

It prevents the project from turning into a large collection of unrelated privacy features.

## 2. Important Terms

### Browser Agent

Software that interprets a user task, understands browser state, chooses actions, and executes those actions in a browser.

### Agent Core

The part of the application responsible for planning, navigation, state management, and action execution.

### Browser Context

Information extracted from the current page for reasoning.

It can include:

- DOM structure.
- Visible text.
- Links.
- Form fields.
- Screenshots.
- OCR output.
- Visual regions.
- Page metadata.

### Context Capture

The mechanism used to obtain browser context.

### Adaptive Capture

Selecting the least expensive context source that can satisfy the current task.

### Task Context Analyzer

A component that estimates which browser information is required for the current agent step.

### DOM

Document Object Model: the structured representation of a webpage.

### OCR

Optical Character Recognition: converting text visible in an image into machine-readable text.

### Local Vision Model

A small ML model executed inside the browser/device rather than on the remote AI server.

### WebGPU

Browser API/runtime used to accelerate supported ML computations on the GPU.

### WASM

WebAssembly, used here as a possible CPU-side fallback for local model execution.

### Sensitive Data

Any user, credential, financial, private, confidential, or otherwise protected information that should not be exposed to an external AI service without explicit policy authorization.

### Sensitive Region

A region of a webpage or screenshot believed to contain sensitive information.

### Detector

Component that identifies sensitive information.

### Evidence

The signal supporting a detector result, such as DOM metadata, OCR text, a regex match, or local visual inference.

### Evidence Fusion

Combining multiple detection signals into one confidence/risk assessment.

### Redaction

Transforming sensitive content so the exact value is not exposed.

### Masking

Replacing sensitive visual or textual content with a protected placeholder/block.

### Minimization

Reducing the amount of context shared so unnecessary information never reaches the remote model.

### Sanitized Context

A purpose-built, privacy-filtered representation of browser context that is allowed to leave the device.

### Policy Engine

Component that maps privacy findings and task requirements to an action such as allow, minimize, redact, ask, or block.

### Privacy Egress Gate

Final checkpoint before any browser context is sent to an external AI service.

### Fail Closed

When safety cannot be established, block or require explicit user permission rather than allowing transmission automatically.

### User Consent

An explicit user decision allowing a protected context transfer for the relevant task.

### Trust Boundary

The point separating local/private processing from remote/external AI processing.

### Local Action Validation

Checking an AI-generated action locally before executing it in the browser.

### Privacy-Safe Telemetry

Operational metrics that describe privacy decisions without collecting protected browser content.

## 3. Core Interfaces

### Privacy Gateway

```ts
interface PrivacyGateway {
  sanitize(
    context: BrowserContext,
    task: AgentTask,
  ): Promise<PrivacyResult>;
}
```

### Policy Engine

```ts
interface PrivacyPolicyEngine {
  evaluate(input: PolicyInput): Promise<PrivacyDecision>;
}
```

### Local Vision

```ts
interface LocalVisionProvider {
  isAvailable(): Promise<boolean>;
  analyze(image: ImageData): Promise<VisionFinding[]>;
}
```

### OCR

```ts
interface OcrProvider {
  isAvailable(): Promise<boolean>;
  recognize(image: ImageData): Promise<OcrFinding[]>;
}
```

### Egress Gate

```ts
interface PrivacyEgressGate {
  authorize(payload: SanitizedContext): Promise<EgressDecision>;
}
```

## 4. Data Lifecycle

```text
RAW PAGE
  ↓
LOCAL CAPTURE
  ↓
LOCAL PERCEPTION
  ↓
SENSITIVE DETECTION
  ↓
EVIDENCE FUSION
  ↓
TASK RELEVANCE
  ↓
POLICY DECISION
  ↓
REDACTION / MINIMIZATION
  ↓
USER CONFIRMATION IF NEEDED
  ↓
EGRESS GATE
  ↓
SANITIZED CONTEXT
  ↓
REMOTE AI
```

The raw page should never be treated as the AI payload.

## 5. Coding-Agent Execution Order

Use an AI coding agent in small checkpoints.

### Task 1 — Repository discovery

Read:

- Root README.
- package/workspace files.
- extension manifest.
- agent entry points.
- browser context code.
- LLM client code.
- UI entry points.
- build configuration.

Output:

- architecture map.
- exact outbound AI request path.
- exact existing context types.
- exact UI entry points.

Do not modify code yet.

### Task 2 — Baseline

Run the unmodified fork.

Verify:

- installation.
- extension loading.
- one agent task.
- one model request.
- one action execution.

Create a baseline commit.

### Task 3 — Add privacy types and gateway shell

Create the privacy interfaces and a gateway that intercepts the existing context.

Initially keep functionality compatible, but make the request flow explicit.

### Task 4 — Add context minimization

Implement task-aware selection of:

- DOM.
- screenshot.
- OCR.
- vision.

Do not add the model yet if the context routing layer is not stable.

### Task 5 — Add detection engine

Implement:

- rules.
- DOM detector.
- OCR detector.
- vision adapter.
- evidence fusion.

### Task 6 — Add redaction engine

Implement:

- text masking.
- image region masking.
- token replacement.
- region exclusion.

### Task 7 — Add policy engine

Implement:

```text
ALLOW
MINIMIZE
REDACT
ASK_USER
BLOCK
```

### Task 8 — Add fail-closed egress

Make the external model client accept only sanitized context.

This is the main security milestone.

### Task 9 — Add user confirmation UI

Create the privacy prompt and connect it to the gate.

### Task 10 — Connect local WebGPU model

Integrate the selected small browser-compatible model behind a provider interface.

Do not allow model load failure to disable privacy protection.

### Task 11 — Action validation

Place a local validation checkpoint before browser execution.

### Task 12 — Rebrand and redesign

Now replace UI identity across the repository.

This sequencing prevents a visual rewrite from hiding architectural issues.

### Task 13 — Remove old visible references

Run a repository-wide scan and classify every remaining upstream reference.

### Task 14 — Test and harden

Run:

- unit tests.
- integration tests.
- privacy invariants.
- network inspection.
- cross-browser build.
- fallback tests.

### Task 15 — SIH demo mode

Create deterministic demo pages for:

1. Safe page.
2. Sensitive page.
3. Ambiguous page.
4. User-denied flow.
5. User-approved flow.

## 6. AI Coding-Agent Rules

The coding agent should follow these rules:

### Rule A
Do not rewrite the existing browser-agent architecture unless required by the audit.

### Rule B
Do not bypass the privacy gateway to make a feature work faster.

### Rule C
Do not send raw screenshots or raw DOM through generic debugging logs.

### Rule D
Do not put sensitive values into test snapshots.

### Rule E
Do not silently allow transmission when a privacy detector fails.

### Rule F
Do not perform global string replacement for rebranding without classifying references.

### Rule G
Do not remove legal notices just because they contain the upstream name.

### Rule H
Keep local model code behind an interface.

### Rule I
Keep privacy policy deterministic and testable.

### Rule J
Every privacy-related change must add or update a test.

## 7. Suggested Commit Sequence

```text
01 baseline-fork
02 audit-agent-context-flow
03 add-privacy-gateway-shell
04 add-adaptive-context-capture
05 add-sensitive-detection
06 add-redaction-engine
07 add-policy-engine
08 add-user-consent
09 enforce-egress-gate
10 add-local-vision-provider
11 add-wasm-fallback
12 add-local-action-validation
13 rebrand-product-shell
14 redesign-extension-ui
15 remove-visible-upstream-references
16 privacy-integration-tests
17 demo-scenarios
18 release-cleanup
```

## 8. Final Architecture Check

Before calling the prototype complete, trace one request manually:

```text
Task
→ browser context
→ privacy layer
→ detection
→ policy
→ redaction
→ gate
→ sanitized payload
→ remote AI
→ action
→ local validation
→ browser execution
```

Then deliberately introduce failure:

```text
local detector unavailable
```

Expected behavior:

```text
No automatic external transmission.
Ask/block according to policy.
```

## 9. Final Product Definition

The finished product should be presented as:

> A privacy-first browser agent that performs local perception and privacy enforcement before sharing task-relevant context with external AI.

It should not be presented as:

> A lightly modified NanoBrowser with a privacy feature.

The engineering lineage can remain documented internally, while the user-facing product is completely its own identity.
