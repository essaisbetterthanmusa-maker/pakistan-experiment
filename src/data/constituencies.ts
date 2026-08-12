import { PARTIES, type PartyId } from './parties';
import type { ProvinceId, ProvinceMeta } from './provinces';
import { PROVINCE_LIST, PROVINCES } from './provinces';
import { mulberry32, randRange, randInt, pick, gaussNoise, type Rand } from '../engine/random';

export interface CandidateSlate {
  party: PartyId;
  /** 0-100 baseline party vote strength in this seat before campaign/swing */
  baseline: number;
  /** 0-10, local electable network / family influence / incumbency */
  candidateStrength: number;
  candidateName: string;
  incumbent: boolean;
  isElectable: boolean; // strong local network, demands attention in campaign phase
}

export type SeatCategory = 'stronghold' | 'competitive' | 'swing' | 'fragmented';

export interface Constituency {
  id: string; // NA-1 .. NA-266, or PA-1.. for provincial assemblies
  name: string; // "NA-118 Lahore-XII"
  province: ProvinceId;
  district: string;
  urban: boolean;
  category: SeatCategory;
  turnoutBase: number; // 0.30 - 0.60
  swingSensitivity: number; // 0.6 - 1.5, how much national/provincial swing moves this seat
  slates: CandidateSlate[]; // parties actually contesting here (baseline > threshold)
  favoredParty: PartyId; // highest baseline, i.e. "safe" holder absent campaign effects
}

const FIRST_NAMES = ['Ahmed', 'Muhammad', 'Ali', 'Imran', 'Tariq', 'Shahid', 'Nasir', 'Faisal', 'Kamran', 'Zafar', 'Rashid', 'Aslam', 'Iqbal', 'Waqar', 'Anwar', 'Jamil', 'Saeed', 'Rizwan', 'Aftab', 'Ghulam', 'Sardar', 'Mir', 'Nawabzada', 'Chaudhry', 'Malik', 'Mumtaz', 'Shazia', 'Farah', 'Nusrat', 'Fauzia', 'Samina', 'Robina', 'Bushra', 'Sherry', 'Zartaj'];
const LAST_NAMES = ['Khan', 'Sharif', 'Bhutto', 'Leghari', 'Jatoi', 'Gopang', 'Chandio', 'Mahar', 'Bijarani', 'Tareen', 'Sadiq', 'Qureshi', 'Gilani', 'Buzdar', 'Elahi', 'Warraich', 'Cheema', 'Gujjar', 'Awan', 'Bhatti', 'Niazi', 'Marwat', 'Wazir', 'Mengal', 'Bugti', 'Marri', 'Raisani', 'Zehri', 'Achakzai', 'Kakar', 'Baloch', 'Magsi', 'Talpur', 'Abro', 'Mirani', 'Rind', 'Hoti', 'Durrani', 'Yousafzai', 'Afridi', 'Orakzai', 'Mehsud'];

export function randomCandidateName(rand: Rand) {
  return `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`;
}

/** Which parties even field a serious slate in a given province (baseline presence). */
function contestingParties(province: ProvinceId): PartyId[] {
  return (Object.keys(PARTIES) as PartyId[]).filter(id => {
    if (id === 'OTH') return false;
    const p = PARTIES[id];
    return p.provinceStrength[province] > 0.03;
  });
}

/** Generates `seatCount` constituencies for a single province, id-prefixed (NA-/PA-). Shared by the national and provincial-assembly generators so both draw on the same underlying political geography. */
export function generateSeatsForProvince(rand: Rand, prov: ProvinceMeta, seatCount: number, prefix: string, startIndex = 1): Constituency[] {
  const parties = contestingParties(prov.id);
  const seats: Constituency[] = [];

  for (let i = 0; i < seatCount; i++) {
    const district = prov.districts[Math.floor((i / seatCount) * prov.districts.length)] ?? pick(rand, prov.districts);
    const urban = prov.urbanDistricts.includes(district) && rand() < (prov.urbanDistricts.length === 1 ? 0.9 : 0.55);
    const isKarachi = district.startsWith('Karachi');

    const slates: CandidateSlate[] = parties.map(pid => {
      const party = PARTIES[pid];
      let strength = party.provinceStrength[prov.id];
      if (isKarachi && party.urbanSindhBoost) strength += party.urbanSindhBoost;
      else if (urban && pid === 'PTI') strength += 0.1;
      strength = Math.max(0.02, strength + gaussNoise(rand, 0.22));
      const baseline = Math.max(2, Math.min(78, strength * 42 + randRange(rand, -6, 6)));
      const candidateStrength = Math.round(Math.max(1, Math.min(10, 3 + strength * 3 + gaussNoise(rand, 1.6))));
      const isElectable = candidateStrength >= 8 && rand() < 0.6;
      return { party: pid, baseline, candidateStrength, candidateName: randomCandidateName(rand), incumbent: false, isElectable };
    })
    .concat(Array.from({ length: randInt(rand, 1, 3) }, () => {
      const strength = Math.max(0.05, PARTIES.IND.provinceStrength[prov.id] + gaussNoise(rand, 0.3));
      const baseline = Math.max(1, Math.min(45, strength * 30 + randRange(rand, -5, 10)));
      const candidateStrength = Math.round(Math.max(1, Math.min(10, 4 + strength * 3 + gaussNoise(rand, 1.8))));
      return {
        party: 'IND' as PartyId, baseline, candidateStrength,
        candidateName: randomCandidateName(rand), incumbent: false,
        isElectable: candidateStrength >= 8 && rand() < 0.4,
      };
    }));

    const total = slates.reduce((s, c) => s + c.baseline, 0);
    const scale = total > 0 ? 92 / total : 1;
    slates.forEach(s => { s.baseline = Math.round(s.baseline * scale * 10) / 10; });
    slates.sort((a, b) => b.baseline - a.baseline);
    slates[0].incumbent = rand() < 0.65;

    const sorted = [...slates].sort((a, b) => b.baseline - a.baseline);
    const gap = sorted[0].baseline - (sorted[1]?.baseline ?? 0);
    let category: SeatCategory;
    if (gap > 20) category = 'stronghold';
    else if (gap > 10) category = 'competitive';
    else if (sorted.length > 3 && (sorted[2]?.baseline ?? 0) > sorted[0].baseline - 15) category = 'fragmented';
    else category = 'swing';

    const num = startIndex + i;
    seats.push({
      id: `${prefix}-${num}`,
      name: `${prefix}-${num} ${district}${prov.districts.length > 1 ? `-${i + 1}` : ''}`,
      province: prov.id,
      district,
      urban,
      category,
      turnoutBase: randRange(rand, 0.35, 0.58),
      swingSensitivity: randRange(rand, 0.6, 1.5),
      slates,
      favoredParty: sorted[0].party,
    });
  }
  return seats;
}

export function generateConstituencies(seed: number): Constituency[] {
  const rand = mulberry32(seed);
  const seats: Constituency[] = [];
  let naCounter = 1;
  for (const prov of PROVINCE_LIST) {
    const provSeats = generateSeatsForProvince(rand, prov, prov.generalSeats, 'NA', naCounter);
    seats.push(...provSeats);
    naCounter += prov.generalSeats;
  }
  return seats;
}

/** Provincial assembly general seats, one independently-seeded set per province. */
export function generateProvincialAssemblySeats(seed: number): Record<ProvinceId, Constituency[]> {
  const out: Record<ProvinceId, Constituency[]> = {} as any;
  for (const prov of PROVINCE_LIST) {
    if (prov.paSeats === 0) { out[prov.id] = []; continue; }
    const rand = mulberry32(seed + hashString(prov.id) * 7793);
    out[prov.id] = generateSeatsForProvince(rand, prov, prov.paSeats, 'PA');
  }
  return out;
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export { PROVINCES };
