import React from 'react';
import { useSession } from '../context/SessionContext';
import { Trophy, History, Users, Clock, CheckCircle, Share2 } from 'lucide-react';

export const QueueView: React.FC = () => {
  const { players, rounds, currentRound } = useSession();

  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Active bench players waiting for court time
  const onDeckPlayers = currentRound
    ? currentRound.restingPlayerIds
        .map((id) => playerMap.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p && p.status === 'active')
    : [];

  const completedMatches = [
    ...rounds.flatMap((round) => round.matches.filter((match) => match.completed && match.winner)),
    ...(currentRound?.matches.filter((match) => match.completed && match.winner) || []),
  ];

  // Count total completed games logged across all rounds
  const totalCompletedGames = completedMatches.length;

  return (
    <div className="space-y-6 pb-28 md:pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Queue & Match History</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor players on-deck and review past game outcomes.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-300">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>{totalCompletedGames} {totalCompletedGames === 1 ? 'Game' : 'Games'} Logged</span>
        </div>
      </div>

      {/* On-Deck / Next Up Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">On Deck (Next Game Priority)</h2>
            <p className="text-xs text-slate-400">
              Active players currently benched who will be placed first into the upcoming game.
            </p>
          </div>
        </div>

        {onDeckPlayers.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            All active players are currently on court!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {onDeckPlayers.map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/40 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center font-mono-nums">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-sm text-slate-100 block">{player.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {player.gamesPlayed} games played
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono-nums text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 font-bold text-slate-300">
                    {player.skillLevel.toFixed(1)}
                  </span>
                  {player.consecutiveRests > 0 && (
                    <span className="block text-[10px] text-amber-400 font-semibold mt-0.5">
                      Benched {player.consecutiveRests}x
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Games History */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Completed Games History</h2>
              <p className="text-[11px] text-slate-500">{completedMatches.length} finished {completedMatches.length === 1 ? 'match' : 'matches'}</p>
            </div>
          </div>
          {completedMatches.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                const lines = completedMatches.map((match) => {
                  const team1 = match.team1.map((id) => playerMap.get(id)?.name || 'Player').join(' & ');
                  const team2 = match.team2.map((id) => playerMap.get(id)?.name || 'Player').join(' & ');
                  return match.courtName + ': ' + team1 + ' ' + match.team1Score + ' - ' + match.team2Score + ' ' + team2;
                });
                const shareText = 'RallyPulse Finished Matches\n\n' + lines.join('\n');
                try {
                  if (navigator.share) {
                    await navigator.share({ title: 'RallyPulse Finished Matches', text: shareText });
                  } else {
                    await navigator.clipboard.writeText(shareText);
                    alert('Finished match results copied to clipboard.');
                  }
                } catch {
                  // User cancelled native sharing or sharing is unavailable.
                }
              }}
              className="h-10 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black transition active:scale-95 cursor-pointer"
              title="Share all finished match results"
            >
              <Share2 className="w-4 h-4" />
              <span>Share All Finished Matches</span>
            </button>
          )}
        </div>

        {rounds.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 p-6">
            <CheckCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-300">No Completed Games Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Finish matches on the Live screen and tap "Next Game" to log completed game scores and update player records.
            </p>
          </div>
        ) : (
          rounds.map((round) => (
            <div
              key={round.id}
              className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-4 shadow-md space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs">
                    Game #{round.roundNumber}
                  </span>
                  <span className="text-xs text-slate-400 font-mono-nums">
                    {new Date(round.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {round.matches.length} {round.matches.length === 1 ? 'Court' : 'Courts'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {round.matches.map((m) => {
                  const t1p1 = playerMap.get(m.team1[0])?.name || 'Player 1';
                  const t1p2 = playerMap.get(m.team1[1])?.name || 'Player 2';
                  const t2p1 = playerMap.get(m.team2[0])?.name || 'Player 3';
                  const t2p2 = playerMap.get(m.team2[1])?.name || 'Player 4';

                  return (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                        <span>{m.courtName}</span>

                      </div>

                      {/* Team 1 vs Team 2 */}
                      <div className="space-y-1.5 text-xs">
                        <div
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            m.winner === 'team1'
                              ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          <span className="truncate pr-2">{t1p1} & {t1p2}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${
                              m.winner === 'team1'
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {m.winner === 'team1' ? 'WIN' : 'LOSE'}
                            </span>
                            <span className="font-mono-nums font-black text-sm">{m.team1Score}</span>
                          </span>
                        </div>

                        <div
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            m.winner === 'team2'
                              ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          <span className="truncate pr-2">{t2p1} & {t2p2}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${
                              m.winner === 'team2'
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {m.winner === 'team2' ? 'WIN' : 'LOSE'}
                            </span>
                            <span className="font-mono-nums font-black text-sm">{m.team2Score}</span>
                          </span>
                        </div>
                      </div>


                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
