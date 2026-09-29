import { Match, Player, Round, SessionRecap } from '../types';

export function getCompletedMatches(rounds: Round[], currentRound?: Round | null): Match[] {
  const byId = new Map<string, Match>();
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.completed && match.winner) byId.set(match.id, match);
    }
  }
  if (currentRound) {
    for (const match of currentRound.matches) {
      if (match.completed && match.winner) byId.set(match.id, match);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const aDuration = a.durationSeconds || 0;
    const bDuration = b.durationSeconds || 0;
    return aDuration - bDuration;
  });
}

export function buildSessionRecap(
  players: Player[],
  rounds: Round[],
  currentRound?: Round | null
): SessionRecap {
  const completedMatches = getCompletedMatches(rounds, currentRound);
  const totalDurationSeconds = completedMatches.reduce(
    (sum, match) => sum + (match.durationSeconds || 0),
    0
  );

  const playerStats = [...players]
    .map((player) => ({
      id: player.id,
      name: player.name,
      gamesPlayed: player.gamesPlayed,
      wins: player.wins,
      losses: player.losses,
      winRate: player.gamesPlayed > 0
        ? Math.round((player.wins / player.gamesPlayed) * 100)
        : 0,
      pointDifferential: player.pointsWon - player.pointsLost,
    }))
    .sort((a, b) =>
      b.winRate - a.winRate ||
      b.wins - a.wins ||
      b.pointDifferential - a.pointDifferential ||
      a.name.localeCompare(b.name)
    );

  return {
    generatedAt: new Date().toISOString(),
    totalGames: completedMatches.length,
    totalRounds: new Set(completedMatches.map((match) => match.id.split('_')[1])).size,
    averageMatchLengthSeconds: completedMatches.length > 0
      ? Math.round(totalDurationSeconds / completedMatches.length)
      : 0,
    playerStats,
  };
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 60) return `${Math.max(0, Math.round(seconds))}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
