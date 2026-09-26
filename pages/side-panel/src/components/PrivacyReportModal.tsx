import React, { useEffect } from 'react';
import { FiShield, FiX, FiCheckCircle, FiLock, FiSlash, FiSettings, FiExternalLink } from 'react-icons/fi';
import type { PrivacySettingsConfig } from '@extension/storage';

interface PrivacyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PrivacySettingsConfig;
  isDarkMode?: boolean;
}

export const PrivacyReportModal: React.FC<PrivacyReportModalProps> = ({
  isOpen,
  onClose,
  config,
  isDarkMode = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleOpenSettings = () => {
    onClose();
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  };

  const modeLabel = config.mode ? config.mode.charAt(0).toUpperCase() + config.mode.slice(1) : 'Strict';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl transition-all ${
          isDarkMode ? 'border-sky-800 bg-slate-900 text-gray-100' : 'border-sky-200 bg-white text-gray-900'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-report-title">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-sky-500/20 bg-sky-500/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400">
              <FiShield className="h-6 w-6" />
            </div>
            <div>
              <h3 id="privacy-report-title" className="text-base font-bold text-sky-950 dark:text-sky-200">
                Local Privacy Report
              </h3>
              <p className="text-xs text-sky-700/80 dark:text-sky-400/80">
                LOOKUP Perception & Egress Telemetry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            aria-label="Close modal">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-5 text-left text-sm max-h-[70vh] overflow-y-auto">
          {/* Active Policy Status */}
          <div className={`flex items-center justify-between rounded-xl border p-3 ${isDarkMode ? 'border-slate-800 bg-slate-800/60' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <FiCheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Active Policy Mode</span>
            </div>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-bold text-sky-600 dark:text-sky-300 uppercase">
              {modeLabel}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl border p-3 text-center ${isDarkMode ? 'border-slate-800 bg-slate-800/40' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-xl font-black text-sky-500">{config.inspectedContexts ?? 0}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Contexts Inspected</div>
            </div>

            <div className={`rounded-xl border p-3 text-center ${isDarkMode ? 'border-slate-800 bg-slate-800/40' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-xl font-black text-amber-500">{config.redactedContexts ?? 0}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Regions Redacted</div>
            </div>

            <div className={`rounded-xl border p-3 text-center ${isDarkMode ? 'border-slate-800 bg-slate-800/40' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-xl font-black text-rose-500">{config.blockedContexts ?? 0}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Blocked Invocations</div>
            </div>

            <div className={`rounded-xl border p-3 text-center ${isDarkMode ? 'border-slate-800 bg-slate-800/40' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-xl font-black text-emerald-500">{config.sanitizedContexts ?? 0}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Safe Egresses</div>
            </div>
          </div>

          {/* Privacy Invariants */}
          <div className={`rounded-xl border p-3.5 ${isDarkMode ? 'border-slate-800 bg-slate-800/60' : 'border-gray-100 bg-gray-50'}`}>
            <span className="block mb-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              Active Trust Guarantees
            </span>
            <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <FiLock className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                <span>Fail-closed egress gate strictly enforced</span>
              </li>
              <li className="flex items-center gap-2">
                <FiSlash className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Zero raw credentials, auth tokens, or passwords sent</span>
              </li>
              <li className="flex items-center gap-2">
                <FiShield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Visual masking and local OCR redaction active</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between border-t p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-gray-100 bg-gray-50'}`}>
          <button
            type="button"
            onClick={handleOpenSettings}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline">
            <FiSettings className="h-3.5 w-3.5" />
            Configure Policy in Options
            <FiExternalLink className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-2 text-xs font-bold text-gray-800 hover:bg-gray-300 dark:bg-slate-700 dark:text-gray-200 dark:hover:bg-slate-600 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyReportModal;
