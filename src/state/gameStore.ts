import { create } from 'zustand';
import { PARTIES, type PartyId } from '../data/parties';
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
import { generateClimate, type PoliticalClimate } from '../engine/politicalClimate';

export type GamePhase =
  | 'START' | 'PARTY_SELECT' | 'CAMPAIGN' | 'ELECTION_NIGHT' | 'RESULTS'
  | 'GOVERNMENT_FORMATION' | 'GOVERNING' | 'OPPOSITION';

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

/** Player-initiated actions available while in government, each with a real
 * cost — you can't take every one in a term. */
export interface GoverningAction {
  id: string;
  label: string;
  detail: string;
  apply: (m: GoverningMeters) => Partial<GoverningMeters>;
}

/** Player-initiated actions available while in opposition, building toward
 * either toppling the government or winning the next election. */
export interface OppositionAction {
  id: string;
  label: string;
  detail: string;
}

export interface OppositionState {
  governingParty: PartyId;
  momentum: number;      // 0-100, your opposition movement's strength
  govStability: number;  // 0-100, how secure the sitting government is
  log: string[];
  actionsTaken: number;
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
  termActionsUsed: number;
  opposition: OppositionState | null;
  climate: PoliticalClimate | null;

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
  takeGoverningAction: (action: GoverningAction) => void;
  fallToOpposition: (reason: string) => void;
  takeOppositionAction: (action: OppositionAction) => { text: string; toppled: boolean };
}

const PROVINCE_IDS = PROVINCE_LIST.map(p => p.id);

/**
 * The establishment's starting lean, if any. PML-N has historically been read
 * as the establishment's default pick going into an election, PPP occasionally
 * gets a working arrangement, and PTI's relationship has been openly hostile
 * since 2022 — so PTI is a rare outlier here rather than an equal roll.
 */
function pickEstablishmentLean(): PartyId | null {
  if (Math.random() < 0.4) return null;
  // Weighted by each party's establishment affinity — a party the
  // establishment has been actively squeezing is very unlikely to be its pick.
  const candidates: PartyId[] = ['PMLN', 'PPP', 'PTI'];
  const weights = candidates.map(id => Math.max(0.05, PARTIES[id].establishmentAffinity + 2.2));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return 'PMLN';
}

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
  termActionsUsed: 0,
  opposition: null,
  climate: null,

  startNewGame: () => {
    const seed = Math.floor(Math.random() * 1_000_000);
    const establishmentLean = pickEstablishmentLean();
    const climate = generateClimate(seed, { establishmentLean });
    set({
      seed,
      climate,
      seats: generateConstituencies(seed, climate),
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
      termActionsUsed: 0,
      opposition: null,
      establishmentLean,
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
    const { seats, playerParty, campaign, establishmentLean, seed, electionCycle, climate } = get();
    const raw = simulateElection(seats, playerParty, campaign, establishmentLean, seed + electionCycle * 7919);
    const result = allocateReservedSeats(raw);
    // Provincial assemblies vote the same day as the National Assembly, so they
    // ride the same underlying swing — a party's NA landslide in a province
    // should show up in that province's assembly result too.
    const provincialAssemblies = simulateProvincialAssemblies(seed + electionCycle * 7919, establishmentLean, {
      national: raw.nationalSwing,
      provincial: raw.provincialSwing,
    }, climate ?? undefined, playerParty, campaign);
    const senateByParty = approximateSenateComposition(result.totalByParty, seed + electionCycle * 7919);
    set({ electionResult: result, provincialAssemblies, senateByParty });
  },

  goToResults: () => set({ phase: 'RESULTS' }),
  goToGovernmentFormation: () => set({ phase: 'GOVERNMENT_FORMATION' }),

  formGovernment: (accepted, independentsAttempted) => {
    const { electionResult, playerParty, seed, formationAttempts, meters } = get();
    if (!electionResult || !playerParty) return;
    const leaderSeats = electionResult.totalByParty[playerParty] ?? 0;
    const result = resolveGovernmentFormation(leaderSeats, accepted, independentsAttempted, seed + formationAttempts * 131, meters.establishment);

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

  takeGoverningAction: (action) => {
    const { meters, termActionsUsed } = get();
    const delta = action.apply(meters);
    set({
      meters: { ...meters, ...delta },
      termActionsUsed: termActionsUsed + 1,
    });
    get().logCrisis(`Policy: ${action.label} — ${action.detail}`);
  },

  fallToOpposition: (reason) => {
    const { electionResult, playerParty, meters } = get();
    if (!electionResult || !playerParty) return;
    // Whoever placed highest other than the player takes over.
    const rival = (Object.keys(electionResult.totalByParty) as PartyId[])
      .filter(id => id !== playerParty && id !== 'IND' && id !== 'OTH' && electionResult.totalByParty[id] > 0)
      .sort((a, b) => electionResult.totalByParty[b] - electionResult.totalByParty[a])[0] ?? 'PMLN';
    set({
      phase: 'OPPOSITION',
      government: null,
      opposition: {
        governingParty: rival,
        momentum: Math.max(20, Math.min(70, meters.publicApproval * 0.6 + 15)),
        govStability: 65,
        log: [reason],
        actionsTaken: 0,
      },
    });
  },

  takeOppositionAction: (action) => {
    const { opposition, meters } = get();
    if (!opposition) return { text: '', toppled: false };

    let momentumDelta = 0;
    let stabilityDelta = 0;
    let text = '';
    const roll = Math.random();

    switch (action.id) {
      case 'protest':
        momentumDelta = 6 + roll * 10;
        stabilityDelta = -(4 + roll * 8);
        text = roll > 0.7
          ? 'The long march draws huge crowds — the government looks rattled.'
          : 'The protest fills streets in your strongholds, little movement elsewhere.';
        break;
      case 'defectors':
        if (roll > 0.55) {
          momentumDelta = 10;
          stabilityDelta = -14;
          text = 'Several government backbenchers quietly signal they are ready to cross the floor.';
        } else {
          momentumDelta = -3;
          stabilityDelta = 3;
          text = 'Your approach leaks. The government whips its members back into line and paints you as a schemer.';
        }
        break;
      case 'noconfidence': {
        const chance = (opposition.momentum - opposition.govStability + 40) / 100;
        if (roll < chance) {
          set({
            opposition: { ...opposition, log: ['The no-confidence motion succeeds — the government has fallen.', ...opposition.log], actionsTaken: opposition.actionsTaken + 1 },
          });
          return { text: 'The no-confidence motion SUCCEEDS. The government falls and you are invited to form one.', toppled: true };
        }
        momentumDelta = -10;
        stabilityDelta = 6;
        text = 'The motion fails on the floor. The government survives and your numbers look weaker for having tried.';
        break;
      }
      case 'media':
        momentumDelta = 4 + roll * 7;
        stabilityDelta = -(2 + roll * 5);
        text = 'Your media campaign lands — the government spends the week on the defensive.';
        break;
      case 'alliance':
        momentumDelta = 8 + roll * 6;
        stabilityDelta = -(3 + roll * 6);
        text = 'You bring another opposition party into a joint platform. The bloc looks more credible.';
        break;
      case 'courts':
        if (roll > 0.5) {
          momentumDelta = 9;
          stabilityDelta = -10;
          text = 'The courts admit your petition. The government faces a genuine legal problem.';
        } else {
          momentumDelta = -4;
          stabilityDelta = 4;
          text = 'The petition is dismissed. The government calls it vindication.';
        }
        break;
    }

    const next: OppositionState = {
      ...opposition,
      momentum: Math.max(0, Math.min(100, opposition.momentum + momentumDelta)),
      govStability: Math.max(0, Math.min(100, opposition.govStability + stabilityDelta)),
      log: [text, ...opposition.log].slice(0, 20),
      actionsTaken: opposition.actionsTaken + 1,
    };
    set({
      opposition: next,
      meters: { ...meters, oppositionStrength: next.momentum },
    });
    return { text, toppled: false };
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
    const { seed, electionCycle, playerParty, meters, government, establishmentLean } = get();
    const newCycle = electionCycle + 1;
    // The next cycle's weather is shaped by how this term actually went.
    const climate = generateClimate(seed + newCycle * 104729, {
      incumbentParty: government ? playerParty : null,
      incumbentApproval: meters.publicApproval,
      inflation: meters.economy.inflation,
      establishmentLean,
    });
    set({
      climate,
      seats: generateConstituencies(seed + newCycle * 104729, climate),
      campaign: freshCampaign(),
      electionResult: null,
      provincialAssemblies: null,
      senateByParty: null,
      government: null,
      phase: 'CAMPAIGN',
      electionCycle: newCycle,
      formationAttempts: 0,
      lastFormationResult: null,
      termActionsUsed: 0,
      opposition: null,
    });
  },

  forceFreshElection: () => {
    const { seed, electionCycle, meters, playerParty, government, establishmentLean } = get();
    const newCycle = electionCycle + 1;
    const climate = generateClimate(seed + newCycle * 104729, {
      incumbentParty: government ? playerParty : null,
      incumbentApproval: meters.publicApproval,
      inflation: meters.economy.inflation,
      establishmentLean,
    });
    set({
      climate,
      seats: generateConstituencies(seed + newCycle * 104729, climate),
      campaign: freshCampaign(),
      electionResult: null,
      provincialAssemblies: null,
      senateByParty: null,
      government: null,
      phase: 'CAMPAIGN',
      electionCycle: newCycle,
      formationAttempts: 0,
      lastFormationResult: null,
      termActionsUsed: 0,
      opposition: null,
      meters: { ...meters, oppositionStrength: Math.min(100, meters.oppositionStrength + 15) },
    });
  },
}));

export function coalitionAnalysisForCurrent() {
  const { electionResult, playerParty, seed, meters } = useGameStore.getState();
  if (!electionResult || !playerParty) return null;
  return analyzeCoalitionOptions(electionResult.totalByParty, playerParty, seed, meters.establishment);
}

export { LEADERS_BY_PARTY };
