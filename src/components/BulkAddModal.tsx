import React, { useState } from 'react';
import { SkillLevel } from '../types';
import { X, UserPlus, FileText, CheckCircle2, Sparkles, Users } from 'lucide-react';

interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkAdd: (namesText: string, defaultSkill: SkillLevel) => void;
}

const SKILL_LEVELS: SkillLevel[] = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

export const BulkAddModal: React.FC<BulkAddModalProps> = ({
  isOpen,
  onClose,
  onBulkAdd,
}) => {
  const [textInput, setTextInput] = useState('');
  const [defaultSkill, setDefaultSkill] = useState<SkillLevel>(3.0);

  if (!isOpen) return null;

  // Parse names preview
  const parsedNames = textInput
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedNames.length === 0) return;
    onBulkAdd(textInput, defaultSkill);
    setTextInput('');
    onClose();
  };

  const handlePasteExample = () => {
    setTextInput(
      `Alex Johnson\nSarah Connor (3.5)\nMichael Chang 4.0\nEmma Watson\nDavid Beckham (4.5)\nLisa Simpson\nJames Bond 3.5\nMaria Sharapova 4.0`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-white">
                Bulk Paste Players
              </h3>
              <p className="text-xs text-slate-400">
                Paste multiple names from WhatsApp, Notes, or Excel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Default Skill Level Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                Default DUPR / Skill Rating
              </label>
              <span className="text-[11px] text-emerald-400 font-bold font-mono-nums">
                {defaultSkill.toFixed(1)}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {SKILL_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setDefaultSkill(lvl)}
                  className={`py-2 rounded-xl text-xs font-bold font-mono-nums transition cursor-pointer ${
                    defaultSkill === lvl
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl.toFixed(1)}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Applied to players unless a specific rating is included in the line (e.g. "John 3.5").
            </p>
          </div>

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">
                Player Names (One per line or comma-separated)
              </label>
              <button
                type="button"
                onClick={handlePasteExample}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Fill Sample List</span>
              </button>
            </div>
            <textarea
              rows={6}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste names here...&#10;e.g.&#10;Alex Johnson&#10;Sarah Connor 3.5&#10;Michael Chang&#10;Emma Watson 4.0"
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-xs md:text-sm font-mono transition resize-none leading-relaxed"
              autoFocus
            />
          </div>

          {/* Parsing Preview */}
          {parsedNames.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ready to add {parsedNames.length} {parsedNames.length === 1 ? 'player' : 'players'}</span>
                </span>
                <span className="text-[10px] text-slate-500 uppercase font-mono-nums">
                  {Math.floor(parsedNames.length / 4)} full court{Math.floor(parsedNames.length / 4) === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {parsedNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium"
                  >
                    <span>{name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={parsedNames.length === 0}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/25 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add {parsedNames.length > 0 ? `${parsedNames.length} Players` : 'Players'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
