import React from 'react';
import { Match, Player, SessionSettings } from '../types';
import { CircleDot, Trophy } from 'lucide-react';

interface KioskCourtCardProps {
  match: Match;
  playersMap: Map<string, Player>;
  timerSeconds: number;
  settings: SessionSettings;
}

export const KioskCourtCard: React.FC<KioskCourtCardProps> = ({
  match,
  playersMap,
  timerSeconds,
  settings,
}) => {
  const team1 = match.team1.map((id) => playersMap.get(id)).filter(Boolean) as Player[];
  const team2 = match.team2.map((id) => playersMap.get(id)).filter(Boolean) as Player[];
  const team1Average = team1.length === 2 ? (team1[0].skillLevel + team1[1].skillLevel) / 2 : 0;
  const team2Average = team2.length === 2 ? (team2[0].skillLevel + team2[1].skillLevel) / 2 : 0;
  const servingTeam = match.servingPlayerId && match.team1.includes(match.servingPlayerId) ? 1 : 2;
  const servingPlayer = match.servingPlayerId ? playersMap.get(match.servingPlayerId) : undefined;

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const time = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

  const surface = settings.outdoorHighContrast
    ? 'bg-white border-slate-300 text-slate-950'
    : 'bg-slate-900 border-slate-800 text-white';

  return (
    <section className={'rounded-3xl p-6 md:p-8 border transition-colors ' + surface}>
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <span className={settings.outdoorHighContrast
            ? 'px-3 py-1.5 rounded-xl text-lg md:text-xl font-black bg-slate-100 text-slate-900'
            : 'px-3 py-1.5 rounded-xl text-lg md:text-xl font-black bg-slate-800 text-slate-200'
          }>
            C{match.courtNumber}
          </span>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] font-black opacity-60">Now Playing</div>
            <div className="text-xl md:text-2xl font-black">{match.courtName}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono-nums text-4xl md:text-5xl font-black tabular-nums">{time}</div>
          <div className="text-[11px] uppercase tracking-wider font-bold opacity-60">
            {match.completed ? 'Final' : settings.timerMode === 'count_up' ? 'Elapsed' : 'Remaining'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-5">
        <div className={match.winner === 'team1'
          ? (settings.outdoorHighContrast ? 'rounded-2xl p-4 md:p-5 bg-emerald-100 border-2 border-emerald-500' : 'rounded-2xl p-4 md:p-5 bg-emerald-950/60 border-2 border-emerald-500')
          : (settings.outdoorHighContrast ? 'rounded-2xl p-4 md:p-5 bg-slate-50 border border-slate-200' : 'rounded-2xl p-4 md:p-5 bg-slate-950 border border-slate-800')
        }>
          <div className="text-[10px] uppercase tracking-wider font-black opacity-60">Team 1</div>
          <div className="mt-1 text-2xl md:text-3xl font-black leading-tight">{team1.map((p) => p.name.split(' ')[0]).join(' & ') || 'Awaiting players'}</div>
          <div className="mt-2 text-sm md:text-base font-mono-nums font-black opacity-75">DUPR {team1Average.toFixed(1)}</div>
          {servingTeam === 1 && servingPlayer && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase text-amber-500">
              <CircleDot className="w-4 h-4" />
              Serving: {servingPlayer.name}
            </div>
          )}
        </div>

        <div className="text-5xl md:text-7xl font-mono-nums font-black text-center min-w-[110px]">
          <span className={match.winner === 'team1' ? 'text-emerald-500' : ''}>{match.team1Score}</span>
          <span className="opacity-30 mx-2">-</span>
          <span className={match.winner === 'team2' ? 'text-emerald-500' : ''}>{match.team2Score}</span>
        </div>

        <div className={match.winner === 'team2'
          ? (settings.outdoorHighContrast ? 'rounded-2xl p-4 md:p-5 bg-emerald-100 border-2 border-emerald-500' : 'rounded-2xl p-4 md:p-5 bg-emerald-950/60 border-2 border-emerald-500')
          : (settings.outdoorHighContrast ? 'rounded-2xl p-4 md:p-5 bg-slate-50 border border-slate-200' : 'rounded-2xl p-4 md:p-5 bg-slate-950 border border-slate-800')
        }>
          <div className="text-[10px] uppercase tracking-wider font-black opacity-60">Team 2</div>
          <div className="mt-1 text-2xl md:text-3xl font-black leading-tight">{team2.map((p) => p.name.split(' ')[0]).join(' & ') || 'Awaiting players'}</div>
          <div className="mt-2 text-sm md:text-base font-mono-nums font-black opacity-75">DUPR {team2Average.toFixed(1)}</div>
          {servingTeam === 2 && servingPlayer && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-black uppercase text-amber-500">
              <CircleDot className="w-4 h-4" />
              Serving: {servingPlayer.name}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-xs md:text-sm font-bold opacity-70">
        <span>DUPR balance: {Math.abs(team1Average - team2Average).toFixed(1)} difference</span>
        {match.completed && match.winner && (
          <span className="inline-flex items-center gap-2 text-emerald-500 uppercase tracking-wider font-black">
            <Trophy className="w-4 h-4" />
            {match.winner === 'team1' ? 'Team 1 Won' : 'Team 2 Won'}
          </span>
        )}
      </div>
    </section>
  );
};
