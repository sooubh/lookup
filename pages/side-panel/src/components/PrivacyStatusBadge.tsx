import React from 'react';
import { FiShield } from 'react-icons/fi';
import type { PrivacyMode } from '@extension/storage';

interface PrivacyStatusBadgeProps {
  mode: PrivacyMode;
  isDarkMode?: boolean;
  onClick: () => void;
  lastDecision?: string | null;
}

export const PrivacyStatusBadge: React.FC<PrivacyStatusBadgeProps> = ({
  mode,
  isDarkMode = false,
  onClick,
  lastDecision,
}) => {
  const modeLabel = mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Strict';

  const badgeStyle =
    mode === 'strict'
      ? isDarkMode
        ? 'border-emerald-500/30 bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/60'
        : 'border-emerald-500/30 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
      : mode === 'balanced'
      ? isDarkMode
        ? 'border-sky-500/30 bg-sky-950/50 text-sky-300 hover:bg-sky-900/60'
        : 'border-sky-500/30 bg-sky-50 text-sky-800 hover:bg-sky-100'
      : isDarkMode
      ? 'border-amber-500/30 bg-amber-950/50 text-amber-300 hover:bg-amber-900/60'
      : 'border-amber-500/30 bg-amber-50 text-amber-800 hover:bg-amber-100';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer shadow-xs ${badgeStyle}`}
      title="LOOKUP Local Privacy Shield Active. Click to inspect privacy audit metrics.">
      <FiShield className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      <span className="truncate">Protected Locally ({modeLabel})</span>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
      </span>
    </button>
  );
};

export default PrivacyStatusBadge;
