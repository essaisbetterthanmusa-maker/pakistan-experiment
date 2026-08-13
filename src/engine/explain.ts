import type { Constituency } from '../data/constituencies';
import type { PartyId } from '../data/parties';
import type { CampaignState, ElectionResult, SharedSwing } from './types';
import { simulateElection } from './electionEngine';
import type { PoliticalClimate } from './politicalClimate';

export interface ExplainFactor {
  label: string;
  seats: number;      // signed seat effect
  detail: string;
}

export interface ResultExplanation {
  finalSeats: number;
  baselineSeats: number;
  factors: ExplainFactor[];
}

/**
 * Attributes the player's seat count to the decisions they made.
 *
 * Campaign effects are measured by counterfactual: re-run the identical
 * election on the identical seat map with one input removed, and the seat
 * difference is that input's real contribution. This is honest attribution
 * rather than a guess, because the only thing that changes between runs is
 * the input being tested.
 *
 * The political climate can't be counterfactualled the same way — it shapes
 * the constituency map itself, not just the campaign — so it is reported as
 * the strength multiplier it applied, alongside the headlines that caused it.
 */
export function explainResult(
  seats: Constituency[],
  playerParty: PartyId,
  campaign: CampaignState,
  establishmentLean: PartyId | null,
  seed: number,
  actual: ElectionResult,
  climate: PoliticalClimate | null,
  sharedSwing?: SharedSwing,
): ResultExplanation {
  const finalSeats = actual.generalSeatsByParty[playerParty] ?? 0;

  const run = (c: CampaignState | null) =>
    simulateElection(seats, playerParty, c, establishmentLean, seed, sharedSwing)
      .generalSeatsByParty[playerParty] ?? 0;

  const noCampaign = run(null);
  const noTargeting = run({ ...campaign, targetedSeats: [] });
  const noElectables = run({ ...campaign, recruitedElectables: [], rejectedElectables: [] });
  const noMedia = run({ ...campaign, mediaSpend: 0 });

  const factors: ExplainFactor[] = [];

  const provinceSpendTotal = Object.values(campaign.provinceSpend).reduce((a, b) => a + b, 0);
  // Everything the campaign did, minus the parts attributed separately below.
  const wholeCampaign = finalSeats - noCampaign;
  const targeting = finalSeats - noTargeting;
  const electables = finalSeats - noElectables;
  const media = finalSeats - noMedia;
  const provincial = wholeCampaign - targeting - electables - media;

  if (provinceSpendTotal > 0) {
    factors.push({
      label: 'Provincial campaign spend',
      seats: provincial,
      detail: `Rs ${provinceSpendTotal}M across the provinces.`,
    });
  }
  if (campaign.mediaSpend > 0) {
    factors.push({ label: 'National media push', seats: media, detail: `Rs ${campaign.mediaSpend}M on TV and digital.` });
  }
  if (campaign.targetedSeats.length > 0) {
    factors.push({
      label: 'Targeted ground game',
      seats: targeting,
      detail: `${campaign.targetedSeats.length} constituencies given organisers and rallies.`,
    });
  }
  if (campaign.recruitedElectables.length > 0 || campaign.rejectedElectables.length > 0) {
    factors.push({
      label: 'Electable deals',
      seats: electables,
      detail: `${campaign.recruitedElectables.length} recruited, ${campaign.rejectedElectables.length} refused.`,
    });
  }

  if (climate) {
    const m = climate.momentum[playerParty] ?? 1;
    const pct = Math.round((m - 1) * 100);
    if (Math.abs(pct) >= 3) {
      factors.push({
        label: pct > 0 ? 'National mood in your favour' : 'National mood against you',
        seats: NaN, // not a counterfactual — reported as a strength shift
        detail: `${pct > 0 ? '+' : ''}${pct}% to your party's strength this cycle: ${climate.events.map(e => e.headline).join('; ')}.`,
      });
    }
    if (climate.suppressedParty === playerParty) {
      factors.push({
        label: 'Your party was squeezed',
        seats: NaN,
        detail: 'Candidates pushed onto independent symbols — your vote held up better than your seat count did.',
      });
    }
  }

  factors.sort((a, b) => (isNaN(b.seats) ? -1 : b.seats) - (isNaN(a.seats) ? -1 : a.seats));

  return { finalSeats, baselineSeats: noCampaign, factors };
}
