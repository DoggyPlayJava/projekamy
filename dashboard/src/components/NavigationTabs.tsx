import React from 'react';
import { Sprout, CloudSun, Clock, BarChart3 } from 'lucide-react';

export type TabId = 'garden' | 'weather-roi' | 'schedules' | 'analytics';

interface NavigationTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  activeSchedulesCount: number;
  wateringLogsCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  activeSchedulesCount,
  wateringLogsCount,
}) => {
  const tabs = [
    {
      id: 'garden' as TabId,
      label: 'Pasu & Pemantauan',
      shortLabel: 'Pasu Tanaman',
      icon: Sprout,
      badge: '4 Pasu',
    },
    {
      id: 'weather-roi' as TabId,
      label: 'Cuaca & Impak Kos',
      shortLabel: 'Cuaca & ROI',
      icon: CloudSun,
      badge: 'Kuantan',
    },
    {
      id: 'schedules' as TabId,
      label: 'Jadual Siraman',
      shortLabel: 'Jadual',
      icon: Clock,
      badge: `${activeSchedulesCount} Aktif`,
    },
    {
      id: 'analytics' as TabId,
      label: 'Log & Analitik',
      shortLabel: 'Analitik',
      icon: BarChart3,
      badge: `${wateringLogsCount} Rekod`,
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-1.5 sm:p-2 border border-white/80 shadow-md backdrop-blur-md bg-white/75 mb-8 sticky top-4 z-20 transition-all">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all cursor-pointer select-none active:scale-[0.98] ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold shadow-md shadow-emerald-600/25 ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 font-semibold'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'}`} />
              <span className="hidden md:inline whitespace-nowrap">{tab.label}</span>
              <span className="md:hidden whitespace-nowrap">{tab.shortLabel}</span>

              {/* Dynamic Badge */}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors hidden sm:inline-block ${
                  isActive
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'bg-slate-100 text-slate-500 border border-slate-200/50'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
