import React, { useEffect } from 'react';
import { FiAlertTriangle, FiShield, FiX, FiCheck, FiSlash, FiInfo } from 'react-icons/fi';

export interface PrivacyConsentRequest {
  id: string;
  task?: string;
  domain?: string;
  categories: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  explanation?: string;
  contextWillSend?: string;
  redactedFields?: string[];
  // Action-level consent fields (for "Proceed Anyway" on protected element interactions)
  isActionConsent?: boolean;
  targetIndex?: number;
  actionName?: string;
  inputText?: string;
  elementDescription?: string;
  timestamp?: number;
}

interface PrivacyConsentModalProps {
  isOpen: boolean;
  request: PrivacyConsentRequest | null;
  onDeny: (requestId: string) => void;
  onAllowOnce: (requestId: string) => void;
  isDarkMode?: boolean;
}

export const PrivacyConsentModal: React.FC<PrivacyConsentModalProps> = ({
  isOpen,
  request,
  onDeny,
  onAllowOnce,
  isDarkMode = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !request) return;
      if (e.key === 'Escape') {
        // Default action is Deny
        onDeny(request.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, request, onDeny]);

  if (!isOpen || !request) {
    return null;
  }

  const severityColor =
    request.severity === 'critical' || request.severity === 'high'
      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
      : 'bg-amber-500/10 text-amber-500 border-amber-500/20';

  const defaultExplanation =
    request.explanation ||
    (request.isActionConsent
      ? `The agent wants to interact with a protected ${(request.categories || []).join(', ')} field on this page. This element was flagged by the privacy pipeline. Approve to let the agent proceed with this specific action.`
      : 'LOOKUP detected sensitive or ambiguous data fields on this page that may be required by your task. In accordance with your fail-closed privacy policy, no content will leave your device until you confirm.');

  const defaultWillSend =
    request.contextWillSend ||
    (request.isActionConsent
      ? `The agent will perform the action "${request.actionName || 'input_text'}" on the protected element. This is a one-time approval for this specific interaction only.`
      : 'Only the sanitized task-relevant DOM elements. Personal identifiers, payment tokens, and sensitive visual regions will be masked or excluded.');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl transition-all ${
          isDarkMode ? 'border-amber-500/40 bg-slate-900 text-gray-100' : 'border-amber-400 bg-white text-gray-900'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-consent-title">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-amber-500/20 bg-amber-500/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <FiAlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 id="privacy-consent-title" className="text-base font-bold text-amber-900 dark:text-amber-300">
                {request.isActionConsent ? 'Proceed Anyway?' : 'Privacy Confirmation Required'}
              </h3>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                {request.isActionConsent ? 'Action Consent · Protected Element' : 'Case C · Ambiguous Context Detected'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDeny(request.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            aria-label="Deny and close">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 p-5 text-left text-sm max-h-[70vh] overflow-y-auto">
          {/* Action-Level Consent Details */}
          {request.isActionConsent && (
            <div
              className={`rounded-xl border p-3.5 ${isDarkMode ? 'border-amber-800 bg-amber-950/40' : 'border-amber-200 bg-amber-50'}`}>
              <div className="mb-2 flex items-center gap-1.5 font-semibold text-xs text-amber-600 dark:text-amber-400">
                <FiAlertTriangle className="h-3.5 w-3.5" />
                Agent Action Requires Approval
              </div>
              <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                <p>
                  <span className="font-semibold">Action:</span>{' '}
                  <code className="rounded bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 text-[11px] font-mono">
                    {request.actionName || 'input_text'}
                  </code>
                </p>
                {request.inputText && (
                  <p>
                    <span className="font-semibold">Value:</span>{' '}
                    <code className="rounded bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 text-[11px] font-mono break-all">
                      {request.inputText}
                    </code>
                  </p>
                )}
                {request.elementDescription && (
                  <p>
                    <span className="font-semibold">Target:</span> {request.elementDescription}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Detected Categories */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Detected Sensitive Categories
              </span>
              {request.severity && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${severityColor}`}>
                  {request.severity} Risk
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {request.categories && request.categories.length > 0 ? (
                request.categories.map((cat, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    <FiShield className="h-3 w-3" />
                    {cat}
                  </span>
                ))
              ) : (
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  AMBIGUOUS_PAGE_DATA
                </span>
              )}
            </div>
          </div>

          {/* Explanation */}
          <div
            className={`rounded-xl border p-3.5 ${isDarkMode ? 'border-slate-800 bg-slate-800/60' : 'border-gray-100 bg-gray-50'}`}>
            <div className="mb-1 flex items-center gap-1.5 font-semibold text-xs text-sky-600 dark:text-sky-400">
              <FiInfo className="h-3.5 w-3.5" />
              Why confirmation is requested
            </div>
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{defaultExplanation}</p>
          </div>

          {/* Context Scope Disclosure */}
          <div
            className={`rounded-xl border p-3.5 ${isDarkMode ? 'border-slate-800 bg-slate-800/60' : 'border-gray-100 bg-gray-50'}`}>
            <span className="block mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              What will be transmitted if approved
            </span>
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">{defaultWillSend}</p>
          </div>

          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Privacy Invariant:</span> Choosing Deny keeps all data strictly on your
            device.
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          className={`flex items-center justify-end gap-3 border-t p-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/80' : 'border-gray-100 bg-gray-50'}`}>
          <button
            type="button"
            autoFocus
            onClick={() => onDeny(request.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-colors">
            <FiSlash className="h-4 w-4" />
            Deny (Default)
          </button>
          <button
            type="button"
            onClick={() => onAllowOnce(request.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-500 transition-colors shadow-sm">
            <FiCheck className="h-4 w-4" />
            {request.isActionConsent ? 'Proceed Anyway' : 'Allow Once'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyConsentModal;
