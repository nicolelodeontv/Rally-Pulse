import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { PickleballCourt, formatSkillBadge } from './PickleballCourt';
import { MasterTimerBar } from './MasterTimerBar';
import { CountdownTimer } from './CountdownTimer';
import { SwapPlayerModal } from './SwapPlayerModal';
import { SlotAssignModal } from './SlotAssignModal';
import { BulkAddModal } from './BulkAddModal';
import { SkillLevel, RotationPreset } from '../types';
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
  UserPlus,
  Plus,
  FileText,
  X,
  ShieldCheck,
  Zap,
  Timer,
} from 'lucide-react';

interface ActiveSlotAssignmentTarget {
  courtId: string;
  courtName: string;
  teamNumber: 1 | 2;
  slotIndex: 0 | 1;
  slotPosition: 'left' | 'right';
}

const SKILL_LEVELS: SkillLevel[] = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

const ROTATION_PRESETS: Array<{ id: RotationPreset; label: string; short: string }> = [
  { id: '4_in_4_out', label: '4-in / 4-out (Standard)', short: '4-in/4-out' },
  { id: '2_in_2_out_winners_stay', label: '2-in / 2-out (Winners Stay)', short: 'Winners Stay' },
  { id: 'fair_play_sitout', label: 'Fair-Play Sit-Out Priority', short: 'Sit-Out Priority' },
  { id: 'skill_balanced', label: 'Skill / DUPR Matchmaker', short: 'DUPR Match' },
];

export const LiveView: React.FC = () => {
  const {
    players,
    courts,
    currentRound,
    recordMatchScore,
    swapPlayers,
    assignPlayerToSlot,
    createAndAssignPlayer,
    syncCurrentRoundWithRoster,
    generateNextRound,
    completeCurrentRound,
    setIsAttendanceSheetOpen,
    setIsTvMode,
    settings,
    updateSettings,
    toggleAutoRotate,
    autoRotateNotice,
    courtTimers,
    startCourtTimer,
    pauseCourtTimer,
    startAllCourtTimers,
    pauseAllCourtTimers,
    averageMatchDurationMinutes,
    getEstimatedWaitMinutes,
    addPlayer,
    bulkAddPlayers,
  } = useSession();

  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [slotAssignTarget, setSlotAssignTarget] = useState<ActiveSlotAssignmentTarget | null>(null);
  const [timerMode, setTimerMode] = useState<'independent' | 'global'>('independent');
  const [showFloatingPills, setShowFloatingPills] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  // Quick add form state
  const [quickName, setQuickName] = useState('');
  const [quickSkill, setQuickSkill] = useState<SkillLevel>(3.0);

  const courtsContainerRef = useRef<HTMLDivElement>(null);

  // Detect when user scrolls past the main courts grid to show floating timer pills
  useEffect(() => {
    const handleScroll = () => {
      if (!courtsContainerRef.current) return;
      const rect = courtsContainerRef.current.getBoundingClientRect();
      const pastCourts = rect.top < 0;
      setShowFloatingPills(pastCourts);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return;
    addPlayer(quickName.trim(), quickSkill);
    setQuickName('');
    setShowQuickAddModal(false);
  };

  const activeRunningCourtCount = Object.values(courtTimers).filter((t) => t.isRunning).length;

  const activeCourtsToRender = courts.slice(0, settings.courtCount);
  const activeCourtIdSet = new Set(activeCourtsToRender.map((c) => c.id));

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const activePlayers = players.filter((p) => p.status === 'active');

  const assignedPlayerIds = new Set<string>();
  const matchByCourtId = new Map<string, any>();

  if (currentRound) {
    currentRound.matches
      .filter((m) => activeCourtIdSet.has(m.courtId))
      .forEach((m) => {
        matchByCourtId.set(m.courtId, m);
        [...m.team1, ...m.team2].forEach((id) => {
          if (id) assignedPlayerIds.add(id);
        });
      });
  }

  const roundRestingPlayers = currentRound
    ? currentRound.restingPlayerIds.map((id) => playerMap.get(id)).filter(Boolean)
    : players.filter((p) => !assignedPlayerIds.has(p.id));

  const activeMatches = currentRound?.matches.filter((m) => activeCourtIdSet.has(m.courtId)) || [];
  const allMatchesFinished =
    activeMatches.length > 0 &&
    activeMatches.every((m) => m.completed);

  const handleOpenSlotAssign = (
    courtId: string,
    team: 'team1' | 'team2',
    slotIndex: 0 | 1,
    slotName: string
  ) => {
    const court = courts.find((c) => c.id === courtId);
    setSlotAssignTarget({
      courtId,
      courtName: court ? court.name : 'Court',
      teamNumber: team === 'team1' ? 1 : 2,
      slotIndex,
      slotPosition: slotIndex === 0 ? 'left' : 'right',
    });
  };

  const handleAssignPlayerConfirm = (playerId: string) => {
    if (!slotAssignTarget) return;
    assignPlayerToSlot(
      slotAssignTarget.courtId,
      slotAssignTarget.teamNumber === 1 ? 'team1' : 'team2',
      slotAssignTarget.slotIndex,
      playerId
    );
    setSlotAssignTarget(null);
  };

  const handleCreateAndAssignConfirm = (name: string, skillLevel: SkillLevel) => {
    if (!slotAssignTarget) return;
    createAndAssignPlayer(
      slotAssignTarget.courtId,
      slotAssignTarget.teamNumber === 1 ? 'team1' : 'team2',
      slotAssignTarget.slotIndex,
      name,
      skillLevel
    );
    setSlotAssignTarget(null);
  };

  return (
    <div className="space-y-4 pb-52 sm:pb-44 max-w-5xl mx-auto">
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
              {currentRound ? `Round #${currentRound.roundNumber}` : 'Fresh Session'}
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-white mt-1">
            {currentRound ? `Active Matches: Round ${currentRound.roundNumber}` : 'Ready to Start Session'}
          </h1>
        </div>

        {/* Quick Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-900/30 transition active:scale-95 cursor-pointer"
            title="Switch to full-screen Fence Board Kiosk Mode"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fence Board</span>
            <span className="sm:hidden">TV</span>
          </button>
        </div>
      </div>

      {/* Preset Rotation Rules Quick Selector Bar */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 p-2 rounded-2xl overflow-x-auto shadow-md">
        <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-400 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Rotation Rule:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          {ROTATION_PRESETS.map((preset) => {
            const isSelected = (settings.rotationPreset || '4_in_4_out') === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() =>
                  updateSettings({
                    rotationPreset: preset.id,
                    rotationStrategy: preset.id === 'skill_balanced' ? 'skill_balanced' : 'fair_social',
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Compact Master Timer Bar */}
      <MasterTimerBar
        timerMode={timerMode}
        onTimerModeChange={setTimerMode}
      />

      {/* Global Countdown Timer Bar if in Global Mode */}
      {timerMode === 'global' && <CountdownTimer />}

      {/* No active round state / fewer than 4 active players */}
      {(!currentRound || activePlayers.length < 4) && (
        <div className="p-8 md:p-12 rounded-3xl border-2 border-dashed border-slate-800 text-center bg-slate-900/50 backdrop-blur-sm max-w-2xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white">
            {players.length === 0
              ? 'Welcome! Session Roster is Empty'
              : activePlayers.length < 4
              ? `Need ${4 - activePlayers.length} More Active Players for Doubles`
              : 'Ready to Generate Games'}
          </h3>
          <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto mt-2 mb-6">
            {players.length === 0
              ? 'Add individual players or paste your group roster from WhatsApp or Excel to begin automated round-robin rotation.'
              : activePlayers.length < 4
              ? `Doubles requires at least 4 active players. Currently ${activePlayers.length} active. Add players or activate from bench.`
              : `${activePlayers.length} active players ready. Generate a fair doubles rotation with balanced pairings!`}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowQuickAddModal(true)}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Player</span>
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="min-h-[48px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Bulk Paste Roster</span>
            </button>
            {players.length > 0 && (
              <button
                onClick={() => setIsAttendanceSheetOpen(true)}
                className="min-h-[48px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
              >
                Attendance ({activePlayers.length})
              </button>
            )}
            {activePlayers.length >= 4 && (
              <button
                onClick={generateNextRound}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
              >
                Generate Next Game
              </button>
            )}
          </div>
        </div>
      )}

      {/* Active Courts Visual Grid */}
      {currentRound && activePlayers.length >= 4 && (
        <div
          ref={courtsContainerRef}
          className={`grid gap-4 ${settings.courtCount === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 lg:grid-cols-2'}`}
        >
          {activeCourtsToRender.map((court) => {
            const match = matchByCourtId.get(court.id);
            return (
              <PickleballCourt
                key={court.id}
                courtId={court.id}
                courtNumber={court.courtNumber}
                courtName={court.name}
                match={match}
                playersMap={playerMap}
                onRecordScore={recordMatchScore}
                onInitiateSwap={(pId) => setSwapSourceId(pId)}
                onAssignSlot={handleOpenSlotAssign}
                onOpenAttendance={() => setIsAttendanceSheetOpen(true)}
                activePlayerCount={activePlayers.length}
              />
            );
          })}
        </div>
      )}

      {/* Resting Players / Bench Section with Dynamic Estimated Wait Times */}
      {currentRound && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>🟡 On Deck / Resting Bench ({roundRestingPlayers.length})</span>
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 font-mono-nums">
                  Avg Pace: ~{averageMatchDurationMinutes}m
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQuickAddModal(true)}
                className="min-h-[44px] text-xs font-bold px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition cursor-pointer flex items-center gap-1.5"
                title="Add player directly to queue"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Player</span>
              </button>
              <button
                onClick={syncCurrentRoundWithRoster}
                className="min-h-[44px] text-xs font-bold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                title="Re-shuffle current unstarted round with full active roster"
              >
                Re-Shuffle Game
              </button>
            </div>
          </div>

          {roundRestingPlayers.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">
              All active players are currently placed on courts.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {roundRestingPlayers.map((player: any, idx: number) => {
                const estWait = getEstimatedWaitMinutes(idx);
                const badge = formatSkillBadge(player.skillLevel, settings.skillDisplayMode);

                return (
                  <div
                    key={player.id}
                    onClick={() => setSwapSourceId(player.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/50 text-xs font-semibold text-slate-200 transition cursor-pointer active:scale-95 min-h-[44px] shadow-sm"
                    title="Click to swap this player into a court"
                  >
                    <span className="font-extrabold text-white">{player.name}</span>
                    <span className={`text-[10px] font-mono-nums font-extrabold px-1.5 py-0.5 rounded-full border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono-nums flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>~{estWait}m</span>
                    </span>
                    {player.consecutiveRests > 0 && (
                      <span className="text-[10px] text-amber-400 font-bold">
                        ({player.consecutiveRests} rest{player.consecutiveRests > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FIXED 52px–56px THUMB-ZONE ACTION BAR */}
      {currentRound && activePlayers.length >= 4 && (
        <div className="fixed bottom-16 sm:bottom-4 left-0 right-0 z-40 px-3 sm:px-6 max-w-xl mx-auto pointer-events-none">
          {/* Individual Court Quick-Action Chips: Visible only when scrolled past courts */}
          {showFloatingPills && activeMatches.length > 0 && (
            <div className="flex items-center justify-center gap-2 mb-2 overflow-x-auto py-1 px-1 transition-all animate-fadeIn">
              {activeMatches.map((m) => {
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
                    className={`pointer-events-auto px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xl backdrop-blur-xl border transition active:scale-95 cursor-pointer min-h-[44px] ${
                      isTimeUp
                        ? 'bg-rose-950/95 text-rose-300 border-rose-500 animate-pulse'
                        : timer.isRunning
                        ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/60 shadow-emerald-950/50 animate-pulse-subtle'
                        : 'bg-slate-900/95 text-slate-300 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <span>C{m.courtNumber}: {timeFormatted}</span>
                    {timer.isRunning ? (
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Master Thumb Action Bar (56px Action Buttons) */}
          <div className="pointer-events-auto bg-slate-950/95 border-2 border-slate-700 rounded-2xl p-2 shadow-2xl backdrop-blur-xl flex items-center gap-2">
            {/* Master Start / Pause */}
            <button
              onClick={activeRunningCourtCount > 0 ? pauseAllCourtTimers : startAllCourtTimers}
              className={`flex-1 min-h-[52px] py-3 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md ${
                activeRunningCourtCount > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              {activeRunningCourtCount > 0 ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause ({activeRunningCourtCount})</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 ml-0.5" />
                  <span>Start All</span>
                </>
              )}
            </button>

            {/* Bench Attendance */}
            <button
              onClick={() => setIsAttendanceSheetOpen(true)}
              className="min-h-[52px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer flex flex-col items-center justify-center gap-0.5 border border-slate-700"
              title="Open Bench & Attendance"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black uppercase text-slate-300">Bench</span>
            </button>

            {/* Next Game / Complete Round */}
            {allMatchesFinished ? (
              <button
                onClick={completeCurrentRound}
                className="flex-1 min-h-[52px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/35 transition active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Next Game</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={generateNextRound}
                className="flex-1 min-h-[52px] py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Next Game</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Add Player Modal */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Quick Add Player</h3>
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Player Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Jordan Hayes"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Skill Level (DUPR Rating)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {SKILL_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setQuickSkill(lvl)}
                      className={`py-2 rounded-xl font-mono-nums font-bold text-xs transition cursor-pointer ${
                        quickSkill === lvl
                          ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {lvl.toFixed(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="flex-1 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[48px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  Add to Bench
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      <BulkAddModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onBulkAdd={(text, skill) => bulkAddPlayers(text, skill)}
      />

      {/* Manual Player Swap Modal */}
      <SwapPlayerModal
        sourcePlayerId={swapSourceId}
        players={players}
        onClose={() => setSwapSourceId(null)}
        onSwap={(p1, p2) => swapPlayers(p1, p2)}
      />

      {/* Direct Slot Assignment Modal */}
      {slotAssignTarget && (
        <SlotAssignModal
          isOpen={!!slotAssignTarget}
          onClose={() => setSlotAssignTarget(null)}
          courtName={slotAssignTarget.courtName}
          teamNumber={slotAssignTarget.teamNumber}
          slotPosition={slotAssignTarget.slotPosition}
          players={players}
          assignedPlayerIds={assignedPlayerIds}
          onAssignPlayer={handleAssignPlayerConfirm}
          onCreateAndAssign={handleCreateAndAssignConfirm}
        />
      )}
    </div>
  );
};
