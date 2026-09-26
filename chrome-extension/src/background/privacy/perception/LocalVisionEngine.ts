import type { SensitiveCategory, BoundingBox } from '../core/PrivacyTypes';
import { WebGpuRuntime } from './WebGpuRuntime';
import { WasmFallback } from './WasmFallback';

export interface VisionFinding {
  category: SensitiveCategory;
  bbox: BoundingBox;
  confidence: number;
  label: string;
}

export interface LocalVisionProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  analyze(imageDataUrl: string): Promise<VisionFinding[]>;
}

export class WebGpuVisionProvider implements LocalVisionProvider {
  public name = 'WebGpuVisionProvider';

  public async isAvailable(): Promise<boolean> {
    return await WebGpuRuntime.isAvailable();
  }

  public async analyze(_imageDataUrl: string): Promise<VisionFinding[]> {
    void _imageDataUrl;
    // If WebGPU model pipeline is initialized, run inference
    return [];
  }
}

export class WasmVisionProvider implements LocalVisionProvider {
  public name = 'WasmVisionProvider';

  public async isAvailable(): Promise<boolean> {
    return WasmFallback.isAvailable();
  }

  public async analyze(_imageDataUrl: string): Promise<VisionFinding[]> {
    void _imageDataUrl;
    // WASM quantized model execution
    return [];
  }
}

export class HeuristicVisionProvider implements LocalVisionProvider {
  public name = 'HeuristicVisionProvider';
  private cannedResponses: Map<string, VisionFinding[]> = new Map();

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public registerCannedResponse(key: string, findings: VisionFinding[]): void {
    this.cannedResponses.set(key, findings);
  }

  public async analyze(imageDataUrl: string): Promise<VisionFinding[]> {
    for (const [key, findings] of this.cannedResponses.entries()) {
      if (imageDataUrl.includes(key)) {
        return [...findings];
      }
    }
    return [];
  }
}

/**
 * LocalVisionEngine
 * 
 * Coordinates local vision perception using tiered runtime selection:
 * WebGPU -> WASM/CPU -> Heuristic.
 */
export class LocalVisionEngine {
  private providers: LocalVisionProvider[];
  private heuristicProvider: HeuristicVisionProvider;

  constructor(customProviders?: LocalVisionProvider[]) {
    this.heuristicProvider = new HeuristicVisionProvider();
    if (customProviders && customProviders.length > 0) {
      this.providers = [...customProviders];
    } else {
      this.providers = [
        new WebGpuVisionProvider(),
        new WasmVisionProvider(),
        this.heuristicProvider,
      ];
    }
  }

  public getHeuristicProvider(): HeuristicVisionProvider {
    return this.heuristicProvider;
  }

  public registerProvider(provider: LocalVisionProvider, prepend = false): void {
    if (prepend) {
      this.providers.unshift(provider);
    } else {
      this.providers.push(provider);
    }
  }

  public async analyze(imageDataUrl: string): Promise<VisionFinding[]> {
    for (const provider of this.providers) {
      try {
        if (await provider.isAvailable()) {
          const findings = await provider.analyze(imageDataUrl);
          if (findings.length > 0) {
            return findings;
          }
        }
      } catch (err) {
        console.warn(`[LocalVisionEngine] Provider ${provider.name} failed:`, err);
      }
    }
    return [];
  }
}
