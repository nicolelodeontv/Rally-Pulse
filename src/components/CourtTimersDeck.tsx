import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus,
  Clock,
  RefreshCw,
  Eye,
  Volume2,
  VolumeX,
  Smartphone,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { wakeLockManager } from '../utils/hardware';

interface CourtTimersDeckProps {
  onInitiateSwap?: (playerId: string) => void;
}

export const CourtTimersDeck: React.FC<CourtTimersDeckProps> = () => {
  const {
    currentRound,
    courts,
    players,
    courtTimers,
    startCourtTimer,
    pauseCourtTimer,
    resetCourtTimer,
    adjustCourtTimer,
    startAllCourtTimers,
    pauseAllCourtTimers,
    resetAllCourtTimers,
    updateCourtCount,
    settings,
    updateSettings,
    toggleAutoRotate,
    autoRotateCountdown,
    executeAutoRotateNow,
    cancelAutoRotate,
  } = useSession();

  const isCountUp = settings.timerMode === 'count_up';
  const targetSeconds = settings.matchDurationMinutes * 60;
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Active matches in the current round mapped by courtId
  const matchByCourtId = new Map(currentRound?.matches.map((m) => [m.courtId, m]) || []);
  const activeRunningCourts = Object.values(courtTimers).filter((t) => t.isRunning).length;
  const totalCourtsCount = courts.length;

  return (
    <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl backdrop-blur-md space-y-4">
      {/* Top Header & Session-Wide Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            {isCountUp ? <TrendingUp className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-white">Court Match Timers</h2>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isCountUp ? 'Count-Up (from 00:00)' : 'Countdown'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {totalCourtsCount} {totalCourtsCount === 1 ? 'Court' : 'Courts'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeRunningCourts > 0
                ? `${activeRunningCourts} of ${totalCourtsCount} courts running • Each court has its own independent timer`
                : `All ${totalCourtsCount} court clocks paused • Start courts individually or together`}
            </p>
          </div>
        </div>

        {/* Global Toolbar: Add/Remove Courts Stepper, Timer Mode, Auto-Rotate, Sync */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Court Count Stepper (Support for Many Courts / "Daghan of Courts") */}
          <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => updateCourtCount(Math.max(1, courts.length - 1))}
              disabled={courts.length <= 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-40 disabled:hover:text-slate-400 transition cursor-pointer"
              title="Remove a court"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-bold font-mono-nums text-slate-200">
              {courts.length} {courts.length === 1 ? 'Court' : 'Courts'}
            </span>
            <button
              onClick={() => updateCourtCount(Math.min(8, courts.length + 1))}
              disabled={courts.length >= 8}
              className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 disabled:opacity-40 disabled:hover:text-emerald-400 transition cursor-pointer"
              title="Add another court (independent timer added)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Timer Mode Toggle (Count Up vs Countdown) */}
          <div className="inline-flex rounded-xl bg-slate-950/80 p-0.5 border border-slate-800 text-xs font-bold">
            <button
              onClick={() => updateSettings({ timerMode: 'count_up' })}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                isCountUp
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Starts timer from 00:00 (Stopwatch)"
            >
              <TrendingUp className="w-3 h-3" />
              <span>Count Up (00:00)</span>
            </button>
            <button
              onClick={() => updateSettings({ timerMode: 'countdown' })}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                !isCountUp
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Countdown from match duration"
            >
              <Clock className="w-3 h-3" />
              <span>Countdown</span>
            </button>
          </div>

          {/* Auto-Rotate Quick Toggle */}
          <button
            onClick={toggleAutoRotate}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border transition cursor-pointer active:scale-95 ${
              settings.autoRotateEnabled
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title="Automatically advance round when target time reached"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${settings.autoRotateEnabled ? 'text-emerald-400 animate-spin-slow' : 'text-slate-400'}`} />
            <span>Auto-Rotate: {settings.autoRotateEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Master Sync Action Buttons */}
          <div className="flex items-center gap-1.5">
            {activeRunningCourts > 0 ? (
              <button
                onClick={pauseAllCourtTimers}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition active:scale-95 cursor-pointer"
                title="Pause all court timers"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause All</span>
              </button>
            ) : (
              <button
                onClick={startAllCourtTimers}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
                title={isCountUp ? "Start all court stopwatches from zero" : "Start all court timers simultaneously"}
              >
                <Play className="w-3.5 h-3.5 ml-0.5" />
                <span>Start All</span>
              </button>
            )}

            <button
              onClick={resetAllCourtTimers}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
              title={isCountUp ? "Reset all court stopwatches back to 00:00" : `Reset all court timers to ${settings.matchDurationMinutes}m`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Wake Lock Active Indicator */}
          {wakeLockManager.isActive() && activeRunningCourts > 0 && (
            <span className="hidden lg:flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-1 rounded-xl">
              <Eye className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Wake Lock Active</span>
            </span>
          )}

          {/* Sound & Vibration Toggles */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
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
      </div>

      {/* Auto-Rotate In-Flight Countdown Banner */}
      {autoRotateCountdown !== null && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/90 to-blue-950/90 border border-emerald-500/50 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
            <div>
              <span className="text-xs md:text-sm font-black text-white block">
                Target Time Reached! Auto-rotating courts in{' '}
                <span className="text-emerald-400 font-mono-nums text-base font-black underline">
                  {autoRotateCountdown}s
                </span>
              </span>
              <span className="text-[11px] text-slate-300">
                Generating fresh fair pairings and starting independent court stopwatches from 00:00...
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={executeAutoRotateNow}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition cursor-pointer active:scale-95 shadow-md shadow-emerald-500/25"
            >
              Rotate Now
            </button>
            <button
              onClick={cancelAutoRotate}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grid of Independent Court Timers — Renders all courts configured */}
      <div className={`grid grid-cols-1 ${courts.length === 2 ? 'md:grid-cols-2' : courts.length >= 3 ? 'md:grid-cols-2 lg:grid-cols-3' : ''} gap-3`}>
        {courts.map((court) => {
          const courtId = court.id;
          const match = matchByCourtId.get(courtId);
          const defaultSecs = isCountUp ? 0 : targetSeconds;

          const timer = courtTimers[courtId] || {
            seconds: defaultSecs,
            isRunning: false,
          };

          const minutes = Math.floor(timer.seconds / 60);
          const seconds = timer.seconds % 60;
          const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

          const isTargetReached = isCountUp
            ? timer.seconds >= targetSeconds && timer.seconds > 0
            : timer.seconds === 0;

          // Elapsed percentage calculation
          const elapsedPercent = isCountUp
            ? Math.min(100, (timer.seconds / targetSeconds) * 100)
            : Math.min(100, Math.max(0, ((targetSeconds - timer.seconds) / targetSeconds) * 100));

          const t1p1 = match ? playerMap.get(match.team1[0]) : null;
          const t1p2 = match ? playerMap.get(match.team1[1]) : null;
          const t2p1 = match ? playerMap.get(match.team2[0]) : null;
          const t2p2 = match ? playerMap.get(match.team2[1]) : null;

          return (
            <div
              key={courtId}
              className={`rounded-xl border p-3.5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between gap-3 ${
                isTargetReached
                  ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/20'
                  : timer.isRunning
                  ? 'bg-slate-950/80 border-emerald-500/60 shadow-lg shadow-emerald-950/30 animate-glow-subtle'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Court Name, Matchup Info & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-extrabold text-xs transition-colors ${
                    timer.isRunning
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/20'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  }`}>
                    C{court.courtNumber}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm leading-tight">{court.name}</h3>
                    {match ? (
                      <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[220px]">
                        {t1p1?.name.split(' ')[0]} & {t1p2?.name.split(' ')[0]} vs {t2p1?.name.split(' ')[0]} &{' '}
                        {t2p2?.name.split(' ')[0]}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Ready for next game</p>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isTargetReached
                        ? 'bg-rose-500 animate-ping'
                        : timer.isRunning
                        ? 'bg-emerald-400 animate-pulse ring-2 ring-emerald-400/40'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${
                      isTargetReached
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : timer.isRunning
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isTargetReached
                      ? isCountUp
                        ? 'Target Reached'
                        : "Time's Up"
                      : timer.isRunning
                      ? isCountUp
                        ? 'Playing'
                        : 'Running'
                      : 'Paused'}
                  </span>
                </div>
              </div>

              {/* Middle Row: Digital Clock (starts from 00:00 in count-up) & Quick Adjust */}
              <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 shadow-inner border transition-all duration-300 ${
                timer.isRunning
                  ? 'bg-slate-900/95 border-emerald-500/30'
                  : 'bg-slate-900/90 border-slate-800/80'
              }`}>
                {/* Clock Display */}
                <div className="flex items-baseline gap-2">
                  <span
                    className={`font-mono-nums font-black text-3xl md:text-4xl tracking-tight transition-all ${
                      isTargetReached
                        ? 'text-rose-500 animate-pulse'
                        : timer.isRunning
                        ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)] animate-pulse-subtle'
                        : 'text-slate-200'
                    }`}
                  >
                    {formattedTime}
                  </span>
                  <div className="flex flex-col text-[10px] uppercase font-bold text-slate-500 leading-tight">
                    <span>{isCountUp ? 'elapsed' : 'remaining'}</span>
                    <span className="text-[9px] text-slate-400 font-mono-nums">
                      target: {settings.matchDurationMinutes}m
                    </span>
                  </div>
                </div>

                {/* Quick Add / Minus Time Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustCourtTimer(courtId, -60)}
                    disabled={timer.seconds < 60}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer text-xs"
                    title={`Subtract 1 minute from ${court.name}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => adjustCourtTimer(courtId, 60)}
                    className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer text-xs font-bold"
                    title={`Add 1 minute to ${court.name}`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>1m</span>
                  </button>
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-full bg-slate-800/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isTargetReached ? 'bg-rose-500' : timer.isRunning ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.min(100, elapsedPercent)}%` }}
                />
              </div>

              {/* Bottom Row: Independent Start/Pause Action & Reset to 00:00 */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => (timer.isRunning ? pauseCourtTimer(courtId) : startCourtTimer(courtId))}
                  className={`col-span-2 py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md ${
                    timer.isRunning
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                  }`}
                >
                  {timer.isRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause {court.name}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 ml-0.5" />
                      <span>
                        {timer.seconds === 0 ? `Start ${court.name} (00:00)` : `Resume ${court.name}`}
                      </span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => resetCourtTimer(courtId)}
                  className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                  title={isCountUp ? `Reset ${court.name} to 00:00` : `Reset ${court.name} to ${settings.matchDurationMinutes}m`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isCountUp ? '00:00' : 'Reset'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
