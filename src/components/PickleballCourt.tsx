import React, { useState, useEffect } from 'react';
import { Match, Player, SkillLevel } from '../types';
import {
  Trophy,
  ArrowLeftRight,
  Check,
  Plus,
  Minus,
  Play,
  Pause,
  RotateCcw,
  Clock,
  UserPlus,
  Users,
  Sparkles,
  Flame,
  FastForward,
  CircleDot,
} from 'lucide-react';
import { useSession } from '../context/SessionContext';

interface PickleballCourtProps {
  courtId: string;
  courtNumber: number;
  courtName: string;
  match?: Match;
  playersMap: Map<string, Player>;
  onRecordScore?: (matchId: string, team1Score: number, team2Score: number, winner: 'team1' | 'team2' | null, servingPlayerId?: string, serviceNumber?: 1 | 2) => void;
  onInitiateSwap?: (playerId: string) => void;
  onAssignSlot?: (courtId: string, team: 'team1' | 'team2', slotIndex: 0 | 1, slotName: string) => void;
  onOpenAttendance?: () => void;
  isTvMode?: boolean;
  activePlayerCount?: number;
}

export function formatSkillBadge(skillLevel: SkillLevel, mode: 'dupr' | 'casual' = 'dupr'): { label: string; bg: string } {
  if (mode === 'casual') {
    if (skillLevel <= 2.5) return { label: 'Beginner', bg: 'bg-amber-500/25 text-amber-300 border-amber-500/40' };
    if (skillLevel <= 3.5) return { label: 'Inter', bg: 'bg-blue-500/25 text-blue-300 border-blue-500/40' };
    if (skillLevel <= 4.5) return { label: 'Adv', bg: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40' };
    return { label: 'Pro', bg: 'bg-purple-500/25 text-purple-300 border-purple-500/40' };
  }

  if (skillLevel >= 4.0) return { label: skillLevel.toFixed(1), bg: 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40' };
  if (skillLevel >= 3.5) return { label: skillLevel.toFixed(1), bg: 'bg-blue-500/25 text-blue-300 border-blue-500/40' };
  return { label: skillLevel.toFixed(1), bg: 'bg-amber-500/25 text-amber-300 border-amber-500/40' };
}

export const PickleballCourt: React.FC<PickleballCourtProps> = ({
  courtId,
  courtNumber,
  courtName,
  match,
  playersMap,
  onRecordScore,
  onInitiateSwap,
  onAssignSlot,
  onOpenAttendance,
  isTvMode = false,
  activePlayerCount = 0,
}) => {
  const {
    courtTimers,
    startCourtTimer,
    pauseCourtTimer,
    resetCourtTimer,
    adjustCourtTimer,
    startWarmupTimer,
    skipWarmup,
    settings,
  } = useSession();

  const [t1Score, setT1Score] = useState(match?.team1Score || 0);
  const [t2Score, setT2Score] = useState(match?.team2Score || 0);
  const [isEndGameOpen, setIsEndGameOpen] = useState(false);
  const [endGameWinner, setEndGameWinner] = useState<'team1' | 'team2' | null>(null);
  const [lastScoreSnapshot, setLastScoreSnapshot] = useState<{ team1: number; team2: number } | null>(null);
  const [sideSwitchAlert, setSideSwitchAlert] = useState<string | null>(null);
  const previousScoresRef = useRef({ team1: t1Score, team2: t2Score });

  const t1Names = match ? `${playersMap.get(match.team1[0])?.name || 'Player 1'} & ${playersMap.get(match.team1[1])?.name || 'Player 2'}` : 'Team 1';
  const t2Names = match ? `${playersMap.get(match.team2[0])?.name || 'Player 3'} & ${playersMap.get(match.team2[1])?.name || 'Player 4'}` : 'Team 2';

  useEffect(() => {
    if (match) {
      setT1Score(match.team1Score);
      setT2Score(match.team2Score);
    }
  }, [match?.team1Score, match?.team2Score, match?.id]);

  useEffect(() => {
    const previous = previousScoresRef.current;
    const reachedSix =
      (previous.team1 < 6 && t1Score >= 6) ||
      (previous.team2 < 6 && t2Score >= 6);

    if (reachedSix) {
      const team = t1Score >= 6 && previous.team1 < 6 ? 'Team 1' : 'Team 2';
      setSideSwitchAlert(`${team} reached 6 points. Switch court sides now.`);
      const timeout = window.setTimeout(() => setSideSwitchAlert(null), 4500);
      previousScoresRef.current = { team1: t1Score, team2: t2Score };
      return () => window.clearTimeout(timeout);
    }

    previousScoresRef.current = { team1: t1Score, team2: t2Score };
  }, [t1Score, t2Score]);

  const isCountUp = settings.timerMode === 'count_up';
  const targetSeconds = settings.matchDurationMinutes * 60;
  const defaultSeconds = isCountUp ? 0 : targetSeconds;

  const courtTimer = courtTimers[courtId] || {
    seconds: defaultSeconds,
    isRunning: false,
  };

  // Warmup vs Match Stopwatch calculations
  const isWarmup = courtTimer.isWarmup ?? false;
  const warmupSecsRemaining = courtTimer.warmupSecondsRemaining ?? 120;
  const warmupMins = Math.floor(warmupSecsRemaining / 60);
  const warmupSecs = warmupSecsRemaining % 60;
  const formattedWarmupTime = `${String(warmupMins).padStart(2, '0')}:${String(warmupSecs).padStart(2, '0')}`;

  const timerMinutes = Math.floor(courtTimer.seconds / 60);
  const timerSecs = courtTimer.seconds % 60;
  const formattedCourtTime = `${String(timerMinutes).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`;

  // Soft Color Benchmarks for free elapsed stopwatch:
  // 00:00 - 11:59: 🟩 Green Accent (Fresh game / early rallies)
  // 12:00 - 17:59: 🟨 Yellow Accent (Typical finishing range ~15 min average)
  // 18:00+: 🟧 Soft Orange Accent (Long game / close deuce battle)
  const isBenchmarkFresh = isCountUp && courtTimer.seconds < 12 * 60;
  const isBenchmarkFinishing = isCountUp && courtTimer.seconds >= 12 * 60 && courtTimer.seconds < 18 * 60;
  const isBenchmarkExtended = isCountUp && courtTimer.seconds >= 18 * 60;

  const benchmarkColorClass = isWarmup
    ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]'
    : isBenchmarkFresh
    ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]'
    : isBenchmarkFinishing
    ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)]'
    : 'text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.35)]';

  const benchmarkLabel = isWarmup
    ? 'Warm-Up Rally'
    : isBenchmarkFresh
    ? 'Fresh Game'
    : isBenchmarkFinishing
    ? 'Finishing Range'
    : 'Overtime';

  // Scoring rules
  const targetPoints = settings.pointsToWin || 0;
  const isTimedOnly = targetPoints === 0;
  const winByTwo = settings.winByTwo ?? true;

  const t1HasMetTarget =
    !isTimedOnly &&
    t1Score >= targetPoints &&
    (!winByTwo || t1Score - t2Score >= 2);

  const t2HasMetTarget =
    !isTimedOnly &&
    t2Score >= targetPoints &&
    (!winByTwo || t2Score - t1Score >= 2);

  const detectedWinner: 'team1' | 'team2' | null = t1HasMetTarget
    ? 'team1'
    : t2HasMetTarget
    ? 'team2'
    : match?.winner || null;
  const servingPlayerId = match?.servingPlayerId || match?.team1[0];
  const servingTeam = match?.team1.includes(servingPlayerId || '') ? 'team1' : 'team2';
  const serviceNumber = match?.serviceNumber || 1;

  const team1PlayersForMetrics = match ? [playersMap.get(match.team1[0]), playersMap.get(match.team1[1])] : [];
  const team2PlayersForMetrics = match ? [playersMap.get(match.team2[0]), playersMap.get(match.team2[1])] : [];
  const team1Average = (team1PlayersForMetrics[0] && team1PlayersForMetrics[1])
    ? (team1PlayersForMetrics[0].skillLevel + team1PlayersForMetrics[1].skillLevel) / 2
    : 0;
  const team2Average = (team2PlayersForMetrics[0] && team2PlayersForMetrics[1])
    ? (team2PlayersForMetrics[0].skillLevel + team2PlayersForMetrics[1].skillLevel) / 2
    : 0;
  const teamSkillDifference = Math.abs(team1Average - team2Average);
  const balanceLabel =
    teamSkillDifference <= 0.2 ? 'Balanced' :
    teamSkillDifference <= 0.5 ? 'Close' : 'Uneven';


  // Real-Time Court Status Badge Logic
  // 🟢 Active Match: Timer is running or scores are being logged
  // 🟡 On Deck / Next Up: Match is scheduled, waiting to start play
  // ⚪ Open / Available: Court has no active match
  const isMatchActive = match && (courtTimer.isRunning || t1Score > 0 || t2Score > 0);
  const isCourtOpen = !match;

  // High contrast outdoor style classes
  const isHighContrast = settings.outdoorHighContrast;

  if (isCourtOpen) {
    const requiredForThisCourt = courtNumber * 4;
    const playersNeeded = Math.max(1, requiredForThisCourt - activePlayerCount);

    return (
      <div
        className={`rounded-2xl border-2 transition-all p-4 md:p-5 flex flex-col justify-between ${
          isHighContrast
            ? 'bg-black border-slate-700 shadow-2xl'
            : 'border-dashed border-slate-800 bg-slate-950/60 shadow-xl'
        }`}
      >
        {/* Court Header with ⚪ Open / Available Badge */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-800 text-slate-300 font-black text-xs border border-slate-700">
              C{courtNumber}
            </div>
            <div>
              <h3 className="font-black text-white text-base leading-tight">{courtName}</h3>
              <span className="text-xs text-slate-400 font-semibold">Available for Play</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Open Court</span>
          </div>
        </div>

        {/* Informative Body */}
        <div className="py-6 px-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center my-auto">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto mb-2.5">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <h4 className="text-sm font-bold text-slate-200">
            {activePlayerCount} Active Player{activePlayerCount === 1 ? '' : 's'} in Session
          </h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-4">
            Need <span className="text-emerald-400 font-bold">{playersNeeded} more active</span> player{playersNeeded === 1 ? '' : 's'} to activate this court.
          </p>

          <div className="flex items-center justify-center gap-2 flex-wrap">
            {onAssignSlot && (
              <button
                onClick={() => onAssignSlot(courtId, 'team1', 0, 'Left Service')}
                className="min-h-[48px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Assign to C{courtNumber}</span>
              </button>
            )}
            {onOpenAttendance && (
              <button
                onClick={onOpenAttendance}
                className="min-h-[48px] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition active:scale-95 cursor-pointer"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Activate Bench</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Status: Open / Available</span>
          <span className="font-mono-nums">Stopwatch: 00:00</span>
        </div>
      </div>
    );
  }

  const t1p1 = playersMap.get(match.team1[0]);
  const t1p2 = playersMap.get(match.team1[1]);
  const t2p1 = playersMap.get(match.team2[0]);
  const t2p2 = playersMap.get(match.team2[1]);

  const handleScoreChange = (team: 'team1' | 'team2', delta: number) => {
    if (!onRecordScore || match.completed) return;

    let newT1 = t1Score;
    let newT2 = t2Score;
    setLastScoreSnapshot({ team1: t1Score, team2: t2Score });

    if (team === 'team1') {
      newT1 = Math.max(0, t1Score + delta);
      setT1Score(newT1);
    } else {
      newT2 = Math.max(0, t2Score + delta);
      setT2Score(newT2);
    }

    let winner: 'team1' | 'team2' | null = match.winner;
    if (!isTimedOnly) {
      if (newT1 >= targetPoints && (!winByTwo || newT1 - newT2 >= 2)) {
        winner = 'team1';
      } else if (newT2 >= targetPoints && (!winByTwo || newT2 - newT1 >= 2)) {
        winner = 'team2';
      } else if (winner !== null && newT1 < targetPoints && newT2 < targetPoints) {
        winner = null;
      }
    }

    const nextServiceNumber: 1 | 2 =
      team === servingTeam ? (serviceNumber === 1 ? 2 : 1) : 1;
    const nextServingPlayerId =
      team === 'team1'
        ? (nextServiceNumber === 1 ? match.team1[0] : match.team1[1])
        : (nextServiceNumber === 1 ? match.team2[0] : match.team2[1]);

    onRecordScore(
      match.id,
      newT1,
      newT2,
      winner,
      nextServingPlayerId,
      nextServiceNumber
    );
  };

  const handleUndoPoint = () => {
    if (!onRecordScore || !lastScoreSnapshot || match.completed) return;
    setT1Score(lastScoreSnapshot.team1);
    setT2Score(lastScoreSnapshot.team2);
    onRecordScore(match.id, lastScoreSnapshot.team1, lastScoreSnapshot.team2, null);
    setLastScoreSnapshot(null);
  };

  const handleConfirmResult = (winnerTeam: 'team1' | 'team2') => {
    if (!onRecordScore) return;
    onRecordScore(match.id, t1Score, t2Score, winnerTeam);
  };

  const handleDeclareWinnerManual = (winner: 'team1' | 'team2') => {
    if (!onRecordScore) return;
    const defaultWinPoints = targetPoints > 0 ? targetPoints : 11;
    const finalT1 = winner === 'team1' ? Math.max(defaultWinPoints, t1Score) : Math.min(t1Score, defaultWinPoints - 2);
    const finalT2 = winner === 'team2' ? Math.max(defaultWinPoints, t2Score) : Math.min(t2Score, defaultWinPoints - 2);
    setT1Score(finalT1);
    setT2Score(finalT2);
    onRecordScore(match.id, finalT1, finalT2, winner);
  };

  const renderPlayerBadge = (
    player: Player | undefined,
    teamNumber: 1 | 2,
    slotIndex: 0 | 1,
    slotName: string
  ) => {
    if (!player) {
      return (
        <button
          type="button"
          onClick={() => onAssignSlot?.(match.courtId, teamNumber === 1 ? 'team1' : 'team2', slotIndex, slotName)}
          className="w-full min-h-[48px] flex items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-emerald-500/40 hover:border-emerald-400 bg-slate-900/80 hover:bg-emerald-950/40 text-emerald-400 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 group"
        >
          <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Empty Slot • Tap to Assign</span>
        </button>
      );
    }

    const isWinner = (teamNumber === 1 && detectedWinner === 'team1') || (teamNumber === 2 && detectedWinner === 'team2');
    const skillBadge = formatSkillBadge(player.skillLevel, settings.skillDisplayMode);

    return (
      <div
        className={`group relative flex flex-col items-center justify-center p-2.5 rounded-xl transition-all duration-200 select-none min-h-[48px] ${
          isWinner
            ? 'bg-amber-400/25 border-2 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20'
            : isHighContrast
            ? 'bg-black border-2 border-slate-700 text-white'
            : 'bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/60 text-slate-100 shadow'
        }`}
      >
        <div className="flex items-center gap-1.5 w-full justify-center">
          <span className="font-extrabold truncate text-center text-xs md:text-sm text-white drop-shadow-sm">
            {player.name}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-mono-nums font-black text-[10px] shrink-0 border ${skillBadge.bg}`}
          >
            {skillBadge.label}
          </span>
          {player.id === servingPlayerId && (
            <span className="flex items-center gap-1 shrink-0 text-[9px] font-black uppercase text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded-full">
              <CircleDot className="w-3 h-3" />
              {serviceNumber === 1 ? '1st Server' : '2nd Server'}
            </span>
          )}
        </div>

        {!isTvMode && onInitiateSwap && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInitiateSwap(player.id);
            }}
            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400 cursor-pointer"
            title="Swap this player"
          >
            <ArrowLeftRight className="w-3 h-3" />
            <span>Swap</span>
          </button>
        )}
      </div>
    );
  };

  const team1Names = [t1p1?.name.split(' ')[0], t1p2?.name.split(' ')[0]].filter(Boolean).join(' & ') || 'Team 1';
  const team2Names = [t2p1?.name.split(' ')[0], t2p2?.name.split(' ')[0]].filter(Boolean).join(' & ') || 'Team 2';

  return (
    <div
      className={`rounded-2xl transition-all duration-300 overflow-hidden border-2 ${
        match.completed
          ? 'bg-slate-900/95 border-emerald-500 shadow-xl shadow-emerald-950/30'
          : isHighContrast
          ? 'bg-black border-slate-700 shadow-2xl'
          : detectedWinner
          ? 'bg-slate-900/90 border-amber-500/70 shadow-xl shadow-amber-500/15'
          : 'bg-slate-900/80 border-slate-800 shadow-xl'
      } ${isTvMode ? 'p-5' : 'p-3.5 md:p-4'}`}
    >
      {/* Court Header with 🟢 Active / 🟡 On Deck / ⚪ Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-sm shadow-sm">
            C{match.courtNumber}
          </div>
          <div>
            <h3 className="font-black text-white leading-tight text-sm md:text-base">
              {match.courtName}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              {team1Names} vs {team2Names}
            </span>
          </div>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-2">
          {match.completed ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-black uppercase tracking-wider shadow-sm">
              <Check className="w-3.5 h-3.5" />
              <span>Finished</span>
            </span>
          ) : isMatchActive ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-black uppercase tracking-wider animate-pulse shadow-sm shadow-emerald-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>🟢 Active Match</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black uppercase tracking-wider shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>🟡 On Deck</span>
            </span>
          )}
        </div>
      </div>

      {/* 48px–56px Touch Target Scoreboard */}
      <div className="flex items-center justify-between gap-2 bg-slate-950/95 border border-slate-800 rounded-2xl p-2 mb-3 shadow-inner">
        {/* Team 1 Counter */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">T1</span>
          {!isTvMode && (
            <button
              onClick={() => handleScoreChange('team1', -1)}
              className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition active:scale-95 cursor-pointer shadow-sm"
              title="Subtract 1 point Team 1"
            >
              <Minus className="w-5 h-5" />
            </button>
          )}
          <span className="font-mono-nums font-black text-center min-w-[32px] px-1 text-2xl md:text-3xl text-emerald-300">
            {t1Score}
          </span>
          {!isTvMode && (
            <button
              onClick={() => handleScoreChange('team1', 1)}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center bg-emerald-600/35 hover:bg-emerald-600/50 text-emerald-300 hover:text-emerald-100 border border-emerald-500/50 transition active:scale-95 cursor-pointer font-black shadow-md shadow-emerald-950/40"
              title="Add 1 point Team 1"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>

        <span className="text-slate-600 font-black text-xl mx-0.5">:</span>

        {/* Team 2 Counter */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!isTvMode && (
            <button
              onClick={() => handleScoreChange('team2', -1)}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition active:scale-95 cursor-pointer shadow-sm"
              title="Subtract 1 point Team 2"
            >
              <Minus className="w-5 h-5" />
            </button>
          )}
          <span className="font-mono-nums font-black text-center min-w-[32px] px-1 text-2xl md:text-3xl text-emerald-300">
            {t2Score}
          </span>
          {!isTvMode && (
            <button
              onClick={() => handleScoreChange('team2', 1)}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl flex items-center justify-center bg-emerald-600/35 hover:bg-emerald-600/50 text-emerald-300 hover:text-emerald-100 border border-emerald-500/50 transition active:scale-95 cursor-pointer font-black shadow-md shadow-emerald-950/40"
              title="Add 1 point Team 2"
            >
              <Plus className="w-6 h-6" />
            </button>
          )}
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">T2</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Team DUPR</span>
          <span className="font-mono-nums text-sm font-black text-slate-200">
            {team1Average.toFixed(1)} vs {team2Average.toFixed(1)}
          </span>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full ${
          teamSkillDifference <= 0.2
            ? 'bg-emerald-500/10 text-emerald-300'
            : teamSkillDifference <= 0.5
            ? 'bg-amber-500/10 text-amber-300'
            : 'bg-rose-500/10 text-rose-300'
        }`}>
          {balanceLabel} • Δ {teamSkillDifference.toFixed(1)}
        </span>
      </div>

      {sideSwitchAlert && (
        <div className="mb-2.5 rounded-xl bg-amber-400 text-slate-950 px-3 py-2.5 text-xs font-black flex items-center justify-between gap-2 shadow-lg animate-pulse">
          <span>{sideSwitchAlert}</span>
          <span className="uppercase tracking-wider text-[9px]">Side Switch</span>
        </div>
      )}

      <div className="mb-2.5 flex items-center justify-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 text-[10px] font-black uppercase tracking-wide">
          <CircleDot className="w-3.5 h-3.5 text-amber-400" />
          Serving: {servingTeam === 'team1' ? team1Names : team2Names} • {serviceNumber === 1 ? '1st server' : '2nd server'}
        </span>
      </div>

      {/* Target & Rules Indicator */}
      {!isTimedOnly && (
        <div className="flex items-center justify-between text-xs px-1 mb-2.5 font-bold">
          <span className="text-emerald-300 font-black tracking-wider uppercase drop-shadow-sm">
            Target: {targetPoints} pts {winByTwo ? '(Win by 2)' : ''}
          </span>
          {detectedWinner && (
            <span className="text-amber-300 font-black flex items-center gap-1 animate-bounce">
              <Trophy className="w-4 h-4" />
              {detectedWinner === 'team1' ? 'Team 1 Reached Target!' : 'Team 2 Reached Target!'}
            </span>
          )}
        </div>
      )}

      {!isTvMode && !match.completed && (
        <div className="flex items-center justify-end mb-2.5">
          <button
            type="button"
            onClick={handleUndoPoint}
            disabled={!lastScoreSnapshot}
            className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:text-slate-600 disabled:bg-slate-900 disabled:cursor-not-allowed text-xs font-black transition active:scale-95 border border-slate-800"
          >
            Undo Point
          </button>
        </div>
      )}

      {/* Modern Elapsed Stopwatch Bar with Soft Color Benchmarks */}
      <div className="flex items-center justify-between rounded-xl px-3 py-2.5 mb-3 bg-slate-950/95 border border-slate-800 shadow-inner flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Clock className={`w-4 h-4 ${isWarmup ? 'text-amber-400' : 'text-emerald-400'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-mono-nums font-black text-lg md:text-xl tracking-tight ${benchmarkColorClass}`}>
                {isWarmup ? formattedWarmupTime : formattedCourtTime}
              </span>
              <span
                title={!isWarmup && !isBenchmarkFresh && !isBenchmarkFinishing ? "Overtime: Match duration has exceeded 18 minutes" : "Match duration milestone"}
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border cursor-help ${
                  isWarmup
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : isBenchmarkFresh
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : isBenchmarkFinishing
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                }`}
              >
                {benchmarkLabel}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">
              {isWarmup ? 'Pre-game rally countdown' : 'Elapsed match time'}
            </span>
          </div>
        </div>

        {/* Controls: Warm-up Toggle, Start/Pause, Adjust */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Warm-Up Mode Toggle */}
          {!isTvMode && (
            isWarmup ? (
              <button
                onClick={() => skipWarmup(match.courtId)}
                className="min-h-[44px] flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 cursor-pointer shadow-md shadow-amber-500/20"
                title="End warm-up and start match stopwatch now"
              >
                <FastForward className="w-4 h-4" />
                <span>Start Match</span>
              </button>
            ) : (
              <button
                onClick={() => startWarmupTimer(match.courtId, 2)}
                className="min-h-[44px] flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer"
                title="Start 2-minute pre-game warm-up"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>+2m Warm-up</span>
              </button>
            )
          )}

          {match && !match.completed && (
            <button
              onClick={() => {
                setEndGameWinner(t1Score > t2Score ? 'team1' : t2Score > t1Score ? 'team2' : null);
                setIsEndGameOpen(true);
              }}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-black text-xs transition active:scale-95 cursor-pointer shadow-md"
              title="End game anytime with current score"
            >
              <span>End Game</span>
            </button>
          )}

          <button
            onClick={() => (courtTimer.isRunning ? pauseCourtTimer(match?.courtId || courtId) : startCourtTimer(match?.courtId || courtId))}
            className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-xs transition active:scale-95 cursor-pointer shadow-md ${
              courtTimer.isRunning
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {courtTimer.isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 ml-0.5" />
                <span>Start</span>
              </>
            )}
          </button>

          <button
            onClick={() => adjustCourtTimer(match.courtId, 60)}
            className="h-10 min-h-[40px] px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center cursor-pointer"
            title="Add 1m"
          >
            +1m
          </button>
          <button
            onClick={() => resetCourtTimer(match.courtId)}
            className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer"
            title="Reset stopwatch"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual CSS Grid-Based Court */}
      <div className="relative w-full rounded-2xl overflow-hidden border-2 border-emerald-600/70 bg-emerald-950/90 shadow-2xl p-2.5">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-teal-950 to-emerald-950 opacity-90" />

        <div className="relative w-full border-2 border-emerald-400/50 rounded-xl p-2 flex flex-col gap-2">
          {/* TEAM 1 SIDE */}
          <div className="relative">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-200">Team 1</span>
              {detectedWinner === 'team1' && (
                <span className="flex items-center gap-1 text-xs font-black text-amber-300 bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 rounded-full shadow-sm">
                  <Trophy className="w-3.5 h-3.5" /> Winner
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 relative bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-500/35">
              <div className="relative">
                <span className="absolute top-1 left-2 text-xs font-black text-emerald-200 uppercase tracking-wide">
                  Left Service
                </span>
                <div className="pt-5">{renderPlayerBadge(t1p1, 1, 0, 'Left Service')}</div>
              </div>
              <div className="relative border-l-2 border-emerald-400/40 pl-2.5">
                <span className="absolute top-1 left-3 text-xs font-black text-emerald-200 uppercase tracking-wide">
                  Right Service
                </span>
                <div className="pt-5">{renderPlayerBadge(t1p2, 1, 1, 'Right Service')}</div>
              </div>
            </div>
          </div>

          {/* NON-VOLLEY ZONE (THE KITCHEN) */}
          <div className="relative my-1">
            <div className="h-0.5 w-full bg-emerald-300/50" />

            <div className="relative py-2.5 px-3 bg-teal-900/70 border-y-2 border-teal-500/50 flex items-center justify-center">
              <span className="text-xs font-black tracking-widest text-teal-100 uppercase drop-shadow-md bg-emerald-950 px-2.5 py-0.5 rounded-md border border-teal-500/40 z-10">
                Non-Volley Zone (The Kitchen)
              </span>

              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <div className="w-2 h-4 bg-slate-200 rounded shadow" />
                <div className="flex-1 h-1.5 bg-white border-y border-slate-300 shadow-md relative" />
                <div className="w-2 h-4 bg-slate-200 rounded shadow" />
              </div>
            </div>

            <div className="h-0.5 w-full bg-emerald-300/50" />
          </div>

          {/* TEAM 2 SIDE */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-2 relative bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-500/35">
              <div className="relative">
                <span className="absolute top-1 left-2 text-xs font-black text-emerald-200 uppercase tracking-wide">
                  Left Service
                </span>
                <div className="pt-5">{renderPlayerBadge(t2p1, 2, 0, 'Left Service')}</div>
              </div>
              <div className="relative border-l-2 border-emerald-400/40 pl-2.5">
                <span className="absolute top-1 left-3 text-xs font-black text-emerald-200 uppercase tracking-wide">
                  Right Service
                </span>
                <div className="pt-5">{renderPlayerBadge(t2p2, 2, 1, 'Right Service')}</div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 mt-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-200">Team 2</span>
              {detectedWinner === 'team2' && (
                <span className="flex items-center gap-1 text-xs font-black text-amber-300 bg-amber-400/20 border border-amber-400/40 px-2.5 py-0.5 rounded-full shadow-sm">
                  <Trophy className="w-3.5 h-3.5" /> Winner
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Result Confirmation & Winner Actions (52px Touch Height) */}
      {!isTvMode && (
        <div className="mt-3 pt-2.5 border-t border-slate-800">
          {detectedWinner ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-emerald-950/50 border-2 border-emerald-500/60 p-3 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-black text-emerald-200">
                  {detectedWinner === 'team1' ? 'Team 1' : 'Team 2'} Won ({t1Score} - {t2Score})
                </span>
              </div>
              <button
                onClick={() => handleConfirmResult(detectedWinner)}
                className="min-h-[52px] px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/35 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span>Finish & Record Result</span>
              </button>
            </div>
          ) : (
            <div className="relative z-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400">Finish Match:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeclareWinnerManual('team1')}
                  className={`flex-1 sm:flex-initial min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer ${
                    match.winner === 'team1'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {match.winner === 'team1' && <Check className="w-4 h-4" />}
                  <span>Team 1 Won</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeclareWinnerManual('team2')}
                  className={`flex-1 sm:flex-initial min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition active:scale-95 cursor-pointer ${
                    match.winner === 'team2'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {match.winner === 'team2' && <Check className="w-4 h-4" />}
                  <span>Team 2 Won</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* End Game Anytime Confirmation Modal */}
      {isEndGameOpen && match && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsEndGameOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">End Match Early</h3>
              <button
                onClick={() => setIsEndGameOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Current score on {courtName}: <strong className="text-white font-mono-nums">{t1Score} - {t2Score}</strong>. Select the winning team to record and conclude this match immediately.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300">Winner Selection:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEndGameWinner('team1')}
                  className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                    endGameWinner === 'team1'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <span className="truncate max-w-full">{t1Names}</span>
                  <span className="font-mono-nums text-sm font-black">{t1Score} pts</span>
                </button>
                <button
                  onClick={() => setEndGameWinner('team2')}
                  className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer flex flex-col items-center gap-1 ${
                    endGameWinner === 'team2'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <span className="truncate max-w-full">{t2Names}</span>
                  <span className="font-mono-nums text-sm font-black">{t2Score} pts</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 gap-2">
              <button
                onClick={() => {
                  setIsEndGameOpen(false);
                  if (onRecordScore) {
                    onRecordScore(match.id, t1Score, t2Score, null);
                  }
                }}
                className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold transition cursor-pointer"
              >
                Don't Record Result
              </button>
              <button
                disabled={!endGameWinner}
                onClick={() => {
                  if (endGameWinner && onRecordScore) {
                    setIsEndGameOpen(false);
                    onRecordScore(match.id, t1Score, t2Score, endGameWinner);
                  }
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  endGameWinner
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                Confirm & Record Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
