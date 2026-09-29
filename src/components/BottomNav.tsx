import React from 'react';
import { useSession } from '../context/SessionContext';
import { ActiveTab } from '../types';
import {
  Radio,
  Layers,
  Users,
  Trophy,
  Sliders,
} from 'lucide-react';

const TABS: Array<{ id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'queue', label: 'Queue', icon: Layers },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'standings', label: 'Standings', icon: Trophy },
  { id: 'settings', label: 'Settings', icon: Sliders },
];

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, isTvMode } = useSession();

  if (isTvMode) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition duration-150 cursor-pointer select-none active:scale-90 ${
                isActive
                  ? 'text-emerald-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-emerald-400' : 'text-slate-400'}`} />
                {tab.id === 'live' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </div>
              <span className="text-[10px] mt-1 leading-none tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
