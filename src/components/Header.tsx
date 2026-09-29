import React from 'react';
import { useSession } from '../context/SessionContext';
import { ActiveTab } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { SessionControlDrawer } from './SessionControlDrawer';
import { CountdownTimer } from './CountdownTimer';
import {
  Flame,
  Tv,
  Radio,
  Layers,
  Users,
  Trophy,
  Sliders,
  Sun,
} from 'lucide-react';

const TABS: Array<{ id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'live', label: 'Live Court', icon: Radio },
  { id: 'queue', label: 'Queue & History', icon: Layers },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'standings', label: 'Standings', icon: Trophy },
  { id: 'settings', label: 'Settings', icon: Sliders },
];

export const Header: React.FC = () => {
  const { activeTab, setActiveTab, setIsTvMode, isTvMode, settings, updateSettings } = useSession();

  if (isTvMode) return null;

  return (
    <header
      className={`sticky top-0 z-40 transition-all border-b ${
        settings.outdoorHighContrast
          ? 'bg-black border-emerald-400/80 shadow-lg shadow-black'
          : 'bg-slate-950/85 backdrop-blur-xl border-slate-800/80'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('live')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Flame className="w-5 h-5 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base text-white tracking-tight leading-none">
                RallyPulse
              </span>
              <span className="text-[10px] uppercase font-extrabold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.2 rounded-full">
                Doubles
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block font-medium leading-tight">
              Court Rotation & Queue
            </span>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Tools: compact session controls, outdoor mode, TV mode, PWA */}
        <div className="flex items-center gap-2">
          {activeTab === 'live' && <SessionControlDrawer />}
          {/* Outdoor Sunlight Mode Quick Toggle */}
          <button
            onClick={() => updateSettings({ outdoorHighContrast: !settings.outdoorHighContrast })}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 ${
              settings.outdoorHighContrast
                ? 'bg-amber-400 text-slate-950 font-black shadow-sm shadow-amber-400/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
            }`}
            title={`Outdoor Mode: ${settings.outdoorHighContrast ? 'ON' : 'OFF'}`}
          >
            <Sun className={`w-3.5 h-3.5 ${settings.outdoorHighContrast ? 'text-slate-950 fill-slate-950' : 'text-amber-400'}`} />
            <span className="text-[10px] uppercase">{settings.outdoorHighContrast ? 'Outdoor On' : 'Outdoor'}</span>
          </button>

          {/* Mini Timer (visible if not on Live tab) */}
          {activeTab !== 'live' && (
            <div className="hidden sm:block">
              <CountdownTimer compact={true} />
            </div>
          )}

          {/* Fence Board / TV Display Mode Button */}
          <button
            onClick={() => setIsTvMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-md shadow-indigo-950/30"
            title="Switch to full-screen Fence Board / Gym TV Display Mode"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fence Board</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton variant="header" />
        </div>
      </div>
    </header>
  );
};
