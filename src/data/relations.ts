import type { PartyId } from './parties';

export type Relation = 'ALLY' | 'PRAGMATIC' | 'UNEASY' | 'HOSTILE';

/**
 * Rough political compatibility between parties, grounded in real recent
 * alignments. PTI treats both PML-N and PPP as the same "old guard" bloc and
 * refuses to sit with either. PML-N and PPP are old rivals themselves
 * (decades of alternating governments and corruption accusations) but have
 * shown they'll grudgingly coalesce against a common threat (PDM 2022-23) —
 * that's an uneasy, not natural, alliance. This is a simulation abstraction,
 * not a claim about real party positions today.
 */
const HOSTILE_PAIRS: [PartyId, PartyId][] = [
  ['PMLN', 'PTI'],
  ['PPP', 'PTI'],
  ['PTI', 'JUIF'],
  ['PTI', 'ANP'],
  ['PTI', 'IPP'],
  ['PPP', 'GDA'],
];

const ALLY_PAIRS: [PartyId, PartyId][] = [
  ['PMLN', 'IPP'],
  ['PMLN', 'MQMP'],
  ['PMLN', 'BAP'],
  ['PPP', 'JUIF'],
  ['PPP', 'MQMP'],
  ['PPP', 'BAP'],
  ['JUIF', 'JI'],
];

const UNEASY_PAIRS: [PartyId, PartyId][] = [
  ['PMLN', 'PPP'],
  ['PMLN', 'JUIF'],
  ['MQMP', 'JUIF'],
];

function pairKey(a: PartyId, b: PartyId) {
  return [a, b].sort().join('|');
}

const HOSTILE_SET = new Set(HOSTILE_PAIRS.map(([a, b]) => pairKey(a, b)));
const ALLY_SET = new Set(ALLY_PAIRS.map(([a, b]) => pairKey(a, b)));
const UNEASY_SET = new Set(UNEASY_PAIRS.map(([a, b]) => pairKey(a, b)));

export function getRelation(a: PartyId, b: PartyId): Relation {
  if (a === b) return 'ALLY';
  const key = pairKey(a, b);
  if (HOSTILE_SET.has(key)) return 'HOSTILE';
  if (ALLY_SET.has(key)) return 'ALLY';
  if (UNEASY_SET.has(key)) return 'UNEASY';
  // Establishment-aligned "king's parties" and small regional outfits are
  // pragmatic with almost anyone holding the centre.
  if (['IND', 'BAP', 'PKMAP', 'IPP', 'OTH'].includes(a) || ['IND', 'BAP', 'PKMAP', 'IPP', 'OTH'].includes(b)) return 'PRAGMATIC';
  return 'PRAGMATIC';
}

export const RELATION_LABEL: Record<Relation, string> = {
  ALLY: 'Natural ally',
  PRAGMATIC: 'Pragmatic — will deal',
  UNEASY: 'Uneasy — needs convincing',
  HOSTILE: 'Bitter rivals — will refuse',
};

export const RELATION_RELIABILITY_RANGE: Record<Relation, [number, number]> = {
  ALLY: [0.68, 0.95],
  PRAGMATIC: [0.5, 0.78],
  UNEASY: [0.32, 0.55],
  HOSTILE: [0, 0.15],
};
