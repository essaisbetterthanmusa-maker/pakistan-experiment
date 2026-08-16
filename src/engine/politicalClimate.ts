import type { PartyId } from '../data/parties';
import { PARTIES } from '../data/parties';
import type { ProvinceId } from '../data/provinces';
import { PROVINCE_LIST } from '../data/provinces';
import { mulberry32, randRange, pick, type Rand } from './random';

const ALL_PARTY_IDS = Object.keys(PARTIES) as PartyId[];

export interface ClimateEvent {
  id: string;
  headline: string;
  detail: string;
}

export interface PoliticalClimate {
  events: ClimateEvent[];
  /** multiplier on each party's baseline strength this cycle (0.4 – 1.7) */
  momentum: Record<PartyId, number>;
  /** additional per-province multiplier layered on top of national momentum */
  regional: Record<ProvinceId, Record<PartyId, number>>;
  /** a party whose candidates are being squeezed — they bleed strength to independents */
  suppressedParty: PartyId | null;
  /** where the electables are migrating this cycle; they follow power */
  electableMagnet: PartyId | null;
  turnoutShift: number;
}

function baseMomentum(): Record<PartyId, number> {
  return Object.fromEntries(ALL_PARTY_IDS.map(id => [id, 1])) as Record<PartyId, number>;
}

function baseRegional(): Record<ProvinceId, Record<PartyId, number>> {
  const out = {} as Record<ProvinceId, Record<PartyId, number>>;
  for (const p of PROVINCE_LIST) out[p.id] = baseMomentum();
  return out;
}

const MAJORS: PartyId[] = ['PMLN', 'PTI', 'PPP'];
const RELIGIOUS: PartyId[] = ['JUIF', 'JI', 'TLP'];
const REGIONALS: PartyId[] = ['ANP', 'BAP', 'PKMAP', 'BNPM', 'GDA', 'MQMP'];

/**
 * Builds the political weather for a single election cycle.
 *
 * Without this, every election reruns the same fixed party-strength map and
 * Punjab/Sindh/KP fall the same way every time. Real Pakistani election cycles
 * turn on things like anti-incumbency, a crackdown pushing a party's
 * candidates onto independent symbols, electables migrating en masse to
 * whoever looks like winning, sympathy waves around a jailed leader, and
 * economic collapse gutting whoever happens to be governing. Each cycle draws
 * 2–3 of these, and they move party strength far enough to genuinely flip
 * provinces rather than nudge margins.
 */
export function generateClimate(
  seed: number,
  opts: {
    incumbentParty?: PartyId | null;
    incumbentApproval?: number;
    inflation?: number;
    establishmentLean?: PartyId | null;
  } = {},
): PoliticalClimate {
  const rand: Rand = mulberry32(seed * 7717 + 13);
  const momentum = baseMomentum();
  const regional = baseRegional();
  const events: ClimateEvent[] = [];
  let suppressedParty: PartyId | null = null;
  let electableMagnet: PartyId | null = null;
  let turnoutShift = randRange(rand, -0.05, 0.05);

  const { incumbentParty = null, incumbentApproval = 50, inflation = 22, establishmentLean = null } = opts;

  // --- Every cycle: baseline volatility so no two elections start identical.
  for (const id of ALL_PARTY_IDS) {
    momentum[id] *= randRange(rand, 0.78, 1.24);
    for (const p of PROVINCE_LIST) regional[p.id][id] *= randRange(rand, 0.82, 1.2);
  }

  // --- Anti-incumbency: Pakistani governments rarely get rewarded for a term.
  if (incumbentParty) {
    const approvalGap = (50 - incumbentApproval) / 100; // positive when unpopular
    const penalty = Math.max(0.45, Math.min(1.1, 0.92 - approvalGap * 0.9));
    momentum[incumbentParty] *= penalty;
    events.push({
      id: 'incumbency',
      headline: incumbentApproval < 40
        ? `Voters turn on the ${PARTIES[incumbentParty].short} government`
        : `The ${PARTIES[incumbentParty].short} government faces the usual anti-incumbency drag`,
      detail: incumbentApproval < 40
        ? 'A term of unpopular decisions has left the governing party badly exposed.'
        : 'No Pakistani government gets an easy second mandate.',
    });
    // Opposition majors soak up the anger.
    for (const id of MAJORS) if (id !== incumbentParty) momentum[id] *= randRange(rand, 1.05, 1.3);
  }

  // --- Economy: high inflation punishes whoever is holding the ledger.
  if (inflation > 25 && incumbentParty) {
    momentum[incumbentParty] *= randRange(rand, 0.7, 0.88);
    for (const id of RELIGIOUS) momentum[id] *= randRange(rand, 1.1, 1.45);
    events.push({
      id: 'economy',
      headline: 'Cost-of-living anger dominates the campaign',
      detail: 'Inflation is the only issue on the doorstep, and protest votes are drifting to the religious right.',
    });
  }

  // --- Draw 2–3 structural storylines for the cycle.
  const pool = ['crackdown', 'sympathy', 'youth', 'religious', 'nationalist', 'electables', 'dynasty', 'split'];
  const drawn = shuffle(pool, rand).slice(0, 2 + Math.floor(rand() * 2));

  for (const storyline of drawn) {
    switch (storyline) {
      case 'crackdown': {
        // A party gets squeezed: symbol trouble, candidates pushed to
        // independents. The establishment squeezes the party it likes least,
        // never its own preferred vehicle.
        const eligible = MAJORS
          .filter(m => m !== establishmentLean)
          .sort((a, b) => PARTIES[a].establishmentAffinity - PARTIES[b].establishmentAffinity);
        const target = rand() < 0.7 ? eligible[0] : pick(rand, eligible);
        suppressedParty = target;
        momentum[target] *= randRange(rand, 0.45, 0.7);
        momentum.IND *= randRange(rand, 1.6, 2.4);
        events.push({
          id: 'crackdown',
          headline: `${PARTIES[target].short} candidates forced onto independent symbols`,
          detail: 'A pre-election squeeze scatters the party\'s vote across independents — its supporters still turn out, but the seat tally suffers.',
        });
        break;
      }
      case 'sympathy': {
        const target = pick(rand, MAJORS);
        momentum[target] *= randRange(rand, 1.25, 1.6);
        events.push({
          id: 'sympathy',
          headline: `A sympathy wave builds behind ${PARTIES[target].short}`,
          detail: 'Legal cases and arrests against the leadership have energised the base rather than deterring it.',
        });
        break;
      }
      case 'youth': {
        momentum.PTI *= randRange(rand, 1.15, 1.5);
        for (const p of PROVINCE_LIST) if (p.urbanDistricts.length > 0) regional[p.id].PTI *= randRange(rand, 1.05, 1.25);
        events.push({
          id: 'youth',
          headline: 'Record youth registration reshapes urban seats',
          detail: 'First-time voters are breaking heavily for the populist option in the cities.',
        });
        break;
      }
      case 'religious': {
        for (const id of RELIGIOUS) momentum[id] *= randRange(rand, 1.3, 1.8);
        // Religious surge splits the right-of-centre vote in Punjab.
        regional.Punjab.PMLN *= randRange(rand, 0.85, 0.96);
        events.push({
          id: 'religious',
          headline: 'Religious parties consolidate their vote',
          detail: 'A unified religious platform is pulling enough votes in Punjab to change who wins the close seats.',
        });
        break;
      }
      case 'nationalist': {
        for (const id of REGIONALS) momentum[id] *= randRange(rand, 1.25, 1.7);
        regional.Balochistan.IND *= randRange(rand, 1.1, 1.4);
        events.push({
          id: 'nationalist',
          headline: 'Nationalist sentiment surges in the periphery',
          detail: 'Provincial rights and resource grievances are dominating Balochistan and the Pashtun belt.',
        });
        break;
      }
      case 'electables': {
        // Electables follow power — they gravitate to whoever the
        // establishment is behind, and to establishment-friendly vehicles.
        const magnet = establishmentLean
          ?? [...MAJORS].sort((a, b) => PARTIES[b].establishmentAffinity - PARTIES[a].establishmentAffinity)[0];
        electableMagnet = magnet;
        momentum[magnet] *= randRange(rand, 1.2, 1.5);
        for (const id of MAJORS) if (id !== magnet) momentum[id] *= randRange(rand, 0.82, 0.95);
        events.push({
          id: 'electables',
          headline: `Electables migrate en masse to ${PARTIES[magnet].short}`,
          detail: 'Local powerbrokers have read the wind and switched tickets. Their vote banks are going with them.',
        });
        break;
      }
      case 'dynasty': {
        momentum.PMLN *= randRange(rand, 0.8, 0.95);
        momentum.PPP *= randRange(rand, 0.8, 0.95);
        momentum.IND *= randRange(rand, 1.15, 1.4);
        events.push({
          id: 'dynasty',
          headline: 'Dynastic fatigue sets in',
          detail: 'Voters are visibly tired of the same two family names on the ballot.',
        });
        break;
      }
      case 'split': {
        const victim = pick(rand, MAJORS);
        momentum[victim] *= randRange(rand, 0.72, 0.9);
        momentum.IPP *= randRange(rand, 1.4, 2.0);
        events.push({
          id: 'split',
          headline: `A faction breaks away from ${PARTIES[victim].short}`,
          detail: 'Defectors have taken a bloc of constituencies and their organisation with them.',
        });
        break;
      }
    }
  }

  // --- Establishment-friendly vehicles (MQM-P, BAP, IPP, GDA) do best in
  // cycles where the establishment is actively steering the outcome; parties
  // it is hostile toward pay a corresponding price.
  if (establishmentLean || suppressedParty) {
    for (const id of ALL_PARTY_IDS) {
      const aff = PARTIES[id].establishmentAffinity;
      if (aff !== 0) momentum[id] *= 1 + aff * randRange(rand, 0.04, 0.11);
    }
  }

  // --- Turnout: a heated cycle brings more people out.
  if (events.length >= 3) turnoutShift += randRange(rand, 0.02, 0.07);

  // Clamp so nothing goes absurd. First-past-the-post massively amplifies
  // even small vote-share gaps into seat gaps, so the usable band here is much
  // narrower than it looks — beyond roughly ±45% a party stops merely winning
  // and starts sweeping every seat in a province, which never happens in
  // reality even in landslide years.
  for (const id of ALL_PARTY_IDS) {
    momentum[id] = Math.max(0.62, Math.min(1.55, momentum[id]));
    for (const p of PROVINCE_LIST) regional[p.id][id] = Math.max(0.68, Math.min(1.42, regional[p.id][id]));
  }

  return { events, momentum, regional, suppressedParty, electableMagnet, turnoutShift };
}

function shuffle<T>(arr: T[], rand: Rand): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
