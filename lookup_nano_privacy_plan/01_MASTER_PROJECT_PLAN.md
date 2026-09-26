# LOOKUP — NanoBrowser Fork → Privacy-Preserving Browser Agent

## 1. Project Goal

Build a new browser-agent product by forking the existing NanoBrowser codebase as the starting point, then replacing its visible identity and inserting a local privacy enforcement layer into the browser-agent pipeline.

The final product should behave like a browser agent to the user, but the important architectural rule is:

> Raw browser context must be processed locally first. Only task-relevant, sanitized context may cross the trust boundary to a remote AI model.

The uploaded SIH proposal describes this as a privacy-preserving browser AI system with task-aware context, adaptive local perception, DOM + OCR + vision, redaction/masking, and a fail-closed privacy gate. The intended flow ends with local browser execution of the AI-generated action. [Source: SIH deck, pages 2–3.]

## 2. What Is Being Built

This is **not** a small feature added to NanoBrowser. It is a rebranded product built on top of NanoBrowser's agent/browser foundation.

Three layers must remain conceptually separate:

1. **Browser Agent Core**
   - Understands the task.
   - Maintains page state.
   - Produces and executes actions.
   - Continues the agent loop after each action.

2. **Local Privacy Layer**
   - Receives browser context before cloud transmission.
   - Determines what context is required for the current task.
   - Captures/uses DOM, OCR, and local vision adaptively.
   - Detects sensitive information.
   - Applies policy and redaction.
   - Stops transmission when confidence/policy requirements are not satisfied.

3. **Remote AI Layer**
   - Receives only the sanitized context that passed the local privacy gate.
   - Performs higher-level reasoning.
   - Returns a structured action or decision.
   - Never receives a raw screenshot or unfiltered page context when the privacy pipeline is active.

## 3. Target User Experience

Example task:

> "Compare prices on this page."

Expected execution:

```text
User task
  ↓
Agent planner
  ↓
Current page state
  ↓
Adaptive local context capture
  ↓
Local privacy layer
  ├─ Task context analysis
  ├─ DOM inspection
  ├─ OCR when useful
  ├─ Small in-browser vision model when useful
  ├─ Sensitive-region detection
  ├─ Policy evaluation
  └─ Redaction / replacement
  ↓
User consent / privacy decision when required
  ↓
Privacy egress gate
  ↓
Sanitized context
  ↓
Remote LLM/VLM
  ↓
Structured action
  ↓
Local action validation
  ↓
Browser execution
  ↓
Updated page
  ↓
Next agent step
```

The SIH deck explicitly describes this loop, including local processing, sanitized context, server-side reasoning, returned actions, and local execution.

## 4. Core Product Principles

### Privacy by construction
Privacy checks are placed in the data path, not added as an afterthought in the UI.

### Minimum disclosure
Do not send the entire page just because the agent can technically capture it. Send only the context needed for the task.

### Adaptive perception
Use the cheapest reliable signal first. The system should not run OCR or vision on every page if DOM information is enough.

### Fail closed
When the system cannot establish that the outgoing context is safe, transmission is blocked.

### User-controlled exceptions
When policy or uncertainty requires a human decision, present a clear prompt and let the user explicitly allow or deny the transfer.

### Agent preservation
Do not destroy the useful browser-agent loop. Wrap its context path with privacy enforcement instead.

### Model independence
The privacy layer should not be hard-coded around one cloud provider or one local model.

## 5. Scope

### In scope

- Fork-based project setup.
- Complete product rebranding.
- Removal of visible NanoBrowser branding.
- Privacy middleware/gateway.
- Task-aware context analysis.
- DOM extraction.
- Screenshot/region capture.
- OCR integration.
- Small browser-local model through WebGPU where supported.
- WASM/CPU fallback path.
- Detection of broad sensitive-data classes.
- Policy engine.
- Redaction/masking.
- Privacy confidence calculation.
- User confirmation when required.
- Fail-closed egress.
- Sanitized context contract.
- Local action validation.
- Privacy-safe telemetry.
- Updated extension UI and settings.
- Tests and demo scenarios.
- Documentation and setup.

### Out of scope for the first milestone

- Training a new foundation model.
- Rebuilding the browser automation engine from scratch.
- Full enterprise DLP certification.
- Perfect semantic understanding of every visual document.
- Automatic approval of ambiguous sensitive-data transmission without user confirmation.

## 6. Recommended Development Phases

### Phase 0 — Baseline and fork

- Fork the upstream repository into the team's GitHub account.
- Create a clean working branch.
- Run the unmodified extension.
- Verify build, packaging, and one complete browser-agent task.
- Record baseline performance and bundle size.
- Freeze the baseline commit.

Deliverable: working unmodified fork.

### Phase 1 — Rebrand shell

- Rename project package metadata.
- Replace extension name/description.
- Replace icons and visual identity.
- Replace popup/side-panel terminology.
- Replace documentation branding.
- Remove upstream product names from user-facing strings.
- Preserve required license and attribution notices.

Deliverable: the product visibly appears as the new product, not NanoBrowser.

### Phase 2 — Privacy boundary

Introduce one explicit privacy gateway between captured browser context and the existing AI request path.

At this stage the gateway may initially pass through context unchanged, but it must log the decision path and provide a single interception point.

Deliverable: deterministic interception architecture.

### Phase 3 — Local perception

Implement adaptive local perception:

- DOM first.
- OCR when screenshot text matters.
- Small WebGPU model when visual semantics are needed.
- CPU/WASM fallback when WebGPU is unavailable.

Deliverable: local context representation.

### Phase 4 — Sensitive-data detection

Implement multiple detection signals:

- Pattern/rule detection for obvious secrets and identifiers.
- DOM semantics and field metadata.
- OCR text detection.
- Visual detection from the local model.
- Cross-signal agreement/conflict handling.

Deliverable: sensitive regions + confidence + evidence metadata.

### Phase 5 — Policy + redaction

Create a policy engine that decides:

- Allow.
- Mask/redact.
- Reduce context.
- Ask user.
- Block.

Deliverable: deterministic local privacy decision before network egress.

### Phase 6 — User confirmation

For cases such as uncertain classification, high-risk information, or an action that requires explicit disclosure:

- Explain what category was detected.
- Explain what would be shared.
- Explain why the task needs it.
- Allow the user to approve or deny.
- Default to deny/block.

Deliverable: human-in-the-loop privacy decision.

### Phase 7 — Agent integration

Pass the sanitized context into the existing remote reasoning pipeline.

The remote response must still use the existing action format so the browser action layer can execute it.

Deliverable: end-to-end private agent loop.

### Phase 8 — Validation and hardening

- Unit tests.
- Integration tests.
- Red-team privacy scenarios.
- Cross-browser checks.
- Performance measurements.
- Error and fallback testing.
- Rebrand string scan.
- Network inspection to verify raw context does not escape through unintended paths.

Deliverable: SIH demo-ready build.

## 7. Rebranding Rule

All user-facing references should be migrated to the new product identity.

This includes:

- Extension name.
- App title.
- Logo.
- Favicon/icon pack.
- Popup/side panel.
- Settings pages.
- Onboarding.
- Empty states.
- Loading states.
- Error messages.
- Documentation.
- README.
- Package metadata.
- Store-facing metadata.
- Telemetry labels.
- Analytics/event names.
- Environment variables where practical.
- Screenshots.
- Demo scripts.

### Important legal/maintenance rule

Do **not** blindly delete upstream license, copyright, attribution, or third-party notices. The upstream repository currently includes an Apache-2.0 LICENSE and other project documentation. Rebranding is a product/UI change; legal notices must be handled according to the applicable license terms.

## 8. Success Criteria

The project is complete for the initial SIH milestone when all of the following are true:

1. A user can start a browser-agent task normally.
2. Browser context is intercepted locally before remote AI transmission.
3. The privacy layer can choose DOM/OCR/vision adaptively.
4. Sensitive information can be detected from multiple signals.
5. Redaction occurs before egress.
6. Ambiguous cases trigger user confirmation or blocking.
7. Raw screenshots/credentials/secrets do not get sent through the intended AI request path.
8. Sanitized context reaches the remote model.
9. The remote model can still reason and return an action.
10. The browser executes the action locally.
11. The entire visible product uses the new branding.
12. Privacy decisions can be explained in a demo.

## 9. Source Baseline Used

The plan is based on the uploaded SIH proposal plus a review of the current public NanoBrowser repository structure.

The current repository contains browser-agent and browser-context areas such as:

```text
chrome-extension/src/background/agent/
chrome-extension/src/background/browser/
chrome-extension/src/background/agent/executor.ts
chrome-extension/src/background/browser/context.ts
chrome-extension/src/background/browser/page.ts
```

The repository is a TypeScript/React/Turbo workspace and currently identifies itself as NanoBrowser in its package metadata.

## 10. Final Architecture Target

```text
┌─────────────────────────────────────────────────────────────────┐
│                         USER / EXTENSION                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ task
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AGENT CORE (LOCAL)                          │
│ planner → navigator → action engine                             │
└──────────────────────────────┬──────────────────────────────────┘
                               │ requested context
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LOCAL PRIVACY LAYER                            │
│                                                                 │
│  Task Context Analyzer                                          │
│        │                                                        │
│        ├── DOM perception                                       │
│        ├── OCR perception                                       │
│        └── Local vision (WebGPU → WASM/CPU)                    │
│                           │                                     │
│                    Sensitive Detector                           │
│                           │                                     │
│                    Policy Engine                                │
│                           │                                     │
│                  Redaction / Minimization                       │
│                           │                                     │
│                 Confidence / Consent                            │
│                           │                                     │
│                 Privacy Egress Gate                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │ sanitized context only
                         TRUST BOUNDARY
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       REMOTE AI                                 │
│            LLM / VLM / reasoning service                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ structured action
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              LOCAL ACTION VALIDATION + EXECUTION                │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
                         UPDATED PAGE
                               │
                               └────────→ next agent step
```
