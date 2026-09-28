# LOOKUP — Privacy-Preserving Browser AI

> **On-device Visual Perception for Light-weight Browser Agents**
>
> Smart India Hackathon 2026 · Problem Statement **SIH26171** · Team **Gen(AI)Tics**

LOOKUP is a privacy-preserving browser-agent project built around a simple principle:

> **The AI should see only what it needs, while sensitive browser data remains protected on the device.**

This repository explores an architecture in which browser context is inspected locally before any context is shared with an external AI model. Instead of sending an unrestricted screenshot or full browser state to a cloud model, LOOKUP introduces a local privacy layer that can analyze DOM structure, OCR output, and visual information, detect sensitive content, sanitize the context, and allow only task-relevant information to cross the privacy boundary.

## About This Documentation

This repository contains the LOOKUP browser-agent codebase as well as the project's technical direction and documentation assets.

The companion documentation page is intentionally written as a **technical project proposal / architecture specification**. It explains the intended system design, privacy boundary, processing flow, and implementation approach. It should not be interpreted as a claim that every described component is already complete, production-ready, or fully integrated end-to-end.

The architecture is documented so that reviewers, engineers, and judges can understand **what LOOKUP is designed to do and how the complete system is intended to work**.

---

## The Problem

Browser agents need webpage and screen context to reason about a user's task. A typical cloud-based agent may need access to page text, DOM structure, screenshots, or other visual information.

That creates a privacy problem when the active page contains information unrelated to the task, such as:

- personal information
- credentials
- account details
- private messages
- payment information
- secrets or tokens
- sensitive visual content

Running an entire AI agent locally can reduce external data exposure, but full local reasoning and vision can be constrained by device memory, compute capacity, latency, and battery usage.

LOOKUP explores a hybrid architecture:

```text
                 BROWSER / DEVICE
                         │
                  Local perception
                         │
                 Local privacy layer
                         │
                Sanitized task context
                         │
               ───── TRUST BOUNDARY ─────
                         │
                    Server AI
                         │
                 Structured action
                         │
                  Local validation
                         │
                 Browser execution
```

The goal is to keep privacy-sensitive perception and enforcement local while allowing a more capable external model to perform heavier reasoning over a minimized context.

---

## What Is LOOKUP?

LOOKUP is a **privacy enforcement layer for browser-agent workflows**.

At a high level, it sits between the browser and an AI reasoning service:

```text
User Task
   ↓
Browser Agent
   ↓
Context Capture
   ↓
LOOKUP Local Privacy Layer
   ↓
Sensitive Detection
   ↓
Redaction / Masking
   ↓
Privacy Egress Gate
   ↓
Sanitized Context
   ↓
Server VLM / LLM
   ↓
Structured Action
   ↓
Local Validation
   ↓
Browser Execution
```

LOOKUP does not need to replace the complete browser-agent workflow. Its purpose is to add a local privacy enforcement boundary around that workflow.

---

## Core Ideas

### 1. Task-Aware Privacy Firewall

LOOKUP uses the user's task to reason about what information is actually needed.

For example, for:

> `Compare prices on this page`

the agent may need product names, prices, and relevant visual regions, but it may not need unrelated account information or private messages.

The intended design therefore favors **task-aware minimization** instead of blindly hiding or forwarding the complete page.

### 2. Multi-Source Local Perception

The privacy layer combines multiple browser-side signals:

- **DOM** for page structure, text, links, and elements
- **OCR** for text present inside images or visual regions
- **Local vision** for visual information that is not adequately represented by text or DOM data

Using multiple signals provides broader coverage for both structural and visual sensitive content.

### 3. Minimum-Context Sharing

The objective is to send only the context required for the current task.

```text
Raw Browser State
       ↓
Local Analysis
       ↓
Sensitive Data Detection
       ↓
Redaction / Masking
       ↓
Task-Relevant Sanitized Context
       ↓
External AI
```

### 4. Privacy Confidence Gate

Privacy decisions are not always certain. The architecture therefore uses a **fail-closed** approach for uncertain or unsafe cases.

If the system cannot safely establish that a payload is suitable for external processing, the intended behavior is to stop or block transmission rather than automatically allow it.

---

## End-to-End User Flow

### 1. Open & Ask

The user opens the LOOKUP interface and gives a browser task.

Example:

```text
Compare prices on this page.
```

### 2. Smart Capture

LOOKUP determines what type of page context is useful for the current task.

Possible sources include:

- DOM capture
- screenshot capture
- adaptive/task-based capture

### 3. Local Privacy Guard

Captured context is processed locally.

```text
Screen Input
   ↓
OCR / DOM / Local Vision
   ↓
Sensitive Detection
   ↓
Privacy Policy
   ↓
Redaction / Masking
   ↓
Sanitized Context
```

### 4. Server-Side AI Processing

Only sanitized context is made available to the reasoning layer.

The external model can then:

- understand the task
- reason about the sanitized page state
- determine the next action
- return a structured action representation

### 5. Action Decision

The result can represent browser actions such as:

- click
- type
- scroll
- navigate
- other supported actions

### 6. Local Execution

The browser validates and executes the action locally.

The updated page becomes the next state in the agent loop.

---

## Proposed System Architecture

### Local / Browser Side

```text
User
  │
  ▼
Agentic Browser Core
  ├── Planner
  ├── Navigator
  └── Action Engine
          │
          ▼
Browser Context Capture
  ├── DOM Capture
  ├── Screenshot Capture
  └── Adaptive Capture
          │
          ▼
LOOKUP Local Privacy Layer
  ├── Task Context Analyzer
  ├── Local Vision Model
  ├── OCR
  ├── Sensitive / PII Detection
  ├── Privacy Policy Engine
  ├── Redaction / Masking
  └── Privacy Egress Gate
          │
          ▼
   Sanitized Context
          │
          ├─────────────── TRUST BOUNDARY ───────────────┐
          │                                               │
          ▼                                               │
Server VLM / LLM                                         │
  ├── Task Reasoning                                      │
  ├── Visual Reasoning                                    │
  └── Structured Action Output                            │
          │                                               │
          └──────────────────── Action ───────────────────┘
                                  │
                                  ▼
                         Local Action Validation
                                  │
                                  ▼
                         Browser Action Engine
                                  │
                                  ▼
                            Updated Page
                                  │
                                  └──► Next Agent Step
```

### Trust Boundary

The key architectural boundary is between local processing and external reasoning.

**Intended to remain on device:**

- raw screenshots
- unprocessed browser context
- credentials and secrets
- PII / personal information
- sensitive visual data

**Intended to cross the boundary only after sanitization:**

- sanitized context
- relevant UI elements
- required visual regions
- task-related information

---

## Technical Stack

The project currently uses a modern browser-extension development stack and explores browser-side privacy and perception components around it.

| Technology | Intended Role |
|---|---|
| WebExtension / Manifest V3 | Browser extension platform |
| TypeScript | Core development |
| React | Extension interfaces |
| Tesseract.js | OCR |
| WebGPU + ONNX Runtime Web | Local/browser-side vision inference |
| Canvas API | Redaction / masking |
| Node.js | Supporting backend APIs |
| External VLM / LLM providers | Heavy reasoning over sanitized context |

The repository is structured as a TypeScript/React/Vite/Turbo monorepo with a `chrome-extension` package and page-specific interfaces. See the package configuration and extension manifest in the repository for the current implementation details.

---

## Privacy Architecture

LOOKUP follows a **privacy-by-construction** model:

```text
Browser Context
    ↓
Task Context Analysis
    ↓
Adaptive Local Perception
    ↓
Multi-Signal Detection
    ↓
Evidence / Policy Checks
    ↓
Redaction & Masking
    ↓
Privacy / Consent Checks
    ↓
Fail-Closed Egress Gate
    ↓
Sanitized Context Only
    ↓
Remote AI Reasoning
    ↓
Local Action Validation
    ↓
Browser Execution
```

The repository also contains a dedicated privacy architecture document describing local redaction, egress control, action validation, API-key handling, and privacy-safe telemetry.

---

## Why Local Perception?

A browser privacy layer cannot depend only on plain page text.

Sensitive information can appear as:

- HTML text
- visual text inside images
- screenshots
- rendered UI elements
- graphical information
- mixed visual and structural context

This is why the proposed architecture combines DOM, OCR, and local vision rather than relying on a single detector.

---

## Feasibility Considerations

The proposal identifies several practical implementation challenges.

### Device Constraints

Large vision models can increase memory usage, latency, and battery consumption.

**Mitigation direction:** lightweight or quantized models, relevant-region processing, and a WASM fallback where required.

### Browser Differences

WebGPU behavior and browser APIs can differ across environments.

**Mitigation direction:** feature detection and browser-specific fallbacks.

### Privacy Accuracy

A privacy detector can face both false positives and false negatives.

**Mitigation direction:** combine multiple detection signals and fail closed when safety cannot be established.

### Extension Constraints

Manifest V3 service workers have limitations around direct DOM access.

**Mitigation direction:** use content scripts, offscreen processing, and a modular separation between browser privacy logic and AI reasoning.

---

## Viability

The project direction is based on a browser-extension deployment model rather than requiring a custom browser from the user.

The proposed architecture also aims to keep the privacy layer relatively independent from the reasoning provider so the downstream AI model can be changed without redesigning the privacy boundary.

This makes the architecture suitable for different browser-agent workflows while keeping the privacy enforcement layer local.

---

## Impact & Benefits

### Privacy & Security

Sensitive visual information is intended to be processed locally before external AI access.

### Reduced Unnecessary Data Sharing

The architecture minimizes the amount of browser context exposed to the external reasoning system.

### Browser AI on Resource-Constrained Devices

Lightweight client-side perception can handle privacy-sensitive processing while heavier reasoning remains available remotely.

### Broader Browser-Agent Applicability

The privacy layer is intended to make browser automation more practical for workflows involving sensitive webpages and screen content.

### Potential Efficiency Benefits

Filtering context before transmission may reduce unnecessary visual data transfer, although the actual effect depends on task complexity, model size, and network usage.

---

## USP

### Minimum-Disclosure Context

Only task-relevant, privacy-processed context is intended to reach external AI.

### Multimodal Privacy Guard

DOM, OCR, and local visual perception work together to protect structural and visual information.

### Drop-In Agent Privacy

LOOKUP can be understood as a privacy enforcement layer around a browser-agent workflow rather than a replacement for the workflow itself.

---

## Example

### User Request

```text
Compare prices on this page.
```

### Conventional Flow

```text
Full browser context
        ↓
External AI
```

### LOOKUP Flow

```text
Browser Page
      ↓
Task Analysis
      ↓
Relevant Context Capture
      ↓
Local Sensitive Detection
      ↓
Redaction / Masking
      ↓
Sanitized Context
      ↓
External AI
      ↓
Structured Action
      ↓
Local Validation
      ↓
Browser Execution
```

The central difference is not simply **where the AI model runs**. It is **what information is permitted to reach the AI model**.

---

## Project Status & Scope

This repository should be treated as an evolving implementation and research/prototype codebase.

The documentation describes the **intended architecture and project idea**. Some components may still be under development, partially implemented, experimental, or not yet connected into a complete end-to-end production workflow.

In particular, do not use the architecture diagrams as proof that every module is currently operational.

The documentation is intended to answer:

1. What problem is LOOKUP solving?
2. What is the proposed privacy architecture?
3. What stays on the user's device?
4. What information is allowed to reach external AI?
5. How can browser-side perception support privacy enforcement?
6. How can sanitized context be used by an AI browser agent?
7. How can the proposed design be implemented and extended?

---

## Repository Structure

The repository is organized around the browser extension and supporting packages. At a high level, the project contains browser pages/interfaces, shared application code, and a dedicated Chrome-extension package.

A representative structure is:

```text
lookup/
├── chrome-extension/
│   ├── src/
│   ├── public/
│   ├── manifest.js
│   └── package.json
├── pages/
│   ├── content/
│   ├── options/
│   └── side-panel/
├── package.json
└── ...
```

The exact repository structure may evolve as implementation continues.

---

## Getting Started

The root project uses **pnpm** and a Turbo-based workspace. The repository currently specifies **Node.js 22.12+** and **pnpm 9.15.1+** in its package configuration.

### Install

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Type Check

```bash
pnpm type-check
```

### Lint

```bash
pnpm lint
```

Check the repository's current scripts and package configuration before adding or changing commands.

---

## Documentation Website

A standalone technical documentation page is provided as `index.html`.

The page presents the project in a documentation-first format with:

- sticky documentation navigation
- section-aware sidebar
- project overview
- problem and solution explanation
- architecture visualization
- privacy trust boundary
- user flow
- technology stack
- feasibility and viability
- impact and benefits
- comparison and references

The documentation page intentionally focuses on **explaining the architecture and project idea**, rather than pretending that the entire system is already production-complete.

---

## Research Direction

The project explores browser-side technologies relevant to local perception and privacy enforcement, including:

- ONNX Runtime Web / WebGPU
- Transformers.js and browser inference approaches
- WebExtensions APIs
- Manifest V3 execution constraints
- OCR and visual-content analysis
- local redaction and context minimization

These technologies are part of the implementation direction and may evolve as the prototype is tested.

---

## Comparison Context

The project proposal discusses related browser-agent and privacy systems including NanoBrowser, SafeScreen, and Agent Browser.

The purpose of the comparison is to explain the architectural focus of LOOKUP:

- browser automation
- local privacy protection
- combined visual + OCR + DOM perception
- task-aware context minimization
- fail-closed privacy enforcement

The comparison should be interpreted as a high-level architectural comparison, not as a benchmark or a claim of universal superiority.

---

## Smart India Hackathon

**Event:** Smart India Hackathon 2026  
**Problem Statement ID:** SIH26171  
**Problem Statement:** On-device Visual Perception for Light-weight Browser Agents  
**Theme:** Smart Automation  
**Category:** Software  
**Team ID:** 164736  
**Team:** Gen(AI)Tics

---

## License

The repository is licensed under the **Apache License 2.0**.

See [`LICENSE`](LICENSE) for the complete license text.

---

## Important Note

LOOKUP is a security-sensitive architecture. Privacy guarantees depend on the correctness of local detection, sanitization, policy enforcement, egress validation, browser integration, and action validation.

The architecture should therefore be evaluated and tested continuously before being treated as a production security boundary.

---

## Links

- **Repository:** https://github.com/sooubh/lookup
- **Documentation:** `index.html`

