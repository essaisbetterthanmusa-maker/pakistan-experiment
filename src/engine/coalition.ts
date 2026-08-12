import type { PartyId } from '../data/parties';
import { PARTIES } from '../data/parties';
import { NA_MAJORITY } from '../data/provinces';
import { getRelation, RELATION_RELIABILITY_RANGE, type Relation } from '../data/relations';
import { mulberry32, randRange, type Rand } from './random';
import { establishmentScore, type EstablishmentStance } from './types';

export interface CoalitionPartner {
  party: PartyId;
  seats: number;
  demand: string[];
  reliability: number; // 0-1, chance they hold together under pressure
  relation: Relation;
  refuses: boolean;
}

export interface CoalitionAnalysis {
  leaderParty: PartyId;
  leaderSeats: number;
  hasMajorityAlone: boolean;
  possiblePartners: CoalitionPartner[];
  independents: number;
  majorityThreshold: number;
}

const DEMAND_POOL = [
  'Deputy Prime Minister / Speaker slot',
  'Finance or Interior ministry',
  'Development fund allocation for their province',
  'Protection from accountability cases against their leadership',
  'A Senate seat in the next round',
  'Governor slot in their home province',
  'Local infrastructure projects named after their leader',
  'Cabinet seats for two senior figures',
];

const HOSTILE_DEMAND_EXTRA = [
  'Public apology for past accusations',
  'Written guarantees before a single vote in parliament',
  'Veto power over the next cabinet reshuffle',
];

export function analyzeCoalitionOptions(totalByParty: Record<PartyId, number>, leaderParty: PartyId, seed: number, establishmentStance: EstablishmentStance = 'NEUTRAL'): CoalitionAnalysis {
  const rand: Rand = mulberry32(seed + 9001);
  const leaderSeats = totalByParty[leaderParty] ?? 0;
  // A government seen as establishment-favoured looks like a safer bet to
  // join; one that's on the outs makes potential partners nervous.
  const establishmentBonus = establishmentScore(establishmentStance) * 0.04;
  const partners: CoalitionPartner[] = (Object.keys(PARTIES) as PartyId[])
    .filter(id => id !== leaderParty && id !== 'IND' && id !== 'OTH' && (totalByParty[id] ?? 0) > 0)
    .map(id => {
      const relation = getRelation(leaderParty, id);
      const [lo, hi] = RELATION_RELIABILITY_RANGE[relation];
      const demandCount = relation === 'HOSTILE' ? 3 : relation === 'UNEASY' ? 2 + Math.floor(rand() * 2) : 1 + Math.floor(rand() * 2);
      const pool = relation === 'HOSTILE' || relation === 'UNEASY' ? [...DEMAND_POOL, ...HOSTILE_DEMAND_EXTRA] : DEMAND_POOL;
      const reliability = Math.max(0.02, Math.min(0.98, randRange(rand, lo, hi) + establishmentBonus));
      return {
        party: id,
        seats: totalByParty[id],
        demand: shuffle(pool, rand).slice(0, demandCount),
        reliability: Math.round(reliability * 100) / 100,
        relation,
        refuses: relation === 'HOSTILE',
      };
    })
    .sort((a, b) => b.seats - a.seats);

  return {
    leaderParty,
    leaderSeats,
    hasMajorityAlone: leaderSeats >= NA_MAJORITY,
    possiblePartners: partners,
    independents: totalByParty.IND ?? 0,
    majorityThreshold: NA_MAJORITY,
  };
}

function shuffle<T>(arr: T[], rand: Rand): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type GovernmentOutcome = 'MAJORITY' | 'COALITION' | 'MINORITY' | 'OPPOSITION' | 'FAILED';

export interface FormationResult {
  outcome: GovernmentOutcome;
  total: number;
  independentsActuallyGained: number;
  successChance: number;
  collapsed: boolean;
  narrative: string;
}

/**
 * Reaching the seat-count threshold on paper is not the same as a coalition
 * actually holding together through the formation vote. Weaker average
 * partner reliability (driven by real political compatibility) raises the
 * chance talks collapse even when the arithmetic works.
 */
export function resolveGovernmentFormation(
  leaderSeats: number,
  acceptedPartners: CoalitionPartner[],
  independentsAttempted: number,
  seed: number,
  establishmentStance: EstablishmentStance = 'NEUTRAL',
): FormationResult {
  const rand: Rand = mulberry32(seed + 55511);
  const establishmentBonus = establishmentScore(establishmentStance) * 0.05;

  // Independents are never a sure thing — some peel off during talks. A
  // favourable establishment relationship makes them noticeably easier to
  // hold; a hostile one means fewer of them will risk backing you.
  const independentsActuallyGained = Math.round(independentsAttempted * Math.max(0.1, Math.min(0.95, 0.45 + rand() * 0.4 + establishmentBonus)));
  const total = leaderSeats + acceptedPartners.reduce((s, p) => s + p.seats, 0) + independentsActuallyGained;

  if (leaderSeats >= NA_MAJORITY) {
    return { outcome: 'MAJORITY', total, independentsActuallyGained, successChance: 1, collapsed: false, narrative: 'An outright majority — no coalition arithmetic required.' };
  }

  const partnerSeatTotal = acceptedPartners.reduce((s, p) => s + p.seats, 0);
  const weightedReliability = partnerSeatTotal > 0
    ? acceptedPartners.reduce((s, p) => s + p.reliability * p.seats, 0) / partnerSeatTotal
    : 0.45;

  if (total >= NA_MAJORITY) {
    const successChance = Math.max(0.08, Math.min(0.95, weightedReliability * 1.05 - 0.05 + establishmentBonus));
    const collapsed = rand() > successChance;
    if (collapsed) {
      return {
        outcome: 'FAILED', total, independentsActuallyGained, successChance, collapsed: true,
        narrative: 'The numbers were there, but talks collapsed before the vote — a partner walked out over unmet demands.',
      };
    }
    return { outcome: 'COALITION', total, independentsActuallyGained, successChance, collapsed: false, narrative: 'The coalition holds together — for now.' };
  }

  if (total >= NA_MAJORITY - 12) {
    const successChance = Math.max(0.05, Math.min(0.6, weightedReliability * 0.7 + establishmentBonus));
    const collapsed = rand() > successChance;
    if (collapsed) {
      return {
        outcome: 'FAILED', total, independentsActuallyGained, successChance, collapsed: true,
        narrative: 'A minority government attempt failed to secure enough floor votes to be sworn in.',
      };
    }
    return { outcome: 'MINORITY', total, independentsActuallyGained, successChance, collapsed: false, narrative: 'A minority government, surviving vote to vote.' };
  }

  return {
    outcome: 'FAILED', total, independentsActuallyGained, successChance: 0, collapsed: true,
    narrative: 'Nowhere near enough seats. Government formation fails outright.',
  };
}
