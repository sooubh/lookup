import type { BoundingBox } from '../core/PrivacyTypes';

export interface OcrFinding {
  text: string;
  bbox: BoundingBox;
  confidence: number;
}

export interface OcrProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  recognize(imageDataUrl: string, regions?: BoundingBox[]): Promise<OcrFinding[]>;
}

/**
 * In-memory / Mock OCR provider for rapid local testing and offline execution.
 */
export class MockOcrProvider implements OcrProvider {
  public name = 'MockOcrProvider';
  private cannedResponses: Map<string, OcrFinding[]> = new Map();

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public registerCannedResponse(imageSnippetOrKey: string, findings: OcrFinding[]): void {
    this.cannedResponses.set(imageSnippetOrKey, findings);
  }

  public async recognize(imageDataUrl: string, _regions?: BoundingBox[]): Promise<OcrFinding[]> {
    void _regions;
    for (const [key, findings] of this.cannedResponses.entries()) {
      if (imageDataUrl.includes(key)) {
        return [...findings];
      }
    }
    return [];
  }
}

/**
 * Tesseract / Web Worker OCR provider fallback stub.
 */
export class TesseractOcrProvider implements OcrProvider {
  public name = 'TesseractOcrProvider';

  public async isAvailable(): Promise<boolean> {
    return typeof (globalThis as unknown as { Tesseract?: unknown }).Tesseract !== 'undefined';
  }

  public async recognize(_imageDataUrl: string, _regions?: BoundingBox[]): Promise<OcrFinding[]> {
    void _imageDataUrl;
    void _regions;
    // If Tesseract is present in worker or page scope, call it; otherwise return empty
    return [];
  }
}

/**
 * OcrEngine
 * 
 * Orchestrates OCR providers with priority fallback.
 */
export class OcrEngine {
  private providers: OcrProvider[] = [];
  private mockProvider: MockOcrProvider;

  constructor(customProviders?: OcrProvider[]) {
    this.mockProvider = new MockOcrProvider();
    if (customProviders && customProviders.length > 0) {
      this.providers = [...customProviders];
    } else {
      this.providers = [new TesseractOcrProvider(), this.mockProvider];
    }
  }

  public getMockProvider(): MockOcrProvider {
    return this.mockProvider;
  }

  public registerProvider(provider: OcrProvider, prepend = false): void {
    if (prepend) {
      this.providers.unshift(provider);
    } else {
      this.providers.push(provider);
    }
  }

  public async recognize(
    imageDataUrl: string,
    regions?: BoundingBox[]
  ): Promise<OcrFinding[]> {
    for (const provider of this.providers) {
      try {
        if (await provider.isAvailable()) {
          const findings = await provider.recognize(imageDataUrl, regions);
          if (findings.length > 0) {
            return findings;
          }
        }
      } catch (err) {
        console.warn(`[OcrEngine] Provider ${provider.name} failed:`, err);
      }
    }

    return [];
  }
}
