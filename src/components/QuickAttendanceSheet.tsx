import React from 'react';
import { X, UserCheck, Moon, Users, Plus } from 'lucide-react';
import { useSession } from '../context/SessionContext';

export const QuickAttendanceSheet: React.FC = () => {
  const {
    players,
    togglePlayerStatus,
    isAttendanceSheetOpen,
    setIsAttendanceSheetOpen,
    setActiveTab,
  } = useSession();

  if (!isAttendanceSheetOpen) return null;

  const activeCount = players.filter((p) => p.status === 'active').length;
  const restingCount = players.filter((p) => p.status === 'resting').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4">
      {/* Background click to dismiss */}
      <div
        className="absolute inset-0"
        onClick={() => setIsAttendanceSheetOpen(false)}
      />

      {/* Slide-up Container */}
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Grab Handle for mobile gesture feel */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-700/80" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Quick Attendance & Bench</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Toggle players active/resting. Changes apply to the next generated round.
            </p>
          </div>
          <button
            onClick={() => setIsAttendanceSheetOpen(false)}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Attendance Counter Pill */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeCount} Active (Playing)
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              {restingCount} Resting (Bench)
            </span>
          </div>

          <button
            onClick={() => {
              setIsAttendanceSheetOpen(false);
              setActiveTab('players');
            }}
            className="text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manage Roster</span>
          </button>
        </div>

        {/* Player List */}
        <div className="p-4 overflow-y-auto space-y-2 max-h-[60vh]">
          {players.map((player) => {
            const isActive = player.status === 'active';
            return (
              <div
                key={player.id}
                onClick={() => togglePlayerStatus(player.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none active:scale-[0.99] ${
                  isActive
                    ? 'bg-slate-800/70 border-emerald-500/40 text-white'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{player.name}</span>
                      <span className="font-mono-nums font-semibold text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {player.skillLevel.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {player.gamesPlayed} games played • {player.wins}W - {player.losses}L
                    </div>
                  </div>
                </div>

                {/* Toggle Pill Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayerStatus(player.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {isActive ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5" />
                      <span>Resting</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Done Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={() => setIsAttendanceSheetOpen(false)}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
