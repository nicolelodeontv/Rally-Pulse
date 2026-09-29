import { Match, Player, Round } from '../types';
import { getCompletedMatches } from './sessionAnalytics';

const CSV_HEADERS = [
  'Date',
  'Match Format',
  'Player 1',
  'Player 2',
  'Player 3',
  'Player 4',
  'Team 1 Score',
  'Team 2 Score',
  'Winner',
];

function csvCell(value: string | number): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildDuprCsv(
  players: Player[],
  rounds: Round[],
  currentRound?: Round | null
): string {
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const matches = getCompletedMatches(rounds, currentRound);

  const rows = matches.map((match: Match) => {
    const names = [
      playerMap.get(match.team1[0])?.name || '',
      playerMap.get(match.team1[1])?.name || '',
      playerMap.get(match.team2[0])?.name || '',
      playerMap.get(match.team2[1])?.name || '',
    ];

    return [
      new Date().toISOString().slice(0, 10),
      'Rally',
      ...names,
      match.team1Score,
      match.team2Score,
      match.winner === 'team1' ? 'Team 1' : 'Team 2',
    ].map(csvCell).join(',');
  });

  return [CSV_HEADERS.map(csvCell).join(','), ...rows].join('\n');
}
