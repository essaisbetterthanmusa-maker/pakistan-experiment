import type { PartyId } from '../data/parties';
import type { SeatResult } from './types';
import { mulberry32, gaussNoise, pick, type Rand } from './random';

export interface ByElectionResult {
  seatId: string;
  seatName: string;
  vacancyReason: string;
  previousWinner: PartyId;
  newWinner: PartyId;
  winnerName: string;
  flipped: boolean;
}

const VACANCY_REASONS = [
  'the sitting member resigned amid a corruption inquiry',
  'the sitting member passed away',
  'the seat was vacated after a disqualification order',
  'the sitting member resigned to contest from a second constituency they also won',
  'the sitting member defected and was unseated on a floor-crossing reference',
  'the sitting member was elevated to the cabinet from outside parliament and had to vacate',
  'the seat was vacated after an election-tribunal ruling on the original result',
];

/**
 * By-elections in Pakistan are notoriously brutal for whoever is in power —
 * low turnout favours whoever is angrier, protest voting punishes the
 * government of the day almost regardless of the national mood, and by-poll
 * defeats for the ruling party are the norm rather than the exception (PTI
 * lost most of its 2022-23 by-polls even at the height of its street
 * support; PML-N and PPP have both bled by-election seats in office too).
 * So this isn't a neutral re-score: the sitting coalition carries a
 * structural anti-incumbency penalty on top of anything approval is doing,
 * and a popular government only partly offsets it.
 */
export function runByElections(
  seatResults: SeatResult[],
  count: number,
  coalitionParties: PartyId[],
  governingApproval: number,
  seed: number,
): ByElectionResult[] {
  const rand: Rand = mulberry32(seed);
  if (seatResults.length === 0 || count <= 0) return [];

  const pool = [...seatResults];
  const picked: SeatResult[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rand() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }

  const coalitionSet = new Set(coalitionParties);
  // Even a genuinely popular government only claws a little of this back —
  // by-election losses happen almost regardless of approval in Pakistan, so
  // the relief is deliberately small next to the flat penalty.
  const approvalRelief = Math.max(-4, Math.min(4, (governingApproval - 50) / 6));

  return picked.map(sr => {
    const seat = sr.seat;
    const previousWinner = sr.winner.party;
    const scored = seat.slates.map(slate => {
      let score = slate.baseline + slate.candidateStrength * 1.1;
      if (coalitionSet.has(slate.party)) {
        score += -17 + approvalRelief; // structural by-election anti-incumbency
      } else if (slate.party !== 'IND' && slate.party !== 'OTH') {
        score += 7; // opposition parties benefit from the protest vote
      }
      score += gaussNoise(rand, 8); // by-election chaos: low turnout, pure local swing
      return { slate, score: Math.max(0.5, score) };
    });
    const winnerSlate = scored.sort((a, b) => b.score - a.score)[0].slate;
    return {
      seatId: seat.id,
      seatName: seat.name,
      vacancyReason: pick(rand, VACANCY_REASONS),
      previousWinner,
      newWinner: winnerSlate.party,
      winnerName: winnerSlate.candidateName,
      flipped: winnerSlate.party !== previousWinner,
    };
  });
}
