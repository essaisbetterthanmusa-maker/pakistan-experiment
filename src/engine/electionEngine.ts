import type { Constituency } from '../data/constituencies';
import type { PartyId } from '../data/parties';
import { PARTIES } from '../data/parties';
import type { ProvinceId } from '../data/provinces';
import { PROVINCE_LIST } from '../data/provinces';
import type { CampaignState, ElectionResult, SeatResult, SeatResultLine, SharedSwing } from './types';
import { mulberry32, gaussNoise, randRange, type Rand } from './random';

const ALL_PARTY_IDS = Object.keys(PARTIES) as PartyId[];
function zeroTally(): Record<PartyId, number> {
  return Object.fromEntries(ALL_PARTY_IDS.map(id => [id, 0])) as Record<PartyId, number>;
}

function campaignBonusFor(seat: Constituency, party: PartyId, playerParty: PartyId | null, campaign: CampaignState | null): number {
  if (!campaign || party !== playerParty) return 0;
  let bonus = 0;
  const provinceSpend = campaign.provinceSpend[seat.province] ?? 0;
  // diminishing returns on province-wide spend
  bonus += Math.min(6, Math.sqrt(provinceSpend) * 0.9);
  if (campaign.targetedSeats.includes(seat.id)) bonus += 7;
  bonus += Math.min(3, Math.sqrt(campaign.mediaSpend) * 0.35);
  return bonus;
}

function electableAdjustments(seat: Constituency, playerParty: PartyId | null, campaign: CampaignState | null) {
  // Recruiting the seat's strongest electable into the player's party pulls their
  // baseline strength across; refusing them spins up (or strengthens) an independent.
  const adj: { party: PartyId; delta: number }[] = [];
  if (!campaign || !playerParty) return adj;
  const strongest = [...seat.slates].sort((a, b) => b.candidateStrength - a.candidateStrength)[0];
  if (!strongest) return adj;
  if (campaign.recruitedElectables.includes(seat.id) && strongest.party !== playerParty) {
    adj.push({ party: strongest.party, delta: -strongest.baseline * 0.55 });
    adj.push({ party: playerParty, delta: strongest.baseline * 0.55 + 6 });
  }
  if (campaign.rejectedElectables.includes(seat.id)) {
    adj.push({ party: strongest.party, delta: -strongest.baseline * 0.3 });
    adj.push({ party: 'IND', delta: strongest.baseline * 0.3 + 5 });
  }
  return adj;
}

export function simulateElection(
  seats: Constituency[],
  playerParty: PartyId | null,
  campaign: CampaignState | null,
  establishmentLean: PartyId | null,
  seed: number,
  sharedSwing?: SharedSwing,
): ElectionResult {
  const rand: Rand = mulberry32(seed);

  // National swing: every party gets a random national mood shift; the player's
  // party gets a modest boost proportional to total campaign spend efficiency.
  // When a shared swing is supplied (provincial assemblies voting the same day
  // as the National Assembly), we anchor to it so results stay correlated —
  // the same wave that wins a party its NA seats in a province should carry
  // into that province's assembly too, not roll a fresh, unrelated outcome.
  const nationalSwing: Record<PartyId, number> = zeroTally();
  for (const id of ALL_PARTY_IDS) {
    nationalSwing[id] = sharedSwing
      ? sharedSwing.national[id] + gaussNoise(rand, 1.1)
      : gaussNoise(rand, 4.8);
  }
  if (playerParty && campaign) {
    const efficiency = Math.min(1, campaign.spent / Math.max(1, campaign.totalBudget));
    nationalSwing[playerParty] += efficiency * randRange(rand, 2, 5);
  }
  if (establishmentLean) nationalSwing[establishmentLean] += randRange(rand, 1, 4);

  // Provincial swing layered on top of national.
  const provincialSwing: Record<ProvinceId, Record<PartyId, number>> = {} as any;
  for (const prov of PROVINCE_LIST) {
    provincialSwing[prov.id] = zeroTally();
    for (const id of ALL_PARTY_IDS) {
      provincialSwing[prov.id][id] = sharedSwing
        ? sharedSwing.provincial[prov.id][id] + gaussNoise(rand, 0.9)
        : gaussNoise(rand, 3.6);
    }
  }

  const seatResults: SeatResult[] = [];
  const generalSeatsByParty = zeroTally();
  const provinceGeneralByParty: Record<ProvinceId, Record<PartyId, number>> = {} as any;
  for (const prov of PROVINCE_LIST) provinceGeneralByParty[prov.id] = zeroTally();

  for (const seat of seats) {
    const adjustments = electableAdjustments(seat, playerParty, campaign);
    const scored = seat.slates.map(slate => {
      let score = slate.baseline;
      score += slate.candidateStrength * 1.4;
      if (slate.isElectable) score += 2.5;
      if (slate.incumbent) score += 1.5;
      score += campaignBonusFor(seat, slate.party, playerParty, campaign);
      for (const a of adjustments) if (a.party === slate.party) score += a.delta;
      score += (nationalSwing[slate.party] ?? 0) * seat.swingSensitivity * 0.5;
      score += (provincialSwing[seat.province][slate.party] ?? 0) * seat.swingSensitivity * 0.5;
      score += gaussNoise(rand, 4.8); // seat-day uncertainty: turnout quirks, local news, weather
      return { slate, score: Math.max(0.5, score) };
    });

    const scoreSum = scored.reduce((s, x) => s + x.score, 0);
    const turnoutPct = Math.max(0.28, Math.min(0.68, seat.turnoutBase + gaussNoise(rand, 0.04)));
    const registeredVoters = Math.round(randRange(rand, 260000, 420000));
    const votesCast = Math.round(registeredVoters * turnoutPct);

    const lines: SeatResultLine[] = scored
      .map(({ slate, score }) => ({
        party: slate.party,
        candidateName: slate.candidateName,
        votes: Math.round((score / scoreSum) * votesCast),
        isElectable: slate.isElectable,
        incumbent: slate.incumbent,
      }))
      .sort((a, b) => b.votes - a.votes);

    const winner = lines[0];
    const margin = winner.votes - (lines[1]?.votes ?? 0);
    generalSeatsByParty[winner.party]++;
    provinceGeneralByParty[seat.province][winner.party]++;

    seatResults.push({
      seat, lines, winner, margin, turnoutPct,
      reportTimeMinutes: 0, // assigned by scheduleReporting()
      upset: winner.party !== seat.favoredParty,
    });
  }

  scheduleReporting(seatResults, rand);

  return {
    seatResults,
    generalSeatsByParty,
    womenReservedByParty: zeroTally(),
    minorityReservedByParty: zeroTally(),
    totalByParty: { ...generalSeatsByParty },
    provinceGeneralByParty,
    nationalSwing,
    provincialSwing,
  };
}

/**
 * Election night pacing: KP and rural seats with simple counts report early,
 * dense urban Punjab/Karachi seats and closely fought races report late —
 * matching the real rhythm of Pakistani election nights.
 */
function scheduleReporting(results: SeatResult[], rand: Rand) {
  for (const r of results) {
    let base: number;
    switch (r.seat.province) {
      case 'KP': base = randRange(rand, 15, 220); break;
      case 'Balochistan': base = randRange(rand, 20, 200); break;
      case 'Sindh': base = randRange(rand, r.seat.urban ? 120 : 60, r.seat.urban ? 420 : 280); break;
      case 'Islamabad': base = randRange(rand, 100, 260); break;
      case 'Punjab':
      default: base = randRange(rand, r.seat.urban ? 150 : 90, r.seat.urban ? 460 : 340); break;
    }
    if (r.margin < 3000) base += randRange(rand, 20, 90); // close races take longer to confirm
    r.reportTimeMinutes = Math.round(base);
  }
  results.sort((a, b) => a.reportTimeMinutes - b.reportTimeMinutes);
}
