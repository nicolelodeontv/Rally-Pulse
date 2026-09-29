import React, { useEffect, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { formatSkillBadge } from './PickleballCourt';
import { KioskCourtCard } from './KioskCourtCard';
import { audioSynth } from '../utils/hardware';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Users,
  Maximize2,
  RefreshCw,
  Clock,
  Radio,
  Volume2,
  VolumeX,
  Sun,
  Shield,
  Zap,
} from 'lucide-react';

export const TvDisplayMode: React.FC = () => {
  const {
    currentRound,
    players,
    setIsTvMode,
    timerSeconds,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    recordMatchScore,
    generateNextRound,
    completeCurrentRound,
    settings,
    updateSettings,
    toggleAutoRotate,
    autoRotateCountdown,
    executeAutoRotateNow,
    cancelAutoRotate,
    courtTimers,
    startAllCourtTimers,
    pauseAllCourtTimers,
    getEstimatedWaitMinutes,
  } = useSession();

  const [calloutFlash, setCalloutFlash] = useState<string | null>(null);

  const playerMap = new Map(players.map((p) => [p.id, p]));

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isCountUp = settings.timerMode === 'count_up';
  const targetSeconds = settings.matchDurationMinutes * 60;
  const isTimeUp = isCountUp ? timerSeconds >= targetSeconds && timerSeconds > 0 : timerSeconds === 0;
  const isLowTime = !isCountUp && timerSeconds <= 60 && timerSeconds > 0;

  // Active running court count
  const activeRunningCourtCount = Object.values(courtTimers).filter((t) => t.isRunning).length;

  // Next up on-deck players
  const onDeckPlayers = currentRound
    ? currentRound.restingPlayerIds
        .map((id) => playerMap.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p && p.status === 'active')
    : [];

  const allMatchesFinished = currentRound?.matches.every((m) => m.completed) ?? false;

  // Visual callout cue when round changes or completes
  useEffect(() => {
    if (currentRound) {
      setCalloutFlash(`Round #${currentRound.roundNumber} is Live!`);
      if (settings.soundEnabled) {
        audioSynth.playChime();
      }
      const timer = setTimeout(() => setCalloutFlash(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [currentRound?.roundNumber]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col p-4 md:p-8 overflow-y-auto select-none transition-all ${
        settings.outdoorHighContrast
          ? 'bg-slate-50 text-slate-950'
          : 'bg-slate-950 text-white'
      }`}
    >
      {/* Live Audio / Visual Callout Flash Banner */}
      {calloutFlash && (
        <div className="mb-4 bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl shadow-2xl flex items-center justify-between font-black text-base md:text-lg animate-bounce border-2 border-white">
          <div className="flex items-center gap-3">
            <Radio className="w-6 h-6 animate-pulse text-slate-950" />
            <span>{calloutFlash} — Players to your assigned courts!</span>
          </div>
          <span className="text-xs uppercase bg-slate-950 text-emerald-400 px-3 py-1 rounded-full">
            Court Callout
          </span>
        </div>
      )}

      {/* High-visibility Auto-Rotate Countdown TV Alert Banner */}
      {autoRotateCountdown !== null && (
        <div className="mb-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 border-2 border-white p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3 text-slate-950">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                Match Finished — Auto-Rotating in <span className="underline font-mono-nums text-3xl font-black">{autoRotateCountdown}s</span>
              </h2>
              <p className="text-xs md:text-sm font-bold text-slate-900">
                Generating fresh fair pairings and starting the next match timer automatically...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={executeAutoRotateNow}
              className="px-5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-white font-black text-sm shadow-xl transition cursor-pointer active:scale-95"
            >
              Rotate Now
            </button>
            <button
              onClick={cancelAutoRotate}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-slate-950 font-black text-sm transition cursor-pointer active:scale-95"
            >
              Cancel Auto
            </button>
          </div>
        </div>
      )}

      {/* Top Fence Board Bar: High-contrast clock and round banner */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b-2 border-slate-800">
        {/* Left: Branding & Round Number */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 font-black text-xl shadow-lg shadow-emerald-500/20">
            RP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-black tracking-widest text-emerald-400">
                Fence Board Display
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
              {currentRound ? `Round ${currentRound.roundNumber}` : 'Next Round Ready'}
            </h1>
          </div>
        </div>

        {/* Center: GIANT COUNTDOWN CLOCK (Visible from 30+ feet away) */}
        <div className="flex items-center gap-4 bg-slate-900/90 border-2 border-slate-700/80 rounded-2xl px-6 py-2 shadow-2xl">
          <div
            className={`font-mono-nums font-black text-5xl md:text-6xl tracking-tight transition-colors ${
              isTimeUp
                ? 'text-rose-500 animate-pulse'
                : isLowTime
                ? 'text-amber-400 animate-pulse'
                : isTimerRunning
                ? 'text-emerald-400'
                : 'text-slate-200'
            }`}
          >
            {formattedTime}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={isTimerRunning ? pauseTimer : startTimer}
              className={`p-3 rounded-xl font-bold transition active:scale-95 cursor-pointer shadow-lg ${
                isTimerRunning
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              }`}
              title={isTimerRunning ? 'Pause' : 'Start'}
            >
              {isTimerRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
            <button
              onClick={resetTimer}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition active:scale-95 cursor-pointer"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right: Controls & Exit */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound Buzzer Alert Toggle */}
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`p-3 rounded-xl border font-bold transition cursor-pointer ${
              settings.soundEnabled
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={`Audio Chimes: ${settings.soundEnabled ? 'ON' : 'OFF'}`}
          >
            {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* High Contrast Sunlight Toggle */}
          <button
            onClick={() => updateSettings({ outdoorHighContrast: !settings.outdoorHighContrast })}
            className={`p-3 rounded-xl border font-bold transition cursor-pointer ${
              settings.outdoorHighContrast
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Outdoor Sunlight High Contrast Theme"
          >
            <Sun className="w-5 h-5" />
          </button>

          <button
            onClick={toggleAutoRotate}
            className={`flex items-center gap-1.5 px-3.5 py-3 rounded-xl border text-xs font-bold transition active:scale-95 cursor-pointer ${
              settings.autoRotateEnabled
                ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${settings.autoRotateEnabled ? 'text-emerald-400 animate-spin-slow' : 'text-slate-400'}`} />
            <span>Auto: {settings.autoRotateEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {allMatchesFinished ? (
            <button
              onClick={completeCurrentRound}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 transition active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Next Game</span>
            </button>
          ) : (
            <button
              onClick={generateNextRound}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              Rotate Courts
            </button>
          )}

          <button
            onClick={toggleFullScreen}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Toggle Browser Fullscreen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsTvMode(false)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Exit Kiosk</span>
          </button>
        </div>
      </div>

      <section className="flex-1 py-4 md:py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm md:text-base uppercase tracking-[0.22em] font-black opacity-60">Now Playing</div>
            <div className="text-2xl md:text-4xl font-black">
              {currentRound ? `${currentRound.matches.filter((m) => m.courtNumber <= settings.courtCount).length} live courts` : 'Courts are being prepared'}
            </div>
          </div>
          <div className="text-right text-xs md:text-sm font-bold opacity-60">
            {currentRound ? `Round ${currentRound.roundNumber}` : 'Ready'}
          </div>
        </div>

        {currentRound ? (
          <div
            className={settings.courtCount === 1
              ? 'grid gap-5 grid-cols-1 max-w-5xl mx-auto'
              : settings.courtCount === 2
              ? 'grid gap-5 grid-cols-1 xl:grid-cols-2'
              : 'grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            }
          >
            {currentRound.matches
              .filter((match) => match.courtNumber <= settings.courtCount)
              .map((match) => (
                <KioskCourtCard
                  key={match.id}
                  match={match}
                  playersMap={playerMap}
                  timerSeconds={courtTimers[match.courtId]?.seconds ?? 0}
                  settings={settings}
                />
              ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <h2 className="text-3xl md:text-5xl font-black opacity-80">No active matches</h2>
            <button
              onClick={generateNextRound}
              className="mt-6 px-8 py-4 rounded-2xl bg-emerald-500 font-black text-slate-950 text-base md:text-lg"
            >
              Start Next Game
            </button>
          </div>
        )}
      </section>

      {/* Bottom Ticker: On-Deck / Next Up Players Marquee */}
      {onDeckPlayers.length > 0 && (
        <div className="mt-auto pt-3 border-t-2 border-slate-800 flex items-center gap-4 bg-slate-900/80 rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase tracking-wider shrink-0">
            <Users className="w-5 h-5" />
            <span>🟡 On Deck (Next Up):</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {onDeckPlayers.map((player, idx) => {
              const badge = formatSkillBadge(player.skillLevel, settings.skillDisplayMode);
              const estWait = getEstimatedWaitMinutes(idx);

              return (
                <div
                  key={player.id}
                  className={settings.outdoorHighContrast ? "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 font-black text-base text-slate-900 whitespace-nowrap" : "flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 font-black text-base text-slate-100 whitespace-nowrap"}
                >
                  <span className="font-black">{player.name}</span>
                  <span className={`font-mono-nums text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border ${badge.bg}`}>
                    {badge.label}
                  </span>
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono-nums flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>~{estWait}m</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
