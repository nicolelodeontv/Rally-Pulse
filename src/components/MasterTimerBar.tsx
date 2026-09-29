import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Smartphone,
  Eye,
  Info,
  Clock,
  Zap,
} from 'lucide-react';

interface MasterTimerBarProps {
  timerMode: 'independent' | 'global';
  onTimerModeChange: (mode: 'independent' | 'global') => void;
}

export const MasterTimerBar: React.FC<MasterTimerBarProps> = ({
  timerMode,
  onTimerModeChange,
}) => {
  const {
    courtTimers,
    startAllCourtTimers,
    pauseAllCourtTimers,
    resetAllCourtTimers,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    settings,
    updateSettings,
    autoRotateCountdown,
    cancelAutoRotate,
    executeAutoRotateNow,
  } = useSession();

  const [showModeHelp, setShowModeHelp] = useState(false);

  // Active running court count
  const activeRunningCourtCount = Object.values(courtTimers).filter((t) => t.isRunning).length;
  const isAnyRunning = timerMode === 'independent' ? activeRunningCourtCount > 0 : isTimerRunning;

  const handleMasterToggle = () => {
    if (timerMode === 'independent') {
      if (activeRunningCourtCount > 0) {
        pauseAllCourtTimers();
      } else {
        startAllCourtTimers();
      }
    } else {
      if (isTimerRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    }
  };

  const handleMasterReset = () => {
    if (timerMode === 'independent') {
      resetAllCourtTimers();
    } else {
      resetTimer();
    }
  };

  return (
    <div className="space-y-2">
      {/* Auto-Rotate Countdown Notification Bar */}
      {autoRotateCountdown !== null && (
        <div className="bg-amber-500/20 border border-amber-500/40 p-3 rounded-2xl flex items-center justify-between shadow-lg backdrop-blur-sm animate-pulse">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-200">
              Matches finished! Starting next game rotation in{' '}
              <span className="font-mono-nums font-black text-amber-300 text-sm">
                {autoRotateCountdown}s
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={executeAutoRotateNow}
              className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition cursor-pointer active:scale-95 shadow-md shadow-emerald-500/25"
            >
              Rotate Now
            </button>
            <button
              onClick={cancelAutoRotate}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Compact Master Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Left: Master Play/Pause & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMasterToggle}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer shadow-md ${
              isAnyRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 font-black'
            }`}
          >
            {isAnyRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>
                  Pause All {timerMode === 'independent' && `(${activeRunningCourtCount})`}
                </span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 ml-0.5" />
                <span>Start All Courts</span>
              </>
            )}
          </button>

          <button
            onClick={handleMasterReset}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition active:scale-95 cursor-pointer"
            title="Reset All Timers"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Timer Mode Switcher with Tooltip / Helper */}
        <div className="flex items-center justify-center sm:justify-start gap-1.5">
          <div className="inline-flex rounded-xl bg-slate-950 border border-slate-800 p-0.5 text-xs font-bold">
            <button
              onClick={() => onTimerModeChange('independent')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timerMode === 'independent'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Independent
            </button>
            <button
              onClick={() => onTimerModeChange('global')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                timerMode === 'global'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Global
            </button>
          </div>

          <button
            onClick={() => setShowModeHelp(!showModeHelp)}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition ${
              showModeHelp ? 'bg-slate-800 text-emerald-400' : ''
            }`}
            title="What is Independent vs Global timer mode?"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Sound, Vibration, and WakeLock Quick Toggles */}
        <div className="flex items-center justify-end gap-1.5">
          {/* Sound Toggle */}
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              settings.soundEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title={`Sound Buzzer: ${settings.soundEnabled ? 'ON' : 'OFF'}`}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="text-[10px] hidden md:inline">Buzzer</span>
          </button>

          {/* Vibration Toggle */}
          <button
            onClick={() => updateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
            className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              settings.vibrationEnabled
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title={`Haptic Vibration: ${settings.vibrationEnabled ? 'ON' : 'OFF'}`}
          >
            <Smartphone className="w-4 h-4" />
            <span className="text-[10px] hidden md:inline">Haptic</span>
          </button>

          {/* WakeLock Indicator */}
          <button
            onClick={() => updateSettings({ wakeLockEnabled: !settings.wakeLockEnabled })}
            className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              settings.wakeLockEnabled
                ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title={`Screen Wake Lock: ${settings.wakeLockEnabled ? 'Active' : 'Disabled'}`}
          >
            <Eye className="w-4 h-4" />
            <span className="text-[10px] hidden md:inline">Wake Lock</span>
          </button>
        </div>
      </div>

      {/* Helper text explaining Timer Modes */}
      {showModeHelp && (
        <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl text-xs text-slate-300 flex items-start gap-2 animate-fadeIn">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p>
              <strong className="text-white">Independent Mode:</strong> Each court runs its own separate match clock so matches starting or finishing at different times don't conflict.
            </p>
            <p>
              <strong className="text-white">Global Mode:</strong> A single master countdown timer controls all active courts simultaneously for synchronized session intervals.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
