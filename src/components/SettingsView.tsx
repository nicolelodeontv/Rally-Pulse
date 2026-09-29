import React, { useEffect, useState } from 'react';
import { useSession } from '../context/SessionContext';
import { RotationStrategy } from '../types';
import { buildDuprCsv } from '../utils/duprExport';
import { downloadTextFile } from '../utils/sessionAnalytics';
import { SessionRecapModal } from './SessionRecapModal';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Sliders,
  Volume2,
  Smartphone,
  Eye,
  RotateCcw,
  Download,
  Upload,
  Layers,
  Clock,
  ShieldCheck,
  Check,
  RefreshCw,
  Zap,
  TrendingUp,
  Trophy,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    courts,
    updateCourtCount,
    updateCourtName,
    resetSession,
    exportSessionData,
    importSessionData,
    sessionEnded,
    endSession,
    getSessionRecap,
    resetSession,
    players,
    rounds,
    currentRound,
  } = useSession();

  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showRecapModal, setShowRecapModal] = useState(false);

  useEffect(() => {
    if (sessionEnded) setShowRecapModal(true);
  }, [sessionEnded]);


  const handleExport = () => {
    const json = exportSessionData();
    navigator.clipboard.writeText(json).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const ok = importSessionData(importText);
    if (ok) {
      setShowImportModal(false);
      setImportText('');
      alert('Session data imported successfully!');
    } else {
      alert('Invalid JSON session backup format.');
    }
  };

  return (
    <div className="space-y-6 pb-28 md:pb-12 max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 md:p-5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl md:text-2xl font-black text-white">Session Settings</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure courts, rotation matchmaking algorithm rules, timer durations, and hardware integrations.
        </p>
      </div>

      {/* Courts Configuration */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Layers className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white">Courts Setup</h2>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-300">
              Number of Active Courts ({settings.courtCount})
            </label>
            <span className="text-[11px] font-semibold text-emerald-400">
              Each court has its own independent timer
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <button
                key={num}
                onClick={() => updateCourtCount(num)}
                className={`py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  settings.courtCount === num
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {num} {num === 1 ? 'Court' : 'Courts'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Court Names */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold text-slate-400 block">Court Names / Labels</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {courts.map((court) => (
              <div key={court.id} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 w-6 font-mono-nums">
                  #{court.courtNumber}
                </span>
                <input
                  type="text"
                  value={court.name}
                  onChange={(e) => updateCourtName(court.id, e.target.value)}
                  placeholder={`Court ${court.courtNumber}`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preset Rotation Rules */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Preset Rotation Rules</h2>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            {settings.rotationPreset || '4_in_4_out'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              id: '4_in_4_out',
              title: '4-in / 4-out (Standard Open Play)',
              desc: 'Full 4-player rotation with strict sit-out balancing. Best for large open play groups and long queues.',
            },
            {
              id: '2_in_2_out_winners_stay',
              title: '2-in / 2-out (Winners Stay)',
              desc: 'Winning pair stays on court (max 2 consecutive wins to prevent court hogging); losing pair rests; 2 challengers enter.',
            },
            {
              id: 'fair_play_sitout',
              title: 'Fair-Play / Sit-Out Priority',
              desc: 'Strict priority: Guarantees any player with 2+ consecutive rests is placed on a court in the very next game.',
            },
            {
              id: 'skill_balanced',
              title: 'Skill / DUPR Matchmaker',
              desc: 'Pairs and courts are balanced according to DUPR ratings to create close, nail-biting matches.',
            },
          ].map((preset) => (
            <div
              key={preset.id}
              onClick={() => updateSettings({ rotationPreset: preset.id as any, rotationStrategy: preset.id === 'skill_balanced' ? 'skill_balanced' : 'fair_social' })}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                (settings.rotationPreset || '4_in_4_out') === preset.id
                  ? 'bg-emerald-950/50 border-emerald-500 text-white shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100">{preset.title}</span>
                  {(settings.rotationPreset || '4_in_4_out') === preset.id && (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{preset.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skill Level Display Format & Outdoor Display */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white">Visual Display & Skill Tagging</h2>
        </div>

        {/* Skill Display Format */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">
            Player Skill Display Tagging
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => updateSettings({ skillDisplayMode: 'dupr' })}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                settings.skillDisplayMode !== 'casual'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-100">Numeric DUPR Rating (3.5)</span>
                {settings.skillDisplayMode !== 'casual' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Displays exact skill numbers: 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0.
              </p>
            </button>

            <button
              onClick={() => updateSettings({ skillDisplayMode: 'casual' })}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                settings.skillDisplayMode === 'casual'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-100">Casual Tiers (Beginner / Inter / Adv)</span>
                {settings.skillDisplayMode === 'casual' && <Check className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Displays friendly tier badges: Beginner, Intermediate, Advanced, Pro.
              </p>
            </button>
          </div>
        </div>

        {/* Outdoor Sunlight Mode */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div>
            <span className="font-bold text-sm text-slate-100 block">High-Contrast Outdoor Sunlight Theme</span>
            <span className="text-[11px] text-slate-400">
              Sharp border separation and vivid colors to prevent glare during outdoor daytime play
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
            <input
              type="checkbox"
              checked={settings.outdoorHighContrast ?? false}
              onChange={(e) => updateSettings({ outdoorHighContrast: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400 shadow-inner"></div>
          </label>
        </div>
      </div>

      {/* Auto-Rotate Hands-Free Mode */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 ${settings.autoRotateEnabled ? 'text-emerald-400 animate-spin-slow' : 'text-slate-400'}`} />
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Auto-Rotate Mode</span>
                {settings.autoRotateEnabled ? (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                    Off
                  </span>
                )}
              </h2>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoRotateEnabled}
              onChange={(e) => updateSettings({ autoRotateEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
          </label>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Automatically cycles the queue, generates fair matchups for all available courts, and starts the timer for the next match as soon as the current clock hits 00:00 — completely hands-free for open play and drop-in sessions.
        </p>

        {/* Transition Buffer Delay */}
        <div className={`pt-2 space-y-2 transition-opacity ${settings.autoRotateEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Transition Delay Between Matches</span>
            </label>
            <span className="text-xs font-mono-nums font-bold text-emerald-400">
              {settings.autoRotateBufferSeconds === 0 ? 'Instant (0s)' : `${settings.autoRotateBufferSeconds} seconds`}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { sec: 0, label: '0s (Instant)' },
              { sec: 3, label: '3s' },
              { sec: 5, label: '5s (Rec.)' },
              { sec: 10, label: '10s' },
            ].map((opt) => (
              <button
                key={opt.sec}
                disabled={!settings.autoRotateEnabled}
                onClick={() => updateSettings({ autoRotateBufferSeconds: opt.sec })}
                className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  settings.autoRotateBufferSeconds === opt.sec
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            A small buffer allows players to clear the court or swap paddles before the new countdown starts.
          </p>
        </div>
      </div>

      {/* Scoring Target & Game Rules (Batch 2) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Scoring Rules & Match Target</h2>
        </div>

        {/* Play To Points */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-300">
              Play To (Target Points)
            </label>
            <span className="text-[11px] font-semibold text-emerald-400">
              {settings.pointsToWin === 0 ? 'Timed only' : `${settings.pointsToWin} Points`}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { pts: 11, label: '11 pts (Standard)' },
              { pts: 15, label: '15 pts' },
              { pts: 21, label: '21 pts (Rally)' },
              { pts: 0, label: 'Timed Only' },
            ].map((opt) => (
              <button
                key={opt.pts}
                onClick={() => updateSettings({ pointsToWin: opt.pts })}
                className={`py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  settings.pointsToWin === opt.pts
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            When a team reaches this score threshold with the required margin, the system automatically highlights the winner and prompts a single "Confirm Result" action.
          </p>
        </div>

        {/* Win by 2 Toggle */}
        <div className={`flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 transition-opacity ${settings.pointsToWin === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <span className="font-bold text-sm text-slate-100 block">Win by 2 Points Margin</span>
            <span className="text-[11px] text-slate-400">
              Requires the winning team to hold at least a 2-point lead (e.g. 11-9, 12-10) before declaring victory
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
            <input
              type="checkbox"
              checked={settings.winByTwo ?? true}
              disabled={settings.pointsToWin === 0}
              onChange={(e) => updateSettings({ winByTwo: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
          </label>
        </div>
      </div>

      {/* Timer & Hardware Settings */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Clock className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Match Duration & Hardware Integrations</h2>
        </div>

        {/* Timer Mode: Count Up from 00:00 vs Countdown */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">
            Timer Direction / Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => updateSettings({ timerMode: 'count_up' })}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                settings.timerMode === 'count_up'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-sm text-slate-100">Count-Up / Stopwatch (00:00)</span>
                </div>
                {settings.timerMode === 'count_up' && (
                  <span className="text-[10px] font-black uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Clocks start from 00:00 and track elapsed match time up to the target duration for each court.
              </p>
            </button>

            <button
              onClick={() => updateSettings({ timerMode: 'countdown' })}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                settings.timerMode === 'countdown'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm text-slate-100">Countdown</span>
                </div>
                {settings.timerMode === 'countdown' && (
                  <span className="text-[10px] font-black uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Clocks start at {settings.matchDurationMinutes}:00 and countdown toward 00:00.
              </p>
            </button>
          </div>
        </div>

        {/* Duration Select */}
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">
            Target Match Duration
          </label>
          <div className="flex items-center gap-2">
            {[10, 12, 15, 20].map((mins) => (
              <button
                key={mins}
                onClick={() => updateSettings({ matchDurationMinutes: mins })}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  settings.matchDurationMinutes === mins
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {mins} mins
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2">
          {/* Sound Buzzer */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-sm text-slate-100 block">Sound Buzzer & Whistle</span>
                <span className="text-[11px] text-slate-400">
                  Synthesized dual-tone horn on 00:00 and chimes on match victory
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Vibration */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-blue-400" />
              <div>
                <span className="font-bold text-sm text-slate-100 block">Haptic Phone Vibration</span>
                <span className="text-[11px] text-slate-400">
                  Vibrates mobile devices on buzzer expiration and scores
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.vibrationEnabled}
              onChange={(e) => updateSettings({ vibrationEnabled: e.target.checked })}
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Screen Wake Lock */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-purple-400" />
              <div>
                <span className="font-bold text-sm text-slate-100 block">Screen Wake Lock API</span>
                <span className="text-[11px] text-slate-400">
                  Prevents phone display from sleeping while match timer is running
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.wakeLockEnabled}
              onChange={(e) => updateSettings({ wakeLockEnabled: e.target.checked })}
              className="w-5 h-5 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* PWA Installation Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h2 className="text-base font-bold text-white">Progressive Web App (PWA)</h2>
        <p className="text-xs text-slate-400">
          Install RallyPulse onto your home screen for instantaneous offline loading, full-screen view without browser address bars, and instant launch.
        </p>
        <PWAInstallButton variant="settings" />
      </div>

      {/* Analytics & DUPR Export */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div>
          <h2 className="text-base font-bold text-white">Session Analytics & DUPR Export</h2>
          <p className="text-xs text-slate-400 mt-1">
            Export recorded matches for DUPR review/import and download a session recap when play is finished.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => {
              const csv = buildDuprCsv(players, rounds, currentRound);
              downloadTextFile(
                `rallypulse-dupr-matches-${new Date().toISOString().slice(0, 10)}.csv`,
                csv,
                'text/csv;charset=utf-8'
              );
            }}
            className="min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export DUPR CSV
          </button>
          <button
            onClick={() => setShowRecapModal(true)}
            className="min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            View Session Recap
          </button>
        </div>

        <a
          href="https://www.dupr.com/club-resources"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center text-[11px] text-emerald-400 hover:text-emerald-300 font-bold"
        >
          Check the current official DUPR CSV template
        </a>
      </div>

      {/* Backup, Export & Reset */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <h2 className="text-base font-bold text-white">Data & Session Backup</h2>
        <p className="text-xs text-slate-400">
          Session data automatically saves locally. You can also export a JSON snapshot to transfer to another device or save for club archives.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            {copyFeedback ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
            <span>{copyFeedback ? 'Copied JSON!' : 'Copy Backup JSON'}</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Restore Backup</span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-800">
          <button
            onClick={() => {
              if (confirm('End this session and stop all active timers?')) {
                endSession();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>End Session & View Recap</span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-800">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset all players and match histories to defaults?')) {
                resetSession();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 font-bold text-xs transition active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Session to Default Roster</span>
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-2">Paste Session Backup JSON</h3>
            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste JSON here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 mb-4"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25"
              >
                Restore Session
              </button>
            </div>
          </div>
        </div>
      )}

      <SessionRecapModal
        recap={getSessionRecap()}
        onClose={() => setShowRecapModal(false)}
        onStartNewSession={() => {
          setShowRecapModal(false);
          resetSession();
        }}
      />
    </div>
  );
};
