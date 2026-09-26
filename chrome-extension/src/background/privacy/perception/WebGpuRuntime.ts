/**
 * WebGpuRuntime
 * 
 * Safe detection and execution wrapper for browser WebGPU compute tasks.
 * Fails gracefully to false when running in Node, headless tests, or unsupported browsers.
 */
export class WebGpuRuntime {
  private static cachedAvailability: boolean | null = null;

  public static async isAvailable(): Promise<boolean> {
    if (this.cachedAvailability !== null) {
      return this.cachedAvailability;
    }

    try {
      if (
        typeof navigator !== 'undefined' &&
        'gpu' in navigator &&
        typeof (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu
          ?.requestAdapter === 'function'
      ) {
        const adapter = await (
          navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }
        ).gpu.requestAdapter();
        this.cachedAvailability = adapter !== null && adapter !== undefined;
      } else {
        this.cachedAvailability = false;
      }
    } catch {
      this.cachedAvailability = false;
    }

    return this.cachedAvailability;
  }

  public static async requestDevice(): Promise<unknown | null> {
    const available = await this.isAvailable();
    if (!available) return null;

    try {
      const adapter = await (
        navigator as unknown as {
          gpu: {
            requestAdapter: () => Promise<{ requestDevice: () => Promise<unknown> } | null>;
          };
        }
      ).gpu.requestAdapter();

      if (!adapter) return null;
      return await adapter.requestDevice();
    } catch {
      return null;
    }
  }

  public static resetCache(): void {
    this.cachedAvailability = null;
  }
}
