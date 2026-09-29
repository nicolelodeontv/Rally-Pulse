import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Court, CourtTimerState, Match, Player, Round, SessionSettings, ActiveTab } from '../types';
import { generateRotationRound, applyMatchResults } from '../utils/rotationAlgorithm';
import { audioSynth, triggerVibration, wakeLockManager } from '../utils/hardware';
import { triggerConfetti } from '../utils/confetti';

const STORAGE_KEY = 'rallypulse_session_v2';

const DEFAULT_PLAYERS: Player[] = [
  { id: 'p_1', name: 'Alex Rivera', skillLevel: 4.0, status: 'active', gamesPlayed: 2, wins: 2, losses: 0, pointsWon: 22, pointsLost: 15, consecutiveRests: 0, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_2', name: 'Sammy Chen', skillLevel: 3.5, status: 'active', gamesPlayed: 2, wins: 1, losses: 1, pointsWon: 19, pointsLost: 20, consecutiveRests: 0, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_3', name: 'Taylor Brooks', skillLevel: 3.5, status: 'active', gamesPlayed: 2, wins: 2, losses: 0, pointsWon: 22, pointsLost: 14, consecutiveRests: 0, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_4', name: 'Jordan Hayes', skillLevel: 4.5, status: 'active', gamesPlayed: 2, wins: 1, losses: 1, pointsWon: 20, pointsLost: 18, consecutiveRests: 0, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_5', name: 'Morgan Vance', skillLevel: 3.0, status: 'active', gamesPlayed: 1, wins: 0, losses: 1, pointsWon: 7, pointsLost: 11, consecutiveRests: 1, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_6', name: 'Riley Martinez', skillLevel: 3.5, status: 'active', gamesPlayed: 2, wins: 1, losses: 1, pointsWon: 18, pointsLost: 19, consecutiveRests: 0, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_7', name: 'Casey Dupont', skillLevel: 4.0, status: 'active', gamesPlayed: 1, wins: 1, losses: 0, pointsWon: 11, pointsLost: 8, consecutiveRests: 1, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_8', name: 'Devon Kim', skillLevel: 3.0, status: 'active', gamesPlayed: 2, wins: 0, losses: 2, pointsWon: 14, pointsLost: 22, consecutiveRests: 0, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_9', name: 'Jamie Foster', skillLevel: 3.5, status: 'active', gamesPlayed: 1, wins: 0, losses: 1, pointsWon: 6, pointsLost: 11, consecutiveRests: 1, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_10', name: 'Quinn Bailey', skillLevel: 4.0, status: 'active', gamesPlayed: 1, wins: 1, losses: 0, pointsWon: 11, pointsLost: 9, consecutiveRests: 1, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_11', name: 'Avery Walsh', skillLevel: 3.0, status: 'resting', gamesPlayed: 0, wins: 0, losses: 0, pointsWon: 0, pointsLost: 0, consecutiveRests: 2, partnerHistory: {}, opponentHistory: {} },
  { id: 'p_12', name: 'Skyler Patel', skillLevel: 3.5, status: 'resting', gamesPlayed: 0, wins: 0, losses: 0, pointsWon: 0, pointsLost: 0, consecutiveRests: 2, partnerHistory: {}, opponentHistory: {} },
];

const DEFAULT_SETTINGS: SessionSettings = {
  courtCount: 2,
  courtNames: ['Court 1', 'Court 2'],
  matchDurationMinutes: 12,
  pointsToWin: 11,
  rotationStrategy: 'fair_social',
  soundEnabled: true,
  vibrationEnabled: true,
  wakeLockEnabled: true,
  autoRotateEnabled: false,
  autoRotateBufferSeconds: 5,
  timerMode: 'count_up',
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
  // Per-Court Independent Timers
  courtTimers: Record<string, CourtTimerState>;
  startCourtTimer: (courtId: string) => void;
  pauseCourtTimer: (courtId: string) => void;
  resetCourtTimer: (courtId: string) => void;
  adjustCourtTimer: (courtId: string, seconds: number) => void;
  startAllCourtTimers: () => void;
  pauseAllCourtTimers: () => void;
  resetAllCourtTimers: () => void;
  // Actions
  addPlayer: (name: string, skillLevel: Player['skillLevel']) => void;
  updatePlayer: (player: Player) => void;
  togglePlayerStatus: (playerId: string) => void;
  deletePlayer: (playerId: string) => void;
  bulkAddPlayers: (namesText: string, defaultSkill: Player['skillLevel']) => void;
  updateCourtCount: (count: number) => void;
  updateCourtName: (courtId: string, name: string) => void;
  generateNextRound: () => void;
  recordMatchScore: (matchId: string, team1Score: number, team2Score: number, winner: 'team1' | 'team2' | null) => void;
  swapPlayers: (player1Id: string, player2Id: string) => void;
  completeCurrentRound: () => void;
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

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [players, setPlayers] = useState<Player[]>(DEFAULT_PLAYERS);
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS);
  const [courts, setCourts] = useState<Court[]>(() => buildCourts(DEFAULT_SETTINGS.courtCount, DEFAULT_SETTINGS.courtNames));
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('live');
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [isAttendanceSheetOpen, setIsAttendanceSheetOpen] = useState(false);

  // Auto-rotate state
  const [autoRotateCountdown, setAutoRotateCountdown] = useState<number | null>(null);
  const [autoRotateNotice, setAutoRotateNotice] = useState<string | null>(null);

  // Global Timer state (starts from 0 for count_up)
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

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.players && Array.isArray(parsed.players)) setPlayers(parsed.players);
        if (parsed.settings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed.settings,
          });
        }
        if (parsed.courts && Array.isArray(parsed.courts)) setCourts(parsed.courts);
        if (parsed.rounds && Array.isArray(parsed.rounds)) setRounds(parsed.rounds);
        if (parsed.currentRound) setCurrentRound(parsed.currentRound);
        if (typeof parsed.timerSeconds === 'number') setTimerSeconds(parsed.timerSeconds);
        if (parsed.courtTimers && typeof parsed.courtTimers === 'object') {
          setCourtTimers(parsed.courtTimers);
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
      // Ignore if not enough active
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
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }, [players, settings, courts, rounds, currentRound, timerSeconds, courtTimers]);

  // Execute Auto-Rotate to cycle queue and immediately start the next match
  const executeAutoRotate = useCallback(() => {
    setAutoRotateCountdown(null);
    const activeRound = currentRoundRef.current;
    const currentSettings = settingsRef.current;
    const currentCourts = courtsRef.current;

    // 1. Advance players history / stats from previous match
    const activePlayers = playersRef.current;
    let finalPlayers = activePlayers;

    if (activeRound) {
      const updated = applyMatchResults(activePlayers, activeRound.matches);
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
      setRounds((prev) => [{ ...activeRound, completed: true }, ...prev]);
    }

    // 2. Generate next round with fair algorithm
    const nextRoundNumber = (activeRound ? activeRound.roundNumber : roundsRef.current.length) + 1;
    try {
      const res = generateRotationRound(
        finalPlayers,
        currentCourts,
        currentSettings.rotationStrategy,
        nextRoundNumber
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

  // 3. Countdown Timer effect & Web Audio / Vibration / Wake Lock integration
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
              // Hit 00:00!
              clearInterval(timerIntervalRef.current);
              setIsTimerRunning(false);

              if (settings.soundEnabled) {
                audioSynth.playBuzzer();
              }
              if (settings.vibrationEnabled) {
                triggerVibration([300, 100, 300, 100, 500]);
              }

              // AUTO-ROTATE TRIGGER
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
                if (isCountUp) {
                  anyStillRunning = true;
                  const nextSecs = timer.seconds + 1;
                  next[cId] = { ...timer, seconds: nextSecs };
                  if (nextSecs === targetSeconds) {
                    anyHitTarget = true;
                    const cObj = courtsRef.current.find((c) => c.id === cId);
                    targetCourts.push(cObj ? cObj.name : `Court`);
                  }
                } else {
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

              // Auto-rotate trigger when independent court timers reach target
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
        next[cId] = { seconds: secs, isRunning: true };
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
        next[cId] = { seconds: defaultSecs, isRunning: false };
      }
      return next;
    });
    setIsTimerRunning(false);
    setTimerSeconds(defaultSecs);
  }, []);

  // Update court count
  const updateCourtCount = useCallback((count: number) => {
    const validCount = Math.max(1, Math.min(12, count));
    const newCourts = buildCourts(validCount, settings.courtNames);
    setCourts(newCourts);
    setCourtTimers((prev) => initCourtTimers(newCourts, settings.matchDurationMinutes, settings.timerMode, prev));
    setSettings((prev) => ({
      ...prev,
      courtCount: validCount,
      courtNames: newCourts.map((c) => c.name),
    }));
  }, [settings.courtNames, settings.matchDurationMinutes, settings.timerMode]);

  const updateCourtName = useCallback((courtId: string, name: string) => {
    setCourts((prev) =>
      prev.map((c) => (c.id === courtId ? { ...c, name: name.trim() || `Court ${c.courtNumber}` } : c))
    );
  }, []);

  // Player management
  const addPlayer = useCallback((name: string, skillLevel: Player['skillLevel']) => {
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
    setPlayers((prev) => [...prev, newPlayer]);
  }, []);

  const updatePlayer = useCallback((updated: Player) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const togglePlayerStatus = useCallback((playerId: string) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          const newStatus = p.status === 'active' ? 'resting' : 'active';
          return {
            ...p,
            status: newStatus,
            // If setting to active, give them 1 rest count credit so they get queued fairly soon
            consecutiveRests: newStatus === 'active' ? Math.max(1, p.consecutiveRests) : p.consecutiveRests,
          };
        }
        return p;
      })
    );
  }, []);

  const deletePlayer = useCallback((playerId: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    // Also remove from current match if present
    if (currentRound) {
      setCurrentRound((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          restingPlayerIds: prev.restingPlayerIds.filter((id) => id !== playerId),
        };
      });
    }
  }, [currentRound]);

  const bulkAddPlayers = useCallback((namesText: string, defaultSkill: Player['skillLevel']) => {
    const lines = namesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const newPlayers: Player[] = lines.map((line, idx) => {
      // Check if line contains skill rating like "John Doe (4.0)" or "Jane 3.5"
      let name = line;
      let skill = defaultSkill;
      const match = line.match(/(.*?)[(\s]+([2-5]\.[05]|[2-5])[)\s]*$/);
      if (match) {
        name = match[1].trim();
        const parsed = parseFloat(match[2]);
        if (!isNaN(parsed) && parsed >= 2.0 && parsed <= 5.0) {
          skill = parsed as Player['skillLevel'];
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

    setPlayers((prev) => [...prev, ...newPlayers]);
  }, []);

  // Generate Next Round
  const generateNextRound = useCallback(() => {
    const nextRoundNumber = (currentRound ? currentRound.roundNumber : rounds.length) + 1;
    try {
      const { round } = generateRotationRound(players, courts, settings.rotationStrategy, nextRoundNumber);
      setCurrentRound(round);
      // Reset timer for next round
      setTimerSeconds(settings.matchDurationMinutes * 60);
      setIsTimerRunning(false);

      if (settings.soundEnabled) {
        audioSynth.playWhistle();
      }
    } catch (e: any) {
      alert(e.message || 'Cannot generate round. Please check active players.');
    }
  }, [currentRound, rounds.length, players, courts, settings.rotationStrategy, settings.matchDurationMinutes, settings.soundEnabled]);

  // Record score & winner for a match
  const recordMatchScore = useCallback((matchId: string, team1Score: number, team2Score: number, winner: 'team1' | 'team2' | null) => {
    if (!currentRound) return;

    const updatedMatches = currentRound.matches.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          team1Score,
          team2Score,
          winner,
          completed: winner !== null,
        };
      }
      return m;
    });

    const isAllCompleted = updatedMatches.every((m) => m.completed);

    setCurrentRound({
      ...currentRound,
      matches: updatedMatches,
      completed: isAllCompleted,
    });

    if (winner !== null) {
      if (settings.soundEnabled) {
        audioSynth.playChime();
      }
      if (settings.vibrationEnabled) {
        triggerVibration([50, 30, 80]);
      }
      triggerConfetti();
    }
  }, [currentRound, settings.soundEnabled, settings.vibrationEnabled]);

  // Swap any two players (on court, or between court & bench)
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

      // Replace helper
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

      // Find where p1 and p2 currently reside
      let p1InMatch = false;
      let p2InMatch = false;

      newMatches.forEach((m) => {
        if (m.team1.includes(p1Id) || m.team2.includes(p1Id)) p1InMatch = true;
        if (m.team1.includes(p2Id) || m.team2.includes(p2Id)) p2InMatch = true;
      });

      // Case 1: Both in matches
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
      }
      // Case 2: One in match, one in resting
      else if (p1InMatch && !p2InMatch) {
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

  // Complete current round, archive into round history, and update player cumulative stats
  const completeCurrentRound = useCallback(() => {
    if (!currentRound) return;

    // Apply match results to players
    const updatedPlayers = applyMatchResults(players, currentRound.matches);

    // Update consecutive rests for players who were benched
    const activeRestingSet = new Set(currentRound.restingPlayerIds);
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
    setRounds((prev) => [currentRound, ...prev]);

    // Automatically generate next round
    const nextRoundNumber = currentRound.roundNumber + 1;
    try {
      const { round } = generateRotationRound(finalPlayers, courts, settings.rotationStrategy, nextRoundNumber);
      setCurrentRound(round);
      resetTimer();
    } catch {
      setCurrentRound(null);
    }
  }, [currentRound, players, courts, settings.rotationStrategy, resetTimer]);

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

  const resetSession = useCallback(() => {
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
        startAllCourtTimers,
        pauseAllCourtTimers,
        resetAllCourtTimers,
        addPlayer,
        updatePlayer,
        togglePlayerStatus,
        deletePlayer,
        bulkAddPlayers,
        updateCourtCount,
        updateCourtName,
        generateNextRound,
        recordMatchScore,
        swapPlayers,
        completeCurrentRound,
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
