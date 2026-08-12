import type { PartyId } from '../data/parties';
import { PROVINCE_LIST, type ProvinceId } from '../data/provinces';
import { generateProvincialAssemblySeats, randomCandidateName, type Constituency } from '../data/constituencies';
import { simulateElection } from './electionEngine';
import { allocateReservedSeatsGeneric } from './reservedSeats';
import type { ElectionResult } from './types';
import { mulberry32 } from './random';

export interface ProvincialAssemblyResult {
  province: ProvinceId;
  seats: Constituency[];
  result: ElectionResult;
  totalSeats: number;
  majority: number;
  leadingParty: PartyId | null;
  hasMajorityAlone: boolean;
  coalition: { party: PartyId; seats: number }[];
  coalitionSeats: number;
  hung: boolean;
  cmName: string | null;
  cmParty: PartyId | null;
  cmApproval: number;
}

/**
 * Simulates all four provincial assemblies (Islamabad has none) seat-by-seat,
 * then auto-resolves government formation the way real post-2018 Pakistani
 * provincial politics usually goes: the largest party tries to govern alone,
 * and if short, pulls in the next-largest parties until it clears a majority
 * or the assembly is left hung.
 */
export function simulateProvincialAssemblies(seed: number, establishmentLean: PartyId | null): Record<ProvinceId, ProvincialAssemblyResult> {
  const out: Record<ProvinceId, ProvincialAssemblyResult> = {} as any;
  const allSeats = generateProvincialAssemblySeats(seed);

  for (const prov of PROVINCE_LIST) {
    if (prov.paSeats === 0) continue; // Islamabad has no provincial assembly
    const seats = allSeats[prov.id];
    const raw = simulateElection(seats, null, null, establishmentLean, seed + hashString(prov.id) * 104729);
    const result = allocateReservedSeatsGeneric(raw, prov.paWomenSeats, prov.paMinoritySeats);

    const totalSeats = prov.paSeats + prov.paWomenSeats + prov.paMinoritySeats;
    const majority = Math.floor(totalSeats / 2) + 1;

    const ranked = (Object.keys(result.totalByParty) as PartyId[])
      .filter(id => result.totalByParty[id] > 0 && id !== 'IND')
      .sort((a, b) => result.totalByParty[b] - result.totalByParty[a]);

    const leadingParty = ranked[0] ?? null;
    const leadingSeats = leadingParty ? result.totalByParty[leadingParty] : 0;
    const hasMajorityAlone = leadingSeats >= majority;

    const coalition: { party: PartyId; seats: number }[] = [];
    let coalitionSeats = leadingSeats;
    if (!hasMajorityAlone && leadingParty) {
      for (const id of ranked.slice(1)) {
        if (coalitionSeats >= majority) break;
        coalition.push({ party: id, seats: result.totalByParty[id] });
        coalitionSeats += result.totalByParty[id];
      }
    }
    const hung = leadingParty === null || coalitionSeats < majority;

    const rand = mulberry32(seed + hashString(prov.id) * 65537 + 7);
    const cmName = leadingParty && !hung ? randomCandidateName(rand) : null;

    out[prov.id] = {
      province: prov.id,
      seats,
      result,
      totalSeats,
      majority,
      leadingParty,
      hasMajorityAlone,
      coalition,
      coalitionSeats,
      hung,
      cmName,
      cmParty: hung ? null : leadingParty,
      cmApproval: 40 + Math.floor(rand() * 30),
    };
  }
  return out;
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
