<h1 align="center">
    <img src="https://github.com/user-attachments/assets/ec60b0c4-87ba-48f4-981a-c55ed0e8497b" height="100" width="375" alt="banner" /><br>
</h1>


<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nanobrowser)
[![Twitter](https://img.shields.io/badge/Twitter-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/nanobrowser_ai)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/NN3ABHggMK)
[<img src="https://deepwiki.com/badge.svg" height="28" alt="Ask DeepWiki">](https://deepwiki.com/nanobrowser/nanobrowser)
[![Sponsor](https://img.shields.io/badge/Sponsor-ff69b4?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/alexchenzl)

</div>

## 🛡️ LOOKUP

**LOOKUP** is an open-source, privacy-preserving AI browser agent that executes local perception and context sanitization before remote AI reasoning. It pairs powerful multi-agent browser automation with a deterministic, fail-closed privacy gate.

> **Privacy by Construction:** Raw browser context must be processed locally first. Only task-relevant, sanitized context may cross the trust boundary to an external AI model.

---

## 🔒 What Makes LOOKUP Different?

Conventional browser agents capture full-page DOM dumps and unredacted screenshots, streaming your sensitive passwords, payment details, cookies, and private communications directly to remote AI cloud APIs.

**LOOKUP establishes a local privacy enforcement boundary:**
- **Adaptive Local Perception**: Analyzes each step's context needs (DOM, OCR, local vision) and only captures what the task actually requires.
- **Multi-Signal Sensitive Detection**: Inspects DOM semantics, applies regex pattern matching with Luhn verification for payment cards/SSNs/tokens, and runs local OCR and vision heuristics.
- **Local Redaction & Minimization**: Masks or tokenizes sensitive credentials, account numbers, and visual regions prior to serialization.
- **Fail-Closed Privacy Gate**: Cryptographically validates sanitized payloads before egress. If safety cannot be confirmed or if uncertain, requires explicit user consent or blocks transmission.
- **Local Action Validation**: Evaluates AI-proposed actions locally, blocking interactions with protected regions or dangerous navigation schemes (`javascript:`, `file:`, etc.).
- **Multiple LLM Providers**: Support for OpenAI, Anthropic, Gemini, Ollama, Groq, Cerebras, and custom OpenAI-compatible models.

---

## 📊 Key Features

- **Local Privacy Enforcement Plane**: Strict, Balanced, and Custom privacy policies with real-time redaction.
- **Multi-Agent Architecture**: Collaborative Navigator and Planner agents coordinating task execution.
- **Human-in-the-Loop Consent**: Interactive modal prompts when ambiguous or high-risk context is detected.
- **Privacy Dashboard**: Live tracking of inspected contexts, redacted elements, and blocked transmission attempts.
- **Interactive Side Panel**: Chat interface with real-time privacy status indicator and visual reports.
- **Local Deterministic Demos**: Built-in test scenarios (Safe Shopping, Account Checkout with PII, Ambiguous ID).

**Not Supported:**
- Firefox, Safari, and other Chromium variants (Opera, Arc, etc.)

> **Note**: While Nanobrowser may function on other Chromium-based browsers, we recommend using Chrome or Edge for the best experience and guaranteed compatibility.


## 🚀 Quick Start

1. **Install from Chrome Web Store** (Stable Version):
   * Visit the [Nanobrowser Chrome Web Store page](https://chromewebstore.google.com/detail/nanobrowser/imbddededgmcgfhfpcjmijokokekbkal)
   * Click "Add to Chrome" button
   * Confirm the installation when prompted

> **Important Note**: For latest features, install from ["Manually Install Latest Version"](#-manually-install-latest-version) below, as Chrome Web Store version may be delayed due to review process.

2. **Configure Agent Models**:
   * Click the Nanobrowser icon in your toolbar to open the sidebar
   * Click the `Settings` icon (top right)
   * Add your LLM API keys
   * Choose which model to use for different agents (Navigator, Planner)

## 🔧 Manually Install Latest Version

To get the most recent version with all the latest features:

1. **Download**
    * Download the latest `nanobrowser.zip` file from the official Github [release page](https://github.com/nanobrowser/nanobrowser/releases).

2. **Install**:
    * Unzip `nanobrowser.zip`.
    * Open `chrome://extensions/` in Chrome
    * Enable `Developer mode` (top right)
    * Click `Load unpacked` (top left)
    * Select the unzipped `nanobrowser` folder.

3. **Configure Agent Models**
    * Click the Nanobrowser icon in your toolbar to open the sidebar
    * Click the `Settings` icon (top right).
    * Add your LLM API keys.
    * Choose which model to use for different agents (Navigator, Planner)

4. **Upgrading**:
    * Download the latest `nanobrowser.zip` file from the release page.
    * Unzip and replace your existing Nanobrowser files with the new ones.
    * Go to `chrome://extensions/` in Chrome and click the refresh icon on the Nanobrowser card.

## 🛠️ Build from Source

If you prefer to build Nanobrowser yourself, follow these steps:

1. **Prerequisites**:
   * [Node.js](https://nodejs.org/) (v22.12.0 or higher)
   * [pnpm](https://pnpm.io/installation) (v9.15.1 or higher)

2. **Clone the Repository**:
   ```bash
   git clone https://github.com/nanobrowser/nanobrowser.git
   cd nanobrowser
   ```

3. **Install Dependencies**:
   ```bash
   pnpm install
   ```

4. **Build the Extension**:
   ```bash
   pnpm build
   ```

5. **Load the Extension**:
   * The built extension will be in the `dist` directory
   * Follow the installation steps from the Manually Install section to load the extension into your browser

6. **Development Mode** (optional):
   ```bash
   pnpm dev
   ```

## 🤖 Choosing Your Models

Nanobrowser allows you to configure different LLM models for each agent to balance performance and cost. Here are recommended configurations:

### Better Performance
- **Planner**: Claude Sonnet 4
  - Better reasoning and planning capabilities
- **Navigator**: Claude Haiku 3.5
  - Efficient for web navigation tasks
  - Good balance of performance and cost

### Cost-Effective Configuration
- **Planner**: Claude Haiku or GPT-4o
  - Reasonable performance at lower cost
  - May require more iterations for complex tasks
- **Navigator**: Gemini 2.5 Flash or GPT-4o-mini
  - Lightweight and cost-efficient
  - Suitable for basic navigation tasks

### Local Models
- **Setup Options**:
  - Use Ollama or other custom OpenAI-compatible providers to run models locally
  - Zero API costs and complete privacy with no data leaving your machine

- **Recommended Models**:
  - **Qwen3-30B-A3B-Instruct-2507**
  - **Falcon3 10B**
  - **Qwen 2.5 Coder 14B**
  - **Mistral Small 24B**
  - [Latest test results from community](https://gist.github.com/maximus2600/75d60bf3df62986e2254d5166e2524cb) 
  - We welcome community experience sharing with other local models in our [Discord](https://discord.gg/NN3ABHggMK)

- **Prompt Engineering**:
  - Local models require more specific and cleaner prompts
  - Avoid high-level, ambiguous commands
  - Break complex tasks into clear, detailed steps
  - Provide explicit context and constraints

> **Note**: The cost-effective configuration may produce less stable outputs and require more iterations for complex tasks.

> **Tip**: Feel free to experiment with your own model configurations! Found a great combination? Share it with the community in our [Discord](https://discord.gg/NN3ABHggMK) to help others optimize their setup.

## 💡 See It In Action

Here are some powerful tasks you can accomplish with just a sentence:

1. **News Summary**:
   > "Go to TechCrunch and extract top 10 headlines from the last 24 hours"

2. **GitHub Research**:
   > "Look for the trending Python repositories on GitHub with most stars"

3. **Shopping Research**:
   > "Find a portable Bluetooth speaker on Amazon with a water-resistant design, under $50. It should have a minimum battery life of 10 hours"

## 🛠️ Roadmap

We're actively developing Nanobrowser with exciting features on the horizon, welcome to join us! 

Check out our detailed roadmap and upcoming features in our [GitHub Discussions](https://github.com/nanobrowser/nanobrowser/discussions/85). 

## 🤝 Contributing

**We need your help to make Nanobrowser even better!**  Contributions of all kinds are welcome:

*  **Share Prompts & Use Cases** 
   * Join our [Discord server](https://discord.gg/NN3ABHggMK).
   * share how you're using Nanobrowser.  Help us build a library of useful prompts and real-world use cases.
*  **Provide Feedback** 
   * Try Nanobrowser and give us feedback on its performance or suggest improvements in our [Discord server](https://discord.gg/NN3ABHggMK).
* **Contribute Code**
   * Check out our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute code to the project.
   * Submit pull requests for bug fixes, features, or documentation improvements.


We believe in the power of open source and community collaboration.  Join us in building the future of web automation!


## 🔒 Security

If you discover a security vulnerability, please **DO NOT** disclose it publicly through issues, pull requests, or discussions.

Instead, please create a [GitHub Security Advisory](https://github.com/nanobrowser/nanobrowser/security/advisories/new) to report the vulnerability responsibly. This allows us to address the issue before it's publicly disclosed.

We appreciate your help in keeping Nanobrowser and its users safe!

## 💬 Community

Join our growing community of developers and users:

- [Discord](https://discord.gg/NN3ABHggMK) - Chat with team and community
- [Twitter](https://x.com/nanobrowser_ai) - Follow for updates and announcements
- [GitHub Discussions](https://github.com/nanobrowser/nanobrowser/discussions) - Share ideas and ask questions

## 👏 Acknowledgments

Nanobrowser builds on top of other awesome open-source projects:

- [Browser Use](https://github.com/browser-use/browser-use)
- [Puppeteer](https://github.com/EmergenceAI/Agent-E)
- [Chrome Extension Boilerplate](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite)
- [LangChain](https://github.com/langchain-ai/langchainjs)

Huge thanks to their creators and contributors!

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

Made with ❤️ by the Nanobrowser Team. 

Like Nanobrowser? Give us a star 🌟 and join us in [Discord](https://discord.gg/NN3ABHggMK) | [X](https://x.com/nanobrowser_ai)

## 🔗 Our Other Products

- [DSH Plugin Directory](https://dsh.directory/): Discover installable community plugins for DeepSeek Harness by category, popularity, and activity.

## ⚠️ DISCLAIMER ON DERIVATIVE PROJECTS

**We explicitly *DO NOT* endorse, support, or participate in any** projects involving cryptocurrencies, tokens, NFTs, or other blockchain-related applications **based on this codebase.**

**Any such derivative projects are NOT Affiliated with, or maintained by, or in any way connected to the official Nanobrowser project or its core team.**

**We assume NO LIABILITY for any losses, damages, or issues arising from the use of third-party derivative projects. Users interact with these projects at their own risk.**

**We reserve the right to publicly distance ourselves from any misuse or misleading use of our name, codebase, or brand.**

We encourage open-source innovation but urge our community to be discerning and cautious. Please ensure you understand the risks before using any software or service built upon our codebase by independent developers.

