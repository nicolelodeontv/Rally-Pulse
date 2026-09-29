import { Court, Match, Player, RotationPreset, RotationStrategy, Round, ShuffleOptions } from '../types';

export interface RotationResult {
  round: Round;
  warning?: string;
  unfilledCourts?: Court[];
}

export function generateRotationRound(
  players: Player[],
  courts: Court[],
  strategyOrPreset: RotationStrategy | RotationPreset,
  roundNumber: number,
  previousRound?: Round | null,
  consecutiveWinLimit: number = 2,
  options: Partial<ShuffleOptions> = {}
): RotationResult {
  const shuffleOptions: ShuffleOptions = {
    avoidRepeatPartners: true,
    equalizeTeamRatings: strategyOrPreset === 'skill_balanced',
    forceMixedDoubles: false,
    ...options,
  };
  const activeCourts = courts.filter((c) => c.status === 'available');
  if (activeCourts.length === 0) {
    const emptyRound: Round = {
      id: `round_${roundNumber}_${Date.now()}`,
      roundNumber,
      timestamp: Date.now(),
      matches: [],
      restingPlayerIds: players.map((p) => p.id),
      completed: false,
    };
    return { round: emptyRound, warning: 'No available courts to generate rotation.' };
  }

  // Filter only active players
  const activePlayers = players.filter((p) => p.status === 'active');
  const totalActive = activePlayers.length;

  if (totalActive < 4) {
    const emptyRound: Round = {
      id: `round_${roundNumber}_${Date.now()}`,
      roundNumber,
      timestamp: Date.now(),
      matches: [],
      restingPlayerIds: players.map((p) => p.id),
      completed: false,
    };
    return {
      round: emptyRound,
      warning: `At least 4 active players are required to generate a doubles match. (Currently ${totalActive} active)`,
    };
  }

  // Normalize preset / strategy
  const preset: RotationPreset =
    strategyOrPreset === '2_in_2_out_winners_stay'
      ? '2_in_2_out_winners_stay'
      : strategyOrPreset === 'fair_play_sitout'
      ? 'fair_play_sitout'
      : strategyOrPreset === 'skill_balanced'
      ? 'skill_balanced'
      : '4_in_4_out';

  const maxCourtsFromPlayers = Math.floor(totalActive / 4);
  const courtsToFillCount = Math.min(activeCourts.length, maxCourtsFromPlayers);
  const playersNeeded = courtsToFillCount * 4;

  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Handle 2-in / 2-out (Winners Stay) logic
  if (preset === '2_in_2_out_winners_stay' && previousRound && previousRound.matches.length > 0) {
    const assignedPlayerIds = new Set<string>();
    const matches: Match[] = [];

    // Identify winners who can stay (haven't hit the 2-win cap)
    const courtMatchesMap = new Map(previousRound.matches.map((m) => [m.courtId, m]));

    // Queue of available players sorted by rest priority
    const queueCandidates = [...activePlayers].sort((a, b) => {
      if (b.consecutiveRests !== a.consecutiveRests) {
        return b.consecutiveRests - a.consecutiveRests;
      }
      return a.gamesPlayed - b.gamesPlayed;
    });

    for (let cIdx = 0; cIdx < courtsToFillCount; cIdx++) {
      const court = activeCourts[cIdx];
      const prevMatch = courtMatchesMap.get(court.id);

      let stayingWinners: [string, string] | null = null;

      if (prevMatch && prevMatch.winner && prevMatch.completed) {
        const winningTeam = prevMatch.winner === 'team1' ? prevMatch.team1 : prevMatch.team2;
        const [w1Id, w2Id] = winningTeam;
        const p1 = playerMap.get(w1Id);
        const p2 = playerMap.get(w2Id);

        // Both winners must be active and not exceeded consecutive win limit
        const p1Active = p1 && p1.status === 'active';
        const p2Active = p2 && p2.status === 'active';
        const p1WinCount = p1?.consecutiveWins || 1;
        const p2WinCount = p2?.consecutiveWins || 1;

        if (
          p1Active &&
          p2Active &&
          !assignedPlayerIds.has(w1Id) &&
          !assignedPlayerIds.has(w2Id) &&
          p1WinCount < consecutiveWinLimit &&
          p2WinCount < consecutiveWinLimit
        ) {
          stayingWinners = [w1Id, w2Id];
          assignedPlayerIds.add(w1Id);
          assignedPlayerIds.add(w2Id);
        }
      }

      if (stayingWinners) {
        // Pick 2 highest priority challengers from queue
        const challengers: string[] = [];
        for (const candidate of queueCandidates) {
          if (!assignedPlayerIds.has(candidate.id)) {
            challengers.push(candidate.id);
            assignedPlayerIds.add(candidate.id);
            if (challengers.length === 2) break;
          }
        }

        if (challengers.length === 2) {
          matches.push({
            id: `m_${roundNumber}_${cIdx + 1}_${Date.now()}`,
            courtId: court.id,
            courtNumber: court.courtNumber,
            courtName: court.name,
            team1: stayingWinners,
            team2: [challengers[0], challengers[1]],
            team1Score: 0,
            team2Score: 0,
            winner: null,
            completed: false,
            servingPlayerId: stayingWinners[0],
            serviceNumber: 1,
            scoreHistory: [],
          });
          continue;
        }
      }

      // If no staying winners, pick 4 players from queue for this court
      const fourPlayers: string[] = [];
      for (const candidate of queueCandidates) {
        if (!assignedPlayerIds.has(candidate.id)) {
          fourPlayers.push(candidate.id);
          assignedPlayerIds.add(candidate.id);
          if (fourPlayers.length === 4) break;
        }
      }

      if (fourPlayers.length === 4) {
        matches.push({
          id: `m_${roundNumber}_${cIdx + 1}_${Date.now()}`,
          courtId: court.id,
          courtNumber: court.courtNumber,
          courtName: court.name,
          team1: [fourPlayers[0], fourPlayers[1]],
          team2: [fourPlayers[2], fourPlayers[3]],
          team1Score: 0,
          team2Score: 0,
          winner: null,
          completed: false,
        });
      }
    }

    if (matches.length > 0) {
      const resting = players.filter((p) => !assignedPlayerIds.has(p.id));
      const round: Round = {
        id: `round_${roundNumber}_${Date.now()}`,
        roundNumber,
        timestamp: Date.now(),
        matches,
        restingPlayerIds: resting.map((p) => p.id),
        completed: false,
      };
      return { round, unfilledCourts: activeCourts.slice(matches.length) };
    }
  }

  // 1. Sort active players by priority:
  // - Priority 1: Players with 2+ consecutive rests (Guaranteed Court Placement)
  // - Priority 2: Consecutive rests = 1
  // - Priority 3: Lowest total games played
  // - Priority 4: Random jitter to break ties evenly
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

  // 2. Best-match search for optimal doubles pairings and court distribution
  let bestScore = Infinity;
  let bestAssignment: Array<{
    court: Court;
    team1: [string, string];
    team2: [string, string];
  }> = [];

  const iterations = Math.min(600, Math.max(100, playersNeeded * 25));

  for (let iter = 0; iter < iterations; iter++) {
    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);

    if (preset === 'skill_balanced') {
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

        // Partner penalty: Heavy penalty for repeated partner
        const p1p2Partnered = p1.partnerHistory[p2.id] || 0;
        const p3p4Partnered = p3.partnerHistory[p4.id] || 0;
        const partnerWeight = shuffleOptions.avoidRepeatPartners ? 250 : 60;
        optScore += (p1p2Partnered ** 2) * partnerWeight;
        optScore += (p3p4Partnered ** 2) * partnerWeight;

        // Opponent penalty: Moderate penalty for repeated opponent
        const opps = [
          p1.opponentHistory[p3.id] || 0,
          p1.opponentHistory[p4.id] || 0,
          p2.opponentHistory[p3.id] || 0,
          p2.opponentHistory[p4.id] || 0,
        ];
        opps.forEach((cnt) => {
          optScore += (cnt ** 1.5) * 10;
        });

        // Skill balance score
        const team1Skill = p1.skillLevel + p2.skillLevel;
        const team2Skill = p3.skillLevel + p4.skillLevel;
        const skillDiff = Math.abs(team1Skill - team2Skill);

        if (shuffleOptions.equalizeTeamRatings || preset === 'skill_balanced') {
          optScore += skillDiff * 35;
        } else {
          optScore += skillDiff * 6;
        }

        if (shuffleOptions.forceMixedDoubles) {
          const team1Mixed =
            (p1.gender === 'male' && p2.gender === 'female') ||
            (p1.gender === 'female' && p2.gender === 'male');
          const team2Mixed =
            (p3.gender === 'male' && p4.gender === 'female') ||
            (p3.gender === 'female' && p4.gender === 'male');
          if (!team1Mixed) optScore += 2000;
          if (!team2Mixed) optScore += 2000;
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
    servingPlayerId: assign.team1[0],
    serviceNumber: 1,
    scoreHistory: [],
  }));

  const round: Round = {
    id: `round_${roundNumber}_${Date.now()}`,
    roundNumber,
    timestamp: Date.now(),
    matches,
    restingPlayerIds: restingPlayers.map((p) => p.id),
    completed: false,
  };

  const unfilledCourts = activeCourts.slice(courtsToFillCount);
  let warning: string | undefined;
  if (unselectedActivePlayers.length > 0) {
    warning = `${unselectedActivePlayers.length} active player(s) resting this round (${unselectedActivePlayers.map((p) => p.name).join(', ')}).`;
  }

  return { round, warning, unfilledCourts };
}

/**
 * Update player statistics and consecutive streaks after completed matches
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

    // Update games played, points and win streaks
    [t1p1, t1p2].forEach((p) => {
      p.gamesPlayed += 1;
      p.consecutiveRests = 0;
      p.pointsWon += m.team1Score;
      p.pointsLost += m.team2Score;
      if (m.winner === 'team1') {
        p.wins += 1;
        p.consecutiveWins = (p.consecutiveWins || 0) + 1;
      } else if (m.winner === 'team2') {
        p.losses += 1;
        p.consecutiveWins = 0;
      }
    });

    [t2p1, t2p2].forEach((p) => {
      p.gamesPlayed += 1;
      p.consecutiveRests = 0;
      p.pointsWon += m.team2Score;
      p.pointsLost += m.team1Score;
      if (m.winner === 'team2') {
        p.wins += 1;
        p.consecutiveWins = (p.consecutiveWins || 0) + 1;
      } else if (m.winner === 'team1') {
        p.losses += 1;
        p.consecutiveWins = 0;
      }
    });
  });

  return updatedPlayers;
}
