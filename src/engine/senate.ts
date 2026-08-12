import type { PartyId } from '../data/parties';
import { largestRemainder } from './reservedSeats';

export const SENATE_SEATS = 100;
export const SENATE_MAJORITY = Math.floor(SENATE_SEATS / 2) + 1;

/**
 * The real Senate is elected indirectly by provincial assemblies in staggered
 * thirds over years, so it never simply mirrors the National Assembly. We
 * approximate that lag: composition leans on NA strength but is damped and
 * given its own noise, so an NA majority is never a guaranteed Senate majority.
 */
export function approximateSenateComposition(naTotalByParty: Record<PartyId, number>, seed: number): Record<PartyId, number> {
  const damped: Record<PartyId, number> = {} as any;
  const rand = mulberrySeed(seed);
  for (const id of Object.keys(naTotalByParty) as PartyId[]) {
    const base = naTotalByParty[id];
    damped[id] = Math.max(0, Math.round(base * (0.6 + rand() * 0.5)));
  }
  return largestRemainder(damped, SENATE_SEATS);
}

function mulberrySeed(seed: number) {
  let a = (seed + 424242) >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
