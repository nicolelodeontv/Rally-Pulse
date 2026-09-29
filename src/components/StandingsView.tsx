import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Trophy, Medal, ArrowUpDown } from 'lucide-react';

type SortKey = 'wins' | 'winRate' | 'diff' | 'games';

export const StandingsView: React.FC = () => {
  const { players } = useSession();
  const [sortKey, setSortKey] = useState<SortKey>('winRate');

  // Partition into played vs unplayed (0 games played must always sort to the bottom)
  const playedPlayers = players.filter((p) => p.gamesPlayed > 0);
  const unplayedPlayers = players.filter((p) => p.gamesPlayed === 0);

  playedPlayers.sort((a, b) => {
    const aWinRate = a.wins / a.gamesPlayed;
    const bWinRate = b.wins / b.gamesPlayed;
    const aDiff = a.pointsWon - a.pointsLost;
    const bDiff = b.pointsWon - b.pointsLost;

    if (sortKey === 'winRate') {
      if (bWinRate !== aWinRate) return bWinRate - aWinRate;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return bDiff - aDiff;
    }
    if (sortKey === 'wins') {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (bWinRate !== aWinRate) return bWinRate - aWinRate;
      return bDiff - aDiff;
    }
    if (sortKey === 'diff') {
      if (bDiff !== aDiff) return bDiff - aDiff;
      return b.wins - a.wins;
    }
    // sortKey === 'games'
    if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    return b.wins - a.wins;
  });

  unplayedPlayers.sort((a, b) => a.name.localeCompare(b.name));

  const sortedPlayers = [...playedPlayers, ...unplayedPlayers];

  return (
    <div className="space-y-6 pb-28 md:pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 md:p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl md:text-2xl font-black text-white">Session Standings</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time leaderboard updated automatically after every recorded match.
          </p>
        </div>

        {/* Sort Selectors */}
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
          <span className="text-[10px] text-slate-500 font-bold px-2 uppercase flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" />
            Sort:
          </span>
          {(
            [
              { key: 'winRate', label: 'Win %' },
              { key: 'wins', label: 'Wins' },
              { key: 'diff', label: 'Diff' },
              { key: 'games', label: 'Played' },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => setSortKey(s.key)}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                sortKey === s.key
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table / Cards */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-extrabold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-3 sm:px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-3 sm:px-4">Player</th>
                <th className="py-3 px-2 text-center">Skill</th>
                <th className="py-3 px-3 text-center">Played</th>
                <th className="py-3 px-3 text-center">W - L</th>
                <th className="py-3 px-3 text-center">Win %</th>
                <th className="py-3 px-3 text-right">Pts +/-</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {sortedPlayers.map((player, idx) => {
                const hasPlayed = player.gamesPlayed > 0;
                const winRate = hasPlayed
                  ? Math.round((player.wins / player.gamesPlayed) * 100)
                  : 0;
                const pointDiff = player.pointsWon - player.pointsLost;

                return (
                  <tr
                    key={player.id}
                    className={`transition duration-150 ${
                      hasPlayed ? 'hover:bg-slate-800/40' : 'bg-slate-950/30 text-slate-500 hover:bg-slate-800/20'
                    }`}
                  >
                    {/* Rank: 0 games played always gets a dash "—" */}
                    <td className="py-3.5 px-3 sm:px-4 text-center">
                      {!hasPlayed ? (
                        <span className="font-mono-nums font-bold text-slate-600 text-sm select-none" title="Unranked (0 games played)">
                          —
                        </span>
                      ) : idx === 0 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20">
                          1
                        </span>
                      ) : idx === 1 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-xs">
                          2
                        </span>
                      ) : idx === 2 ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
                          3
                        </span>
                      ) : (
                        <span className="font-mono-nums font-bold text-slate-500 text-xs">
                          {idx + 1}
                        </span>
                      )}
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-3 sm:px-4">
                      <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                        <span className={!hasPlayed ? 'text-slate-400' : ''}>{player.name}</span>
                        {hasPlayed && idx === 0 && <Medal className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {player.status === 'active' ? 'Active' : 'Resting'}
                      </span>
                    </td>

                    {/* Skill Rating */}
                    <td className="py-3.5 px-2 text-center">
                      <span className="font-mono-nums font-bold text-[11px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-300">
                        {player.skillLevel.toFixed(1)}
                      </span>
                    </td>

                    {/* Games Played */}
                    <td className="py-3.5 px-3 text-center font-mono-nums text-slate-300">
                      {player.gamesPlayed}
                    </td>

                    {/* W - L */}
                    <td className="py-3.5 px-3 text-center font-mono-nums">
                      {hasPlayed ? (
                        <>
                          <span className="text-emerald-400 font-bold">{player.wins}</span>
                          <span className="text-slate-500 mx-1">-</span>
                          <span className="text-rose-400 font-bold">{player.losses}</span>
                        </>
                      ) : (
                        <span className="text-slate-600">0 - 0</span>
                      )}
                    </td>

                    {/* Win Rate */}
                    <td className="py-3.5 px-3 text-center">
                      {hasPlayed ? (
                        <span
                          className={`font-mono-nums font-bold px-2 py-0.5 rounded-md ${
                            winRate >= 70
                              ? 'text-emerald-400 bg-emerald-500/15'
                              : winRate >= 50
                              ? 'text-blue-400 bg-blue-500/15'
                              : 'text-slate-400'
                          }`}
                        >
                          {winRate}%
                        </span>
                      ) : (
                        <span className="font-mono-nums text-slate-600">—</span>
                      )}
                    </td>

                    {/* Point Differential */}
                    <td className="py-3.5 px-3 text-right font-mono-nums font-bold">
                      {hasPlayed ? (
                        <span
                          className={
                            pointDiff > 0
                              ? 'text-emerald-400'
                              : pointDiff < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }
                        >
                          {pointDiff > 0 ? `+${pointDiff}` : pointDiff}
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
