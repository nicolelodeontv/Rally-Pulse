import { Court, Match, Player, RotationStrategy, Round } from '../types';

/**
 * Fair Doubles Court Rotation Algorithm
 *
 * Requirements:
 * 1. Doubles matches: 4 players per court (2 vs 2).
 * 2. Active vs Resting: Only active players are eligible. Resting players are strictly skipped.
 * 3. Equal Play Time: Prioritize players with highest consecutive rests and fewest games played.
 * 4. Partner Variety: Prioritize pairings that have NEVER or least frequently played together.
 * 5. Opponent Variety: Penalize repeated opponent matchups.
 * 6. Skill Balance: According to chosen strategy ('fair_social', 'skill_balanced', 'competitive').
 */

export interface RotationResult {
  round: Round;
  warning?: string;
}

export function generateRotationRound(
  players: Player[],
  courts: Court[],
  strategy: RotationStrategy,
  roundNumber: number
): RotationResult {
  const activeCourts = courts.filter((c) => c.status === 'available');
  if (activeCourts.length === 0) {
    throw new Error('No available courts to generate rotation.');
  }

  // Filter only active players
  const activePlayers = players.filter((p) => p.status === 'active');
  const totalActive = activePlayers.length;

  if (totalActive < 4) {
    throw new Error('At least 4 active players are required to generate a doubles match.');
  }

  // Maximum number of courts we can fill with 4 players each
  const maxCourtsFromPlayers = Math.floor(totalActive / 4);
  const courtsToFillCount = Math.min(activeCourts.length, maxCourtsFromPlayers);
  const playersNeeded = courtsToFillCount * 4;

  // 1. Sort active players by priority to play this round:
  // - Priority 1: Higher consecutive rests (bench time)
  // - Priority 2: Lower total games played
  // - Priority 3: Random jitter to break ties evenly
  const sortedActive = [...activePlayers].sort((a, b) => {
    if (b.consecutiveRests !== a.consecutiveRests) {
      return b.consecutiveRests - a.consecutiveRests;
    }
    if (a.gamesPlayed !== b.gamesPlayed) {
      return a.gamesPlayed - b.gamesPlayed;
    }
    return Math.random() - 0.5;
  });

  const selectedPlayers = sortedActive.slice(0, playersNeeded);
  const unselectedActivePlayers = sortedActive.slice(playersNeeded);
  const restingPlayers = [
    ...unselectedActivePlayers,
    ...players.filter((p) => p.status === 'resting'),
  ];

  // Map for fast player lookup
  const playerMap = new Map<string, Player>();
  players.forEach((p) => playerMap.set(p.id, p));

  // 2. Best-match search for optimal doubles pairings and court distribution
  // We run multiple randomized/heuristic permutations to find the pairing with minimum penalty score
  let bestScore = Infinity;
  let bestAssignment: Array<{
    court: Court;
    team1: [string, string];
    team2: [string, string];
  }> = [];

  const iterations = Math.min(600, Math.max(100, playersNeeded * 25));

  for (let iter = 0; iter < iterations; iter++) {
    // Shuffle the selected players
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);

    // If competitive strategy, sort selected players by skill before chunking into courts
    if (strategy === 'competitive') {
      shuffled.sort((a, b) => b.skillLevel - a.skillLevel);
    }

    let currentScore = 0;
    const currentAssignment: Array<{
      court: Court;
      team1: [string, string];
      team2: [string, string];
    }> = [];

    for (let cIdx = 0; cIdx < courtsToFillCount; cIdx++) {
      const court = activeCourts[cIdx];
      const courtPlayers = shuffled.slice(cIdx * 4, cIdx * 4 + 4);

      // Best partition of 4 players (p0, p1, p2, p3) into two teams of 2
      // 3 possible pairings:
      // Option A: (0,1) vs (2,3)
      // Option B: (0,2) vs (1,3)
      // Option C: (0,3) vs (1,2)
      const options: Array<{ team1: [Player, Player]; team2: [Player, Player] }> = [
        { team1: [courtPlayers[0], courtPlayers[1]], team2: [courtPlayers[2], courtPlayers[3]] },
        { team1: [courtPlayers[0], courtPlayers[2]], team2: [courtPlayers[1], courtPlayers[3]] },
        { team1: [courtPlayers[0], courtPlayers[3]], team2: [courtPlayers[1], courtPlayers[2]] },
      ];

      let bestOption = options[0];
      let bestOptionScore = Infinity;

      for (const opt of options) {
        const [p1, p2] = opt.team1;
        const [p3, p4] = opt.team2;

        let optScore = 0;

        // Partner penalty: Heavy penalty for having partnered before
        const p1p2Partnered = p1.partnerHistory[p2.id] || 0;
        const p3p4Partnered = p3.partnerHistory[p4.id] || 0;
        optScore += (p1p2Partnered ** 2) * 50;
        optScore += (p3p4Partnered ** 2) * 50;

        // Opponent penalty: Moderate penalty for repeated opponent matchups
        const opps = [
          p1.opponentHistory[p3.id] || 0,
          p1.opponentHistory[p4.id] || 0,
          p2.opponentHistory[p3.id] || 0,
          p2.opponentHistory[p4.id] || 0,
        ];
        opps.forEach((cnt) => {
          optScore += (cnt ** 1.5) * 8;
        });

        // Skill balance score
        const team1Skill = p1.skillLevel + p2.skillLevel;
        const team2Skill = p3.skillLevel + p4.skillLevel;
        const skillDiff = Math.abs(team1Skill - team2Skill);

        if (strategy === 'skill_balanced' || strategy === 'competitive') {
          // Strongly encourage equal team skill totals
          optScore += skillDiff * 25;
        } else {
          // Fair social: slight weighting so games aren't completely mismatched
          optScore += skillDiff * 6;
        }

        if (optScore < bestOptionScore) {
          bestOptionScore = optScore;
          bestOption = opt;
        }
      }

      currentScore += bestOptionScore;
      currentAssignment.push({
        court,
        team1: [bestOption.team1[0].id, bestOption.team1[1].id],
        team2: [bestOption.team2[0].id, bestOption.team2[1].id],
      });
    }

    if (currentScore < bestScore) {
      bestScore = currentScore;
      bestAssignment = currentAssignment;
      // If we found a zero-conflict assignment, we can stop early
      if (bestScore === 0) break;
    }
  }

  const matches: Match[] = bestAssignment.map((assign, idx) => ({
    id: `m_${roundNumber}_${idx + 1}_${Date.now()}`,
    courtId: assign.court.id,
    courtNumber: assign.court.courtNumber,
    courtName: assign.court.name,
    team1: assign.team1,
    team2: assign.team2,
    team1Score: 0,
    team2Score: 0,
    winner: null,
    completed: false,
  }));

  const round: Round = {
    id: `round_${roundNumber}_${Date.now()}`,
    roundNumber,
    timestamp: Date.now(),
    matches,
    restingPlayerIds: restingPlayers.map((p) => p.id),
    completed: false,
  };

  let warning: string | undefined;
  if (unselectedActivePlayers.length > 0) {
    warning = `${unselectedActivePlayers.length} active player(s) resting this round (${unselectedActivePlayers.map((p) => p.name).join(', ')}).`;
  }

  return { round, warning };
}

/**
 * Update player statistics and history after a completed round or match
 */
export function applyMatchResults(
  players: Player[],
  completedMatches: Match[]
): Player[] {
  const updatedPlayers = players.map((p) => ({
    ...p,
    partnerHistory: { ...p.partnerHistory },
    opponentHistory: { ...p.opponentHistory },
  }));

  const playerMap = new Map<string, Player>();
  updatedPlayers.forEach((p) => playerMap.set(p.id, p));

  completedMatches.forEach((m) => {
    const [t1p1, t1p2] = m.team1.map((id) => playerMap.get(id));
    const [t2p1, t2p2] = m.team2.map((id) => playerMap.get(id));

    if (!t1p1 || !t1p2 || !t2p1 || !t2p2) return;

    // Update partner histories
    t1p1.partnerHistory[t1p2.id] = (t1p1.partnerHistory[t1p2.id] || 0) + 1;
    t1p2.partnerHistory[t1p1.id] = (t1p2.partnerHistory[t1p1.id] || 0) + 1;

    t2p1.partnerHistory[t2p2.id] = (t2p1.partnerHistory[t2p2.id] || 0) + 1;
    t2p2.partnerHistory[t2p1.id] = (t2p2.partnerHistory[t2p1.id] || 0) + 1;

    // Update opponent histories
    [t1p1, t1p2].forEach((t1p) => {
      [t2p1, t2p2].forEach((t2p) => {
        t1p.opponentHistory[t2p.id] = (t1p.opponentHistory[t2p.id] || 0) + 1;
        t2p.opponentHistory[t1p.id] = (t2p.opponentHistory[t1p.id] || 0) + 1;
      });
    });

    // Update games played and scores
    [t1p1, t1p2].forEach((p) => {
      p.gamesPlayed += 1;
      p.consecutiveRests = 0;
      p.pointsWon += m.team1Score;
      p.pointsLost += m.team2Score;
      if (m.winner === 'team1') p.wins += 1;
      else if (m.winner === 'team2') p.losses += 1;
    });

    [t2p1, t2p2].forEach((p) => {
      p.gamesPlayed += 1;
      p.consecutiveRests = 0;
      p.pointsWon += m.team2Score;
      p.pointsLost += m.team1Score;
      if (m.winner === 'team2') p.wins += 1;
      else if (m.winner === 'team1') p.losses += 1;
    });
  });

  return updatedPlayers;
}
