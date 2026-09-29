import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { PickleballCourt } from './PickleballCourt';
import { CourtTimersDeck } from './CourtTimersDeck';
import { CountdownTimer } from './CountdownTimer';
import { SwapPlayerModal } from './SwapPlayerModal';
import {
  Sparkles,
  Users,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Tv,
  ArrowRight,
  Coffee,
  RefreshCw,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';

export const LiveView: React.FC = () => {
  const {
    players,
    courts,
    currentRound,
    recordMatchScore,
    swapPlayers,
    generateNextRound,
    completeCurrentRound,
    setIsAttendanceSheetOpen,
    setIsTvMode,
    settings,
    toggleAutoRotate,
    autoRotateNotice,
    courtTimers,
    startCourtTimer,
    pauseCourtTimer,
    startAllCourtTimers,
    pauseAllCourtTimers,
  } = useSession();

  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [timerMode, setTimerMode] = useState<'independent' | 'global'>('independent');

  // Active running court count
  const activeRunningCourtCount = Object.values(courtTimers).filter((t) => t.isRunning).length;

  // Map for fast player lookup
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const activePlayers = players.filter((p) => p.status === 'active');

  // Resting players this round (either benched because courts are full, or marked resting)
  const roundRestingPlayers = currentRound
    ? currentRound.restingPlayerIds.map((id) => playerMap.get(id)).filter(Boolean)
    : [];

  const allMatchesFinished = currentRound?.matches.every((m) => m.completed) ?? false;

  return (
    <div className="space-y-4 pb-[11rem] max-w-5xl mx-auto">
      {/* Auto-Rotate Flash Notification Notice */}
      {autoRotateNotice && (
        <div className="bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm flex items-center justify-between shadow-xl shadow-emerald-500/25 animate-bounce">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span>{autoRotateNotice}</span>
          </div>
          <span className="text-[10px] uppercase font-bold bg-slate-950/20 px-2 py-0.5 rounded-full">
            Hands-Free Active
          </span>
        </div>
      )}

      {/* Top Banner: Round Header & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-extrabold text-xs">
              LIVE SESSION
            </span>
            <span className="text-slate-400 text-xs font-semibold">
              {currentRound ? `Round #${currentRound.roundNumber}` : 'Waiting to Start'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white mt-1">
            {currentRound ? `Active Matches: Round ${currentRound.roundNumber}` : 'Ready for Next Rotation'}
          </h1>
        </div>

        {/* Quick Top Actions: Auto-Rotate, Attendance, Timer Mode & TV Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timer Mode Toggle */}
          <div className="inline-flex rounded-xl bg-slate-950/80 p-0.5 border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setTimerMode('independent')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timerMode === 'independent'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Operate independent timers for each individual court"
            >
              Independent
            </button>
            <button
              onClick={() => setTimerMode('global')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                timerMode === 'global'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Use one global timer for all courts"
            >
              Global
            </button>
          </div>

          <button
            onClick={toggleAutoRotate}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
              settings.autoRotateEnabled
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-sm shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title="Automatically start next match when timer hits 00:00"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${settings.autoRotateEnabled ? 'text-emerald-400 animate-spin-slow' : 'text-slate-400'}`} />
            <span>Auto-Rotate: {settings.autoRotateEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setIsAttendanceSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer"
            title="Open bench and attendance management"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Attendance ({activePlayers.length})</span>
          </button>

          <button
            onClick={() => setIsTvMode(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-900/30 transition active:scale-95 cursor-pointer"
            title="Switch to full-screen Gym TV Display Mode"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Gym TV Mode</span>
            <span className="sm:hidden">TV</span>
          </button>
        </div>
      </div>

      {/* Primary Timer Section: Independent Court Timers Deck or Global Timer */}
      {timerMode === 'independent' ? (
        <CourtTimersDeck onInitiateSwap={(pId) => setSwapSourceId(pId)} />
      ) : (
        <CountdownTimer />
      )}

      {/* No active round state */}
      {!currentRound && (
        <div className="p-8 rounded-2xl border-2 border-dashed border-slate-800 text-center bg-slate-900/40">
          <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Active Round</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-5">
            {activePlayers.length >= 4
              ? `${activePlayers.length} active players ready. Generate a fair doubles rotation with balanced pairings!`
              : `At least 4 active players are required. Currently ${activePlayers.length} active.`}
          </p>
          <button
            onClick={generateNextRound}
            disabled={activePlayers.length < 4}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
          >
            Generate Round
          </button>
        </div>
      )}

      {/* Active Courts Visual Cards */}
      {currentRound && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {currentRound.matches.map((match) => (
            <PickleballCourt
              key={match.id}
              match={match}
              playersMap={playerMap}
              onRecordScore={recordMatchScore}
              onInitiateSwap={(pId) => setSwapSourceId(pId)}
            />
          ))}
        </div>
      )}

      {/* Resting Players / Bench Section */}
      {currentRound && roundRestingPlayers.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-200">On Deck / Resting Bench ({roundRestingPlayers.length})</h3>
            </div>
            <span className="text-[11px] text-slate-400">Next in line to play</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {roundRestingPlayers.map((player: any) => (
              <div
                key={player.id}
                onClick={() => setSwapSourceId(player.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-emerald-500/40 text-xs font-semibold text-slate-300 transition cursor-pointer active:scale-95"
                title="Click to swap this player into a court"
              >
                <span>{player.name}</span>
                <span className="text-[10px] font-mono-nums font-bold px-1.5 py-0.5 rounded-full bg-slate-900 text-slate-400">
                  {player.skillLevel.toFixed(1)}
                </span>
                {player.consecutiveRests > 0 && (
                  <span className="text-[10px] text-amber-400 font-bold">
                    ({player.consecutiveRests} rest{player.consecutiveRests > 1 ? 's' : ''})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIXED THUMB-ZONE BOTTOM ACTION BAR FOR MOBILE ORGANIZERS (Phase 3 Requirement) */}
      {currentRound && (
        <div className="fixed bottom-16 sm:bottom-4 left-0 right-0 z-40 px-3 sm:px-6 max-w-xl mx-auto pointer-events-none">
          {/* Individual Court Quick-Action Chips for Fast Thumb Access */}
          {currentRound.matches.length > 0 && (
            <div className="flex items-center justify-center gap-2 mb-2 overflow-x-auto py-1 px-1">
              {currentRound.matches.map((m) => {
                const isCountUp = settings.timerMode === 'count_up';
                const targetSecs = settings.matchDurationMinutes * 60;
                const timer = courtTimers[m.courtId] || {
                  seconds: isCountUp ? 0 : targetSecs,
                  isRunning: false,
                };
                const mins = Math.floor(timer.seconds / 60);
                const secs = timer.seconds % 60;
                const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                const isTimeUp = isCountUp
                  ? timer.seconds >= targetSecs && timer.seconds > 0
                  : timer.seconds === 0;

                return (
                  <button
                    key={m.courtId}
                    onClick={() => (timer.isRunning ? pauseCourtTimer(m.courtId) : startCourtTimer(m.courtId))}
                    className={`pointer-events-auto px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xl backdrop-blur-xl border transition active:scale-95 cursor-pointer ${
                      isTimeUp
                        ? 'bg-rose-950/95 text-rose-300 border-rose-500 animate-pulse'
                        : timer.isRunning
                        ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/60 shadow-emerald-950/50 animate-pulse-subtle'
                        : 'bg-slate-900/95 text-slate-300 border-slate-700/80 hover:border-slate-600'
                    }`}
                    title={timer.isRunning ? `Pause ${m.courtName}` : `Start ${m.courtName}`}
                  >
                    <span>C{m.courtNumber}: {timeFormatted}</span>
                    {timer.isRunning ? (
                      <Pause className="w-3 h-3 text-amber-400" />
                    ) : (
                      <Play className="w-3 h-3 text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Master Thumb Action Bar */}
          <div className="pointer-events-auto bg-slate-950/95 border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl flex items-center gap-2">
            {/* Quick Timer Toggle */}
            <button
              onClick={activeRunningCourtCount > 0 ? pauseAllCourtTimers : startAllCourtTimers}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                activeRunningCourtCount > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              {activeRunningCourtCount > 0 ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause All ({activeRunningCourtCount})</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 ml-0.5" />
                  <span>Start All Courts</span>
                </>
              )}
            </button>

            {/* Quick Attendance Sheet Trigger */}
            <button
              onClick={() => setIsAttendanceSheetOpen(true)}
              className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              title="Quick Attendance"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="hidden xs:inline">Bench</span>
            </button>

            {/* Next Game / Complete Round */}
            {allMatchesFinished ? (
              <button
                onClick={completeCurrentRound}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 transition active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Next Game</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={generateNextRound}
                className="flex-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Next Game</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual Player Swap Modal */}
      <SwapPlayerModal
        sourcePlayerId={swapSourceId}
        players={players}
        onClose={() => setSwapSourceId(null)}
        onSwap={(p1, p2) => swapPlayers(p1, p2)}
      />
    </div>
  );
};
