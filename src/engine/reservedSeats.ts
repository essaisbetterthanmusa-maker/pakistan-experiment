import type { PartyId } from '../data/parties';
import { PARTIES } from '../data/parties';
import { WOMEN_RESERVED_SEATS, MINORITY_RESERVED_SEATS } from '../data/provinces';
import type { ElectionResult } from './types';

const ALL_PARTY_IDS = Object.keys(PARTIES) as PartyId[];

/**
 * Reserved seats (women + non-Muslim) are allocated to parties in proportion
 * to the general seats they won, using the largest-remainder method — the
 * same broad approach used under the Elections Act. Parties with zero general
 * seats get no reserved seats (mirrors the real rule that a party must win at
 * least one general seat, in practice via a party list, to qualify).
 */
export function largestRemainder(byParty: Record<PartyId, number>, totalSeats: number): Record<PartyId, number> {
  const qualifying = ALL_PARTY_IDS.filter(id => byParty[id] > 0 && id !== 'IND');
  const totalGeneral = qualifying.reduce((s, id) => s + byParty[id], 0);
  const out: Record<PartyId, number> = Object.fromEntries(ALL_PARTY_IDS.map(id => [id, 0])) as any;
  if (totalGeneral === 0) return out;

  const shares = qualifying.map(id => {
    const exact = (byParty[id] / totalGeneral) * totalSeats;
    return { id, exact, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let allocated = shares.reduce((s, x) => s + x.floor, 0);
  shares.forEach(x => (out[x.id] = x.floor));
  let remaining = totalSeats - allocated;
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder);
  let i = 0;
  while (remaining > 0 && byRemainder.length > 0) {
    out[byRemainder[i % byRemainder.length].id]++;
    remaining--;
    i++;
  }
  return out;
}

export function allocateReservedSeats(result: ElectionResult): ElectionResult {
  return allocateReservedSeatsGeneric(result, WOMEN_RESERVED_SEATS, MINORITY_RESERVED_SEATS);
}

export function allocateReservedSeatsGeneric(result: ElectionResult, womenSeats: number, minoritySeats: number): ElectionResult {
  const women = largestRemainder(result.generalSeatsByParty, womenSeats);
  const minority = largestRemainder(result.generalSeatsByParty, minoritySeats);
  const total: Record<PartyId, number> = Object.fromEntries(
    ALL_PARTY_IDS.map(id => [id, (result.generalSeatsByParty[id] ?? 0) + (women[id] ?? 0) + (minority[id] ?? 0)])
  ) as any;
  return { ...result, womenReservedByParty: women, minorityReservedByParty: minority, totalByParty: total };
}
