import React from 'react';
import { Download, Trophy, Clock, Target, X } from 'lucide-react';
import { SessionRecap } from '../types';
import { downloadTextFile, formatDuration } from '../utils/sessionAnalytics';

interface SessionRecapModalProps {
  recap: SessionRecap;
  onClose: () => void;
  onStartNewSession: () => void;
}

export const SessionRecapModal: React.FC<SessionRecapModalProps> = ({
  recap,
  onClose,
  onStartNewSession,
}) => {
  const handleDownload = () => {
    const lines = [
      'RallyPulse Session Recap',
      `Generated: ${new Date(recap.generatedAt).toLocaleString()}`,
      '',
      `Total games: ${recap.totalGames}`,
      `Total rounds: ${recap.totalRounds}`,
      `Average match length: ${formatDuration(recap.averageMatchLengthSeconds)}`,
      '',
      'Player,Games,Wins,Losses,Win Rate,Point Differential',
      ...recap.playerStats.map((player) =>
        [
          player.name,
          player.gamesPlayed,
          player.wins,
          player.losses,
          `${player.winRate}%`,
          player.pointDifferential >= 0 ? `+${player.pointDifferential}` : player.pointDifferential,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];

    downloadTextFile(
      `rallypulse-session-recap-${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join('\n'),
      'text/csv;charset=utf-8'
    );
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white">Session Recap</h2>
            <p className="text-xs text-slate-400 mt-0.5">Your completed-session summary is ready.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-950 p-3 text-center">
              <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
              <div className="font-mono-nums text-xl font-black text-white">{recap.totalGames}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-black">Games</div>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 text-center">
              <Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <div className="font-mono-nums text-xl font-black text-white">{recap.totalRounds}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-black">Rounds</div>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 text-center">
              <Clock className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="font-mono-nums text-xl font-black text-white">
                {formatDuration(recap.averageMatchLengthSeconds)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-black">Avg Match</div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[10px] uppercase tracking-wide text-slate-500 font-black">
                <tr>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2 text-center">GP</th>
                  <th className="px-3 py-2 text-center">W-L</th>
                  <th className="px-3 py-2 text-center">Win %</th>
                  <th className="px-3 py-2 text-right">Pts +/-</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recap.playerStats.map((player) => (
                  <tr key={player.id} className="text-slate-200">
                    <td className="px-3 py-2.5 font-bold">{player.name}</td>
                    <td className="px-3 py-2.5 text-center font-mono-nums">{player.gamesPlayed}</td>
                    <td className="px-3 py-2.5 text-center font-mono-nums">
                      <span className="text-emerald-400">{player.wins}</span>
                      <span className="text-slate-600 mx-1">-</span>
                      <span className="text-rose-400">{player.losses}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono-nums">{player.winRate}%</td>
                    <td className={`px-3 py-2.5 text-right font-mono-nums font-bold ${player.pointDifferential >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {player.pointDifferential >= 0 ? `+${player.pointDifferential}` : player.pointDifferential}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-5 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 text-slate-950 text-xs font-black flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Recap CSV
          </button>
          <button
            onClick={onStartNewSession}
            className="flex-1 min-h-[44px] rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
          >
            Start New Session
          </button>
        </div>
      </div>
    </div>
  );
};
