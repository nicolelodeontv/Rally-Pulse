import React, { useState } from 'react';
import { Match, Player } from '../types';
import { Trophy, ArrowLeftRight, Check, Plus, Minus, Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { useSession } from '../context/SessionContext';

interface PickleballCourtProps {
  match: Match;
  playersMap: Map<string, Player>;
  onRecordScore: (matchId: string, team1Score: number, team2Score: number, winner: 'team1' | 'team2' | null) => void;
  onInitiateSwap?: (playerId: string) => void;
  isTvMode?: boolean;
}

export const PickleballCourt: React.FC<PickleballCourtProps> = ({
  match,
  playersMap,
  onRecordScore,
  onInitiateSwap,
  isTvMode = false,
}) => {
  const {
    courtTimers,
    startCourtTimer,
    pauseCourtTimer,
    resetCourtTimer,
    adjustCourtTimer,
    settings,
  } = useSession();

  const [t1Score, setT1Score] = useState(match.team1Score);
  const [t2Score, setT2Score] = useState(match.team2Score);

  // Independent timer for this specific court
  const isCountUp = settings.timerMode === 'count_up';
  const targetSeconds = settings.matchDurationMinutes * 60;
  const defaultSeconds = isCountUp ? 0 : targetSeconds;

  const courtTimer = courtTimers[match.courtId] || {
    seconds: defaultSeconds,
    isRunning: false,
  };
  const timerMinutes = Math.floor(courtTimer.seconds / 60);
  const timerSecs = courtTimer.seconds % 60;
  const formattedCourtTime = `${String(timerMinutes).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`;
  const isCourtLowTime = !isCountUp && courtTimer.seconds <= 60 && courtTimer.seconds > 0;
  const isCourtTimeUp = isCountUp
    ? courtTimer.seconds >= targetSeconds && courtTimer.seconds > 0
    : courtTimer.seconds === 0;

  const t1p1 = playersMap.get(match.team1[0]);
  const t1p2 = playersMap.get(match.team1[1]);
  const t2p1 = playersMap.get(match.team2[0]);
  const t2p2 = playersMap.get(match.team2[1]);

  const handleScoreChange = (team: 'team1' | 'team2', delta: number) => {
    let newT1 = t1Score;
    let newT2 = t2Score;
    if (team === 'team1') {
      newT1 = Math.max(0, t1Score + delta);
      setT1Score(newT1);
    } else {
      newT2 = Math.max(0, t2Score + delta);
      setT2Score(newT2);
    }

    // Auto determine winner if points target reached
    let winner: 'team1' | 'team2' | null = match.winner;
    if (newT1 >= 11 && newT1 - newT2 >= 2) {
      winner = 'team1';
    } else if (newT2 >= 11 && newT2 - newT1 >= 2) {
      winner = 'team2';
    }
    onRecordScore(match.id, newT1, newT2, winner);
  };

  const handleDeclareWinner = (winner: 'team1' | 'team2') => {
    const finalT1 = winner === 'team1' ? Math.max(11, t1Score) : Math.min(t1Score, 9);
    const finalT2 = winner === 'team2' ? Math.max(11, t2Score) : Math.min(t2Score, 9);
    setT1Score(finalT1);
    setT2Score(finalT2);
    onRecordScore(match.id, finalT1, finalT2, winner);
  };

  const renderPlayerBadge = (player: Player | undefined, teamNumber: 1 | 2) => {
    if (!player) return <div className="text-xs text-slate-500 italic">Empty Slot</div>;

    const isWinner = (teamNumber === 1 && match.winner === 'team1') || (teamNumber === 2 && match.winner === 'team2');

    return (
      <div
        className={`group relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 select-none ${
          isWinner
            ? 'bg-amber-400/20 border-2 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20'
            : 'bg-slate-900/85 hover:bg-slate-800/90 border border-slate-700/60 text-slate-100 shadow'
        } ${isTvMode ? 'p-3' : 'p-2'}`}
      >
        <div className="flex items-center gap-1.5 w-full justify-center">
          <span className={`font-bold truncate text-center ${isTvMode ? 'text-lg md:text-xl' : 'text-xs md:text-sm'}`}>
            {player.name}
          </span>
          <span
            className={`rounded-full px-1.5 py-0.2 font-mono-nums font-bold text-[10px] shrink-0 ${
              player.skillLevel >= 4.0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : player.skillLevel >= 3.5
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {player.skillLevel.toFixed(1)}
          </span>
        </div>

        {/* Swap button hover trigger */}
        {!isTvMode && onInitiateSwap && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInitiateSwap(player.id);
            }}
            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-400 cursor-pointer"
            title="Swap this player"
          >
            <ArrowLeftRight className="w-2.5 h-2.5" />
            <span>Swap</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        match.completed
          ? 'bg-slate-900/90 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
          : 'bg-slate-900/80 border-slate-800 shadow-xl'
      } ${isTvMode ? 'p-5' : 'p-3.5 md:p-4'}`}
    >
      {/* Court Header & Quick Scoreboard */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
            C{match.courtNumber}
          </div>
          <div>
            <h3 className={`font-extrabold text-white leading-tight ${isTvMode ? 'text-2xl' : 'text-sm md:text-base'}`}>
              {match.courtName}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Doubles Match</span>
          </div>
        </div>

        {/* Interactive Scoreboard Counters */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 shadow-inner">
          {/* Team 1 Score */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">T1</span>
            {!isTvMode && (
              <button
                onClick={() => handleScoreChange('team1', -1)}
                className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
            )}
            <span className={`font-mono-nums font-black text-center min-w-[20px] ${t1Score > t2Score ? 'text-emerald-400' : 'text-slate-200'} ${isTvMode ? 'text-2xl min-w-[32px]' : 'text-base'}`}>
              {t1Score}
            </span>
            {!isTvMode && (
              <button
                onClick={() => handleScoreChange('team1', 1)}
                className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>

          <span className="text-slate-600 font-bold mx-0.5">:</span>

          {/* Team 2 Score */}
          <div className="flex items-center gap-1">
            {!isTvMode && (
              <button
                onClick={() => handleScoreChange('team2', -1)}
                className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                <Minus className="w-3 h-3" />
              </button>
            )}
            <span className={`font-mono-nums font-black text-center min-w-[20px] ${t2Score > t1Score ? 'text-emerald-400' : 'text-slate-200'} ${isTvMode ? 'text-2xl min-w-[32px]' : 'text-base'}`}>
              {t2Score}
            </span>
            {!isTvMode && (
              <button
                onClick={() => handleScoreChange('team2', 1)}
                className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">T2</span>
          </div>
        </div>
      </div>

      {/* Independent Court Match Timer Bar */}
      <div className={`flex items-center justify-between rounded-xl px-3 py-2 mb-3 shadow-inner flex-wrap gap-2 border transition-all duration-300 ${
        courtTimer.isRunning
          ? 'bg-slate-950/95 border-emerald-500/50 shadow-emerald-950/20 animate-glow-subtle'
          : 'bg-slate-950/90 border-slate-800'
      }`}>
        <div className="flex items-center gap-2.5">
          {/* Status Indicator Dot */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCourtTimeUp
                  ? 'bg-rose-500 animate-ping'
                  : courtTimer.isRunning
                  ? 'bg-emerald-400 animate-pulse ring-2 ring-emerald-400/40'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isCourtTimeUp ? (
                <span className="text-rose-400 font-extrabold">{isCountUp ? 'Target Met' : "Time's Up"}</span>
              ) : courtTimer.isRunning ? (
                <span className="text-emerald-400 font-extrabold">{isCountUp ? 'Stopwatch' : 'Live'}</span>
              ) : (
                'Paused'
              )}
            </span>
          </div>

          {/* Clock Display */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span
              className={`font-mono-nums font-black tracking-tight transition-all ${
                isCourtTimeUp
                  ? 'text-rose-500 text-lg md:text-xl animate-pulse'
                  : isCourtLowTime
                  ? 'text-amber-400 text-lg md:text-xl animate-pulse'
                  : courtTimer.isRunning
                  ? 'text-emerald-400 text-lg md:text-xl drop-shadow-[0_0_8px_rgba(16,185,129,0.35)] animate-pulse-subtle'
                  : 'text-slate-100 text-lg md:text-xl'
              }`}
            >
              {formattedCourtTime}
            </span>
            {isCountUp && (
              <span className="text-[10px] font-semibold text-slate-500">
                /{settings.matchDurationMinutes}m
              </span>
            )}
          </div>
        </div>

        {/* Independent Timer Controls for this court */}
        <div className="flex items-center gap-1.5">
          {/* Play/Pause */}
          <button
            onClick={() => (courtTimer.isRunning ? pauseCourtTimer(match.courtId) : startCourtTimer(match.courtId))}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm ${
              courtTimer.isRunning
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 font-black'
            }`}
            title={courtTimer.isRunning ? 'Pause this court' : 'Start match timer for this court'}
          >
            {courtTimer.isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 ml-0.5" />
                <span>Start</span>
              </>
            )}
          </button>

          {/* Quick -1m and +1m */}
          <button
            onClick={() => adjustCourtTimer(match.courtId, -60)}
            disabled={courtTimer.seconds < 60}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 text-xs transition active:scale-95 cursor-pointer"
            title="Subtract 1 minute from this court timer"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={() => adjustCourtTimer(match.courtId, 60)}
            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition active:scale-95 cursor-pointer"
            title="Add 1 minute to this court timer"
          >
            +1m
          </button>

          {/* Reset */}
          <button
            onClick={() => resetCourtTimer(match.courtId)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition active:scale-95 cursor-pointer"
            title="Reset this court timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Visual CSS Grid-Based Pickleball Court */}
      <div className="relative w-full rounded-xl overflow-hidden border-2 border-emerald-600/60 bg-emerald-950/80 shadow-2xl p-2.5">
        {/* Court Surface Pattern / Greenery */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950 via-teal-950 to-emerald-950 opacity-90" />

        {/* Outer White Court Lines */}
        <div className="relative w-full border border-emerald-400/40 rounded-lg p-1.5 flex flex-col gap-1.5">
          {/* TEAM 1 SIDE (Top Half of Court) */}
          <div className="relative">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">Team 1</span>
              {match.winner === 'team1' && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  <Trophy className="w-2.5 h-2.5" /> Winner
                </span>
              )}
            </div>

            {/* Left & Right Service Courts */}
            <div className="grid grid-cols-2 gap-2 relative bg-emerald-900/30 p-2 rounded-lg border border-emerald-500/25">
              {/* Left Service Court */}
              <div className="relative">
                <span className="absolute top-1 left-1.5 text-[9px] font-bold text-emerald-300/50 uppercase">Left Service</span>
                <div className="pt-4">{renderPlayerBadge(t1p1, 1)}</div>
              </div>
              {/* Right Service Court */}
              <div className="relative border-l border-emerald-400/30 pl-2">
                <span className="absolute top-1 left-3 text-[9px] font-bold text-emerald-300/50 uppercase">Right Service</span>
                <div className="pt-4">{renderPlayerBadge(t1p2, 1)}</div>
              </div>
            </div>
          </div>

          {/* NON-VOLLEY ZONE (THE KITCHEN) & CENTER NET */}
          <div className="relative my-0.5">
            {/* Top Kitchen 7ft line */}
            <div className="h-0.5 w-full bg-emerald-300/40" />

            {/* Kitchen Zone Tinted Area */}
            <div className="relative py-2 px-3 bg-teal-800/40 border-y border-teal-500/30 flex items-center justify-center">
              <span className="text-[9px] font-extrabold tracking-widest text-teal-300/70 uppercase">
                Non-Volley Zone (The Kitchen)
              </span>

              {/* Physical Center Net Graphic */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center">
                <div className="w-1.5 h-3 bg-slate-200 rounded-sm shadow" />
                <div className="flex-1 h-1 bg-white border-y border-slate-300 shadow-md relative">
                  {/* Net grid hatch */}
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_4px,rgba(0,0,0,0.4)_4px,rgba(0,0,0,0.4)_6px)]" />
                </div>
                <div className="w-1.5 h-3 bg-slate-200 rounded-sm shadow" />
              </div>
            </div>

            {/* Bottom Kitchen 7ft line */}
            <div className="h-0.5 w-full bg-emerald-300/40" />
          </div>

          {/* TEAM 2 SIDE (Bottom Half of Court) */}
          <div className="relative">
            {/* Left & Right Service Courts */}
            <div className="grid grid-cols-2 gap-2 relative bg-emerald-900/30 p-2 rounded-lg border border-emerald-500/25">
              {/* Left Service Court */}
              <div className="relative">
                <span className="absolute top-1 left-1.5 text-[9px] font-bold text-emerald-300/50 uppercase">Left Service</span>
                <div className="pt-4">{renderPlayerBadge(t2p1, 2)}</div>
              </div>
              {/* Right Service Court */}
              <div className="relative border-l border-emerald-400/30 pl-2">
                <span className="absolute top-1 left-3 text-[9px] font-bold text-emerald-300/50 uppercase">Right Service</span>
                <div className="pt-4">{renderPlayerBadge(t2p2, 2)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80">Team 2</span>
              {match.winner === 'team2' && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  <Trophy className="w-2.5 h-2.5" /> Winner
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Footer: Declare Winner */}
      {!isTvMode && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-semibold text-slate-400 mr-auto">Record Winner:</span>
          <button
            onClick={() => handleDeclareWinner('team1')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
              match.winner === 'team1'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {match.winner === 'team1' ? <Check className="w-3.5 h-3.5" /> : null}
            <span>Team 1 Won</span>
          </button>
          <button
            onClick={() => handleDeclareWinner('team2')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 cursor-pointer ${
              match.winner === 'team2'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {match.winner === 'team2' ? <Check className="w-3.5 h-3.5" /> : null}
            <span>Team 2 Won</span>
          </button>
        </div>
      )}
    </div>
  );
};
