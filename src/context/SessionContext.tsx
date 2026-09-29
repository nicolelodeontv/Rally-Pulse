import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Court, CourtTimerState, Match, Player, Round, SessionSettings, ActiveTab, SkillLevel, ShuffleOptions, SessionRecap } from '../types';
import { buildSessionRecap } from '../utils/sessionAnalytics';
import { generateRotationRound, applyMatchResults } from '../utils/rotationAlgorithm';
import { audioSynth, triggerVibration, wakeLockManager } from '../utils/hardware';
import { triggerConfetti } from '../utils/confetti';

const STORAGE_KEY = 'rallypulse_session_v2';

const DEFAULT_PLAYERS: Player[] = [];

const DEFAULT_SETTINGS: SessionSettings = {
  courtCount: 2,
  courtNames: ['Court 1', 'Court 2'],
  matchDurationMinutes: 12,
  pointsToWin: 11,
  winByTwo: true,
  rotationStrategy: 'fair_social',
  rotationPreset: '4_in_4_out',
  skillDisplayMode: 'dupr',
  outdoorHighContrast: false,
  consecutiveWinLimit: 2,
  soundEnabled: true,
  vibrationEnabled: true,
  wakeLockEnabled: true,
  autoRotateEnabled: false,
  autoRotateBufferSeconds: 5,
  shuffleDefaults: {
    avoidRepeatPartners: true,
    equalizeTeamRatings: true,
    forceMixedDoubles: false,
  },
  timerMode: 'count_up',
  timerType: 'independent',
};

interface SessionContextType {
  players: Player[];
  courts: Court[];
  rounds: Round[];
  currentRound: Round | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settings: SessionSettings;
  isTvMode: boolean;
  setIsTvMode: (v: boolean) => void;
  timerSeconds: number;
  isTimerRunning: boolean;
  isAttendanceSheetOpen: boolean;
  setIsAttendanceSheetOpen: (open: boolean) => void;
  autoRotateCountdown: number | null;
  autoRotateNotice: string | null;
  // Per-Court Independent Timers & Warm-Up
  courtTimers: Record<string, CourtTimerState>;
  startCourtTimer: (courtId: string) => void;
  pauseCourtTimer: (courtId: string) => void;
  resetCourtTimer: (courtId: string) => void;
  adjustCourtTimer: (courtId: string, seconds: number) => void;
  startWarmupTimer: (courtId: string, minutes?: number) => void;
  skipWarmup: (courtId: string) => void;
  startAllCourtTimers: () => void;
  pauseAllCourtTimers: () => void;
  resetAllCourtTimers: () => void;
  // Dynamic Wait Time Engine
  averageMatchDurationMinutes: number;
  getEstimatedWaitMinutes: (queueIndex: number) => number;
  // Match Share & Recap Modal
  activeRecapMatch: Match | null;
  setActiveRecapMatch: (match: Match | null) => void;
  recapPlayers: Player[] | null;
  setRecapPlayers: (players: Player[] | null) => void;
  sessionEnded: boolean;
  // Actions
  addPlayer: (name: string, skillLevel: SkillLevel, gender?: Player['gender']) => void;
  updatePlayer: (player: Player) => void;
  togglePlayerStatus: (playerId: string) => void;
  deletePlayer: (playerId: string) => void;
  bulkAddPlayers: (namesText: string, defaultSkill: SkillLevel) => void;
  assignPlayerToSlot: (courtId: string, team: 'team1' | 'team2', slotIndex: 0 | 1, playerId: string) => void;
  createAndAssignPlayer: (courtId: string, team: 'team1' | 'team2', slotIndex: 0 | 1, name: string, skillLevel: SkillLevel) => void;
  syncCurrentRoundWithRoster: () => void;
  updateCourtCount: (count: number) => void;
  updateCourtName: (courtId: string, name: string) => void;
  generateNextRound: () => void;
  recordMatchScore: (matchId: string, team1Score: number, team2Score: number, winner: 'team1' | 'team2' | null, servingPlayerId?: string, serviceNumber?: 1 | 2) => void;
  swapPlayers: (player1Id: string, player2Id: string) => void;
  removePlayerFromSlot: (playerId: string) => void;
  reshuffleCurrentRound: (options: ShuffleOptions) => void;
  completeCurrentRound: () => void;
  endSession: () => void;
  getSessionRecap: () => SessionRecap;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  adjustTimer: (seconds: number) => void;
  updateSettings: (newSettings: Partial<SessionSettings>) => void;
  toggleAutoRotate: () => void;
  executeAutoRotateNow: () => void;
  cancelAutoRotate: () => void;
  resetSession: () => void;
  exportSessionData: () => string;
  importSessionData: (jsonStr: string) => boolean;
}

const SessionContext = createContext<SessionContextType | null>(null);

function buildCourts(count: number, names?: string[]): Court[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `court_${idx + 1}`,
    courtNumber: idx + 1,
    name: names && names[idx] ? names[idx] : `Court ${idx + 1}`,
    status: 'available',
  }));
}

function initCourtTimers(
  courtsList: Court[],
  durationMins: number,
  timerMode: 'count_up' | 'countdown' = 'count_up',
  existing?: Record<string, CourtTimerState>
): Record<string, CourtTimerState> {
  const res: Record<string, CourtTimerState> = {};
  const defaultSecs = timerMode === 'count_up' ? 0 : durationMins * 60;
  courtsList.forEach((c) => {
    if (existing && existing[c.id]) {
      res[c.id] = existing[c.id];
    } else {
      res[c.id] = { seconds: defaultSecs, isRunning: false };
    }
  });
  return res;
}

/** Check whether a match is in-progress (scores recorded > 0 or timer running) */
function isMatchInProgress(match: Match, timerState?: CourtTimerState): boolean {
  if (match.team1Score > 0 || match.team2Score > 0 || match.completed) return true;
  if (timerState && timerState.isRunning && timerState.seconds > 0) return true;
  return false;
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS);
  const [courts, setCourts] = useState<Court[]>(() => buildCourts(DEFAULT_SETTINGS.courtCount, DEFAULT_SETTINGS.courtNames));
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('live');
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [isAttendanceSheetOpen, setIsAttendanceSheetOpen] = useState(false);
  const [activeRecapMatch, setActiveRecapMatch] = useState<Match | null>(null);
  const [recapPlayers, setRecapPlayers] = useState<Player[] | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);

  // Auto-rotate state
  const [autoRotateCountdown, setAutoRotateCountdown] = useState<number | null>(null);
  const [autoRotateNotice, setAutoRotateNotice] = useState<string | null>(null);

  // Global Timer state
  const [timerSeconds, setTimerSeconds] = useState<number>(() =>
    DEFAULT_SETTINGS.timerMode === 'count_up' ? 0 : DEFAULT_SETTINGS.matchDurationMinutes * 60
  );
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // Independent Court Timers state
  const [courtTimers, setCourtTimers] = useState<Record<string, CourtTimerState>>(() =>
    initCourtTimers(
      buildCourts(DEFAULT_SETTINGS.courtCount, DEFAULT_SETTINGS.courtNames),
      DEFAULT_SETTINGS.matchDurationMinutes,
      DEFAULT_SETTINGS.timerMode
    )
  );
  const courtTimerIntervalRef = useRef<any>(null);
  const courtTimersRef = useRef(courtTimers);
  courtTimersRef.current = courtTimers;

  // Synchronized state refs to avoid stale closures in intervals/timers
  const playersRef = useRef(players);
  playersRef.current = players;
  const courtsRef = useRef(courts);
  courtsRef.current = courts;
  const currentRoundRef = useRef(currentRound);
  currentRoundRef.current = currentRound;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const roundsRef = useRef(rounds);
  roundsRef.current = rounds;

  // Helper to validate and repair current round if needed
  const autoRepairOrRegenerateRound = useCallback((
    currentRoster: Player[],
    currentCourtsList: Court[],
    currentSettingsObj: SessionSettings,
    existingRound: Round | null,
    force = false
  ): Round | null => {
    const validPlayerIds = new Set(currentRoster.map((p) => p.id));
    const activeRoster = currentRoster.filter((p) => p.status === 'active');

    // 1. If no round exists, or force is true
    if (!existingRound || force) {
      if (activeRoster.length < 4) {
        return {
          id: `round_${existingRound?.roundNumber || 1}_${Date.now()}`,
          roundNumber: existingRound?.roundNumber || 1,
          timestamp: Date.now(),
          matches: [],
          restingPlayerIds: currentRoster.map((p) => p.id),
          completed: false,
        };
      }
      try {
        const { round } = generateRotationRound(
          currentRoster,
          currentCourtsList,
          currentSettingsObj.rotationStrategy,
          existingRound?.roundNumber || 1
        );
        return round;
      } catch {
        return null;
      }
    }

    // 2. Check if any matches have invalid/deleted IDs or missing players
    let hasBrokenPlayer = false;
    let anyMatchStarted = false;

    existingRound.matches.forEach((m) => {
      const allFour = [...m.team1, ...m.team2];
      if (allFour.some((id) => !validPlayerIds.has(id))) {
        hasBrokenPlayer = true;
      }
      if (m.team1Score > 0 || m.team2Score > 0 || m.completed) {
        anyMatchStarted = true;
      }
    });

    // 3. If unstarted and has broken players OR empty matches while active >= 4, re-generate clean round
    if (!anyMatchStarted && (hasBrokenPlayer || (existingRound.matches.length === 0 && activeRoster.length >= 4))) {
      try {
        const { round } = generateRotationRound(
          currentRoster,
          currentCourtsList,
          currentSettingsObj.rotationStrategy,
          existingRound.roundNumber
        );
        return round;
      } catch {
        return existingRound;
      }
    }

    // 4. If match is in progress or already valid, update restingPlayerIds to match current roster
    const activeAssignedIds = new Set<string>();
    existingRound.matches.forEach((m) => {
      [...m.team1, ...m.team2].forEach((id) => activeAssignedIds.add(id));
    });

    const updatedResting = currentRoster
      .filter((p) => !activeAssignedIds.has(p.id))
      .map((p) => p.id);

    return {
      ...existingRound,
      restingPlayerIds: updatedResting,
    };
  }, []);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        let loadedPlayers = parsed.players && Array.isArray(parsed.players) ? parsed.players : DEFAULT_PLAYERS;
        // Purge old mock sample players if previously stored
        const hasSampleMockData = loadedPlayers.some((p: Player) => p.id === 'p_1' && p.name === 'Alex Rivera');
        if (hasSampleMockData) {
          loadedPlayers = [];
        }

        const loadedSettings = parsed.settings ? { ...DEFAULT_SETTINGS, ...parsed.settings } : DEFAULT_SETTINGS;
        const courtCount = typeof loadedSettings.courtCount === 'number' ? loadedSettings.courtCount : DEFAULT_SETTINGS.courtCount;
        const loadedCourts = buildCourts(courtCount, loadedSettings.courtNames);
        const loadedRounds = hasSampleMockData ? [] : (parsed.rounds && Array.isArray(parsed.rounds) ? parsed.rounds : []);
        const loadedCurrentRound = hasSampleMockData ? null : (parsed.currentRound || null);

        setPlayers(loadedPlayers);
        setSettings({ ...loadedSettings, courtCount });
        setCourts(loadedCourts);
        setRounds(loadedRounds);
        setSessionEnded(parsed.sessionEnded === true);
        if (typeof parsed.timerSeconds === 'number') setTimerSeconds(parsed.timerSeconds);
        if (parsed.courtTimers && typeof parsed.courtTimers === 'object') {
          setCourtTimers(initCourtTimers(loadedCourts, loadedSettings.matchDurationMinutes, loadedSettings.timerMode, parsed.courtTimers));
        }

        // Validate and repair current round
        if (loadedPlayers.length >= 4) {
          const repaired = autoRepairOrRegenerateRound(loadedPlayers, loadedCourts, loadedSettings, loadedCurrentRound);
          setCurrentRound(repaired);
        } else {
          setCurrentRound(null);
        }
        return;
      }
    } catch (e) {
      console.error('Failed to parse saved session state:', e);
    }

    // Default initial round generation if brand new session
    const initialCourts = buildCourts(DEFAULT_SETTINGS.courtCount, DEFAULT_SETTINGS.courtNames);
    try {
      const { round } = generateRotationRound(DEFAULT_PLAYERS, initialCourts, DEFAULT_SETTINGS.rotationStrategy, 1);
      setCurrentRound(round);
    } catch {
      // Ignore
    }
  }, [autoRepairOrRegenerateRound]);

  // Check for shared match recap URL parameter (?recap=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const recapParam = params.get('recap');
      if (recapParam) {
        const jsonStr = atob(decodeURIComponent(recapParam));
        const decoded = JSON.parse(jsonStr);
        if (decoded && decoded.m) {
          setActiveRecapMatch(decoded.m);
          if (decoded.p && Array.isArray(decoded.p) && decoded.p.length > 0) {
            setRecapPlayers(decoded.p);
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse shared match recap URL:', e);
    }
  }, []);

  // 2. LocalStorage Auto-saving
  useEffect(() => {
    try {
      const dataToSave = {
        players,
        settings,
        courts,
        rounds,
        currentRound,
        timerSeconds,
        courtTimers,
        sessionEnded,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [players, settings, courts, rounds, currentRound, timerSeconds, courtTimers, sessionEnded]);

  // Deep-link / QR Code URL detection on page load
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const matchParam = searchParams.get('matchId') || (window.location.pathname.startsWith('/match/') ? window.location.pathname.split('/match/')[1] : null);
      if (matchParam) {
        const allMatches = [...(currentRound?.matches || []), ...rounds.flatMap((r) => r.matches)];
        const matched = allMatches.find((m) => m.id === matchParam);
        if (matched) {
          setActiveRecapMatch(matched);
        }
      }
    } catch {
      // Ignore
    }
  }, [rounds, currentRound]);

  // Auto-sync courts whenever player roster changes and matches are unstarted
  const syncRosterToRound = useCallback((updatedRoster: Player[]) => {
    const activeRound = currentRoundRef.current;
    const currentCourts = courtsRef.current;
    const currentSettings = settingsRef.current;
    const timers = courtTimersRef.current;

    // Check if any match in the round is actively in progress
    const anyInProgress = activeRound?.matches.some((m) => isMatchInProgress(m, timers[m.courtId])) ?? false;

    if (!anyInProgress) {
      // Automatically regenerate/rebalance the unstarted round with the new roster!
      const nextRound = autoRepairOrRegenerateRound(
        updatedRoster,
        currentCourts,
        currentSettings,
        activeRound,
        true // force update unstarted round
      );
      setCurrentRound(nextRound);
    } else if (activeRound) {
      // Round is in progress: preserve current match players, update on-deck bench list
      const assignedIds = new Set<string>();
      activeRound.matches.forEach((m) => {
        [...m.team1, ...m.team2].forEach((id) => assignedIds.add(id));
      });
      const newResting = updatedRoster.filter((p) => !assignedIds.has(p.id)).map((p) => p.id);
      setCurrentRound({
        ...activeRound,
        restingPlayerIds: newResting,
      });
    }
  }, [autoRepairOrRegenerateRound]);

  // Execute Auto-Rotate to cycle queue and immediately start the next match
  const executeAutoRotate = useCallback(() => {
    setAutoRotateCountdown(null);
    const activeRound = currentRoundRef.current;
    const currentSettings = settingsRef.current;
    const currentCourts = courtsRef.current;

    // 1. Advance players history / stats from previous match
    const activePlayers = playersRef.current;
    let finalPlayers = activePlayers;

    if (activeRound && activeRound.matches.length > 0) {
      const unapplied = activeRound.matches.filter((m) => m.completed && !m.statsApplied);
      const updated = unapplied.length > 0 ? applyMatchResults(activePlayers, unapplied) : activePlayers;
      const activeRestingSet = new Set(activeRound.restingPlayerIds);
      finalPlayers = updated.map((p) => {
        if (activeRestingSet.has(p.id)) {
          return {
            ...p,
            consecutiveRests: p.consecutiveRests + 1,
          };
        }
        return p;
      });
      setPlayers(finalPlayers);
      setRounds((prev) => [
        { ...activeRound, completed: true, matches: activeRound.matches.map((m) => ({ ...m, statsApplied: m.completed ? true : m.statsApplied })) },
        ...prev,
      ]);
    }

    // 2. Generate next round with fair algorithm
    const nextRoundNumber = (activeRound ? activeRound.roundNumber : roundsRef.current.length) + 1;
    try {
      const res = generateRotationRound(
        finalPlayers,
        currentCourts,
        currentSettings.rotationPreset || currentSettings.rotationStrategy,
        nextRoundNumber,
        activeRound || undefined,
        currentSettings.consecutiveWinLimit || 2
      );
      setCurrentRound(res.round);
    } catch (err) {
      console.warn('Auto-rotate round generation error:', err);
    }

    // 3. Reset timer to starting point (0 for count_up, duration for countdown) and immediately start the clock!
    const isCountUp = currentSettings.timerMode === 'count_up';
    const initialSeconds = isCountUp ? 0 : currentSettings.matchDurationMinutes * 60;
    setTimerSeconds(initialSeconds);
    setIsTimerRunning(true);

    // Reset and start all independent court timers
    setCourtTimers(() => {
      const nextTimers: Record<string, CourtTimerState> = {};
      currentCourts.forEach((c) => {
        nextTimers[c.id] = { seconds: initialSeconds, isRunning: true };
      });
      return nextTimers;
    });

    // 4. Play audio whistle and haptic cue for the new match start
    if (currentSettings.soundEnabled) {
      audioSynth.playWhistle();
    }
    if (currentSettings.vibrationEnabled) {
      triggerVibration([100, 50, 150]);
    }

    // 5. Toast notice for 5 seconds
    setAutoRotateNotice(`Auto-Rotated to Round #${nextRoundNumber}! All court clocks started.`);
    setTimeout(() => {
      setAutoRotateNotice(null);
    }, 5000);
  }, []);

  const executeAutoRotateRef = useRef(executeAutoRotate);
  executeAutoRotateRef.current = executeAutoRotate;

  // Buffer countdown timer effect for Auto-Rotate
  useEffect(() => {
    if (autoRotateCountdown === null) return;

    if (autoRotateCountdown <= 0) {
      executeAutoRotateRef.current();
      return;
    }

    const timer = setTimeout(() => {
      setAutoRotateCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoRotateCountdown]);

  // 3. Global Countdown/Count-up Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      if (settings.wakeLockEnabled) {
        wakeLockManager.requestWakeLock();
      }

      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          const isCountUp = settings.timerMode === 'count_up';
          const targetSeconds = settings.matchDurationMinutes * 60;

          if (isCountUp) {
            const nextSecs = prev + 1;
            if (nextSecs === targetSeconds) {
              if (settings.soundEnabled) {
                audioSynth.playBuzzer();
              }
              if (settings.vibrationEnabled) {
                triggerVibration([300, 100, 300, 100, 500]);
              }
              if (settings.autoRotateEnabled) {
                const buffer = settings.autoRotateBufferSeconds ?? 5;
                if (buffer <= 0) {
                  setTimeout(() => {
                    executeAutoRotateRef.current();
                  }, 100);
                } else {
                  setAutoRotateCountdown(buffer);
                }
              }
            }
            return nextSecs;
          } else {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current);
              setIsTimerRunning(false);

              if (settings.soundEnabled) {
                audioSynth.playBuzzer();
              }
              if (settings.vibrationEnabled) {
                triggerVibration([300, 100, 300, 100, 500]);
              }

              if (settings.autoRotateEnabled) {
                const buffer = settings.autoRotateBufferSeconds ?? 5;
                if (buffer <= 0) {
                  setTimeout(() => {
                    executeAutoRotateRef.current();
                  }, 100);
                } else {
                  setAutoRotateCountdown(buffer);
                }
              }

              return 0;
            }
            return prev - 1;
          }
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      wakeLockManager.releaseWakeLock();
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, settings.soundEnabled, settings.vibrationEnabled, settings.wakeLockEnabled, settings.autoRotateEnabled, settings.autoRotateBufferSeconds, settings.timerMode, settings.matchDurationMinutes]);

  const startTimer = useCallback(() => {
    setAutoRotateCountdown(null);
    const isCountUp = settings.timerMode === 'count_up';
    if (!isCountUp && timerSeconds === 0) {
      setTimerSeconds(settings.matchDurationMinutes * 60);
    }
    setIsTimerRunning(true);
    if (settings.soundEnabled) {
      audioSynth.playWhistle();
    }
  }, [timerSeconds, settings.matchDurationMinutes, settings.soundEnabled, settings.timerMode]);

  const pauseTimer = useCallback(() => {
    setIsTimerRunning(false);
    setAutoRotateCountdown(null);
  }, []);

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setAutoRotateCountdown(null);
    const isCountUp = settings.timerMode === 'count_up';
    setTimerSeconds(isCountUp ? 0 : settings.matchDurationMinutes * 60);
  }, [settings.matchDurationMinutes, settings.timerMode]);

  const adjustTimer = useCallback((seconds: number) => {
    setTimerSeconds((prev) => Math.max(0, prev + seconds));
  }, []);

  const toggleAutoRotate = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      autoRotateEnabled: !prev.autoRotateEnabled,
    }));
  }, []);

  const executeAutoRotateNow = useCallback(() => {
    executeAutoRotate();
  }, [executeAutoRotate]);

  const cancelAutoRotate = useCallback(() => {
    setAutoRotateCountdown(null);
  }, []);

  // 4. Independent Court Timers ticking effect & buzzer
  useEffect(() => {
    const hasRunningCourt = Object.values(courtTimers).some((t) => t.isRunning);

    if (hasRunningCourt) {
      if (settings.wakeLockEnabled) {
        wakeLockManager.requestWakeLock();
      }

      if (!courtTimerIntervalRef.current) {
        courtTimerIntervalRef.current = setInterval(() => {
          setCourtTimers((prev) => {
            const isCountUp = settingsRef.current.timerMode === 'count_up';
            const targetSeconds = settingsRef.current.matchDurationMinutes * 60;
            let anyStillRunning = false;
            let anyHitTarget = false;
            const targetCourts: string[] = [];
            const next: Record<string, CourtTimerState> = {};

            for (const [cId, timer] of Object.entries(prev)) {
              if (timer.isRunning) {
                // If in pre-game Warm-up Mode
                if (timer.isWarmup) {
                  const remaining = timer.warmupSecondsRemaining ?? 120;
                  if (remaining <= 1) {
                    // Warm-up finished! Play chime and auto-start main match stopwatch from 00:00
                    if (settingsRef.current.soundEnabled) {
                      audioSynth.playWhistle();
                    }
                    next[cId] = { seconds: 0, isRunning: true, isWarmup: false, warmupSecondsRemaining: 0 };
                    anyStillRunning = true;
                  } else {
                    anyStillRunning = true;
                    next[cId] = { ...timer, warmupSecondsRemaining: remaining - 1 };
                  }
                } else if (isCountUp) {
                  // Standard open-play count-up stopwatch
                  anyStillRunning = true;
                  const nextSecs = timer.seconds + 1;
                  next[cId] = { ...timer, seconds: nextSecs };
                  if (nextSecs === targetSeconds) {
                    anyHitTarget = true;
                    const cObj = courtsRef.current.find((c) => c.id === cId);
                    targetCourts.push(cObj ? cObj.name : `Court`);
                  }
                } else {
                  // Fixed countdown mode
                  if (timer.seconds <= 1) {
                    next[cId] = { seconds: 0, isRunning: false };
                    anyHitTarget = true;
                    const cObj = courtsRef.current.find((c) => c.id === cId);
                    targetCourts.push(cObj ? cObj.name : `Court`);
                  } else {
                    anyStillRunning = true;
                    next[cId] = { ...timer, seconds: timer.seconds - 1 };
                  }
                }
              } else {
                next[cId] = timer;
              }
            }

            if (anyHitTarget) {
              if (settingsRef.current.soundEnabled) {
                audioSynth.playBuzzer();
              }
              if (settingsRef.current.vibrationEnabled) {
                triggerVibration([300, 100, 300, 100, 500]);
              }
              setAutoRotateNotice(
                isCountUp
                  ? `${targetCourts.join(', ')} reached ${Math.floor(targetSeconds / 60)}:00 target!`
                  : `${targetCourts.join(', ')} timer reached 00:00!`
              );
              setTimeout(() => setAutoRotateNotice(null), 5000);

              if (settingsRef.current.autoRotateEnabled) {
                const activeMatches = currentRoundRef.current?.matches || [];
                const allFinished = activeMatches.length > 0 && activeMatches.every((m) => {
                  const t = next[m.courtId];
                  if (!t) return true;
                  return isCountUp ? t.seconds >= targetSeconds : t.seconds === 0;
                });

                if (allFinished) {
                  const buffer = settingsRef.current.autoRotateBufferSeconds ?? 5;
                  if (buffer <= 0) {
                    setTimeout(() => {
                      executeAutoRotateRef.current();
                    }, 100);
                  } else {
                    setAutoRotateCountdown(buffer);
                  }
                }
              }
            }

            if (!anyStillRunning && courtTimerIntervalRef.current) {
              clearInterval(courtTimerIntervalRef.current);
              courtTimerIntervalRef.current = null;
            }

            return next;
          });
        }, 1000);
      }
    } else {
      if (courtTimerIntervalRef.current) {
        clearInterval(courtTimerIntervalRef.current);
        courtTimerIntervalRef.current = null;
      }
      if (!isTimerRunning) {
        wakeLockManager.releaseWakeLock();
      }
    }

    return () => {
      // Retain active interval unless unmounting
    };
  }, [courtTimers, isTimerRunning, settings.wakeLockEnabled]);

  const startCourtTimer = useCallback((courtId: string) => {
    setAutoRotateCountdown(null);
    setCourtTimers((prev) => {
      const isCountUp = settingsRef.current.timerMode === 'count_up';
      const defaultSecs = isCountUp ? 0 : settingsRef.current.matchDurationMinutes * 60;
      const current = prev[courtId] || { seconds: defaultSecs, isRunning: false };
      let seconds = current.seconds;
      if (!isCountUp && seconds === 0) {
        seconds = settingsRef.current.matchDurationMinutes * 60;
      }
      return {
        ...prev,
        [courtId]: { seconds, isRunning: true },
      };
    });
    if (settingsRef.current.soundEnabled) {
      audioSynth.playWhistle();
    }
  }, []);

  const pauseCourtTimer = useCallback((courtId: string) => {
    setCourtTimers((prev) => {
      if (!prev[courtId]) return prev;
      return {
        ...prev,
        [courtId]: { ...prev[courtId], isRunning: false },
      };
    });
  }, []);

  const resetCourtTimer = useCallback((courtId: string) => {
    setAutoRotateCountdown(null);
    const isCountUp = settingsRef.current.timerMode === 'count_up';
    const defaultSecs = isCountUp ? 0 : settingsRef.current.matchDurationMinutes * 60;
    setCourtTimers((prev) => {
      return {
        ...prev,
        [courtId]: { seconds: defaultSecs, isRunning: false },
      };
    });
  }, []);

  const adjustCourtTimer = useCallback((courtId: string, seconds: number) => {
    setCourtTimers((prev) => {
      const isCountUp = settingsRef.current.timerMode === 'count_up';
      const defaultSecs = isCountUp ? 0 : settingsRef.current.matchDurationMinutes * 60;
      const current = prev[courtId] || { seconds: defaultSecs, isRunning: false };
      return {
        ...prev,
        [courtId]: { ...current, seconds: Math.max(0, current.seconds + seconds) },
      };
    });
  }, []);

  const startWarmupTimer = useCallback((courtId: string, minutes = 2) => {
    setCourtTimers((prev) => ({
      ...prev,
      [courtId]: {
        seconds: 0,
        isRunning: true,
        isWarmup: true,
        warmupSecondsRemaining: minutes * 60,
      },
    }));
    if (settingsRef.current.soundEnabled) {
      audioSynth.playChime();
    }
  }, []);

  const skipWarmup = useCallback((courtId: string) => {
    setCourtTimers((prev) => ({
      ...prev,
      [courtId]: {
        seconds: 0,
        isRunning: true,
        isWarmup: false,
        warmupSecondsRemaining: 0,
      },
    }));
    if (settingsRef.current.soundEnabled) {
      audioSynth.playWhistle();
    }
  }, []);

  const startAllCourtTimers = useCallback(() => {
    setAutoRotateCountdown(null);
    setCourtTimers((prev) => {
      const isCountUp = settingsRef.current.timerMode === 'count_up';
      const next: Record<string, CourtTimerState> = {};
      for (const [cId, timer] of Object.entries(prev)) {
        let secs = timer.seconds;
        if (!isCountUp && secs === 0) {
          secs = settingsRef.current.matchDurationMinutes * 60;
        }
        next[cId] = { seconds: secs, isRunning: true, isWarmup: false };
      }
      return next;
    });
    setIsTimerRunning(true);
    if (settingsRef.current.soundEnabled) {
      audioSynth.playWhistle();
    }
  }, []);

  const pauseAllCourtTimers = useCallback(() => {
    setCourtTimers((prev) => {
      const next: Record<string, CourtTimerState> = {};
      for (const [cId, timer] of Object.entries(prev)) {
        next[cId] = { ...timer, isRunning: false };
      }
      return next;
    });
    setIsTimerRunning(false);
  }, []);

  const resetAllCourtTimers = useCallback(() => {
    const isCountUp = settingsRef.current.timerMode === 'count_up';
    const defaultSecs = isCountUp ? 0 : settingsRef.current.matchDurationMinutes * 60;
    setCourtTimers((prev) => {
      const next: Record<string, CourtTimerState> = {};
      for (const cId of Object.keys(prev)) {
        next[cId] = { seconds: defaultSecs, isRunning: false, isWarmup: false, warmupSecondsRemaining: 0 };
      }
      return next;
    });
    setIsTimerRunning(false);
    setTimerSeconds(defaultSecs);
  }, []);

  // Compute dynamic session average match duration in minutes
  const completedMatchesList = rounds.flatMap((r) => r.matches.filter((m) => m.completed));
  const totalCompletedSecs = completedMatchesList.reduce(
    (acc, m) => acc + (m.durationSeconds || settings.matchDurationMinutes * 60 || 900),
    0
  );
  const averageMatchDurationMinutes =
    completedMatchesList.length > 0
      ? Math.max(8, Math.round(totalCompletedSecs / completedMatchesList.length / 60))
      : settings.matchDurationMinutes || 15;

  // Smart Queue Wait Time Estimator Engine
  const getEstimatedWaitMinutes = useCallback(
    (queueIndex: number): number => {
      const activeCourtsList = courtsRef.current.slice(0, settingsRef.current.courtCount);
      if (activeCourtsList.length === 0) return 0;

      const avgMinutes = averageMatchDurationMinutes || 15;
      const timers = courtTimersRef.current;

      // Project remaining minutes for each active court
      const courtRemainingMinutes = activeCourtsList
        .map((c) => {
          const timer = timers[c.id];
          if (!timer || !timer.isRunning) return 2; // Court finished or idle
          const elapsedMinutes = Math.floor((timer.seconds || 0) / 60);
          return Math.max(2, avgMinutes - elapsedMinutes);
        })
        .sort((a, b) => a - b);

      const playersPerWave =
        settingsRef.current.rotationPreset === '2_in_2_out_winners_stay'
          ? Math.max(2, activeCourtsList.length * 2)
          : Math.max(4, activeCourtsList.length * 4);

      const waveIndex = Math.floor(queueIndex / playersPerWave);
      const courtSlotIndex = queueIndex % activeCourtsList.length;
      const baseCourtWait = courtRemainingMinutes[courtSlotIndex] || courtRemainingMinutes[0] || 4;

      return baseCourtWait + waveIndex * avgMinutes;
    },
    [averageMatchDurationMinutes]
  );

  // Update court count (Single Source of Truth)
  const updateCourtCount = useCallback((count: number) => {
    const validCount = Math.max(1, Math.min(12, count));
    const newCourts = buildCourts(validCount, settings.courtNames);
    const validCourtIds = new Set(newCourts.map((c) => c.id));

    setCourts(newCourts);
    setCourtTimers((prev) => initCourtTimers(newCourts, settings.matchDurationMinutes, settings.timerMode, prev));
    setSettings((prev) => ({
      ...prev,
      courtCount: validCount,
      courtNames: newCourts.map((c) => c.name),
    }));

    const activeRound = currentRoundRef.current;
    const currentRoster = playersRef.current;

    // Identify any players on removed courts
    const removedCourtMatches = activeRound?.matches.filter((m) => !validCourtIds.has(m.courtId)) || [];
    const displacedPlayerIds = new Set<string>();
    removedCourtMatches.forEach((m) => {
      [...m.team1, ...m.team2].forEach((id) => {
        if (id) displacedPlayerIds.add(id);
      });
    });

    // If any players were displaced by court reduction, give them top queue priority for next game
    if (displacedPlayerIds.size > 0) {
      const updatedRoster = currentRoster.map((p) => {
        if (displacedPlayerIds.has(p.id)) {
          return {
            ...p,
            consecutiveRests: Math.max(2, p.consecutiveRests + 2),
          };
        }
        return p;
      });
      setPlayers(updatedRoster);

      // Re-generate or filter active round matches to only valid courts
      try {
        const { round } = generateRotationRound(updatedRoster, newCourts, settings.rotationStrategy, activeRound?.roundNumber || 1);
        setCurrentRound(round);
      } catch {
        if (activeRound) {
          const remainingMatches = activeRound.matches.filter((m) => validCourtIds.has(m.courtId));
          setCurrentRound({
            ...activeRound,
            matches: remainingMatches,
            restingPlayerIds: [
              ...Array.from(displacedPlayerIds),
              ...activeRound.restingPlayerIds.filter((id) => !displacedPlayerIds.has(id)),
            ],
          });
        }
      }
    } else {
      // Re-evaluate round matches for new court count if unstarted
      const timers = courtTimersRef.current;
      const anyInProgress = activeRound?.matches.some((m) => isMatchInProgress(m, timers[m.courtId])) ?? false;

      if (!anyInProgress) {
        try {
          const { round } = generateRotationRound(currentRoster, newCourts, settings.rotationStrategy, activeRound?.roundNumber || 1);
          setCurrentRound(round);
        } catch {
          // Ignore
        }
      }
    }
  }, [settings.courtNames, settings.matchDurationMinutes, settings.timerMode, settings.rotationStrategy]);

  const updateCourtName = useCallback((courtId: string, name: string) => {
    setCourts((prev) =>
      prev.map((c) => (c.id === courtId ? { ...c, name: name.trim() || `Court ${c.courtNumber}` } : c))
    );
  }, []);

  // Player management with Auto-Sync
  const addPlayer = useCallback((name: string, skillLevel: SkillLevel, gender?: Player['gender']) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newPlayer: Player = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      skillLevel,
      status: 'active',
      gender,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointsWon: 0,
      pointsLost: 0,
      consecutiveRests: 0,
      partnerHistory: {},
      opponentHistory: {},
    };
    const nextPlayers = [...playersRef.current, newPlayer];
    setPlayers(nextPlayers);
    syncRosterToRound(nextPlayers);
  }, [syncRosterToRound]);

  const updatePlayer = useCallback((updated: Player) => {
    const nextPlayers = playersRef.current.map((p) => (p.id === updated.id ? updated : p));
    setPlayers(nextPlayers);
  }, []);

  const togglePlayerStatus = useCallback((playerId: string) => {
    const nextPlayers = playersRef.current.map((p) => {
      if (p.id === playerId) {
        const newStatus = p.status === 'active' ? 'resting' : 'active';
        return {
          ...p,
          status: newStatus as Player['status'],
          consecutiveRests: newStatus === 'active' ? Math.max(1, p.consecutiveRests) : p.consecutiveRests,
        };
      }
      return p;
    });
    setPlayers(nextPlayers);
    syncRosterToRound(nextPlayers);
  }, [syncRosterToRound]);

  const deletePlayer = useCallback((playerId: string) => {
    const nextPlayers = playersRef.current.filter((p) => p.id !== playerId);
    setPlayers(nextPlayers);
    syncRosterToRound(nextPlayers);
  }, [syncRosterToRound]);

  const bulkAddPlayers = useCallback((namesText: string, defaultSkill: SkillLevel) => {
    const lines = namesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const newPlayers: Player[] = lines.map((line, idx) => {
      let name = line;
      let skill = defaultSkill;
      const match = line.match(/(.*?)[(\s]+([2-5]\.[05]|[2-5])[)\s]*$/);
      if (match) {
        name = match[1].trim();
        const parsed = parseFloat(match[2]);
        if (!isNaN(parsed) && parsed >= 2.0 && parsed <= 5.0) {
          skill = parsed as SkillLevel;
        }
      }

      return {
        id: `p_bulk_${Date.now()}_${idx}`,
        name: name || `Player ${idx + 1}`,
        skillLevel: skill,
        status: 'active',
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pointsWon: 0,
        pointsLost: 0,
        consecutiveRests: 0,
        partnerHistory: {},
        opponentHistory: {},
      };
    });

    const nextPlayers = [...playersRef.current, ...newPlayers];
    setPlayers(nextPlayers);
    syncRosterToRound(nextPlayers);
  }, [syncRosterToRound]);

  // Assign a player directly to a court slot
  const assignPlayerToSlot = useCallback((
    courtId: string,
    team: 'team1' | 'team2',
    slotIndex: 0 | 1,
    playerId: string
  ) => {
    setCurrentRound((prev) => {
      const courtsList = courtsRef.current;
      const courtObj = courtsList.find((c) => c.id === courtId);
      const courtNumber = courtObj?.courtNumber || 1;
      const courtName = courtObj?.name || `Court ${courtNumber}`;

      const roundNumber = prev?.roundNumber || 1;
      let existingMatches = prev ? [...prev.matches] : [];

      let matchIndex = existingMatches.findIndex((m) => m.courtId === courtId);

      if (matchIndex === -1) {
        // Create a new match entry for this court
        const newMatch: Match = {
          id: `m_${roundNumber}_${courtNumber}_${Date.now()}`,
          courtId,
          courtNumber,
          courtName,
          team1: ['', ''],
          team2: ['', ''],
          team1Score: 0,
          team2Score: 0,
          winner: null,
          completed: false,
        };
        newMatch[team][slotIndex] = playerId;
        existingMatches.push(newMatch);
      } else {
        const targetMatch = { ...existingMatches[matchIndex] };
        const updatedTeam = [...targetMatch[team]] as [string, string];
        const prevAssignedId = updatedTeam[slotIndex];

        // If player is already on another court/slot in this round, clear them from old position
        existingMatches = existingMatches.map((m) => {
          const t1 = [...m.team1] as [string, string];
          const t2 = [...m.team2] as [string, string];
          if (m.courtId === courtId && team === 'team1' && slotIndex === 0) {
            // Target slot
          } else {
            if (t1[0] === playerId) t1[0] = '';
            if (t1[1] === playerId) t1[1] = '';
            if (t2[0] === playerId) t2[0] = '';
            if (t2[1] === playerId) t2[1] = '';
          }
          return { ...m, team1: t1, team2: t2 };
        });

        updatedTeam[slotIndex] = playerId;
        targetMatch[team] = updatedTeam;
        existingMatches[matchIndex] = targetMatch;
      }

      // Ensure player is marked active
      setPlayers((current) =>
        current.map((p) => (p.id === playerId && p.status === 'resting' ? { ...p, status: 'active' } : p))
      );

      // Recompute resting player IDs
      const assignedIds = new Set<string>();
      existingMatches.forEach((m) => {
        [...m.team1, ...m.team2].forEach((id) => {
          if (id) assignedIds.add(id);
        });
      });

      const updatedResting = playersRef.current
        .filter((p) => !assignedIds.has(p.id))
        .map((p) => p.id);

      return {
        id: prev?.id || `round_${roundNumber}_${Date.now()}`,
        roundNumber,
        timestamp: prev?.timestamp || Date.now(),
        matches: existingMatches,
        restingPlayerIds: updatedResting,
        completed: false,
      };
    });
  }, []);

  // Create new player and assign directly to slot
  const createAndAssignPlayer = useCallback((
    courtId: string,
    team: 'team1' | 'team2',
    slotIndex: 0 | 1,
    name: string,
    skillLevel: SkillLevel
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newPlayer: Player = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      skillLevel,
      status: 'active',
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      pointsWon: 0,
      pointsLost: 0,
      consecutiveRests: 0,
      partnerHistory: {},
      opponentHistory: {},
    };
    const nextPlayers = [...playersRef.current, newPlayer];
    setPlayers(nextPlayers);
    assignPlayerToSlot(courtId, team, slotIndex, newPlayer.id);
  }, [assignPlayerToSlot]);

  // Sync / rebalance current round with roster
  const syncCurrentRoundWithRoster = useCallback(() => {
    const activeRoster = players.filter((p) => p.status === 'active');
    if (activeRoster.length < 4) {
      alert(`At least 4 active players are required. (Currently ${activeRoster.length} active)`);
      return;
    }
    const nextRound = autoRepairOrRegenerateRound(
      players,
      courts,
      settings,
      currentRound,
      true
    );
    setCurrentRound(nextRound);
  }, [players, courts, settings, currentRound, autoRepairOrRegenerateRound]);

  // Generate Next Round
  const generateNextRound = useCallback(() => {
    const nextRoundNumber = (currentRound ? currentRound.roundNumber : rounds.length) + 1;
    const prevCompletedRound = currentRound?.completed ? currentRound : rounds[0] || null;
    const activePreset = settings.rotationPreset || settings.rotationStrategy;
    try {
      const { round } = generateRotationRound(
        players,
        courts,
        activePreset,
        nextRoundNumber,
        prevCompletedRound,
        settings.consecutiveWinLimit || 2
      );
      setCurrentRound(round);
      // Reset and auto-start timers for next round
      const isCountUp = settings.timerMode === 'count_up';
      const initialSecs = isCountUp ? 0 : settings.matchDurationMinutes * 60;
      setTimerSeconds(initialSecs);
      setIsTimerRunning(isCountUp && round.matches.length > 0);

      setCourtTimers((prev) => {
        const next: Record<string, CourtTimerState> = {};
        courts.forEach((c) => {
          const hasMatch = round.matches.some((m) => m.courtId === c.id);
          next[c.id] = {
            seconds: initialSecs,
            isRunning: isCountUp ? hasMatch : false,
            isWarmup: false,
            warmupSecondsRemaining: 0,
          };
        });
        return next;
      });

      if (settings.soundEnabled) {
        audioSynth.playWhistle();
      }
    } catch (e: any) {
      alert(e.message || 'Cannot generate round. Please check active players.');
    }
  }, [currentRound, rounds, players, courts, settings.rotationPreset, settings.rotationStrategy, settings.matchDurationMinutes, settings.soundEnabled, settings.timerMode, settings.consecutiveWinLimit]);

  // Record score & winner for a match with duration logging
  const recordMatchScore = useCallback((
    matchId: string,
    team1Score: number,
    team2Score: number,
    winner: 'team1' | 'team2' | null,
    servingPlayerId?: string,
    serviceNumber?: 1 | 2
  ) => {
    if (!currentRound || sessionEnded) return;

    const updatedMatches = currentRound.matches.map((m) => {
      if (m.id === matchId) {
        const timerSecs = courtTimersRef.current[m.courtId]?.seconds;
        const elapsedSecs =
          timerSecs === undefined
            ? m.durationSeconds || 0
            : settingsRef.current.timerMode === 'count_up'
              ? timerSecs
              : Math.max(0, settingsRef.current.matchDurationMinutes * 60 - timerSecs);
        const isCompleted = winner !== null;
        const updatedMatch: Match = {
          ...m,
          team1Score,
          team2Score,
          winner,
          completed: isCompleted,
          durationSeconds: elapsedSecs,
          statsApplied: isCompleted ? true : m.statsApplied,
          servingPlayerId: servingPlayerId ?? m.servingPlayerId ?? m.team1[0],
          serviceNumber: serviceNumber ?? m.serviceNumber ?? 1,
          scoreHistory: [
            ...(m.scoreHistory || []),
            ...(m.team1Score !== team1Score || m.team2Score !== team2Score
              ? [{ team1Score: m.team1Score, team2Score: m.team2Score }]
              : []),
          ],
        };

        if (isCompleted && !m.statsApplied) {
          setPlayers((prevPlayers) => applyMatchResults(prevPlayers, [updatedMatch]));
        }

        return updatedMatch;
      }
      return m;
    });

    const isAllCompleted = updatedMatches.length > 0 && updatedMatches.every((m) => m.completed);

    setCurrentRound({
      ...currentRound,
      matches: updatedMatches,
      completed: isAllCompleted,
    });

    if (winner !== null) {
      const matchObj = updatedMatches.find((m) => m.id === matchId);
      if (matchObj) {
        setCourtTimers((prev) => {
          if (!prev[matchObj.courtId]) return prev;
          return {
            ...prev,
            [matchObj.courtId]: { ...prev[matchObj.courtId], isRunning: false },
          };
        });
      }

      if (settings.soundEnabled) {
        audioSynth.playChime();
      }
      if (settings.vibrationEnabled) {
        triggerVibration([50, 30, 80]);
      }
      triggerConfetti();
    }
  }, [currentRound, settings.soundEnabled, settings.vibrationEnabled, sessionEnded]);

  // Remove a player from the current court assignments and return them to the bench.
  const removePlayerFromSlot = useCallback((playerId: string) => {
    setCurrentRound((prev) => {
      if (!prev) return null;
      const matches = prev.matches.map((m) => ({
        ...m,
        team1: [...m.team1] as [string, string],
        team2: [...m.team2] as [string, string],
      }));
      matches.forEach((m) => {
        if (m.team1[0] === playerId) m.team1[0] = '';
        if (m.team1[1] === playerId) m.team1[1] = '';
        if (m.team2[0] === playerId) m.team2[0] = '';
        if (m.team2[1] === playerId) m.team2[1] = '';
      });
      const restingPlayerIds = playersRef.current
        .filter((p) => !matches.some((m) => [...m.team1, ...m.team2].includes(p.id)))
        .map((p) => p.id);
      return { ...prev, matches, restingPlayerIds };
    });
  }, []);

  const reshuffleCurrentRound = useCallback((options: ShuffleOptions) => {
    const activeRound = currentRoundRef.current;
    if (!activeRound) return;
    const activePlayers = playersRef.current.filter((p) => p.status === 'active');
    if (activePlayers.length < 4) return;
    const inProgress = activeRound.matches.some((m) => isMatchInProgress(m, courtTimersRef.current[m.courtId]));
    if (inProgress) return;

    try {
      const previousCompletedRound = activeRound.completed ? activeRound : roundsRef.current.find((r) => r.completed) || null;
      const { round } = generateRotationRound(
        playersRef.current,
        courtsRef.current,
        settingsRef.current.rotationPreset || settingsRef.current.rotationStrategy,
        activeRound.roundNumber,
        previousCompletedRound,
        settingsRef.current.consecutiveWinLimit || 2,
        options
      );
      setCurrentRound(round);
    } catch (error) {
      console.error('Unable to reshuffle current round:', error);
    }
  }, []);

  // Swap any two players
  const swapPlayers = useCallback((p1Id: string, p2Id: string) => {
    if (!currentRound || p1Id === p2Id) return;

    setCurrentRound((prev) => {
      if (!prev) return null;

      let newMatches = prev.matches.map((m) => ({
        ...m,
        team1: [...m.team1] as [string, string],
        team2: [...m.team2] as [string, string],
      }));

      let newResting = [...prev.restingPlayerIds];

      const replaceInTeam = (team: [string, string], target: string, replacement: string): boolean => {
        if (team[0] === target) {
          team[0] = replacement;
          return true;
        }
        if (team[1] === target) {
          team[1] = replacement;
          return true;
        }
        return false;
      };

      let p1InMatch = false;
      let p2InMatch = false;

      newMatches.forEach((m) => {
        if (m.team1.includes(p1Id) || m.team2.includes(p1Id)) p1InMatch = true;
        if (m.team1.includes(p2Id) || m.team2.includes(p2Id)) p2InMatch = true;
      });

      if (p1InMatch && p2InMatch) {
        newMatches.forEach((m) => {
          if (m.team1[0] === p1Id) m.team1[0] = p2Id;
          else if (m.team1[1] === p1Id) m.team1[1] = p2Id;
          else if (m.team2[0] === p1Id) m.team2[0] = p2Id;
          else if (m.team2[1] === p1Id) m.team2[1] = p2Id;
          else if (m.team1[0] === p2Id) m.team1[0] = p1Id;
          else if (m.team1[1] === p2Id) m.team1[1] = p1Id;
          else if (m.team2[0] === p2Id) m.team2[0] = p1Id;
          else if (m.team2[1] === p2Id) m.team2[1] = p1Id;
        });
      } else if (p1InMatch && !p2InMatch) {
        newMatches.forEach((m) => {
          replaceInTeam(m.team1, p1Id, p2Id);
          replaceInTeam(m.team2, p1Id, p2Id);
        });
        newResting = newResting.map((id) => (id === p2Id ? p1Id : id));
      } else if (!p1InMatch && p2InMatch) {
        newMatches.forEach((m) => {
          replaceInTeam(m.team1, p2Id, p1Id);
          replaceInTeam(m.team2, p2Id, p1Id);
        });
        newResting = newResting.map((id) => (id === p1Id ? p2Id : id));
      }

      return {
        ...prev,
        matches: newMatches,
        restingPlayerIds: newResting,
      };
    });
  }, [currentRound]);

  // Complete current round
  const completeCurrentRound = useCallback(() => {
    if (!currentRound || sessionEnded) return;

    const unappliedMatches = currentRound.matches.filter((m) => m.completed && !m.statsApplied);
    const updatedPlayers = unappliedMatches.length > 0 ? applyMatchResults(players, unappliedMatches) : players;
    const finalRoundMatches = currentRound.matches.map((m) => ({ ...m, statsApplied: true }));
    const finalizedRound = { ...currentRound, matches: finalRoundMatches };

    const activeRestingSet = new Set(finalizedRound.restingPlayerIds);
    const finalPlayers = updatedPlayers.map((p) => {
      if (activeRestingSet.has(p.id)) {
        return {
          ...p,
          consecutiveRests: p.consecutiveRests + 1,
        };
      }
      return p;
    });

    setPlayers(finalPlayers);
    setRounds((prev) => [finalizedRound, ...prev]);

    const nextRoundNumber = currentRound.roundNumber + 1;
    const activePreset = settings.rotationPreset || settings.rotationStrategy;
    try {
      const { round } = generateRotationRound(
        finalPlayers,
        courts,
        activePreset,
        nextRoundNumber,
        currentRound,
        settings.consecutiveWinLimit || 2
      );
      setCurrentRound(round);
      resetTimer();
    } catch {
      setCurrentRound(null);
    }
  }, [currentRound, players, courts, settings.rotationPreset, settings.rotationStrategy, settings.consecutiveWinLimit, resetTimer, sessionEnded]);

  const updateSettings = useCallback((newSettings: Partial<SessionSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.courtCount && newSettings.courtCount !== prev.courtCount) {
        const newCourts = buildCourts(newSettings.courtCount, updated.courtNames);
        setCourts(newCourts);
        setCourtTimers((prevTimers) =>
          initCourtTimers(newCourts, updated.matchDurationMinutes, updated.timerMode, prevTimers)
        );
      }
      if (newSettings.timerMode && newSettings.timerMode !== prev.timerMode) {
        const isNowCountUp = newSettings.timerMode === 'count_up';
        setTimerSeconds(isNowCountUp ? 0 : updated.matchDurationMinutes * 60);
        setCourtTimers((prevTimers) => {
          const next: Record<string, CourtTimerState> = {};
          for (const [cId, t] of Object.entries(prevTimers)) {
            if (!t.isRunning) {
              next[cId] = { seconds: isNowCountUp ? 0 : updated.matchDurationMinutes * 60, isRunning: false };
            } else {
              next[cId] = t;
            }
          }
          return next;
        });
      }
      return updated;
    });
  }, []);

  const endSession = useCallback(() => {
    setSessionEnded(true);
    setCourtTimers((prev) => Object.fromEntries(Object.entries(prev).map(([id, timer]) => [id, { ...timer, isRunning: false }]))));
    setIsTimerRunning(false);
  }, []);

  const getSessionRecap = useCallback(() => {
    return buildSessionRecap(playersRef.current, roundsRef.current, currentRoundRef.current);
  }, []);

  const resetSession = useCallback(() => {
    setSessionEnded(false);
    setPlayers(DEFAULT_PLAYERS);
    setSettings(DEFAULT_SETTINGS);
    const newCourts = buildCourts(DEFAULT_SETTINGS.courtCount, DEFAULT_SETTINGS.courtNames);
    setCourts(newCourts);
    setCourtTimers(initCourtTimers(newCourts, DEFAULT_SETTINGS.matchDurationMinutes, DEFAULT_SETTINGS.timerMode));
    setRounds([]);
    const { round } = generateRotationRound(DEFAULT_PLAYERS, newCourts, DEFAULT_SETTINGS.rotationStrategy, 1);
    setCurrentRound(round);
    setTimerSeconds(DEFAULT_SETTINGS.timerMode === 'count_up' ? 0 : DEFAULT_SETTINGS.matchDurationMinutes * 60);
    setIsTimerRunning(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportSessionData = useCallback(() => {
    const backup = {
      players,
      settings,
      courts,
      rounds,
      currentRound,
      timerSeconds,
      courtTimers,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(backup, null, 2);
  }, [players, settings, courts, rounds, currentRound, timerSeconds, courtTimers]);

  const importSessionData = useCallback((jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.players && Array.isArray(data.players)) setPlayers(data.players);
      if (data.settings) setSettings(data.settings);
      if (data.courts && Array.isArray(data.courts)) setCourts(data.courts);
      if (data.rounds && Array.isArray(data.rounds)) setRounds(data.rounds);
      if (data.currentRound) setCurrentRound(data.currentRound);
      if (data.courtTimers && typeof data.courtTimers === 'object') setCourtTimers(data.courtTimers);
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }, []);

  return (
    <SessionContext.Provider
      value={{
        players,
        courts,
        rounds,
        currentRound,
        activeTab,
        setActiveTab,
        settings,
        isTvMode,
        setIsTvMode,
        timerSeconds,
        isTimerRunning,
        isAttendanceSheetOpen,
        setIsAttendanceSheetOpen,
        autoRotateCountdown,
        autoRotateNotice,
        courtTimers,
        startCourtTimer,
        pauseCourtTimer,
        resetCourtTimer,
        adjustCourtTimer,
        startWarmupTimer,
        skipWarmup,
        startAllCourtTimers,
        pauseAllCourtTimers,
        resetAllCourtTimers,
        averageMatchDurationMinutes,
        getEstimatedWaitMinutes,
        activeRecapMatch,
        setActiveRecapMatch,
        recapPlayers,
        setRecapPlayers,
        sessionEnded,
        addPlayer,
        updatePlayer,
        togglePlayerStatus,
        deletePlayer,
        bulkAddPlayers,
        assignPlayerToSlot,
        createAndAssignPlayer,
        syncCurrentRoundWithRoster,
        updateCourtCount,
        updateCourtName,
        generateNextRound,
        recordMatchScore,
        swapPlayers,
        removePlayerFromSlot,
        reshuffleCurrentRound,
        completeCurrentRound,
        endSession,
        getSessionRecap,
        startTimer,
        pauseTimer,
        resetTimer,
        adjustTimer,
        updateSettings,
        toggleAutoRotate,
        executeAutoRotateNow,
        cancelAutoRotate,
        resetSession,
        exportSessionData,
        importSessionData,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
