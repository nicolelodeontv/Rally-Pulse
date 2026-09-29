export type PlayerStatus = 'active' | 'resting';

export type SkillLevel = 2.0 | 2.5 | 3.0 | 3.5 | 4.0 | 4.5 | 5.0;

export type SkillDisplayMode = 'dupr' | 'casual';

export interface Player {
  id: string;
  name: string;
  skillLevel: SkillLevel;
  status: PlayerStatus;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsWon: number;
  pointsLost: number;
  consecutiveRests: number;
  consecutiveWins?: number;
  gender?: 'male' | 'female' | 'other';
  partnerHistory: Record<string, number>; // playerId -> count
  opponentHistory: Record<string, number>; // playerId -> count
}

export interface Court {
  id: string;
  courtNumber: number;
  name: string;
  status: 'available' | 'disabled';
}

export interface CourtTimerState {
  seconds: number;
  isRunning: boolean;
  isWarmup?: boolean;
  warmupSecondsRemaining?: number;
}

export interface Match {
  id: string;
  courtId: string;
  courtNumber: number;
  courtName: string;
  team1: [string, string]; // [player1Id, player2Id]
  team2: [string, string]; // [player3Id, player4Id]
  team1Score: number;
  team2Score: number;
  winner: 'team1' | 'team2' | null;
  completed: boolean;
  durationSeconds?: number;
  statsApplied?: boolean;
  servingPlayerId?: string;
  serviceNumber?: 1 | 2;
  scoreHistory?: Array<{ team1Score: number; team2Score: number }>;
}

export interface Round {
  id: string;
  roundNumber: number;
  timestamp: number;
  matches: Match[];
  restingPlayerIds: string[];
  completed: boolean;
}

export type RotationStrategy = 'fair_social' | 'skill_balanced' | 'competitive';

export type RotationPreset =
  | '4_in_4_out'
  | '2_in_2_out_winners_stay'
  | 'fair_play_sitout'
  | 'skill_balanced';

export interface ShuffleOptions {
  avoidRepeatPartners: boolean;
  equalizeTeamRatings: boolean;
  forceMixedDoubles: boolean;
}

export interface SessionRecapPlayerStat {
  id: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  pointDifferential: number;
}

export interface SessionRecap {
  generatedAt: string;
  totalGames: number;
  totalRounds: number;
  averageMatchLengthSeconds: number;
  playerStats: SessionRecapPlayerStat[];
}

export interface SessionSettings {
  courtCount: number;
  courtNames: string[];
  matchDurationMinutes: number;
  pointsToWin: number; // 11, 15, 21, or 0 (Timed only)
  winByTwo: boolean;
  rotationStrategy: RotationStrategy;
  rotationPreset: RotationPreset;
  skillDisplayMode: SkillDisplayMode;
  outdoorHighContrast: boolean;
  consecutiveWinLimit: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean;
  autoRotateEnabled: boolean;
  autoRotateBufferSeconds: number;
  timerMode: 'count_up' | 'countdown';
  timerType: 'independent' | 'global';
  shuffleDefaults?: ShuffleOptions;
}

export type ActiveTab = 'live' | 'queue' | 'players' | 'standings' | 'settings';
