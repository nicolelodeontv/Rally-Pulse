import React, { useState } from 'react';
import { Player, SkillLevel } from '../types';
import { X, UserPlus, Check, Search, Moon, UserCheck } from 'lucide-react';

interface SlotAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  courtName: string;
  teamNumber: 1 | 2;
  slotPosition: 'left' | 'right';
  players: Player[];
  assignedPlayerIds: Set<string>;
  onAssignPlayer: (playerId: string) => void;
  onCreateAndAssign: (name: string, skillLevel: SkillLevel) => void;
}

const SKILL_LEVELS: SkillLevel[] = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

export const SlotAssignModal: React.FC<SlotAssignModalProps> = ({
  isOpen,
  onClose,
  courtName,
  teamNumber,
  slotPosition,
  players,
  assignedPlayerIds,
  onAssignPlayer,
  onCreateAndAssign,
}) => {
  const [search, setSearch] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState<SkillLevel>(3.5);

  if (!isOpen) return null;

  // Split players into unassigned vs already on-court
  const unassignedPlayers = players.filter((p) => !assignedPlayerIds.has(p.id));
  const filtered = unassignedPlayers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateAndAssign(newName.trim(), newSkill);
    setNewName('');
    setIsCreatingNew(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h3 className="font-extrabold text-base text-white">Assign Player to Court Slot</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {courtName} • Team {teamNumber} ({slotPosition === 'left' ? 'Left Service' : 'Right Service'})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab or Mode Switcher: Pick Existing vs Create New */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreatingNew(false)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              !isCreatingNew
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
            }`}
          >
            Pick Available Player ({unassignedPlayers.length})
          </button>
          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              isCreatingNew
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-800/70 text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ New Player</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {isCreatingNew ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Player Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Alex Morgan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
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
                      onClick={() => setNewSkill(lvl)}
                      className={`py-2 rounded-xl font-mono-nums font-bold text-xs transition cursor-pointer ${
                        newSkill === lvl
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
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
                  onClick={() => setIsCreatingNew(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25"
                >
                  Create & Slot In
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search available players..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Player list */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs rounded-xl bg-slate-950/40 border border-dashed border-slate-800">
                    <p>No available players found.</p>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(true)}
                      className="mt-2 text-emerald-400 font-bold hover:underline"
                    >
                      + Create a new player
                    </button>
                  </div>
                ) : (
                  filtered.map((player) => {
                    const isActive = player.status === 'active';
                    return (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          onAssignPlayer(player.id);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {player.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-100 group-hover:text-white block">
                              {player.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span>Skill {player.skillLevel.toFixed(1)}</span>
                              <span>•</span>
                              <span>{player.gamesPlayed} GP</span>
                              <span>•</span>
                              <span className={isActive ? 'text-emerald-400' : 'text-amber-400'}>
                                {isActive ? 'Active' : 'Bench'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] font-bold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <span>Assign</span>
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
