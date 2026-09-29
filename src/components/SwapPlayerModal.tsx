import React from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import { Player } from '../types';

interface SwapPlayerModalProps {
  sourcePlayerId: string | null;
  players: Player[];
  onClose: () => void;
  onSwap: (sourceId: string, targetId: string) => void;
}

export const SwapPlayerModal: React.FC<SwapPlayerModalProps> = ({
  sourcePlayerId,
  players,
  onClose,
  onSwap,
}) => {
  if (!sourcePlayerId) return null;

  const sourcePlayer = players.find((p) => p.id === sourcePlayerId);
  if (!sourcePlayer) return null;

  const otherPlayers = players.filter((p) => p.id !== sourcePlayerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Swap Player</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Select a player to swap positions with <strong className="text-emerald-400 font-bold">{sourcePlayer.name}</strong> ({sourcePlayer.skillLevel.toFixed(1)}).
        </p>

        <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
          {otherPlayers.map((target) => (
            <button
              key={target.id}
              onClick={() => {
                onSwap(sourcePlayer.id, target.id);
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/50 transition cursor-pointer active:scale-98 text-left"
            >
              <div>
                <span className="font-semibold text-sm text-slate-100">{target.name}</span>
                <span className="block text-[11px] text-slate-400">
                  {target.status === 'active' ? 'Active' : 'Resting'} • {target.gamesPlayed} games played
                </span>
              </div>
              <span className="font-mono-nums text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 font-bold text-slate-300">
                {target.skillLevel.toFixed(1)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
