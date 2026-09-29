import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Match, Player, SkillLevel } from '../types';
import {
  Trophy,
  X,
  Share2,
  Check,
  Clock,
  Calendar,
  Sparkles,
  TrendingUp,
  Percent,
  Medal,
  Award,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { formatSkillBadge } from './PickleballCourt';

export interface PlayerSessionStats {
  id: string;
  name: string;
  skillLevel: SkillLevel;
  wins: number;
  losses: number;
  totalGames: number;
  winPercentage: number;
  rank: number;
  pointsWon: number;
  pointsLost: number;
}

export interface MatchShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  allPlayers: Player[];
  completedAt?: number;
  onReturnToQueue?: () => void;
}

export const MatchShareModal: React.FC<MatchShareModalProps> = ({
  isOpen,
  onClose,
  match,
  allPlayers,
  completedAt = Date.now(),
  onReturnToQueue,
}) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Compute session standings and ranks for all players in the session
  const rankedPlayers = useMemo(() => {
    return [...allPlayers]
      .sort((a, b) => {
        // Sort by wins desc, then win % desc, then point differential desc
        if (b.wins !== a.wins) return b.wins - a.wins;
        const bPct = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
        const aPct = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
        if (bPct !== aPct) return bPct - aPct;
        const bDiff = b.pointsWon - b.pointsLost;
        const aDiff = a.pointsWon - a.pointsLost;
        return bDiff - aDiff;
      })
      .map((player, index) => {
        const total = player.gamesPlayed || player.wins + player.losses || 0;
        const pct = total > 0 ? Math.round((player.wins / total) * 100) : 0;
        return {
          id: player.id,
          name: player.name,
          skillLevel: player.skillLevel,
          wins: player.wins,
          losses: player.losses,
          totalGames: total,
          winPercentage: pct,
          rank: index + 1,
          pointsWon: player.pointsWon,
          pointsLost: player.pointsLost,
        } as PlayerSessionStats;
      });
  }, [allPlayers]);

  const playerStatsMap = useMemo(() => {
    const map = new Map<string, PlayerSessionStats>();
    rankedPlayers.forEach((p) => map.set(p.id, p));
    return map;
  }, [rankedPlayers]);

  if (!isOpen || !match) return null;

  // Format Match Duration into MM:SS and readable string
  const totalSeconds = match.durationSeconds ?? 0;
  const formattedDuration =
    totalSeconds > 0
      ? `${Math.floor(totalSeconds / 60)}m ${String(totalSeconds % 60).padStart(2, '0')}s`
      : 'Not timed';

  // Format completion date
  const matchDate = new Date(completedAt);
  const formattedDate = matchDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = matchDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Extract players
  const team1List = match.team1.map((id) => playerStatsMap.get(id)).filter(Boolean) as PlayerSessionStats[];
  const team2List = match.team2.map((id) => playerStatsMap.get(id)).filter(Boolean) as PlayerSessionStats[];

  const team1Names = team1List.map((p) => p.name).join(' & ') || 'Team A';
  const team2Names = team2List.map((p) => p.name).join(' & ') || 'Team B';

  const isTeam1Winner = match.winner === 'team1';
  const isTeam2Winner = match.winner === 'team2';

  // Construct shareable URL with Base64 encoded match recap payload
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://rallypulse.app';
  const matchPayload = {
    m: {
      id: match.id,
      courtId: match.courtId,
      courtNumber: match.courtNumber,
      courtName: match.courtName,
      team1: match.team1,
      team2: match.team2,
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      winner: match.winner,
      durationSeconds: match.durationSeconds,
      completed: match.completed,
    },
    p: rankedPlayers.map(p => ({
      id: p.id,
      name: p.name,
      skillLevel: p.skillLevel,
      gamesPlayed: p.totalGames,
      wins: p.wins,
      losses: p.losses,
      pointsWon: p.pointsWon,
      pointsLost: p.pointsLost,
      status: 'active',
      consecutiveRests: 0,
      partnerHistory: {},
      opponentHistory: {},
    })),
    t: completedAt,
  };
  const encodedRecap = encodeURIComponent(btoa(JSON.stringify(matchPayload)));
  const shareableUrl = `${origin}/?recap=${encodedRecap}`;

  const shareText = `🏓 Pickleball Match Recap - ${match.courtName}\n${team1Names} (${match.team1Score}) vs ${team2Names} (${match.team2Score})\n⏱️ Duration: ${formattedDuration}\n🏆 Winner: ${
    isTeam1Winner ? team1Names : isTeam2Winner ? team2Names : 'Draw'
  }\nView session recap: ${shareableUrl}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pickleball Match Recap: ${match.courtName}`,
          text: shareText,
          url: shareableUrl,
        });
        return;
      } catch (err: any) {
        // User cancelled or share failed, fallback to clipboard
        if (err.name !== 'AbortError') {
          console.log('Native share error, using clipboard fallback', err);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableUrl);
      } else {
        // Legacy fallback
        const textArea = document.createElement('textarea');
        textArea.value = shareableUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2500);
    } catch (e: any) {
      setCopyError('Unable to copy link to clipboard');
      setTimeout(() => setCopyError(null), 3000);
    }
  };

  const handleClose = () => {
    if (onReturnToQueue) {
      onReturnToQueue();
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg my-auto rounded-3xl bg-zinc-950 border border-zinc-800/90 shadow-2xl overflow-hidden transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing Gradient Ambient Backdrops */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 inset-x-0 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700/80 transition flex items-center justify-center cursor-pointer shadow-lg active:scale-95"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* MATCH RECEIPT CONTAINER */}
        <div className="p-5 sm:p-7 relative z-10">
          {/* Receipt Top Header Badge */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-500/20 via-indigo-500/20 to-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-widest mb-2 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Match Receipt</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {match.courtName}
            </h2>

            <div className="flex items-center justify-center gap-3 text-xs text-zinc-400 mt-1.5 font-medium flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {formattedDate} • {formattedTime}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30 font-mono-nums">
                <Clock className="w-3.5 h-3.5" />
                {formattedDuration}
              </span>
            </div>
          </div>

          {/* SERRATED DIVIDER */}
          <div className="relative my-4">
            <div className="border-t-2 border-dashed border-zinc-800 w-full" />
            <div className="absolute -left-8 -top-2 w-4 h-4 rounded-full bg-slate-950 border-r border-zinc-800" />
            <div className="absolute -right-8 -top-2 w-4 h-4 rounded-full bg-slate-950 border-l border-zinc-800" />
          </div>

          {/* SCOREBOARD SECTION */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 my-4">
            {/* TEAM A / TEAM 1 */}
            <div
              className={`relative rounded-2xl p-4 transition-all duration-300 border flex flex-col justify-between ${
                isTeam1Winner
                  ? 'bg-gradient-to-b from-emerald-950/70 to-zinc-900/90 border-emerald-500/80 shadow-lg shadow-emerald-950/40'
                  : 'bg-zinc-900/70 border-zinc-800 text-zinc-300'
              }`}
            >
              {isTeam1Winner && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
                  <Trophy className="w-3 h-3" />
                  <span>Winner</span>
                </div>
              )}

              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                  Team A
                </span>
                <div className="space-y-0.5">
                  {team1List.map((p) => (
                    <div key={p.id} className="text-xs sm:text-sm font-extrabold text-white truncate">
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Score</span>
                <span
                  className={`font-mono-nums font-black text-3xl sm:text-4xl ${
                    isTeam1Winner ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'text-zinc-200'
                  }`}
                >
                  {match.team1Score}
                </span>
              </div>
            </div>

            {/* TEAM B / TEAM 2 */}
            <div
              className={`relative rounded-2xl p-4 transition-all duration-300 border flex flex-col justify-between ${
                isTeam2Winner
                  ? 'bg-gradient-to-b from-indigo-950/70 to-zinc-900/90 border-indigo-500/80 shadow-lg shadow-indigo-950/40'
                  : 'bg-zinc-900/70 border-zinc-800 text-zinc-300'
              }`}
            >
              {isTeam2Winner && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
                  <Trophy className="w-3 h-3" />
                  <span>Winner</span>
                </div>
              )}

              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-1">
                  Team B
                </span>
                <div className="space-y-0.5">
                  {team2List.map((p) => (
                    <div key={p.id} className="text-xs sm:text-sm font-extrabold text-white truncate">
                      {p.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Score</span>
                <span
                  className={`font-mono-nums font-black text-3xl sm:text-4xl ${
                    isTeam2Winner ? 'text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 'text-zinc-200'
                  }`}
                >
                  {match.team2Score}
                </span>
              </div>
            </div>
          </div>

          {/* SERRATED DIVIDER */}
          <div className="relative my-4">
            <div className="border-t-2 border-dashed border-zinc-800 w-full" />
            <div className="absolute -left-8 -top-2 w-4 h-4 rounded-full bg-slate-950 border-r border-zinc-800" />
            <div className="absolute -right-8 -top-2 w-4 h-4 rounded-full bg-slate-950 border-l border-zinc-800" />
          </div>

          {/* PLAYER STATS & STANDINGS CARD */}
          <div className="my-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                <span>Updated Session Standings</span>
              </span>
              <span className="text-[10px] font-bold text-zinc-500">Live Leaderboard</span>
            </div>

            <div className="space-y-2">
              {[...team1List, ...team2List].map((p) => {
                const isWinner = (isTeam1Winner && match.team1.includes(p.id)) || (isTeam2Winner && match.team2.includes(p.id));
                const skillBadge = formatSkillBadge(p.skillLevel);

                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all ${
                      isWinner
                        ? 'bg-zinc-900/90 border-emerald-500/30'
                        : 'bg-zinc-900/50 border-zinc-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank Badge */}
                      <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 font-mono-nums font-black text-xs text-amber-400 shrink-0">
                        #{p.rank}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-white text-xs sm:text-sm truncate">
                            {p.name}
                          </span>
                          <span className={`text-[10px] font-mono-nums font-bold px-1.5 py-0.2 rounded-full border ${skillBadge.bg}`}>
                            {skillBadge.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-medium block">
                          {p.totalGames} match{p.totalGames === 1 ? '' : 'es'} played
                        </span>
                      </div>
                    </div>

                    {/* Record & Win Rate */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-mono-nums font-black text-zinc-200">
                          {p.wins}W - {p.losses}L
                        </div>
                        <div className="text-[10px] font-mono-nums font-bold text-emerald-400">
                          {p.winPercentage}% Win Rate
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SERRATED DIVIDER */}
          <div className="relative my-4">
            <div className="border-t-2 border-dashed border-zinc-800 w-full" />
            <div className="absolute -left-8 -top-2 w-4 h-4 rounded-full bg-slate-950 border-r border-zinc-800" />
            <div className="absolute -right-8 -top-2 w-4 h-4 rounded-full bg-slate-950 border-l border-zinc-800" />
          </div>

          {/* QR CODE & SHARING SECTION */}
          <div className="my-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-center gap-4">
            {/* High-Contrast QR Code */}
            <div className="p-2.5 rounded-xl bg-white shadow-xl shrink-0 flex items-center justify-center">
              <QRCodeSVG
                value={shareableUrl}
                size={84}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <span className="text-xs font-black text-zinc-200 block">Scan for Live Match Recap</span>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                Scan with your phone camera or share with court players for instant recap verification.
              </p>
              <span className="font-mono-nums text-[10px] text-indigo-400 truncate block mt-1">
                {shareableUrl.replace(/^https?:\/\//, '')}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS (52px MIN TOUCH TARGET) */}
          <div className="mt-5 space-y-2.5">
            {/* Primary Share Button */}
            <button
              onClick={handleShare}
              className={`w-full min-h-[52px] px-6 py-3.5 rounded-2xl font-black text-sm transition-all duration-200 active:scale-95 cursor-pointer shadow-xl flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-emerald-500 text-zinc-950 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 animate-bounce" />
                  <span>✓ Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5" />
                  <span>Share Match Recap</span>
                </>
              )}
            </button>

            {copyError && (
              <p className="text-center text-xs text-rose-400 font-bold">{copyError}</p>
            )}

            {/* Secondary Return to Queue Button */}
            <button
              onClick={handleClose}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs border border-zinc-800 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Close & Return to Queue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
