import { useMemo, useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { PARTIES, type PartyId } from '../data/parties';
import { NA_MAJORITY } from '../data/provinces';
import { analyzeCoalitionOptions, type CoalitionPartner } from '../engine/coalition';
import { RELATION_LABEL } from '../data/relations';
import EstablishmentBadge from '../components/EstablishmentBadge';

const RELATION_COLOR: Record<string, string> = {
  ALLY: 'var(--accent)',
  PRAGMATIC: 'var(--text-dim)',
  UNEASY: 'var(--warn)',
  HOSTILE: 'var(--danger)',
};

export default function GovernmentFormation() {
  const { electionResult, playerParty, seed, formGovernment, formationAttempts, lastFormationResult, forceFreshElection, forceMinorityGovernment, fallToOpposition, meters } = useGameStore();
  const [accepted, setAccepted] = useState<Set<PartyId>>(new Set());
  const [independentsAttempted, setIndependentsAttempted] = useState(0);

  const analysis = useMemo(() => {
    if (!electionResult || !playerParty) return null;
    return analyzeCoalitionOptions(electionResult.totalByParty, playerParty, seed, meters.establishment);
  }, [electionResult, playerParty, seed, meters.establishment]);

  if (!electionResult || !playerParty || !analysis) return null;

  const sortedParties = (Object.keys(electionResult.totalByParty) as PartyId[])
    .filter(id => electionResult.totalByParty[id] > 0)
    .sort((a, b) => electionResult.totalByParty[b] - electionResult.totalByParty[a]);

  const acceptedPartners: CoalitionPartner[] = analysis.possiblePartners.filter(p => accepted.has(p.party));
  const projectedTotal = analysis.leaderSeats + acceptedPartners.reduce((s, p) => s + p.seats, 0) + Math.round(independentsAttempted * 0.65);

  const partnerSeatTotal = acceptedPartners.reduce((s, p) => s + p.seats, 0);
  const weightedReliability = partnerSeatTotal > 0
    ? acceptedPartners.reduce((s, p) => s + p.reliability * p.seats, 0) / partnerSeatTotal
    : 0.45;
  let previewChance = 0;
  if (projectedTotal >= NA_MAJORITY) previewChance = Math.max(0.08, Math.min(0.95, weightedReliability * 1.05 - 0.05));
  else if (projectedTotal >= NA_MAJORITY - 12) previewChance = Math.max(0.05, Math.min(0.6, weightedReliability * 0.7));

  function toggle(id: PartyId, refuses: boolean) {
    if (refuses) return;
    setAccepted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="page-wrap">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2>Government Formation</h2>
          <p>336 seats declared, including reserved seats. {NA_MAJORITY} needed for a majority.{formationAttempts > 0 ? ` · Attempt ${formationAttempts + 1}` : ''}</p>
        </div>
        <EstablishmentBadge />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        {sortedParties.map(id => (
          <div className="tally-row" key={id}>
            <span className="tally-name">{PARTIES[id].short}</span>
            <div className="tally-bar-bg">
              <div className="tally-bar" style={{ width: `${Math.min(100, (electionResult.totalByParty[id] / NA_MAJORITY) * 100)}%`, background: PARTIES[id].color }} />
            </div>
            <span className="tally-num">{electionResult.totalByParty[id]}</span>
          </div>
        ))}
      </div>

      {lastFormationResult?.collapsed && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--danger)' }}>
          <h3 style={{ color: 'var(--danger)' }}>Formation attempt failed</h3>
          <p style={{ fontSize: 14, margin: '8px 0 14px', color: 'var(--text)' }}>{lastFormationResult.narrative}</p>
          <p className="stat-line">Adjust your coalition and try again, or call fresh elections and let the country re-decide.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-danger" onClick={forceFreshElection}>Call Fresh Elections Instead</button>
            {formationAttempts >= 2 && (
              <>
                <button className="btn" onClick={forceMinorityGovernment}>Take Power Anyway — Weak Minority Government</button>
                <button className="btn" onClick={() => fallToOpposition('You failed to form a government. A rival bloc took power and you sit in opposition.')}>
                  Concede — Sit in Opposition
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {analysis.hasMajorityAlone ? (
        <div className="card">
          <h3>{PARTIES[playerParty].short} has an outright majority.</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0 14px' }}>
            No coalition required — but a solo majority still has to survive its own party's internal politics.
          </p>
          <button className="btn btn-primary" onClick={() => formGovernment([], 0)}>Form Majority Government</button>
        </div>
      ) : (
        <div className="card">
          <h3>You are {Math.max(0, NA_MAJORITY - analysis.leaderSeats)} seats short. Who do you bring in?</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0 14px' }}>
            Every partner has a price — and some will simply refuse. Political history matters here.
          </p>
          {analysis.possiblePartners.map(p => (
            <div
              key={p.party}
              className="seat-row"
              style={{ alignItems: 'flex-start', cursor: p.refuses ? 'not-allowed' : 'pointer', opacity: p.refuses ? 0.55 : 1 }}
              onClick={() => toggle(p.party, p.refuses)}
            >
              <div>
                <b style={{ color: PARTIES[p.party].color }}>{PARTIES[p.party].short}</b> — {p.seats} seats
                <span className="tag" style={{ color: RELATION_COLOR[p.relation] }}>{RELATION_LABEL[p.relation]}</span>
                {!p.refuses && <span className="tag">reliability {(p.reliability * 100).toFixed(0)}%</span>}
                {!p.refuses && <div style={{ marginTop: 4 }}>{p.demand.map(d => <span className="demand-chip" key={d}>{d}</span>)}</div>}
              </div>
              <input type="checkbox" checked={accepted.has(p.party)} disabled={p.refuses} readOnly />
            </div>
          ))}

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 13 }}>Independents you'll approach: {independentsAttempted} / {analysis.independents}</label>
            <input
              type="range" min={0} max={analysis.independents} value={independentsAttempted}
              onChange={e => setIndependentsAttempted(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-dimmer)', marginTop: 4 }}>Independents aren't a sure thing — expect roughly half to come through.</p>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span>
              Projected total: <b style={{ color: projectedTotal >= NA_MAJORITY ? 'var(--accent)' : 'var(--danger)' }}>{projectedTotal}</b> / {NA_MAJORITY}
              {previewChance > 0 && <span style={{ marginLeft: 10, color: 'var(--text-dim)', fontSize: 13 }}>estimated success chance: {(previewChance * 100).toFixed(0)}%</span>}
            </span>
            <button className="btn btn-primary" onClick={() => formGovernment(acceptedPartners, independentsAttempted)}>
              Attempt Government Formation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
