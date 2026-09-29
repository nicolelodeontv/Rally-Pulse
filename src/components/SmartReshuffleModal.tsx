import React, { useState } from 'react';
import { ShuffleOptions } from '../types';
import { RefreshCw, Users, Scale, HeartHandshake, X } from 'lucide-react';

interface SmartReshuffleModalProps {
  isOpen: boolean;
  initialOptions: ShuffleOptions;
  onClose: () => void;
  onApply: (options: ShuffleOptions) => void;
}

export const SmartReshuffleModal: React.FC<SmartReshuffleModalProps> = ({
  isOpen,
  initialOptions,
  onClose,
  onApply,
}) => {
  const [options, setOptions] = useState<ShuffleOptions>(initialOptions);

  if (!isOpen) return null;

  const toggle = (key: keyof ShuffleOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Smart Re-Shuffle</h2>
              <p className="text-[11px] text-slate-500">Tune the next pairing without changing the rest of the session.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => toggle('avoidRepeatPartners')}
            className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition text-left ${options.avoidRepeatPartners ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-slate-800'}`}
          >
            <span className="flex items-center gap-3">
              <HeartHandshake className="w-4 h-4 text-emerald-400" />
              <span>
                <span className="block text-xs font-black text-white">Avoid Repeat Partners</span>
                <span className="block text-[10px] text-slate-500">Strongly penalize repeat pairings.</span>
              </span>
            </span>
            <span className={`text-[10px] font-black uppercase ${options.avoidRepeatPartners ? 'text-emerald-400' : 'text-slate-500'}`}>
              {options.avoidRepeatPartners ? 'On' : 'Off'}
            </span>
          </button>

          <button
            onClick={() => toggle('equalizeTeamRatings')}
            className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition text-left ${options.equalizeTeamRatings ? 'bg-blue-500/10 border-blue-500/30' : 'bg-slate-950 border-slate-800'}`}
          >
            <span className="flex items-center gap-3">
              <Scale className="w-4 h-4 text-blue-400" />
              <span>
                <span className="block text-xs font-black text-white">Equalize Team DUPR Ratings</span>
                <span className="block text-[10px] text-slate-500">Prefer closer combined team ratings.</span>
              </span>
            </span>
            <span className={`text-[10px] font-black uppercase ${options.equalizeTeamRatings ? 'text-blue-400' : 'text-slate-500'}`}>
              {options.equalizeTeamRatings ? 'On' : 'Off'}
            </span>
          </button>

          <button
            onClick={() => toggle('forceMixedDoubles')}
            className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition text-left ${options.forceMixedDoubles ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}
          >
            <span className="flex items-center gap-3">
              <Users className="w-4 h-4 text-amber-400" />
              <span>
                <span className="block text-xs font-black text-white">Force Mixed Doubles</span>
                <span className="block text-[10px] text-slate-500">Uses player gender metadata when available.</span>
              </span>
            </span>
            <span className={`text-[10px] font-black uppercase ${options.forceMixedDoubles ? 'text-amber-400' : 'text-slate-500'}`}>
              {options.forceMixedDoubles ? 'On' : 'Off'}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 pt-4">
          <button onClick={onClose} className="flex-1 min-h-[44px] rounded-xl bg-slate-800 text-slate-200 text-xs font-bold">
            Cancel
          </button>
          <button
            onClick={() => {
              onApply(options);
              onClose();
            }}
            className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 text-slate-950 text-xs font-black"
          >
            Re-Shuffle
          </button>
        </div>
      </div>
    </div>
  );
};
