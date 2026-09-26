import type { ContextNeed } from '../core/PrivacyTypes';

/**
 * TaskContextAnalyzer
 * 
 * Determines the minimum required sensory representation (DOM, Screenshot, OCR, Vision)
 * based on the user task description and current agent execution step.
 */
export class TaskContextAnalyzer {
  private static readonly OCR_KEYWORDS = [
    'ocr',
    'image text',
    'text in image',
    'read image',
    'canvas text',
    'captcha',
    'error image',
    'screenshot text',
    'read receipt',
    'banner text',
    'poster',
  ];

  private static readonly VISION_KEYWORDS = [
    'face',
    'photo',
    'diagram',
    'chart',
    'graph',
    'layout',
    'visual appearance',
    'look like',
    'color of',
    'image matching',
    'id card',
    'passport photo',
    'profile picture',
  ];

  private static readonly SCREENSHOT_KEYWORDS = [
    'screenshot',
    'visual',
    'look at page',
    'how it looks',
    'pixel',
    'canvas',
    'render',
    'ui preview',
  ];

  public analyze(
    task: string,
    _metadata?: { step?: number; pageUrl?: string; pageTitle?: string }
  ): ContextNeed {
    void _metadata;
    const lower = task.toLowerCase();

    const needsOcr = TaskContextAnalyzer.OCR_KEYWORDS.some((kw) => lower.includes(kw));
    const needsVision = TaskContextAnalyzer.VISION_KEYWORDS.some((kw) => lower.includes(kw));
    const explicitlyNeedsScreenshot = TaskContextAnalyzer.SCREENSHOT_KEYWORDS.some((kw) =>
      lower.includes(kw)
    );

    const needsScreenshot = needsOcr || needsVision || explicitlyNeedsScreenshot;

    // DOM is usually needed for standard browser automation unless it is purely visual/image reasoning
    const needsDom = !needsVision || lower.includes('click') || lower.includes('find') || lower.includes('page');

    const requiredFields = this.extractRequiredFields(lower);

    let reason = 'Standard DOM interaction required for task execution.';
    if (needsVision && needsOcr) {
      reason = 'Visual layout semantics and embedded text extraction required.';
    } else if (needsVision) {
      reason = 'Visual semantic analysis required for task-relevant image inspection.';
    } else if (needsOcr) {
      reason = 'Embedded image/canvas text extraction required via OCR.';
    } else if (needsScreenshot) {
      reason = 'Visual page context required by task instruction.';
    } else {
      reason = 'DOM-only context sufficient for task automation.';
    }

    return {
      needsDom,
      needsScreenshot,
      needsOcr,
      needsVision,
      requiredFields,
      reason,
    };
  }

  private extractRequiredFields(taskLower: string): string[] {
    const fields: string[] = [];
    const candidates = [
      'price',
      'title',
      'name',
      'description',
      'email',
      'phone',
      'button',
      'input',
      'search',
      'submit',
      'cart',
      'checkout',
      'product',
      'rating',
    ];

    for (const c of candidates) {
      if (taskLower.includes(c)) {
        fields.push(c);
      }
    }

    return fields;
  }
}
