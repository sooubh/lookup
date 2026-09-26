import { useState, useEffect, useCallback } from 'react';
import {
  type PrivacySettingsConfig,
  type PrivacyMode,
  privacySettingsStore,
  DEFAULT_PRIVACY_SETTINGS,
} from '@extension/storage';
import { Button } from '@extension/ui';
import {
  FiShield,
  FiEye,
  FiFileText,
  FiLock,
  FiAlertTriangle,
  FiCheckCircle,
  FiRefreshCw,
  FiSlash,
  FiLayers,
} from 'react-icons/fi';

interface PrivacySettingsProps {
  isDarkMode?: boolean;
}

export const PrivacySettings = ({ isDarkMode = false }: PrivacySettingsProps) => {
  const [settings, setSettings] = useState<PrivacySettingsConfig>(DEFAULT_PRIVACY_SETTINGS);
  const [isResetting, setIsResetting] = useState(false);

  const loadSettings = useCallback(async () => {
    const data = await privacySettingsStore.getSettings();
    setSettings(data);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleModeChange = async (mode: PrivacyMode) => {
    await privacySettingsStore.setMode(mode);
    await loadSettings();
  };

  const handleToggle = async <K extends keyof PrivacySettingsConfig>(key: K, value: PrivacySettingsConfig[K]) => {
    const newSettings: Partial<PrivacySettingsConfig> = { [key]: value };
    if (settings.mode !== 'custom') {
      newSettings.mode = 'custom';
    }
    setSettings((prev: PrivacySettingsConfig) => ({ ...prev, ...newSettings }));
    await privacySettingsStore.updateSettings(newSettings);
    await loadSettings();
  };

  const handleResetCounters = async () => {
    setIsResetting(true);
    await privacySettingsStore.resetCounters();
    await loadSettings();
    setTimeout(() => setIsResetting(false), 500);
  };

  const handleResetDefaults = async () => {
    await privacySettingsStore.resetToDefaults();
    await loadSettings();
  };

  return (
    <section className="space-y-6">
      {/* Header Banner */}
      <div
        className={`rounded-2xl border ${
          isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
        } p-6 text-left shadow-xs`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <FiShield className="h-6 w-6" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Privacy & Local Perception
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Configure local trust boundaries, real-time perception filters, and outbound egress rules.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              settings.mode === 'strict'
                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                : settings.mode === 'balanced'
                  ? 'border border-sky-500/20 bg-sky-500/10 text-sky-500'
                  : 'border border-amber-500/20 bg-amber-500/10 text-amber-500'
            }`}>
            <FiCheckCircle className="h-3.5 w-3.5" />
            {settings.mode} Policy Active
          </span>
        </div>
      </div>

      {/* Mode Selector Cards */}
      <div
        className={`rounded-2xl border ${
          isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
        } p-6 shadow-xs`}>
        <h3 className={`mb-1 text-base font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          Privacy Mode
        </h3>
        <p className={`mb-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Select the operational policy applied to all browser contexts before external AI dispatch.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Strict Card */}
          <div
            onClick={() => handleModeChange('strict')}
            onKeyDown={e => e.key === 'Enter' && handleModeChange('strict')}
            tabIndex={0}
            role="button"
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              settings.mode === 'strict'
                ? isDarkMode
                  ? 'border-sky-500 bg-sky-950/40 ring-2 ring-sky-500/40'
                  : 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/30'
                : isDarkMode
                  ? 'border-slate-700 bg-slate-800/70 hover:border-slate-600'
                  : 'border-gray-200 bg-gray-50/60 hover:border-gray-300'
            }`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold text-sky-500">Strict</span>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-300">
                Recommended
              </span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Full local perception. All sensitive categories automatically masked. Fail-closed egress. Prompts on any
              ambiguity.
            </p>
          </div>

          {/* Balanced Card */}
          <div
            onClick={() => handleModeChange('balanced')}
            onKeyDown={e => e.key === 'Enter' && handleModeChange('balanced')}
            tabIndex={0}
            role="button"
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              settings.mode === 'balanced'
                ? isDarkMode
                  ? 'border-sky-500 bg-sky-950/40 ring-2 ring-sky-500/40'
                  : 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/30'
                : isDarkMode
                  ? 'border-slate-700 bg-slate-800/70 hover:border-slate-600'
                  : 'border-gray-200 bg-gray-50/60 hover:border-gray-300'
            }`}>
            <div className="mb-2 flex items-center justify-between">
              <span className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Balanced</span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Auto-redacts financial credentials and passwords. Prompts only when high-risk context is ambiguous.
            </p>
          </div>

          {/* Custom Card */}
          <div
            onClick={() => handleModeChange('custom')}
            onKeyDown={e => e.key === 'Enter' && handleModeChange('custom')}
            tabIndex={0}
            role="button"
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              settings.mode === 'custom'
                ? isDarkMode
                  ? 'border-sky-500 bg-sky-950/40 ring-2 ring-sky-500/40'
                  : 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/30'
                : isDarkMode
                  ? 'border-slate-700 bg-slate-800/70 hover:border-slate-600'
                  : 'border-gray-200 bg-gray-50/60 hover:border-gray-300'
            }`}>
            <div className="mb-2 flex items-center justify-between">
              <span className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Custom</span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Individual control over perception engines, OCR redaction, fail-closed policy, and prompt triggers below.
            </p>
          </div>
        </div>
      </div>

      {/* Perception & Redaction Toggles */}
      <div
        className={`rounded-2xl border ${
          isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
        } p-6 shadow-xs`}>
        <h3 className={`mb-4 text-base font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          Perception & Egress Controls
        </h3>

        <div className="space-y-5">
          {/* Local Vision */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-sky-500">
                <FiEye className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Local Vision Perception
                </h4>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Analyzes screenshots on-device with WebGPU / local vision before sending anything to remote models.
                </p>
              </div>
            </div>
            <div className="relative inline-flex cursor-pointer items-center">
              <input
                id="toggle-local-vision"
                type="checkbox"
                checked={settings.enableLocalVision}
                onChange={e => handleToggle('enableLocalVision', e.target.checked)}
                className="peer sr-only"
              />
              <label
                htmlFor="toggle-local-vision"
                className={`peer h-6 w-11 rounded-full ${
                  isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                } after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none`}>
                <span className="sr-only">Toggle Local Vision</span>
              </label>
            </div>
          </div>

          {/* OCR Engine */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-sky-500">
                <FiFileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  On-Device OCR & Text Extraction
                </h4>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Scans image pixels for text locally so private tokens in canvas and graphics are caught.
                </p>
              </div>
            </div>
            <div className="relative inline-flex cursor-pointer items-center">
              <input
                id="toggle-ocr"
                type="checkbox"
                checked={settings.enableOcrPerception}
                onChange={e => handleToggle('enableOcrPerception', e.target.checked)}
                className="peer sr-only"
              />
              <label
                htmlFor="toggle-ocr"
                className={`peer h-6 w-11 rounded-full ${
                  isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                } after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none`}>
                <span className="sr-only">Toggle OCR</span>
              </label>
            </div>
          </div>

          {/* Fail Closed Egress */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-rose-500">
                <FiLock className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Fail-Closed Egress Gate
                </h4>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Blocks context dispatch if local safety verification cannot be positively confirmed.
                </p>
              </div>
            </div>
            <div className="relative inline-flex cursor-pointer items-center">
              <input
                id="toggle-fail-closed"
                type="checkbox"
                checked={settings.failClosed}
                onChange={e => handleToggle('failClosed', e.target.checked)}
                className="peer sr-only"
              />
              <label
                htmlFor="toggle-fail-closed"
                className={`peer h-6 w-11 rounded-full ${
                  isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                } after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none`}>
                <span className="sr-only">Toggle Fail Closed</span>
              </label>
            </div>
          </div>

          {/* Sensitive Data Prompts */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-amber-500">
                <FiAlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Prompt User Whenever Context Is Uncertain
                </h4>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Triggers the PrivacyConsentModal prompt (Case C) whenever ambiguous data is detected.
                </p>
              </div>
            </div>
            <div className="relative inline-flex cursor-pointer items-center">
              <input
                id="toggle-sensitive-prompts"
                type="checkbox"
                checked={settings.askWheneverUncertain}
                onChange={e => handleToggle('askWheneverUncertain', e.target.checked)}
                className="peer sr-only"
              />
              <label
                htmlFor="toggle-sensitive-prompts"
                className={`peer h-6 w-11 rounded-full ${
                  isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                } after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none`}>
                <span className="sr-only">Toggle Uncertain Prompts</span>
              </label>
            </div>
          </div>

          {/* Ask on High-Risk Data */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-rose-500">
                <FiAlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Prompt on High-Risk Categories
                </h4>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Require confirmation for credentials, tokens, payment, and identity data.
                </p>
              </div>
            </div>
            <div className="relative inline-flex cursor-pointer items-center">
              <input
                id="toggle-high-risk-prompts"
                type="checkbox"
                checked={settings.askForHighRiskData}
                onChange={e => handleToggle('askForHighRiskData', e.target.checked)}
                className="peer sr-only"
              />
              <label
                htmlFor="toggle-high-risk-prompts"
                className={`peer h-6 w-11 rounded-full ${
                  isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                } after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none`}>
                <span className="sr-only">Toggle High Risk Prompts</span>
              </label>
            </div>
          </div>

          {/* Redact Sensitive Text */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-emerald-500">
                <FiSlash className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Automatically Redact Sensitive Text
                </h4>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Replaces sensitive strings with [REDACTED_*] placeholders before sending DOM or messages.
                </p>
              </div>
            </div>
            <div className="relative inline-flex cursor-pointer items-center">
              <input
                id="toggle-redact-text"
                type="checkbox"
                checked={settings.redactSensitiveText}
                onChange={e => handleToggle('redactSensitiveText', e.target.checked)}
                className="peer sr-only"
              />
              <label
                htmlFor="toggle-redact-text"
                className={`peer h-6 w-11 rounded-full ${
                  isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                } after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none`}>
                <span className="sr-only">Toggle Redact Text</span>
              </label>
            </div>
          </div>

          {/* Visual Masking */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-indigo-500">
                <FiLayers className="h-5 w-5" />
              </div>
              <div>
                <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  Mask Sensitive Visual Regions
                </h4>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Solid-masks or blurs sensitive bounding boxes in screenshots before remote egress.
                </p>
              </div>
            </div>
            <div className="relative inline-flex cursor-pointer items-center">
              <input
                id="toggle-mask-visual"
                type="checkbox"
                checked={settings.maskSensitiveVisualRegions}
                onChange={e => handleToggle('maskSensitiveVisualRegions', e.target.checked)}
                className="peer sr-only"
              />
              <label
                htmlFor="toggle-mask-visual"
                className={`peer h-6 w-11 rounded-full ${
                  isDarkMode ? 'bg-slate-600' : 'bg-gray-200'
                } after:absolute after:left-[2px] after:top-[2px] after:size-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-sky-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none`}>
                <span className="sr-only">Toggle Visual Masking</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Audit Statistics & Telemetry */}
      <div
        className={`rounded-2xl border ${
          isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
        } p-6 shadow-xs`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className={`text-base font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              Privacy Audit Counters
            </h3>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Telemetry tracking local inspection, redactions, and blocked transmissions without storing raw content.
            </p>
          </div>
          <Button
            onClick={handleResetCounters}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${
              isDarkMode
                ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            <FiRefreshCw className={`h-3 w-3 ${isResetting ? 'animate-spin' : ''}`} />
            Reset Counters
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div
            className={`rounded-xl border p-4 text-center ${
              isDarkMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-gray-50'
            }`}>
            <div className="text-2xl font-black text-sky-500">{settings.inspectedContexts}</div>
            <div className={`mt-1 text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Contexts Inspected
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 text-center ${
              isDarkMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-gray-50'
            }`}>
            <div className="text-2xl font-black text-amber-500">{settings.redactedContexts}</div>
            <div className={`mt-1 text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Regions Redacted
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 text-center ${
              isDarkMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-gray-50'
            }`}>
            <div className="text-2xl font-black text-rose-500">{settings.blockedContexts}</div>
            <div className={`mt-1 text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Blocked Invocations
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 text-center ${
              isDarkMode ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-gray-50'
            }`}>
            <div className="text-2xl font-black text-emerald-500">{settings.sanitizedContexts}</div>
            <div className={`mt-1 text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Safe Egresses
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-slate-700 dark:text-gray-400">
          <span>LOOKUP Privacy Invariant: Zero raw credentials or screenshots transmitted.</span>
          <button type="button" onClick={handleResetDefaults} className="cursor-pointer text-sky-500 hover:underline">
            Restore Default Strict Settings
          </button>
        </div>
      </div>
    </section>
  );
};

export default PrivacySettings;
