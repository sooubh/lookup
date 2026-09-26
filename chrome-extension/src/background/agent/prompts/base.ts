import { HumanMessage, type SystemMessage } from '@langchain/core/messages';
import type { AgentContext } from '@src/background/agent/types';
import { wrapUntrustedContent } from '../messages/utils';
import { createLogger } from '@src/background/log';
import { PrivacyPipeline } from '../../privacy/core/PrivacyPipeline';
import type { RawBrowserContext } from '../../privacy/core/PrivacyTypes';
import { privacySettingsStore } from '@extension/storage';

import { extractRawDomElementsFromBrowserState } from '../../privacy/context/DomExtractor';

const logger = createLogger('BasePrompt');

/**
 * Abstract base class for all prompt types in LOOKUP
 */
abstract class BasePrompt {
  /**
   * Returns the system message that defines the AI's role and behavior
   * @returns SystemMessage from LangChain
   */
  abstract getSystemMessage(): SystemMessage;

  /**
   * Returns the user message for the specific prompt type
   * @param context - Optional context data needed for generating the user message
   * @returns HumanMessage from LangChain
   */
  abstract getUserMessage(context: AgentContext): Promise<HumanMessage>;

  /**
   * Builds the user message containing the sanitized browser state.
   * Intercepts raw browser context and passes it through the LOOKUP Local Privacy Gateway
   * before remote model transmission.
   *
   * @param context - The agent context
   * @returns HumanMessage from LangChain with sanitized context
   */
  async buildBrowserStateUserMessage(context: AgentContext): Promise<HumanMessage> {
    const browserState = await context.browserContext.getState(context.options.useVision);
    const rawElementsText = browserState.elementTree.clickableElementsToString(context.options.includeAttributes);

    // 1. Ensure PrivacyPipeline instance
    if (!context.privacyPipeline) {
      context.privacyPipeline = new PrivacyPipeline();
    }

    // 2. Load current privacy settings
    let strictness: 'strict' | 'balanced' | 'custom' = 'strict';
    try {
      const storedSettings = await privacySettingsStore.getSettings();
      if (storedSettings?.mode) {
        strictness = storedSettings.mode;
      }
    } catch {
      strictness = 'strict';
    }

    // Convert elementTree and selectorMap into structured RawDomElement[] for DOM detection
    const rawDomElements = extractRawDomElementsFromBrowserState(browserState.elementTree, browserState.selectorMap);

    // 3. Construct RawBrowserContext for local evaluation
    const rawContext: RawBrowserContext = {
      task: context.taskText || 'Browser automation task',
      step: context.nSteps,
      pageUrl: browserState.url,
      pageTitle: browserState.title,
      dom: rawDomElements,
      screenshot: browserState.screenshot || undefined,
      tabs: (browserState.tabs || []).map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        active: tab.id === browserState.tabId,
      })),
      metadata: {
        rawElementsText,
      },
    };

    // 4. Intercept and sanitize context through the privacy pipeline
    logger.info(`[PrivacyGateway] Intercepting context for task: "${rawContext.task}" in ${strictness} mode`);
    const sanitizedContext = await context.privacyPipeline.process(rawContext, {
      strictness,
    });
    context.lastSanitizedContext = sanitizedContext;

    // 5. Redact interactive elements text
    const textRedactor = context.privacyPipeline.getRedactionEngine().getTextRedactor();
    const redactedDom = textRedactor.redact(rawElementsText);
    const sanitizedElementsText = redactedDom.redactedText;

    const redactionCount = (redactedDom.records || redactedDom.redactions || []).length;
    if (redactionCount > 0) {
      logger.info(`[PrivacyGateway] Protected ${redactionCount} sensitive item(s) in DOM context`);
      try {
        await privacySettingsStore.incrementCounter('redactedContexts');
      } catch {
        // Storage counter increment error ignored
      }
    }

    try {
      await privacySettingsStore.incrementCounter('inspectedContexts');
      await privacySettingsStore.incrementCounter('sanitizedContexts');
    } catch {
      // Storage counter increment error ignored
    }

    let formattedElementsText = '';
    if (sanitizedElementsText !== '') {
      const scrollInfo = `[Scroll info of current page] window.scrollY: ${browserState.scrollY}, document.body.scrollHeight: ${browserState.scrollHeight}, window.visualViewport.height: ${browserState.visualViewportHeight}, visual viewport height as percentage of scrollable distance: ${Math.round((browserState.visualViewportHeight / (browserState.scrollHeight - browserState.visualViewportHeight)) * 100)}%\n`;
      const elementsText = wrapUntrustedContent(sanitizedElementsText);
      formattedElementsText = `${scrollInfo}[Start of page]\n${elementsText}\n[End of page]\n`;
    } else {
      formattedElementsText = 'empty page';
    }

    let stepInfoDescription = '';
    if (context.stepInfo) {
      stepInfoDescription = `Current step: ${context.stepInfo.stepNumber + 1}/${context.stepInfo.maxSteps}`;
    }

    const timeStr = new Date().toISOString().slice(0, 16).replace('T', ' '); // Format: YYYY-MM-DD HH:mm
    stepInfoDescription += `Current date and time: ${timeStr}`;

    let actionResultsDescription = '';
    if (context.actionResults && context.actionResults.length > 0) {
      for (let i = 0; i < context.actionResults.length; i++) {
        const result = context.actionResults[i];
        if (result.extractedContent) {
          const redactedContent = textRedactor.redact(result.extractedContent).redactedText;
          actionResultsDescription += `\nAction result ${i + 1}/${context.actionResults.length}: ${redactedContent}`;
        }
        if (result.error) {
          const error = result.error.split('\n').pop() || '';
          const redactedError = textRedactor.redact(error).redactedText;
          actionResultsDescription += `\nAction error ${i + 1}/${context.actionResults.length}: ...${redactedError}`;
        }
      }
    }

    const currentTab = `{id: ${browserState.tabId}, url: ${browserState.url}, title: ${browserState.title}}`;
    const otherTabs = (browserState.tabs || [])
      .filter(tab => tab.id !== browserState.tabId)
      .map(tab => `- {id: ${tab.id}, url: ${tab.url}, title: ${tab.title}}`);

    const stateDescription = `
[Task history memory ends]
[Current state starts here]
[LOOKUP Privacy Gate: Context evaluated & sanitized - Mode: ${strictness.toUpperCase()}]
The following is one-time information - if you need to remember it write it to memory:
Current tab: ${currentTab}
Other available tabs:
  ${otherTabs.join('\n')}
Interactive elements from top layer of the current page inside the viewport:
${formattedElementsText}
${stepInfoDescription}
${actionResultsDescription}
`;

    // Only attach screenshot if vision is enabled, sanitizedContext approved, and sanitized image exists
    const canSendScreenshot =
      Boolean(browserState.screenshot) &&
      Boolean(context.options.useVision) &&
      sanitizedContext.privacy.status === 'approved' &&
      sanitizedContext.image !== undefined;

    if (canSendScreenshot && sanitizedContext.image?.dataUrl) {
      return new HumanMessage({
        content: [
          { type: 'text', text: stateDescription },
          {
            type: 'image_url',
            image_url: { url: sanitizedContext.image.dataUrl },
          },
        ],
      });
    }

    return new HumanMessage(stateDescription);
  }
}

export { BasePrompt };
