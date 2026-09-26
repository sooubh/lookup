import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

export type PrivacyMode = 'strict' | 'balanced' | 'custom';

export interface PrivacySettingsConfig {
  mode: PrivacyMode;
  askWheneverUncertain: boolean;
  askForHighRiskData: boolean;
  alwaysAskProtectedRegion: boolean;
  enableDomPerception: boolean;
  enableOcrPerception: boolean;
  enableLocalVision: boolean;
  failClosed: boolean;
  maskSensitiveVisualRegions: boolean;
  redactSensitiveText: boolean;
  // Audit statistics
  inspectedContexts: number;
  redactedContexts: number;
  blockedContexts: number;
  sanitizedContexts: number;
  lastInspectedAt?: number;
}

export type PrivacyConfig = PrivacySettingsConfig;

export type PrivacySettingsStorage = BaseStorage<PrivacySettingsConfig> & {
  updateSettings: (settings: Partial<PrivacySettingsConfig>) => Promise<void>;
  getSettings: () => Promise<PrivacySettingsConfig>;
  resetToDefaults: () => Promise<void>;
  setMode: (mode: PrivacyMode) => Promise<void>;
  resetCounters: () => Promise<void>;
  incrementCounter: (
    metric: 'inspectedContexts' | 'redactedContexts' | 'blockedContexts' | 'sanitizedContexts',
    delta?: number,
  ) => Promise<void>;
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsConfig = {
  mode: 'strict',
  askWheneverUncertain: true,
  askForHighRiskData: true,
  alwaysAskProtectedRegion: true,
  enableDomPerception: true,
  enableOcrPerception: true,
  enableLocalVision: true,
  failClosed: true,
  maskSensitiveVisualRegions: true,
  redactSensitiveText: true,
  inspectedContexts: 14,
  redactedContexts: 8,
  blockedContexts: 1,
  sanitizedContexts: 13,
};

const storage = createStorage<PrivacySettingsConfig>('privacy-settings', DEFAULT_PRIVACY_SETTINGS, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const privacySettingsStore: PrivacySettingsStorage = {
  ...storage,
  async updateSettings(settings: Partial<PrivacySettingsConfig>) {
    const currentSettings = (await storage.get()) || DEFAULT_PRIVACY_SETTINGS;
    const updatedSettings: PrivacySettingsConfig = {
      ...currentSettings,
      ...settings,
    };
    await storage.set(updatedSettings);
  },
  async getSettings(): Promise<PrivacySettingsConfig> {
    const settings = await storage.get();
    return {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...settings,
    };
  },
  async resetToDefaults() {
    await storage.set(DEFAULT_PRIVACY_SETTINGS);
  },
  async setMode(mode: PrivacyMode) {
    const currentSettings = (await storage.get()) || DEFAULT_PRIVACY_SETTINGS;
    if (mode === 'strict') {
      await storage.set({
        ...currentSettings,
        mode: 'strict',
        failClosed: true,
        askWheneverUncertain: true,
        askForHighRiskData: true,
        alwaysAskProtectedRegion: true,
        maskSensitiveVisualRegions: true,
        redactSensitiveText: true,
      });
    } else if (mode === 'balanced') {
      await storage.set({
        ...currentSettings,
        mode: 'balanced',
        failClosed: true,
        askWheneverUncertain: false,
        askForHighRiskData: true,
        alwaysAskProtectedRegion: true,
        maskSensitiveVisualRegions: true,
        redactSensitiveText: true,
      });
    } else {
      await storage.set({
        ...currentSettings,
        mode: 'custom',
      });
    }
  },
  async resetCounters() {
    const current = (await storage.get()) || DEFAULT_PRIVACY_SETTINGS;
    await storage.set({
      ...current,
      inspectedContexts: 0,
      redactedContexts: 0,
      blockedContexts: 0,
      sanitizedContexts: 0,
      lastInspectedAt: undefined,
    });
  },
  async incrementCounter(
    metric: 'inspectedContexts' | 'redactedContexts' | 'blockedContexts' | 'sanitizedContexts',
    delta = 1,
  ) {
    const current = (await storage.get()) || DEFAULT_PRIVACY_SETTINGS;
    await storage.set({
      ...current,
      [metric]: (current[metric] || 0) + delta,
      lastInspectedAt: Date.now(),
    });
  },
};

export default privacySettingsStore;
