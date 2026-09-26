import type { BoundingBox } from '../core/PrivacyTypes';

export interface CapturedScreenshot {
  dataUrl: string;
  width: number;
  height: number;
  regions?: Array<{
    bbox: BoundingBox;
    dataUrl?: string;
  }>;
}

/**
 * ScreenshotCollector
 * 
 * Captures visible viewport or selected bounding box sub-regions.
 * Operates safely both in browser extension runtime and in headless/node testing environments.
 */
export class ScreenshotCollector {
  public async captureViewport(
    existingDataUrl?: string,
    dimensions?: { width: number; height: number }
  ): Promise<CapturedScreenshot | null> {
    if (existingDataUrl) {
      return {
        dataUrl: existingDataUrl,
        width: dimensions?.width || 1280,
        height: dimensions?.height || 720,
      };
    }

    // If running in browser extension environment with chrome.tabs
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.captureVisibleTab) {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          chrome.tabs.captureVisibleTab({ format: 'png' }, (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('captureVisibleTab returned empty result'));
            }
          });
        });

        return {
          dataUrl,
          width: dimensions?.width || 1280,
          height: dimensions?.height || 720,
        };
      } catch {
        return null;
      }
    }

    return null;
  }

  public extractRegions(
    screenshot: CapturedScreenshot,
    regions: BoundingBox[]
  ): CapturedScreenshot {
    // Return screenshot annotated with specific requested target regions
    return {
      ...screenshot,
      regions: regions.map((bbox) => ({
        bbox,
        // In full browser with canvas, can slice pixel region; in service worker, annotate bbox
        dataUrl: screenshot.dataUrl,
      })),
    };
  }
}
