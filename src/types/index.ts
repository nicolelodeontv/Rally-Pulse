export type PlayerStatus = 'active' | 'resting';

export type SkillLevel = 2.0 | 2.5 | 3.0 | 3.5 | 4.0 | 4.5 | 5.0;

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

export interface SessionSettings {
  courtCount: number;
  courtNames: string[];
  matchDurationMinutes: number;
  pointsToWin: number;
  rotationStrategy: RotationStrategy;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean;
  autoRotateEnabled: boolean;
  autoRotateBufferSeconds: number;
  timerMode: 'count_up' | 'countdown';
}

export type ActiveTab = 'live' | 'queue' | 'players' | 'standings' | 'settings';
