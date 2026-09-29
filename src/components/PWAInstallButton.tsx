import React, { useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'settings' | 'compact' }> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-3 py-2 rounded-lg">
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>App Installed as Native PWA</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          className={`flex items-center gap-2 font-medium transition cursor-pointer active:scale-95 ${
            variant === 'settings'
              ? 'w-full justify-center bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-bold px-4 py-3 rounded-xl shadow-lg shadow-emerald-900/30'
              : variant === 'compact'
              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg text-xs shadow-sm'
          }`}
          title="Install RallyPulse on your device"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Install App</span>
        </button>
      )}

      {isIOS && (
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 font-medium transition cursor-pointer active:scale-95 ${
            variant === 'settings'
              ? 'w-full justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-3 rounded-xl'
              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/60 px-2.5 py-1.5 rounded-lg text-xs'
          }`}
          title="Install on iPhone / iPad"
        >
          <Share2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Install on iOS</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="mt-4 space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-blue-400">
                  1
                </span>
                <span>
                  Tap the <strong className="text-white">Share</strong> button in your Safari toolbar (at the bottom or top of your screen).
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-blue-400">
                  2
                </span>
                <span>
                  Scroll down the share sheet and tap{' '}
                  <strong className="text-white">Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-blue-400">
                  3
                </span>
                <span>
                  Tap <strong className="text-white">Add</strong> in the top right. RallyPulse will now launch like a full-screen native app!
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-semibold text-white transition active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
