import React from 'react';
import { FiShield } from 'react-icons/fi';
import type { PrivacyMode } from '@extension/storage';

interface PrivacyStatusBadgeProps {
  mode: PrivacyMode;
  isDarkMode?: boolean;
  onClick: () => void;
  lastDecision?: string | null;
}

export const PrivacyStatusBadge: React.FC<PrivacyStatusBadgeProps> = ({ mode, isDarkMode = false, onClick }) => {
  const modeLabel = mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Strict';

  const badgeStyle =
    mode === 'strict'
      ? isDarkMode
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
        : 'border-emerald-500/30 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80'
      : mode === 'balanced'
        ? isDarkMode
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
          : 'border-sky-500/30 bg-sky-50 text-sky-700 hover:bg-sky-100/80'
        : isDarkMode
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
          : 'border-amber-500/30 bg-amber-50 text-amber-700 hover:bg-amber-100/80';

  const dotColor = mode === 'strict' ? 'bg-emerald-500' : mode === 'balanced' ? 'bg-sky-500' : 'bg-amber-500';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all duration-150 cursor-pointer shadow-2xs ${badgeStyle}`}
      title="LOOKUP Local Privacy Shield Active. Click to view privacy audit metrics.">
      <span className={`inline-block size-1.5 rounded-full ${dotColor}`} />
      <FiShield className="size-3 shrink-0 opacity-80" />
      <span className="font-semibold tracking-wide">{modeLabel}</span>
    </button>
  );
};

export default PrivacyStatusBadge;
