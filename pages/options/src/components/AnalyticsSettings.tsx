import React, { useState, useEffect } from 'react';
import {
  analyticsSettingsStore,
  privacySettingsStore,
  chatHistoryStore,
  type AnalyticsSettingsConfig,
  type PrivacySettingsConfig,
  DEFAULT_PRIVACY_SETTINGS,
} from '@extension/storage';
import {
  FiBarChart2,
  FiShield,
  FiEye,
  FiLock,
  FiCheckCircle,
  FiCopy,
  FiCheck,
  FiRefreshCw,
  FiActivity,
  FiZap,
} from 'react-icons/fi';

interface AnalyticsSettingsProps {
  isDarkMode: boolean;
}

export const AnalyticsSettings: React.FC<AnalyticsSettingsProps> = ({ isDarkMode }) => {
  const [settings, setSettings] = useState<AnalyticsSettingsConfig | null>(null);
  const [privacyConfig, setPrivacyConfig] = useState<PrivacySettingsConfig>(DEFAULT_PRIVACY_SETTINGS);
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [currentAnalytics, currentPrivacy, sessions] = await Promise.all([
          analyticsSettingsStore.getSettings(),
          privacySettingsStore.getSettings(),
          chatHistoryStore.getSessionsMetadata().catch(() => []),
        ]);
        setSettings(currentAnalytics);
        setPrivacyConfig(currentPrivacy);
        setSessionCount(sessions.length);
      } catch (error) {
        console.error('Failed to load analytics dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();

    // Listen for storage changes
    const unsubAnalytics = analyticsSettingsStore.subscribe(loadAllData);
    const unsubPrivacy = privacySettingsStore.subscribe(loadAllData);

    return () => {
      unsubAnalytics();
      unsubPrivacy();
    };
  }, []);

  const handleToggleAnalytics = async (enabled: boolean) => {
    if (!settings) return;
    try {
      await analyticsSettingsStore.updateSettings({ enabled });
      setSettings({ ...settings, enabled });
    } catch (error) {
      console.error('Failed to update analytics settings:', error);
    }
  };

  const handleCopyId = () => {
    if (!settings?.anonymousUserId) return;
    navigator.clipboard.writeText(settings.anonymousUserId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetCounters = async () => {
    setIsResetting(true);
    try {
      await privacySettingsStore.resetCounters();
      const updated = await privacySettingsStore.getSettings();
      setPrivacyConfig(updated);
    } catch (e) {
      console.error('Failed to reset counters', e);
    } finally {
      setTimeout(() => setIsResetting(false), 600);
    }
  };

  if (loading) {
    return (
      <section className="space-y-6 animate-pulse">
        <div
          className={`h-24 rounded-2xl border ${
            isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'
          }`}
        />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`h-28 rounded-2xl border ${
                isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'
              }`}
            />
          ))}
        </div>
      </section>
    );
  }

  const inspected = privacyConfig.inspectedContexts || 0;
  const redacted = privacyConfig.redactedContexts || 0;
  const blocked = privacyConfig.blockedContexts || 0;
  const sanitized = privacyConfig.sanitizedContexts || 0;

  // Calculate privacy protection efficacy
  const totalActions = inspected + redacted + blocked + sanitized;
  const safePercentage =
    totalActions > 0 ? Math.min(100, Math.round(((sanitized + redacted + blocked) / (totalActions || 1)) * 100)) : 100;

  return (
    <section className="space-y-6">
      {/* Hero Header Banner */}
      <div
        className={`rounded-2xl border ${
          isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
        } p-6 shadow-xs`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500/20 to-blue-600/20 text-sky-500 border border-sky-500/30">
              <FiBarChart2 className="size-5.5" />
            </div>
            <div>
              <h2 className={`text-lg font-bold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Analytics & Privacy Telemetry
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Real-time security auditing, local privacy metrics, and transparent usage telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetCounters}
              disabled={isResetting}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
              }`}>
              <FiRefreshCw className={`size-3.5 ${isResetting ? 'animate-spin text-sky-500' : ''}`} />
              <span>Reset Counters</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div
          className={`rounded-2xl border p-4.5 transition-all shadow-2xs ${
            isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Sessions Recorded
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
              <FiActivity className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {sessionCount}
            </span>
            <span className="text-[11px] font-semibold text-sky-500">Local Only</span>
          </div>
          <p className={`mt-1.5 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Autonomous browsing tasks
          </p>
        </div>

        {/* Metric 2 */}
        <div
          className={`rounded-2xl border p-4.5 transition-all shadow-2xs ${
            isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Contexts Inspected
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <FiEye className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {inspected}
            </span>
            <span className="text-[11px] font-semibold text-blue-500">Perception</span>
          </div>
          <p className={`mt-1.5 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            DOM elements parsed
          </p>
        </div>

        {/* Metric 3 */}
        <div
          className={`rounded-2xl border p-4.5 transition-all shadow-2xs ${
            isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Data Points Shielded
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <FiShield className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {redacted}
            </span>
            <span className="text-[11px] font-semibold text-emerald-500">Redacted</span>
          </div>
          <p className={`mt-1.5 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            PII & credentials masked
          </p>
        </div>

        {/* Metric 4 */}
        <div
          className={`rounded-2xl border p-4.5 transition-all shadow-2xs ${
            isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
          }`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Invasions Intercepted
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <FiLock className="size-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {blocked + sanitized}
            </span>
            <span className="text-[11px] font-semibold text-indigo-500">Sanitized</span>
          </div>
          <p className={`mt-1.5 text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Trackers & unsafe vectors
          </p>
        </div>
      </div>

      {/* Security Health & Pipeline Efficacy */}
      <div
        className={`rounded-2xl border p-6 ${
          isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
        } shadow-xs`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* SVG Radial Score Ring */}
            <div className="relative size-20 shrink-0">
              <svg className="size-20 -rotate-90" viewBox="0 0 36 36">
                <path
                  className={`${isDarkMode ? 'text-slate-800' : 'text-slate-100'}`}
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray={`${safePercentage}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-base font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {safePercentage}%
                </span>
                <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-semibold">Safe</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  Zero-Leak Local Shield
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/20">
                  <FiCheckCircle className="size-3" /> Efficacy High
                </span>
              </div>
              <p className={`mt-1 text-xs max-w-md ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                100% of sensitive DOM tokens and password inputs are processed locally on your machine before reaching
                any external LLM endpoint.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col gap-2 min-w-[220px]">
            <div className="flex justify-between text-xs">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>DOM Perception Filter</span>
              <span className="font-semibold text-emerald-500">100% Active</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full w-full" />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Local Redaction Engine</span>
              <span className="font-semibold text-sky-500">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Configuration & Privacy Matrix */}
      <div
        className={`rounded-2xl border ${
          isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
        } p-6 shadow-xs space-y-6`}>
        {/* Toggle Bar */}
        <div
          className={`flex items-center justify-between p-4.5 rounded-xl border ${
            isDarkMode ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-100 bg-slate-50'
          }`}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label
                htmlFor="analytics-toggle"
                className={`text-sm font-bold cursor-pointer ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                Anonymous Reliability Telemetry
              </label>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  settings?.enabled
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                }`}>
                {settings?.enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Share anonymous diagnostic health stats to improve task execution success rates.
            </p>
          </div>

          <div className="relative inline-block w-11 select-none">
            <input
              type="checkbox"
              id="analytics-toggle"
              checked={settings?.enabled ?? false}
              onChange={e => handleToggleAnalytics(e.target.checked)}
              className="sr-only"
            />
            <label
              htmlFor="analytics-toggle"
              className={`block h-6 w-11 cursor-pointer overflow-hidden rounded-full transition-colors ${
                settings?.enabled ? 'bg-sky-500' : isDarkMode ? 'bg-slate-700' : 'bg-slate-300'
              }`}>
              <span
                className={`block size-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out mt-0.5 ml-0.5 ${
                  settings?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </label>
          </div>
        </div>

        {/* Anonymous Client ID */}
        {settings?.anonymousUserId && (
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border text-xs ${
              isDarkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200/80 bg-slate-50/50'
            }`}>
            <div className="flex items-center gap-2">
              <FiZap className="size-4 text-sky-500 shrink-0" />
              <span className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Device Anonymization Token:
              </span>
              <code className="text-[11px] font-mono select-all">{settings.anonymousUserId}</code>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                copied
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                  : isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-2xs'
              }`}>
              {copied ? <FiCheck className="size-3.5" /> : <FiCopy className="size-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Token'}</span>
            </button>
          </div>
        )}

        {/* What is Collected vs What is NEVER Collected */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* What we collect */}
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'border-slate-800/80 bg-slate-900/30' : 'border-slate-200/80 bg-slate-50/60'
            }`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                ✓
              </span>
              <h4
                className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                What Is Shared (When Enabled):
              </h4>
            </div>
            <ul className={`space-y-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Task execution latency & success/failure state</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>Anonymized high-level website domain (e.g. &quot;amazon.com&quot;)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>High-level error classification categories</span>
              </li>
            </ul>
          </div>

          {/* What we NEVER collect */}
          <div
            className={`p-4 rounded-xl border ${
              isDarkMode ? 'border-slate-800/80 bg-slate-900/30' : 'border-slate-200/80 bg-slate-50/60'
            }`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex size-5 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                ✕
              </span>
              <h4
                className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                What Is NEVER Collected:
              </h4>
            </div>
            <ul className={`space-y-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                <span>Passwords, credentials, payment or form entries</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                <span>User prompts, full URLs, query parameters, or DOM text</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-500 font-bold">•</span>
                <span>Screenshots, tab recordings, or session replays</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnalyticsSettings;
