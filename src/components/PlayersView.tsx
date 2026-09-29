import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Player, SkillLevel } from '../types';
import { BulkAddModal } from './BulkAddModal';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  FileText,
  UserCheck,
  Moon,
  TrendingUp,
  UserPlus,
  Sparkles,
} from 'lucide-react';

const SKILL_LEVELS: SkillLevel[] = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

export const PlayersView: React.FC = () => {
  const {
    players,
    addPlayer,
    updatePlayer,
    deletePlayer,
    togglePlayerStatus,
    bulkAddPlayers,
  } = useSession();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resting'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // New player form
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState<SkillLevel>(3.0);
  const [newGender, setNewGender] = useState<Player['gender']>(undefined);

  const filteredPlayers = players.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && p.status === 'active') ||
      (filterStatus === 'resting' && p.status === 'resting');
    return matchesSearch && matchesStatus;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addPlayer(newName, newSkill, newGender);
    setNewName('');
    setNewGender(undefined);
    setShowAddModal(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !editingPlayer.name.trim()) return;
    updatePlayer(editingPlayer);
    setEditingPlayer(null);
  };

  const activeCount = players.filter((p) => p.status === 'active').length;
  const restingCount = players.filter((p) => p.status === 'resting').length;

  return (
    <div className="space-y-6 pb-28 md:pb-12 max-w-4xl mx-auto">
      {/* Header & Quick Stats */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 md:p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl md:text-2xl font-black text-white">Player Roster</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {players.length === 0
              ? 'Roster is fresh and ready. Add players to begin matchmaking.'
              : `Total ${players.length} players • ${activeCount} Active • ${restingCount} Resting (Bench)`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Bulk Paste</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Player</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Visible when roster has players) */}
      {players.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search players by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl w-full sm:w-auto">
            {(['all', 'active', 'resting'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer capitalize ${
                  filterStatus === tab
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'all' ? `All (${players.length})` : tab === 'active' ? `Active (${activeCount})` : `Resting (${restingCount})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Players List or Fresh Slate Zero State */}
      {players.length === 0 ? (
        <div className="py-16 px-6 rounded-2xl bg-slate-900/40 border-2 border-dashed border-slate-800 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4">
            <UserPlus className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-white">Fresh Roster Ready</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Add your session players to start generating fair, balanced doubles rotations and automatic game-by-game standings.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Player</span>
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Bulk Paste Roster</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-400 text-xs">
              No players found matching your criteria.
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isActive = player.status === 'active';
              const winRate =
                player.gamesPlayed > 0
                  ? Math.round((player.wins / player.gamesPlayed) * 100)
                  : 0;

              return (
                <div
                  key={player.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 border-slate-800/60 opacity-60'
                  }`}
                >
                  {/* Left: Avatar, Name & Skill */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
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
                        <span
                          className={`font-mono-nums font-bold text-[10px] px-2 py-0.5 rounded-full ${
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

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                        <span>{player.gamesPlayed} GP</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">{player.wins}W - {player.losses}L</span>
                        {player.consecutiveRests > 0 && <><span>•</span><span className="text-amber-400 font-semibold">Sat {player.consecutiveRests} {player.consecutiveRests === 1 ? 'game' : 'games'}</span></>}
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3 text-slate-400" />
                          {winRate}%
                        </span>
                        {player.consecutiveRests > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 font-medium">Rest: {player.consecutiveRests}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 mt-3 sm:mt-0 justify-end">
                    {/* Status Toggle Switch */}
                    <button
                      onClick={() => togglePlayerStatus(player.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isActive ? <UserCheck className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      <span>{isActive ? 'Active' : 'Resting'}</span>
                    </button>

                    <button
                      onClick={() => setEditingPlayer(player)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                      title="Edit player"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Remove ${player.name} from the session?`)) {
                          deletePlayer(player.id);
                        }
                      }}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title="Delete player"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Player Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Add New Player</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Player Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Jordan Hayes"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Skill Level (Pickleball / DUPR Rating)
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

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Gender (for optional mixed doubles)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { value: undefined, label: 'Not set' },
                    { value: 'female' as const, label: 'Female' },
                    { value: 'male' as const, label: 'Male' },
                    { value: 'other' as const, label: 'Other' },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setNewGender(option.value)}
                      className={`py-2 rounded-xl font-bold text-[10px] transition cursor-pointer ${newGender === option.value ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  Add Player
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Edit Player</h3>
              <button
                onClick={() => setEditingPlayer(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Player Name</label>
                <input
                  type="text"
                  required
                  value={editingPlayer.name}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, name: e.target.value })
                  }
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
                      onClick={() =>
                        setEditingPlayer({ ...editingPlayer, skillLevel: lvl })
                      }
                      className={`py-2 rounded-xl font-mono-nums font-bold text-xs transition cursor-pointer ${
                        editingPlayer.skillLevel === lvl
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {lvl.toFixed(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Gender (for optional mixed doubles)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { value: undefined, label: 'Not set' },
                    { value: 'female' as const, label: 'Female' },
                    { value: 'male' as const, label: 'Male' },
                    { value: 'other' as const, label: 'Other' },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setEditingPlayer({ ...editingPlayer, gender: option.value })}
                      className={`py-2 rounded-xl font-bold text-[10px] transition cursor-pointer ${editingPlayer.gender === option.value ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal Component */}
      <BulkAddModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onBulkAdd={(text, skill) => bulkAddPlayers(text, skill)}
      />
    </div>
  );
};
