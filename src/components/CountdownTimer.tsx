import React from 'react';
import { Play, Pause, RotateCcw, Plus, Eye, Volume2, VolumeX, Smartphone, RefreshCw } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { wakeLockManager } from '../utils/hardware';

export const CountdownTimer: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    timerSeconds,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    adjustTimer,
    settings,
    updateSettings,
    autoRotateCountdown,
    toggleAutoRotate,
    executeAutoRotateNow,
    cancelAutoRotate,
  } = useSession();

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isCountUp = settings.timerMode === 'count_up';
  const targetSeconds = settings.matchDurationMinutes * 60;
  const isTimeUp = isCountUp ? timerSeconds >= targetSeconds && timerSeconds > 0 : timerSeconds === 0;
  const isLowTime = !isCountUp && timerSeconds <= 60 && timerSeconds > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 shadow-sm">
        <span
          className={`font-mono-nums font-black text-sm tracking-tight ${
            isTimeUp
              ? 'text-rose-500 animate-pulse'
              : isLowTime
              ? 'text-amber-400 animate-pulse'
              : isTimerRunning
              ? 'text-emerald-400'
              : 'text-slate-200'
          }`}
        >
          {formattedTime}
        </span>
        <button
          onClick={isTimerRunning ? pauseTimer : startTimer}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition active:scale-90 cursor-pointer ${
            isTimerRunning
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm'
          }`}
          title={isTimerRunning ? 'Pause timer' : 'Start timer'}
        >
          {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {isCountUp ? 'Match Clock (Stopwatch from 00:00)' : 'Match Clock (Countdown)'}
          </span>

          {/* Auto-Rotate Badge & Quick Toggle */}
          <button
            onClick={toggleAutoRotate}
            className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer active:scale-95 ${
              settings.autoRotateEnabled
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Auto-Rotate between rounds"
          >
            <RefreshCw className={`w-3 h-3 ${settings.autoRotateEnabled ? 'text-emerald-400 animate-spin-slow' : 'text-slate-400'}`} />
            <span>Auto-Rotate: {settings.autoRotateEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Wake Lock Active Indicator */}
          {wakeLockManager.isActive() && isTimerRunning && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              <Eye className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Wake Lock Active</span>
            </span>
          )}
        </div>

        {/* Audio / Vibrate Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              settings.soundEnabled
                ? 'text-emerald-400 hover:bg-emerald-500/10'
                : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800'
            }`}
            title={settings.soundEnabled ? 'Buzzer audio ON' : 'Buzzer audio muted'}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => updateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
            className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
              settings.vibrationEnabled
                ? 'text-emerald-400 hover:bg-emerald-500/10'
                : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800'
            }`}
            title={settings.vibrationEnabled ? 'Phone vibration ON' : 'Phone vibration disabled'}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Auto-Rotate In-Flight Countdown Banner */}
      {autoRotateCountdown !== null && (
        <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-emerald-950/80 to-blue-950/80 border border-emerald-500/50 shadow-lg flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
            <div>
              <span className="text-xs font-black text-white block">
                Time's Up! Auto-rotating courts in <span className="text-emerald-400 font-mono-nums text-sm font-black">{autoRotateCountdown}s</span>
              </span>
              <span className="text-[10px] text-slate-300">Cycling queue & starting next match clock...</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={executeAutoRotateNow}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition cursor-pointer active:scale-95 shadow-md shadow-emerald-500/25"
            >
              Rotate Now
            </button>
            <button
              onClick={cancelAutoRotate}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Countdown Display */}
      <div className="flex items-center justify-between gap-4 py-2">
        <div
          className={`font-mono-nums font-black text-4xl sm:text-5xl tracking-tight transition-colors ${
            isTimeUp
              ? 'text-rose-500 animate-pulse'
              : isLowTime
              ? 'text-amber-400 animate-pulse'
              : isTimerRunning
              ? 'text-emerald-400'
              : 'text-slate-100'
          }`}
        >
          {formattedTime}
        </div>

        {/* Quick Add Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => adjustTimer(60)}
            className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition active:scale-95 cursor-pointer"
            title="Add 1 minute"
          >
            <Plus className="w-3 h-3" />
            <span>1m</span>
          </button>
          <button
            onClick={() => adjustTimer(300)}
            className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition active:scale-95 cursor-pointer"
            title="Add 5 minutes"
          >
            <Plus className="w-3 h-3" />
            <span>5m</span>
          </button>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80">
        <button
          onClick={isTimerRunning ? pauseTimer : startTimer}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition active:scale-95 cursor-pointer shadow-lg ${
            isTimerRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
          }`}
        >
          {isTimerRunning ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Pause Clock</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 ml-0.5" />
              <span>Start Match Timer</span>
            </>
          )}
        </button>

        <button
          onClick={resetTimer}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{isCountUp ? 'Reset (00:00)' : `Reset (${settings.matchDurationMinutes}m)`}</span>
        </button>
      </div>
    </div>
  );
};
