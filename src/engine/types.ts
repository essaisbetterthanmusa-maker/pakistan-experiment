import type { PartyId } from '../data/parties';
import type { ProvinceId } from '../data/provinces';
import type { Constituency, CandidateSlate } from '../data/constituencies';

export type EstablishmentStance = 'HOSTILE' | 'COLD' | 'NEUTRAL' | 'WORKING' | 'FAVOURED';

/** -2 (HOSTILE) to +2 (FAVOURED) — how much weight the relationship carries
 * in coalition reliability, independents' willingness to commit, and a
 * government's odds of surviving a no-confidence vote. */
export function establishmentScore(stance: EstablishmentStance): number {
  return { HOSTILE: -2, COLD: -1, NEUTRAL: 0, WORKING: 1, FAVOURED: 2 }[stance];
}

export interface CampaignState {
  totalBudget: number; // Rs millions
  spent: number;
  provinceSpend: Record<ProvinceId, number>; // Rs millions allocated per province
  targetedSeats: string[]; // seat ids given extra ground-game attention (capped)
  recruitedElectables: string[]; // seat ids where player flipped the local electable to their party
  rejectedElectables: string[]; // seat ids where player refused an approaching electable (they'll run IND and split the vote)
  mediaSpend: number; // national media/TV/digital push
}

export interface SeatResultLine {
  party: PartyId;
  candidateName: string;
  votes: number;
  isElectable: boolean;
  incumbent: boolean;
}

export interface SeatResult {
  seat: Constituency;
  lines: SeatResultLine[]; // sorted desc by votes
  winner: SeatResultLine;
  margin: number;
  turnoutPct: number;
  reportTimeMinutes: number; // minutes after 12:00 PM polls-close baseline, for election-night pacing
  upset: boolean; // winner was not the pre-election favoredParty
}

export interface ElectionResult {
  seatResults: SeatResult[];
  generalSeatsByParty: Record<PartyId, number>;
  womenReservedByParty: Record<PartyId, number>;
  minorityReservedByParty: Record<PartyId, number>;
  totalByParty: Record<PartyId, number>;
  provinceGeneralByParty: Record<ProvinceId, Record<PartyId, number>>;
  nationalSwing: Record<PartyId, number>;
  provincialSwing: Record<ProvinceId, Record<PartyId, number>>;
}

/** Lets a second election (provincial assembly) draw on the same underlying
 * political mood as the National Assembly race that ran alongside it,
 * instead of rolling a fully independent, uncorrelated result. */
export interface SharedSwing {
  national: Record<PartyId, number>;
  provincial: Record<ProvinceId, Record<PartyId, number>>;
}

export type { CandidateSlate };
