import { useState, useEffect } from 'react';
import '@src/Options.css';
import LookupLogo from './components/LookupLogo';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { t } from '@extension/i18n';
import { FiSettings, FiCpu, FiShield, FiLock, FiBarChart2 } from 'react-icons/fi';
import { GeneralSettings } from './components/GeneralSettings';
import { ModelSettings } from './components/ModelSettings';
import { PrivacySettings } from './components/PrivacySettings';
import { FirewallSettings } from './components/FirewallSettings';
import { AnalyticsSettings } from './components/AnalyticsSettings';

type TabTypes = 'general' | 'models' | 'privacy' | 'firewall' | 'analytics';

const TABS: { id: TabTypes; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'privacy', icon: FiShield, label: t('options_tabs_privacy') },
  { id: 'firewall', icon: FiLock, label: t('options_tabs_firewall') },
  { id: 'models', icon: FiCpu, label: t('options_tabs_models') },
  { id: 'general', icon: FiSettings, label: t('options_tabs_general') },
  { id: 'analytics', icon: FiBarChart2, label: 'Analytics & Telemetry' },
];

const Options = () => {
  const [activeTab, setActiveTab] = useState<TabTypes>('privacy');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode preference
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleTabClick = (tabId: TabTypes) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings isDarkMode={isDarkMode} />;
      case 'models':
        return <ModelSettings isDarkMode={isDarkMode} />;
      case 'privacy':
        return <PrivacySettings isDarkMode={isDarkMode} />;
      case 'firewall':
        return <FirewallSettings isDarkMode={isDarkMode} />;
      case 'analytics':
        return <AnalyticsSettings isDarkMode={isDarkMode} />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'bg-[#0b0f17] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Modern Dashboard Sidebar */}
      <aside
        className={`w-64 shrink-0 border-r flex flex-col justify-between ${
          isDarkMode ? 'border-slate-800 bg-[#0f141f]' : 'border-slate-200 bg-white'
        }`}>
        <div className="p-5">
          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-8">
            <LookupLogo size={28} withGlow={true} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight">LOOKUP</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                  }`}>
                  v0.1.13
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Privacy-Preserving AI</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <div
              className={`px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider ${
                isDarkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
              Configuration
            </div>
            {TABS.map(item => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 text-left cursor-pointer ${
                    isActive
                      ? isDarkMode
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-xs'
                        : 'bg-sky-500 text-white shadow-xs font-semibold'
                      : isDarkMode
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}>
                  <Icon
                    className={`size-4 shrink-0 ${isActive ? (isDarkMode ? 'text-sky-400' : 'text-white') : 'opacity-70'}`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer info */}
        <div
          className={`p-4 border-t ${isDarkMode ? 'border-slate-800/80 text-slate-500' : 'border-slate-100 text-slate-400'} text-xs`}>
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-emerald-500"></span>
            <span>Local Shield Active</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mx-auto max-w-4xl">{renderTabContent()}</div>
      </main>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <div>Loading...</div>), <div>Error Occurred</div>);
