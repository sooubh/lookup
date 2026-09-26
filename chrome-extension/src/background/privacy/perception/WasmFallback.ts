/**
 * WasmFallback
 * 
 * Execution wrapper for CPU-bound WebAssembly fallback processing
 * when WebGPU acceleration is unavailable.
 */
export class WasmFallback {
  private static cachedAvailability: boolean | null = null;

  public static isAvailable(): boolean {
    if (this.cachedAvailability !== null) {
      return this.cachedAvailability;
    }

    try {
      if (
        typeof WebAssembly === 'object' &&
        typeof WebAssembly.instantiate === 'function'
      ) {
        const module = new WebAssembly.Module(
          Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
        );
        if (module instanceof WebAssembly.Module) {
          this.cachedAvailability =
            new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
        } else {
          this.cachedAvailability = false;
        }
      } else {
        this.cachedAvailability = false;
      }
    } catch {
      this.cachedAvailability = false;
    }

    return this.cachedAvailability;
  }

  public static async execute<T>(fn: () => Promise<T> | T): Promise<T> {
    return await fn();
  }
}
