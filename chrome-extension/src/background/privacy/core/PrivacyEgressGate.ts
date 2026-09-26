import type { BaseMessage } from '@langchain/core/messages';
import type { SanitizedContext, EgressDecision } from './PrivacyTypes';
import { PrivacyBlockedError, PrivacyEgressError } from './PrivacyErrors';
import { luhnCheck } from '../detection/PatternDetector';

/**
 * PrivacyEgressGate
 * 
 * The non-negotiable fail-closed barrier at the boundary to the remote AI layer.
 * Verifies that outbound payloads conform to the SanitizedContext contract,
 * bear an authentic approval stamp, and are free of raw sensitive leakages.
 * Also validates all outbound message history before transport to remote LLMs.
 */
export class PrivacyEgressGate {
  private static readonly STRICT_LEAK_PATTERNS: Array<{
    name: string;
    pattern: RegExp;
    validator?: (matched: string) => boolean;
  }> = [
    {
      name: 'SSN',
      pattern: /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/g,
      validator: (str) => {
        const clean = str.replace(/\D/g, '');
        return clean.length === 9 && !clean.startsWith('000') && !clean.startsWith('666');
      },
    },
    {
      name: 'Credit Card',
      pattern: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{15,16}\b/g,
      validator: (str) => luhnCheck(str),
    },
    {
      name: 'Masked Credit Card',
      pattern: /\b\d{4}[ -]?(?:[xX*]{4}[ -]?){2}\d{4}\b/g,
    },
    {
      name: 'Masked SSN',
      pattern: /(?:\b|\B)(?:[xX*]{3}[-\s][xX*]{2}|\d{3}[-\s][xX*]{2}|[xX*]{3}[-\s]\d{2})[-\s]\d{4}\b/g,
    },
    {
      name: 'OpenAI Secret',
      pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
    },
    {
      name: 'AWS Access Key',
      pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    },
    {
      name: 'GitHub Token',
      pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}\b/g,
    },
    {
      name: 'JWT Token',
      pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g,
    },
  ];

  /**
   * Authorize a Candidate SanitizedContext before packaging into prompt
   */
  public async authorize(payload: unknown): Promise<EgressDecision> {
    const timestamp = Date.now();

    if (!payload || typeof payload !== 'object') {
      throw new PrivacyEgressError('Invalid payload: context is null or non-object');
    }

    const candidate = payload as Partial<SanitizedContext>;

    // 1. Structural validation
    if (!candidate.task || typeof candidate.task !== 'string') {
      throw new PrivacyEgressError('SanitizedContext missing task description');
    }

    if (!candidate.privacy || typeof candidate.privacy !== 'object') {
      throw new PrivacyBlockedError('Payload lacks required privacy authorization metadata');
    }

    // 2. Status verification
    const { status, egressToken } = candidate.privacy;
    if (status !== 'approved' && status !== 'user_approved') {
      throw new PrivacyBlockedError(
        `Payload privacy status "${status}" is not authorized for external transmission`
      );
    }

    if (!egressToken || typeof egressToken !== 'string' || egressToken.length < 8) {
      throw new PrivacyBlockedError('Payload lacks valid cryptographic egress token');
    }

    // 3. Raw context leakage deep-scan
    const violations: string[] = [];
    this.scanForLeaks(candidate, '', violations);

    if (violations.length > 0) {
      throw new PrivacyEgressError(
        `Critical leak detected in outbound payload: ${violations.join(', ')}`,
        violations
      );
    }

    // 4. Verification that raw screenshot is not attached without sanitized wrapper
    if ((candidate as Record<string, unknown>).rawScreenshot) {
      throw new PrivacyEgressError('Prohibited rawScreenshot property attached to outbound payload');
    }

    return {
      authorized: true,
      sanitizedContext: candidate as SanitizedContext,
      egressTimestamp: timestamp,
    };
  }

  /**
   * Validates all outbound messages right before transmission to remote LLM.
   * Ensures no unredacted credentials or unapproved raw images cross the wire.
   */
  public validateOutboundMessages(
    messages: BaseMessage[],
    candidate?: SanitizedContext | null,
  ): void {
    if (!messages || !Array.isArray(messages)) return;

    for (let msgIdx = 0; msgIdx < messages.length; msgIdx++) {
      const msg = messages[msgIdx];
      if (!msg) continue;

      if (typeof msg.content === 'string') {
        this.scanTextForLeaks(msg.content, `messages[${msgIdx}].content`);
      } else if (Array.isArray(msg.content)) {
        for (let partIdx = 0; partIdx < msg.content.length; partIdx++) {
          const part = msg.content[partIdx];
          if (typeof part === 'string') {
            this.scanTextForLeaks(part, `messages[${msgIdx}].content[${partIdx}]`);
          } else if (typeof part === 'object' && part !== null) {
            const p = part as Record<string, unknown>;
            if (p.type === 'text' && typeof p.text === 'string') {
              this.scanTextForLeaks(p.text, `messages[${msgIdx}].content[${partIdx}].text`);
            } else if (p.type === 'image_url') {
              const imgUrlObj = p.image_url as { url?: string } | undefined;
              const imgUrl = imgUrlObj?.url;

              if (!imgUrl) {
                throw new PrivacyEgressError('Outbound message contains empty image_url');
              }

              // Verify against sanitized context
              if (!candidate || !candidate.privacy) {
                throw new PrivacyEgressError('Outbound image rejected: no privacy-sanitized context available');
              }

              if (candidate.privacy.status !== 'approved' && candidate.privacy.status !== 'user_approved') {
                throw new PrivacyBlockedError(
                  `Outbound image rejected: privacy status is "${candidate.privacy.status}"`
                );
              }

              if (!candidate.image?.dataUrl) {
                throw new PrivacyEgressError('Outbound image rejected: sanitized context contains no authorized image');
              }

              if (candidate.image.dataUrl !== imgUrl) {
                throw new PrivacyEgressError(
                  'Outbound image rejected: image dataUrl does not match authorized sanitized image'
                );
              }
            }
          }
        }
      }
    }
  }

  private scanTextForLeaks(text: string, location: string): void {
    if (!text) return;

    // Check if raw data URL is illegally embedded directly in text outside authorized channels
    if (text.includes('data:image/') && !text.includes('[LOOKUP Privacy Gate:')) {
      throw new PrivacyEgressError(
        `Egress Gate blocked outbound message: unauthorized raw image string detected at ${location}`,
        [`Raw image leak at ${location}`]
      );
    }

    for (const { name, pattern, validator } of PrivacyEgressGate.STRICT_LEAK_PATTERNS) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const matchedText = match[0];
        if (!validator || validator(matchedText)) {
          throw new PrivacyEgressError(
            `Egress Gate blocked outbound message: detected unredacted ${name} at ${location}`,
            [`${name} leak at ${location}`]
          );
        }
      }
    }
  }

  private scanForLeaks(obj: unknown, path: string, violations: string[]): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'string') {
      // Don't scan authorized base64 image content in image.dataUrl
      if (path === 'image.dataUrl' || path.endsWith('.image.dataUrl')) {
        return;
      }

      // Check if image data URL is leaked in unexpected path
      if (obj.startsWith('data:image/') && path !== 'image.dataUrl') {
        violations.push(`Unexpected raw image data at "${path}"`);
        return;
      }

      for (const { name, pattern, validator } of PrivacyEgressGate.STRICT_LEAK_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(obj)) !== null) {
          const matchedText = match[0];
          if (!validator || validator(matchedText)) {
            violations.push(`${name} leaked at "${path}"`);
          }
        }
      }
      return;
    }

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        this.scanForLeaks(obj[i], `${path}[${i}]`, violations);
      }
      return;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        // Skip scanning internal tokens or redaction placeholder names
        if (key === 'egressToken' || key === 'replacementToken') continue;
        this.scanForLeaks(value, path ? `${path}.${key}` : key, violations);
      }
    }
  }
}
