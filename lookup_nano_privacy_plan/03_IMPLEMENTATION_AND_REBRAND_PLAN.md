# LOOKUP — Implementation, Repository Changes, UI Rebrand and Execution Plan

## 1. Working Strategy

Start from the forked NanoBrowser repository, preserve the useful browser-agent functionality, and progressively replace its identity while moving all external AI context through the privacy layer.

Do not start by rewriting the whole repository.

The safer sequence is:

```text
Audit → Baseline → Intercept → Privacy modules → Agent integration → Rebrand → Test → Cleanup
```

## 2. Current Repository Areas to Audit First

The current public repository exposes these relevant areas:

```text
chrome-extension/
chrome-extension/src/background/
chrome-extension/src/background/agent/
chrome-extension/src/background/browser/
```

Important files/areas identified during the initial review include:

```text
chrome-extension/src/background/agent/executor.ts
chrome-extension/src/background/agent/helper.ts
chrome-extension/src/background/agent/types.ts
chrome-extension/src/background/agent/actions/
chrome-extension/src/background/agent/agents/
chrome-extension/src/background/agent/messages/
chrome-extension/src/background/agent/prompts/
chrome-extension/src/background/browser/context.ts
chrome-extension/src/background/browser/page.ts
chrome-extension/src/background/browser/dom/
chrome-extension/src/background/index.ts
```

These are **audit targets**, not a claim that every file must be modified.

## 3. First Code-Audit Task

Before implementing privacy logic, trace this exact chain in the fork:

```text
User task
  ↓
Agent planner
  ↓
Browser state/context collection
  ↓
Screenshot/DOM representation
  ↓
Prompt/message builder
  ↓
LLM/VLM client
  ↓
Remote request
  ↓
AI response parser
  ↓
Action executor
```

The main question is:

> At which exact function does raw browser context become an outbound model payload?

That location becomes the **primary privacy interception point**.

## 4. Integration Pattern

Do not scatter privacy checks across every agent function.

Use one explicit interface:

```ts
interface PrivacyGateway {
  sanitize(input: BrowserContext, task: AgentTask): Promise<PrivacyResult>;
}
```

Then the AI client accepts only:

```ts
SanitizedContext
```

not the original `BrowserContext`.

This creates a type-level boundary.

## 5. Recommended Dependency Direction

```text
Browser / Content Script
          │
          ▼
   Browser Context
          │
          ▼
    Privacy Gateway
          │
          ├──── local perception
          ├──── sensitive detection
          ├──── policy
          ├──── redaction
          └──── consent
          │
          ▼
  Sanitized Context
          │
          ▼
       AI Client
          │
          ▼
    Structured Action
          │
          ▼
 Local Action Validator
          │
          ▼
 Browser Action Engine
```

## 6. Repository Structure After Refactor

Suggested target:

```text
project-root/
├─ chrome-extension/
│  ├─ src/
│  │  ├─ privacy/
│  │  │  ├─ core/
│  │  │  ├─ context/
│  │  │  ├─ perception/
│  │  │  ├─ detection/
│  │  │  ├─ redaction/
│  │  │  ├─ consent/
│  │  │  └─ telemetry/
│  │  ├─ agent/
│  │  ├─ browser/
│  │  ├─ ui/
│  │  └─ shared/
│  └─ public/
├─ packages/
│  ├─ privacy-types/
│  └─ privacy-utils/
├─ docs/
├─ README.md
├─ PRIVACY.md
└─ ...workspace files...
```

The exact move/rename plan should be driven by the repository audit so existing imports are changed systematically rather than manually guessed.

## 7. Package and Workspace Rebrand

The current root package metadata identifies the upstream project as NanoBrowser. Rebrand the fork systematically:

### Metadata

- `name`.
- `description`.
- repository URL.
- package banners/comments where present.
- workspace package names where applicable.

### Runtime identity

- Extension manifest name.
- Short name.
- Description.
- Versioning strategy.
- Extension IDs for local builds where applicable.

### Build identity

- output folder names.
- archive names.
- development environment values.
- CI labels.
- release artifact labels.

## 8. Complete Visible-Brand Cleanup

Search the entire repository for these types of strings:

```text
NanoBrowser
nanobrowser
Nano Browser
nano-browser
upstream extension names
upstream logo assets
upstream documentation titles
```

For each match classify it as:

```text
REMOVE / REPLACE / PRESERVE LEGAL NOTICE / PRESERVE TECHNICAL COMPATIBILITY
```

Do not use a blind global replacement because identifiers, URLs, dependency paths, and license notices can require different treatment.

## 9. UI Redesign Plan

The UI should feel like a new privacy-first browser agent, not a fork.

### Main UI surfaces

1. **Home/Task panel**
   - New logo.
   - New product name.
   - Task input.
   - Example tasks.
   - Privacy status indicator.

2. **Live task view**
   - Current page/task.
   - Agent progress.
   - Action being prepared.
   - Privacy status.

3. **Privacy panel**
   - What was detected.
   - Which data will be shared.
   - What was masked.
   - Why the content is needed.
   - Approve/Deny when required.

4. **Settings**
   - Privacy strictness.
   - User confirmation behavior.
   - Model/runtime status.
   - Local vision enable/disable.
   - OCR enable/disable.
   - Diagnostics.

5. **Security / Privacy report**
   - Number of contexts inspected.
   - Number minimized/redacted.
   - Number blocked.
   - No raw private content shown.

## 10. UI Information Architecture

Suggested navigation:

```text
Home
Tasks
Privacy
Settings
About
```

Avoid exposing implementation details such as:

- "NanoBrowser agent"
- "NanoBrowser model"
- "NanoBrowser privacy wrapper"

The user should see product concepts, not fork lineage.

## 11. Branding Direction

The uploaded SIH deck currently uses **LOOKUP** as the working product name and presents it as a privacy-preserving browser AI. The implementation plan can therefore use LOOKUP as the working identity unless the team changes its final product name later.

Suggested positioning:

> LOOKUP — Privacy-first browser AI with local perception.

Core message:

> Your browser context is inspected and protected locally before external AI sees anything.

## 12. Rebrand Asset Checklist

Replace:

- Logo.
- Browser extension icon 16/32/48/128 sizes.
- Favicon.
- Popup header.
- Sidebar header.
- Empty-state illustrations.
- Loading animation.
- Error screen.
- Onboarding illustrations.
- Website/store screenshots.
- Documentation diagrams.

## 13. User Privacy Settings

Minimum settings for the prototype:

### Privacy mode

- Strict.
- Balanced.
- Custom.

For the SIH demo, Strict should be the default.

### User confirmation

- Ask whenever uncertain.
- Ask for high-risk data.
- Always ask before sending a protected region.

The system should never silently weaken protection.

## 14. Local Model Integration Plan

The local vision system should expose a provider abstraction:

```ts
interface LocalVisionProvider {
  isAvailable(): Promise<boolean>;
  analyze(image: ImageData): Promise<VisionFinding[]>;
}
```

Providers:

```text
WebGPU provider
     ↓ unavailable
WASM/CPU provider
     ↓ unavailable
No-vision state
```

No provider is permission to bypass privacy.

## 15. OCR Integration Plan

Use OCR only when useful.

Example router:

```ts
if (context.needTextFromPixels) {
  return runOcr(region);
}

return null;
```

OCR output must be treated as sensitive browser-derived data and processed locally.

## 16. Privacy Decision UX

### Case A — Safe

Show a small indicator:

> Protected locally · Safe context sent

### Case B — Redacted automatically

Show:

> 3 sensitive regions protected before sharing

### Case C — Uncertain

Show a modal:

> We found information that may be sensitive.
> The task may require this region.
> Nothing will be sent until you approve.

Buttons:

```text
Deny
Allow once
```

Default: Deny.

### Case D — Blocked

Show:

> This task cannot continue safely with the current privacy policy.

## 17. Testing Plan

### Unit tests

- Pattern detector.
- Evidence fusion.
- Redaction.
- Context minimizer.
- Policy engine.
- Consent logic.
- Egress gate.

### Integration tests

- DOM-only task.
- OCR task.
- Vision task.
- Mixed DOM + screenshot task.
- High-risk sensitive page.
- Uncertain sensitive page.
- User denial.
- User approval.
- WebGPU unavailable.
- OCR unavailable.

### Network tests

Verify that outbound requests contain:

```text
sanitized context ✅
raw screenshot ❌
raw sensitive DOM ❌
raw OCR containing secrets ❌
credentials ❌
```

## 18. Demo Scenarios

### Demo 1 — Public shopping page

Task:

> Compare prices on this page.

Expected:

- DOM provides product names/prices.
- Screenshot is captured only if needed.
- No sensitive data is present.
- Sanitized context is sent.
- AI returns comparison/interaction action.

### Demo 2 — Shopping page with account information visible

Expected:

- Account region is detected locally.
- Sensitive area is excluded/redacted.
- Product information remains available.
- AI receives only safe task context.

### Demo 3 — Ambiguous screenshot

Expected:

- Local model reports uncertain sensitive region.
- Egress gate blocks.
- User is asked for permission.
- Deny keeps data local.
- Allow once permits only the approved sanitized scope.

## 19. Definition of Done

### Architecture

- Privacy gateway exists.
- All cloud-context paths pass through it.
- No known bypass.

### Privacy

- Broad sensitive categories supported.
- Multi-signal detection enabled.
- Redaction works.
- Fail-closed works.
- User confirmation works.

### AI

- Remote model still receives sufficient context.
- Existing agent action protocol continues to work.

### UI

- New branding is complete.
- Old visible branding removed.
- Privacy decisions are understandable.

### Quality

- Type checks pass.
- Lint passes.
- Extension builds.
- Demo works repeatedly.
