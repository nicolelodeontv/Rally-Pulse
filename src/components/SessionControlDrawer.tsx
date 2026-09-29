import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { RotationPreset } from '../types';
import { ChevronDown, Settings2, Users, Play, Pause, RefreshCw, Sun } from 'lucide-react';

const ROTATION_PRESETS: Array<{ id: RotationPreset; label: string }> = [
  { id: '4_in_4_out', label: '4 in / 4 out' },
  { id: '2_in_2_out_winners_stay', label: 'Winners Stay' },
  { id: 'fair_play_sitout', label: 'Fair-Play Sit-Out' },
  { id: 'skill_balanced', label: 'Skill / DUPR' },
];

export const SessionControlDrawer: React.FC = () => {
  const {
    settings,
    updateSettings,
    players,
    courtTimers,
    startAllCourtTimers,
    pauseAllCourtTimers,
    toggleAutoRotate,
    setIsAttendanceSheetOpen,
    setActiveTab,
    endSession,
    sessionEnded,
  } = useSession();
  const [open, setOpen] = useState(false);

  const activeRunning = Object.values(courtTimers).filter((timer) => timer.isRunning).length;

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="relative"
    >
      <summary className="list-none flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-bold cursor-pointer select-none min-h-[42px]">
        <Settings2 className="w-4 h-4 text-emerald-400" />
        <span className="hidden sm:inline">Game Controls</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </summary>

      <div className="absolute right-0 top-full mt-2 z-[60] w-[min(92vw,480px)] rounded-2xl bg-slate-950/98 backdrop-blur-xl border border-slate-800 shadow-2xl p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-900 p-2.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500 font-black">Rotation</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ROTATION_PRESETS.map((preset) => {
                const selected = settings.rotationPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() =>
                      updateSettings({
                        rotationPreset: preset.id,
                        rotationStrategy: preset.id === 'skill_balanced' ? 'skill_balanced' : 'fair_social',
                      })
                    }
                    className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition ${selected ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 p-2.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500 font-black">Match Clock</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => updateSettings({ timerMode: 'count_up' })}
                className={`px-2 py-2 rounded-lg text-[10px] font-bold ${settings.timerMode === 'count_up' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}`}
              >
                Count Up
              </button>
              <button
                onClick={() => updateSettings({ timerMode: 'countdown' })}
                className={`px-2 py-2 rounded-lg text-[10px] font-bold ${settings.timerMode === 'countdown' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'}`}
              >
                Countdown
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-slate-500 font-black">Session Controls</span>
            <span className="text-[10px] text-slate-400">{activeRunning} court{activeRunning === 1 ? '' : 's'} running</span>
          </div>
          <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              onClick={activeRunning > 0 ? pauseAllCourtTimers : startAllCourtTimers}
              className={`min-h-[40px] rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 ${activeRunning > 0 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'}`}
            >
              {activeRunning > 0 ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {activeRunning > 0 ? 'Pause All' : 'Start All'}
            </button>

            <button
              onClick={toggleAutoRotate}
              className={`min-h-[40px] rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 ${settings.autoRotateEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Auto {settings.autoRotateEnabled ? 'On' : 'Off'}
            </button>

            <button
              onClick={() => setIsAttendanceSheetOpen(true)}
              className="min-h-[40px] rounded-lg bg-slate-800 text-slate-200 text-[10px] font-black flex items-center justify-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Attendance {players.filter((p) => p.status === 'active').length}
            </button>

            <button
              onClick={() => updateSettings({ outdoorHighContrast: !settings.outdoorHighContrast })}
              className={`min-h-[40px] rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 ${settings.outdoorHighContrast ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
            >
              <Sun className="w-3.5 h-3.5" />
              Outdoor
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-2">
          <button
            disabled={sessionEnded}
            onClick={() => {
              if (confirm('End this session, stop all timers, and open the session recap?')) {
                endSession();
                setActiveTab('settings');
              }
            }}
            className="w-full min-h-[40px] rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-[10px] font-black flex items-center justify-center gap-1.5"
          >
            End Session & View Recap
          </button>
        </div>

        <div className="rounded-xl bg-slate-900 p-2.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-500 font-black">Courts</span>
          <div className="mt-1.5 grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
              <button
                key={count}
                onClick={() => updateSettings({ courtCount: count })}
                className={`py-2 rounded-lg text-[10px] font-black ${settings.courtCount === count ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>
    </details>
  );
};
