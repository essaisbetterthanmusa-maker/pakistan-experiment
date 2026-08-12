import { create } from 'zustand';
import type { PartyId } from '../data/parties';
import type { ProvinceId } from '../data/provinces';
import { generateConstituencies, type Constituency } from '../data/constituencies';
import { PROVINCE_LIST } from '../data/provinces';
import type { LeaderOption } from '../data/leaders';
import { LEADERS_BY_PARTY } from '../data/leaders';
import type { CampaignState, ElectionResult, EstablishmentStance } from '../engine/types';
import { simulateElection } from '../engine/electionEngine';
import { allocateReservedSeats } from '../engine/reservedSeats';
import { analyzeCoalitionOptions, resolveGovernmentFormation, type CoalitionPartner, type GovernmentOutcome, type FormationResult } from '../engine/coalition';
import { simulateProvincialAssemblies, type ProvincialAssemblyResult } from '../engine/provincialEngine';
import { approximateSenateComposition } from '../engine/senate';
import { randomCandidateName } from '../data/constituencies';
import { mulberry32 } from '../engine/random';

export type GamePhase =
  | 'START' | 'PARTY_SELECT' | 'CAMPAIGN' | 'ELECTION_NIGHT' | 'RESULTS'
  | 'GOVERNMENT_FORMATION' | 'GOVERNING';

export interface GovernmentState {
  outcome: GovernmentOutcome;
  partners: CoalitionPartner[];
  totalSeats: number;
  termYear: number;
}

export interface Powerbroker {
  name: string;
  region: string;
  loyalty: number;
}

export interface GoverningMeters {
  publicApproval: number;
  partyUnity: number;
  oppositionStrength: number;
  economy: { inflation: number; gdpGrowth: number; reserves: number };
  establishment: EstablishmentStance;
  crisisLog: { year: number; text: string }[];
  powerbrokers: Powerbroker[];
}

interface GameState {
  phase: GamePhase;
  seed: number;
  playerParty: PartyId | null;
  leader: LeaderOption | null;
  seats: Constituency[];
  campaign: CampaignState;
  establishmentLean: PartyId | null;
  electionResult: ElectionResult | null;
  provincialAssemblies: Record<ProvinceId, ProvincialAssemblyResult> | null;
  senateByParty: Record<PartyId, number> | null;
  government: GovernmentState | null;
  meters: GoverningMeters;
  electionCycle: number;
  formationAttempts: number;
  lastFormationResult: FormationResult | null;

  startNewGame: () => void;
  choosePartyAndLeader: (party: PartyId, leader: LeaderOption) => void;
  updateCampaignSpend: (province: ProvinceId, amount: number) => void;
  updateMediaSpend: (amount: number) => void;
  toggleTargetSeat: (seatId: string) => void;
  recruitElectable: (seatId: string) => void;
  rejectElectable: (seatId: string) => void;
  finishCampaign: () => void;
  runElection: () => void;
  goToResults: () => void;
  goToGovernmentFormation: () => void;
  formGovernment: (accepted: CoalitionPartner[], independentsAttempted: number) => void;
  forceMinorityGovernment: () => void;
  advanceGoverning: (delta: Partial<GoverningMeters>) => void;
  logCrisis: (text: string) => void;
  callNextElection: () => void;
  forceFreshElection: () => void;
  courtEstablishment: () => { success: boolean; text: string };
}

const PROVINCE_IDS = PROVINCE_LIST.map(p => p.id);

function freshCampaign(): CampaignState {
  return {
    totalBudget: 100,
    spent: 0,
    provinceSpend: Object.fromEntries(PROVINCE_IDS.map(id => [id, 0])) as Record<ProvinceId, number>,
    targetedSeats: [],
    recruitedElectables: [],
    rejectedElectables: [],
    mediaSpend: 0,
  };
}

function freshPowerbrokers(party: PartyId | null, seed: number): Powerbroker[] {
  const rand = mulberry32(seed + 31337);
  const regions = ['Punjab', 'Sindh', 'KP', 'Balochistan'];
  const roles = ['Powerbroker', 'Organizer', 'Provincial President', 'Senior Vice President'];
  if (!party) return [];
  return regions.slice(0, 3).map(region => ({
    name: randomCandidateName(rand),
    region: `${region} ${roles[Math.floor(rand() * roles.length)]}`,
    loyalty: 55 + Math.floor(rand() * 30),
  }));
}

function freshMeters(party: PartyId | null, seed: number): GoverningMeters {
  return {
    publicApproval: 50,
    partyUnity: 70,
    oppositionStrength: 40,
    economy: { inflation: 22, gdpGrowth: 2.5, reserves: 8 },
    establishment: 'NEUTRAL',
    crisisLog: [],
    powerbrokers: freshPowerbrokers(party, seed),
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'START',
  seed: Date.now() % 1_000_000,
  playerParty: null,
  leader: null,
  seats: [],
  campaign: freshCampaign(),
  establishmentLean: null,
  electionResult: null,
  provincialAssemblies: null,
  senateByParty: null,
  government: null,
  meters: freshMeters(null, 0),
  electionCycle: 1,
  formationAttempts: 0,
  lastFormationResult: null,

  startNewGame: () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    set({
      seed,
      seats: generateConstituencies(seed),
      phase: 'PARTY_SELECT',
      playerParty: null,
      leader: null,
      campaign: freshCampaign(),
      electionResult: null,
      provincialAssemblies: null,
      senateByParty: null,
      government: null,
      meters: freshMeters(null, seed),
      electionCycle: 1,
      formationAttempts: 0,
      lastFormationResult: null,
      establishmentLean: Math.random() < 0.5 ? null : (['PMLN', 'PTI', 'PPP'] as PartyId[])[Math.floor(Math.random() * 3)],
    });
  },

  choosePartyAndLeader: (party, leader) => {
    set({ playerParty: party, leader, phase: 'CAMPAIGN', meters: freshMeters(party, get().seed) });
  },

  updateCampaignSpend: (province, amount) => {
    const { campaign } = get();
    const prev = campaign.provinceSpend[province] ?? 0;
    const delta = amount - prev;
    if (campaign.spent + delta > campaign.totalBudget || amount < 0) return;
    set({
      campaign: {
        ...campaign,
        provinceSpend: { ...campaign.provinceSpend, [province]: amount },
        spent: campaign.spent + delta,
      },
    });
  },

  updateMediaSpend: (amount) => {
    const { campaign } = get();
    const delta = amount - campaign.mediaSpend;
    if (campaign.spent + delta > campaign.totalBudget || amount < 0) return;
    set({ campaign: { ...campaign, mediaSpend: amount, spent: campaign.spent + delta } });
  },

  toggleTargetSeat: (seatId) => {
    const { campaign } = get();
    const has = campaign.targetedSeats.includes(seatId);
    if (!has && campaign.targetedSeats.length >= 12) return; // limited ground game capacity
    set({
      campaign: {
        ...campaign,
        targetedSeats: has ? campaign.targetedSeats.filter(s => s !== seatId) : [...campaign.targetedSeats, seatId],
      },
    });
  },

  recruitElectable: (seatId) => {
    const { campaign } = get();
    set({
      campaign: {
        ...campaign,
        recruitedElectables: [...new Set([...campaign.recruitedElectables, seatId])],
        rejectedElectables: campaign.rejectedElectables.filter(s => s !== seatId),
      },
    });
  },

  rejectElectable: (seatId) => {
    const { campaign } = get();
    set({
      campaign: {
        ...campaign,
        rejectedElectables: [...new Set([...campaign.rejectedElectables, seatId])],
        recruitedElectables: campaign.recruitedElectables.filter(s => s !== seatId),
      },
    });
  },

  finishCampaign: () => set({ phase: 'ELECTION_NIGHT' }),

  runElection: () => {
    const { seats, playerParty, campaign, establishmentLean, seed, electionCycle } = get();
    const raw = simulateElection(seats, playerParty, campaign, establishmentLean, seed + electionCycle * 7919);
    const result = allocateReservedSeats(raw);
    const provincialAssemblies = simulateProvincialAssemblies(seed + electionCycle * 7919, establishmentLean);
    const senateByParty = approximateSenateComposition(result.totalByParty, seed + electionCycle * 7919);
    set({ electionResult: result, provincialAssemblies, senateByParty });
  },

  goToResults: () => set({ phase: 'RESULTS' }),
  goToGovernmentFormation: () => set({ phase: 'GOVERNMENT_FORMATION' }),

  formGovernment: (accepted, independentsAttempted) => {
    const { electionResult, playerParty, seed, formationAttempts } = get();
    if (!electionResult || !playerParty) return;
    const leaderSeats = electionResult.totalByParty[playerParty] ?? 0;
    const result = resolveGovernmentFormation(leaderSeats, accepted, independentsAttempted, seed + formationAttempts * 131);

    if (result.outcome === 'FAILED') {
      set({
        lastFormationResult: result,
        formationAttempts: formationAttempts + 1,
        meters: { ...get().meters, establishment: get().meters.establishment === 'FAVOURED' ? 'WORKING' : get().meters.establishment },
      });
      return;
    }

    set({
      government: { outcome: result.outcome, partners: accepted, totalSeats: result.total, termYear: 0 },
      lastFormationResult: result,
      phase: 'GOVERNING',
      meters: {
        ...get().meters,
        oppositionStrength: result.outcome === 'MAJORITY' ? 35 : result.outcome === 'COALITION' ? 50 : 65,
        partyUnity: result.outcome === 'MINORITY' ? 55 : 70,
      },
    });
  },

  forceMinorityGovernment: () => {
    const { electionResult, playerParty } = get();
    if (!electionResult || !playerParty) return;
    const leaderSeats = electionResult.totalByParty[playerParty] ?? 0;
    set({
      government: { outcome: 'MINORITY', partners: [], totalSeats: leaderSeats, termYear: 0 },
      lastFormationResult: null,
      phase: 'GOVERNING',
      meters: { ...get().meters, oppositionStrength: 78, partyUnity: 45, publicApproval: Math.max(20, get().meters.publicApproval - 10) },
    });
  },

  advanceGoverning: (delta) => {
    set(state => ({ meters: { ...state.meters, ...delta } }));
  },

  courtEstablishment: () => {
    const order: EstablishmentStance[] = ['HOSTILE', 'COLD', 'NEUTRAL', 'WORKING', 'FAVOURED'];
    const { meters } = get();
    const idx = order.indexOf(meters.establishment);
    const success = Math.random() < 0.6;
    if (success && idx < order.length - 1) {
      const next = order[idx + 1];
      set({ meters: { ...meters, establishment: next } });
      return { success: true, text: `Backchannel contacts pay off. The relationship moves to ${next}.` };
    }
    set({ meters: { ...meters, publicApproval: Math.max(0, meters.publicApproval - 4), oppositionStrength: Math.min(100, meters.oppositionStrength + 3) } });
    return { success: false, text: 'The overture goes nowhere — and word of it leaks, costing you some public standing.' };
  },

  logCrisis: (text) => {
    set(state => ({
      meters: { ...state.meters, crisisLog: [{ year: state.electionCycle, text }, ...state.meters.crisisLog].slice(0, 20) },
    }));
  },

  callNextElection: () => {
    const { seed, electionCycle } = get();
    const newCycle = electionCycle + 1;
    set({
      seats: generateConstituencies(seed + newCycle * 104729),
      campaign: freshCampaign(),
      electionResult: null,
      provincialAssemblies: null,
      senateByParty: null,
      government: null,
      phase: 'CAMPAIGN',
      electionCycle: newCycle,
      formationAttempts: 0,
      lastFormationResult: null,
    });
  },

  forceFreshElection: () => {
    const { seed, electionCycle, meters } = get();
    const newCycle = electionCycle + 1;
    set({
      seats: generateConstituencies(seed + newCycle * 104729),
      campaign: freshCampaign(),
      electionResult: null,
      provincialAssemblies: null,
      senateByParty: null,
      government: null,
      phase: 'CAMPAIGN',
      electionCycle: newCycle,
      formationAttempts: 0,
      lastFormationResult: null,
      meters: { ...meters, oppositionStrength: Math.min(100, meters.oppositionStrength + 15) },
    });
  },
}));

export function coalitionAnalysisForCurrent() {
  const { electionResult, playerParty, seed } = useGameStore.getState();
  if (!electionResult || !playerParty) return null;
  return analyzeCoalitionOptions(electionResult.totalByParty, playerParty, seed);
}

export { LEADERS_BY_PARTY };
