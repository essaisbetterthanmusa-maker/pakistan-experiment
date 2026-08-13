import { useState } from 'react';
import { useGameStore, type GoverningAction, TERM_LENGTH_YEARS } from '../state/gameStore';
import { PARTIES, type PartyId } from '../data/parties';
import { PROVINCES, TOTAL_NA_SEATS } from '../data/provinces';
import { SENATE_SEATS, SENATE_MAJORITY } from '../engine/senate';
import { establishmentScore } from '../engine/types';
import EstablishmentBadge from '../components/EstablishmentBadge';

interface CrisisOption { label: string; effect: string; delta: Partial<{ publicApproval: number; partyUnity: number; oppositionStrength: number; inflation: number; reserves: number }>; }
interface Crisis { title: string; body: string; options: CrisisOption[]; }

const CRISES: Crisis[] = [
  {
    title: 'IMF Programme Review',
    body: 'The Fund wants subsidies cut before releasing the next tranche. Your coalition partners are watching closely.',
    options: [
      { label: 'Accept IMF terms', effect: 'Reserves stabilize, public approval drops', delta: { reserves: 2, publicApproval: -8, oppositionStrength: 6 } },
      { label: 'Partial compromise', effect: 'Modest relief, modest anger', delta: { reserves: 1, publicApproval: -3, partyUnity: -2 } },
      { label: 'Refuse and stall', effect: 'Reserves keep falling, markets nervous', delta: { reserves: -3, publicApproval: 2 } },
    ],
  },
  {
    title: 'Inflation Spike',
    body: 'Fuel and food prices jump again. The opposition is organizing a "strike against inflation."',
    options: [
      { label: 'Emergency subsidy package', effect: 'Costs reserves, buys goodwill', delta: { reserves: -2, publicApproval: 6, inflation: -2 } },
      { label: 'Let the market correct', effect: 'No fiscal cost, public fury', delta: { publicApproval: -10, oppositionStrength: 8 } },
    ],
  },
  {
    title: 'Coalition Partner Ultimatum',
    body: 'A junior coalition partner threatens to walk unless a cabinet reshuffle happens within a week.',
    options: [
      { label: 'Give them the ministry', effect: 'Coalition holds, own party grumbles', delta: { partyUnity: -6, oppositionStrength: -3 } },
      { label: 'Call their bluff', effect: 'Risky — could fracture the coalition', delta: { oppositionStrength: 10, partyUnity: 3 } },
    ],
  },
  {
    title: 'Provincial Funding Dispute',
    body: 'A province you don\'t control accuses the federal government of withholding NFC Award funds.',
    options: [
      { label: 'Release the funds', effect: 'Costs reserves, defuses the crisis', delta: { reserves: -2, publicApproval: 3 } },
      { label: 'Reject the accusation', effect: 'Provincial relations sour further', delta: { oppositionStrength: 5, publicApproval: -3 } },
    ],
  },
  {
    title: 'Corruption Allegation',
    body: 'A leaked audio recording implicates a senior cabinet member. The opposition demands resignation.',
    options: [
      { label: 'Force the resignation', effect: 'Own party sees you as weak on loyalty', delta: { partyUnity: -8, publicApproval: 4 } },
      { label: 'Defend the minister', effect: 'Loyalty preserved, credibility damaged', delta: { publicApproval: -7, oppositionStrength: 6 } },
    ],
  },
  {
    title: 'Party Powerbroker Rebellion',
    body: 'A senior figure in your own party is unhappy about candidate tickets handed out last cycle and is organizing a faction.',
    options: [
      { label: 'Buy loyalty with a ministry', effect: 'Costs credibility, keeps the party together', delta: { partyUnity: 8, publicApproval: -2 } },
      { label: 'Publicly face them down', effect: 'Could backfire badly', delta: { partyUnity: -10, oppositionStrength: 4 } },
    ],
  },
  {
    title: 'Court Ruling Against the Government',
    body: 'The courts strike down a flagship policy. Legal analysts call it a major setback.',
    options: [
      { label: 'Comply quietly', effect: 'Approval dips, crisis passes', delta: { publicApproval: -4 } },
      { label: 'Publicly criticize the judiciary', effect: 'Base energized, institutions alarmed', delta: { publicApproval: 3, oppositionStrength: 7 } },
    ],
  },
];

/**
 * Things a sitting government can actually *do*, rather than only reacting to
 * crises. Each has a real cost somewhere — there is no free win here.
 */
const GOVERNING_ACTIONS: GoverningAction[] = [
  {
    id: 'subsidy',
    label: 'Fuel & wheat subsidy package',
    detail: 'Buys public goodwill, drains reserves and worries the IMF.',
    apply: m => ({
      publicApproval: clamp(m.publicApproval + 8),
      economy: { ...m.economy, reserves: Math.max(0, m.economy.reserves - 2.5), inflation: Math.max(0, m.economy.inflation - 1) },
    }),
  },
  {
    id: 'imf',
    needsLegislation: true,
    label: 'Sign a new IMF programme',
    detail: 'Stabilises reserves and growth; austerity terms hurt at home.',
    apply: m => ({
      publicApproval: clamp(m.publicApproval - 9),
      oppositionStrength: clamp(m.oppositionStrength + 5),
      economy: { ...m.economy, reserves: m.economy.reserves + 4, gdpGrowth: m.economy.gdpGrowth + 0.4, inflation: Math.max(0, m.economy.inflation - 2) },
    }),
  },
  {
    id: 'cpec',
    label: 'Launch a CPEC infrastructure push',
    detail: 'Growth and visible development, funded by more debt.',
    apply: m => ({
      publicApproval: clamp(m.publicApproval + 5),
      economy: { ...m.economy, gdpGrowth: m.economy.gdpGrowth + 0.6, reserves: Math.max(0, m.economy.reserves - 1.5) },
      establishment: m.establishment,
    }),
  },
  {
    id: 'cabinet',
    label: 'Reshuffle the cabinet',
    detail: 'Rewards loyalists and steadies the party; looks like panic outside it.',
    apply: m => ({
      partyUnity: clamp(m.partyUnity + 10),
      publicApproval: clamp(m.publicApproval - 3),
      powerbrokers: m.powerbrokers.map(p => ({ ...p, loyalty: Math.min(100, p.loyalty + 8) })),
    }),
  },
  {
    id: 'devfunds',
    label: 'Release development funds to allies',
    detail: 'Classic patronage — locks in coalition partners, costs the exchequer.',
    apply: m => ({
      partyUnity: clamp(m.partyUnity + 5),
      oppositionStrength: clamp(m.oppositionStrength - 6),
      economy: { ...m.economy, reserves: Math.max(0, m.economy.reserves - 1.5) },
      powerbrokers: m.powerbrokers.map(p => ({ ...p, loyalty: Math.min(100, p.loyalty + 5) })),
    }),
  },
  {
    id: 'crackdown',
    label: 'Crack down on opposition protests',
    detail: 'Suppresses the street in the short run; the backlash is real.',
    apply: m => ({
      oppositionStrength: clamp(m.oppositionStrength - 12),
      publicApproval: clamp(m.publicApproval - 7),
    }),
  },
  {
    id: 'taxreform',
    needsLegislation: true,
    label: 'Broaden the tax base',
    detail: 'The responsible choice nobody thanks you for.',
    apply: m => ({
      publicApproval: clamp(m.publicApproval - 6),
      partyUnity: clamp(m.partyUnity - 4),
      economy: { ...m.economy, reserves: m.economy.reserves + 2.5, gdpGrowth: m.economy.gdpGrowth + 0.2 },
    }),
  },
  {
    id: 'energy',
    needsLegislation: true,
    label: 'Energy sector reform',
    detail: 'Tackles circular debt and loadshedding — slow, unglamorous, expensive up front.',
    apply: m => ({
      publicApproval: clamp(m.publicApproval + 3),
      economy: { ...m.economy, reserves: Math.max(0, m.economy.reserves - 1), gdpGrowth: m.economy.gdpGrowth + 0.5 },
    }),
  },
];

/** Policy moves available each year of the term, not per term. */
const MAX_TERM_ACTIONS = 2;

const OUTCOME_LABEL: Record<string, string> = {
  MAJORITY: 'Majority Government',
  COALITION: 'Coalition Government',
  JUNIOR_PARTNER: 'Junior Coalition Partner',
  MINORITY: 'Minority Government',
  OPPOSITION: 'In Opposition',
  FAILED: 'Government Formation Failed',
};

export default function GoverningHub() {
  const { government, meters, electionResult, playerParty, leader, provincialAssemblies, senateByParty, advanceGoverning, logCrisis, callNextElection, courtEstablishment, takeGoverningAction, termActionsUsed, fallToOpposition, advanceYear, appeasePowerbroker, senateSupport } = useGameStore();
  const [activeCrisis, setActiveCrisis] = useState<Crisis | null>(null);
  const [noConfidenceResult, setNoConfidenceResult] = useState<string | null>(null);
  const [establishmentNote, setEstablishmentNote] = useState<string | null>(null);
  const [usedActionIds, setUsedActionIds] = useState<string[]>([]);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [yearReport, setYearReport] = useState<{ year: number; events: string[]; forcedElection: boolean } | null>(null);

  if (!government || !electionResult || !playerParty) return null;

  function newCrisis() {
    setActiveCrisis(CRISES[Math.floor(Math.random() * CRISES.length)]);
  }

  function resolveCrisis(opt: CrisisOption) {
    if (!activeCrisis) return;
    advanceGoverning({
      publicApproval: clamp((meters.publicApproval) + (opt.delta.publicApproval ?? 0)),
      partyUnity: clamp((meters.partyUnity) + (opt.delta.partyUnity ?? 0)),
      oppositionStrength: clamp((meters.oppositionStrength) + (opt.delta.oppositionStrength ?? 0)),
      economy: {
        ...meters.economy,
        inflation: Math.max(0, meters.economy.inflation + (opt.delta.inflation ?? 0)),
        reserves: Math.max(0, meters.economy.reserves + (opt.delta.reserves ?? 0)),
      },
    });
    logCrisis(`${activeCrisis.title}: chose "${opt.label}" — ${opt.effect}`);
    setActiveCrisis(null);
  }

  function tryNoConfidence() {
    if (!government) return;
    // Both sides have to be measured on the same scale. Government strength is
    // its share of the 336-seat house, not a raw seat count — comparing a raw
    // count against a 0-100 opposition meter made the government unlosable.
    const govShare = (government.totalSeats / TOTAL_NA_SEATS) * 100;
    // Disloyal backbenchers are exactly who abstains or crosses the floor,
    // and a government the establishment is backing survives votes it
    // otherwise wouldn't.
    const govPower = govShare
      - (100 - meters.partyUnity) * 0.28
      + establishmentScore(meters.establishment) * 6;
    const oppPower = meters.oppositionStrength + (Math.random() * 24 - 12);
    if (govPower > oppPower) {
      setNoConfidenceResult(
        `The motion fails — ${govPower.toFixed(0)} against ${oppPower.toFixed(0)}. The government survives, but the opposition has shown its hand.`
      );
      advanceGoverning({ partyUnity: clamp(meters.partyUnity - 5), oppositionStrength: clamp(meters.oppositionStrength - 8) });
    } else {
      fallToOpposition(
        `Your government lost a no-confidence vote (${govPower.toFixed(0)} against ${oppPower.toFixed(0)}). You are now in opposition.`
      );
    }
  }

  function useAction(action: GoverningAction) {
    if (termActionsUsed >= MAX_TERM_ACTIONS || usedActionIds.includes(action.id)) return;
    const res = takeGoverningAction(action);
    setActionNote(res.text);
    setUsedActionIds(prev => [...prev, action.id]);
  }

  function nextYear() {
    const rep = advanceYear();
    setYearReport(rep);
    setUsedActionIds([]); // new year, the agenda resets
    setActionNote(null);
  }

  const sortedSenate = senateByParty
    ? (Object.keys(senateByParty) as PartyId[]).filter(id => senateByParty[id] > 0).sort((a, b) => senateByParty[b] - senateByParty[a])
    : [];
  const senate = senateSupport();

  return (
    <div className="page-wrap">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2>
            {government.seniorPartner ? 'In Government (Junior Partner)' : 'Governing'} — {PARTIES[playerParty].short}{leader ? ` · ${leader.name}` : ''}
          </h2>
          <p>
            {OUTCOME_LABEL[government.outcome]} · {government.totalSeats} seats behind the coalition · Year {government.termYear} of {TERM_LENGTH_YEARS}
          </p>
          {government.seniorPartner && (
            <p style={{ color: 'var(--warn)', fontSize: 14, marginTop: 6 }}>
              <b style={{ color: PARTIES[government.seniorPartner].color }}>{PARTIES[government.seniorPartner].short}</b> won
              more seats than you and holds the Prime Minister's office. You sit in cabinet, carrying the government's
              record without controlling it.
            </p>
          )}
        </div>
        <EstablishmentBadge />
      </div>

      <div className="panel-grid">
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Governing meters</h3>
          <Meter label="Public Approval" value={meters.publicApproval} color="var(--accent)" />
          <Meter label="Party Unity" value={meters.partyUnity} color="var(--accent-2)" />
          <Meter label="Opposition Strength" value={meters.oppositionStrength} color="var(--danger)" />
          <p className="stat-line">Inflation {meters.economy.inflation.toFixed(1)}% · GDP growth {meters.economy.gdpGrowth.toFixed(1)}% · Reserves ${meters.economy.reserves.toFixed(1)}B</p>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button className="btn" onClick={newCrisis}>Face next political crisis</button>
            <button className="btn btn-danger" onClick={tryNoConfidence}>Opposition moves no-confidence</button>
            <button className="btn" onClick={() => setEstablishmentNote(courtEstablishment().text)}>Court the Establishment</button>
            {government.termYear < TERM_LENGTH_YEARS ? (
              <button className="btn btn-primary" onClick={nextYear}>Advance to Year {government.termYear + 1} →</button>
            ) : (
              <button className="btn btn-primary" onClick={callNextElection}>Term Over — Hold Elections</button>
            )}
            <button className="btn" onClick={callNextElection}>Call Early Elections</button>
          </div>
          {noConfidenceResult && <p style={{ fontSize: 14, marginTop: 12, color: 'var(--warn)' }}>{noConfidenceResult}</p>}
          {establishmentNote && <p style={{ fontSize: 14, marginTop: 12, color: 'var(--accent-2)' }}>{establishmentNote}</p>}
          {yearReport && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <b style={{ color: 'var(--accent-2)' }}>Year {yearReport.year} of {TERM_LENGTH_YEARS}</b>
              {yearReport.events.map((ev, i) => (
                <p key={i} style={{ fontSize: 13.5, color: 'var(--text-dim)', marginTop: 4 }}>{ev}</p>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Senate of Pakistan</h3>
          <p className="stat-line" style={{ marginBottom: 6 }}>
            Your coalition holds <b style={{ color: senate.hasMajority ? 'var(--accent)' : 'var(--danger)' }}>{senate.seats}</b> of {SENATE_SEATS} · majority needs {SENATE_MAJORITY}.
          </p>
          <p className="stat-line" style={{ marginBottom: 10, color: senate.hasMajority ? 'var(--accent)' : 'var(--warn)' }}>
            {senate.hasMajority
              ? 'You control the upper house — legislation passes freely.'
              : 'Without a Senate majority the opposition can block your legislation. Winning provincial assemblies is how you fix that.'}
          </p>
          {sortedSenate.map(id => (
            <div className="tally-row" key={id}>
              <span className="tally-name">{PARTIES[id].short}</span>
              <div className="tally-bar-bg">
                <div className="tally-bar" style={{ width: `${Math.min(100, ((senateByParty?.[id] ?? 0) / SENATE_MAJORITY) * 100)}%`, background: PARTIES[id].color }} />
              </div>
              <span className="tally-num">{senateByParty?.[id]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 6 }}>Govern — policy agenda ({termActionsUsed}/{MAX_TERM_ACTIONS} used this year)</h3>
        <p className="stat-line" style={{ marginBottom: 6 }}>
          You cannot do everything in one year. Every option below buys you something and costs you something else.
        </p>
        <p className="stat-line" style={{ marginBottom: 14 }}>
          Items marked <span className="tag" style={{ color: 'var(--warn)' }}>SENATE</span> are legislation — without an
          upper-house majority they can be blocked outright.
        </p>
        {actionNote && <p style={{ fontSize: 14, marginBottom: 12, color: 'var(--accent-2)' }}>{actionNote}</p>}
        <div className="panel-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {GOVERNING_ACTIONS.map(a => {
            const used = usedActionIds.includes(a.id);
            const exhausted = termActionsUsed >= MAX_TERM_ACTIONS;
            return (
              <button
                key={a.id}
                className="btn"
                disabled={used || exhausted}
                onClick={() => useAction(a)}
                style={{ display: 'block', textAlign: 'left', height: '100%', padding: '12px 14px' }}
              >
                <b>{a.label}</b>
                {a.needsLegislation && (
                  <span className="tag" style={{ color: senate.hasMajority ? 'var(--accent)' : 'var(--warn)', marginLeft: 6 }}>SENATE</span>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, fontWeight: 400, lineHeight: 1.45 }}>
                  {used ? 'Already on the agenda this year.' : a.detail}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 6 }}>Provincial assemblies</h3>
        <p className="stat-line" style={{ marginBottom: 14 }}>Fought seat-by-seat on the same day, and on the same political wave, as the National Assembly race — so a province you swept nationally should broadly track here too. A federal majority still does not guarantee provincial control.</p>
        <div className="panel-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {provincialAssemblies && (Object.keys(provincialAssemblies) as (keyof typeof provincialAssemblies)[]).map(pid => {
            const pa = provincialAssemblies[pid];
            if (!pa) return null;
            const ranked = (Object.keys(pa.result.totalByParty) as PartyId[])
              .filter(id => pa.result.totalByParty[id] > 0)
              .sort((a, b) => pa.result.totalByParty[b] - pa.result.totalByParty[a])
              .slice(0, 5);
            return (
              <div key={pid} className="card" style={{ background: 'var(--bg-panel-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <b>{PROVINCES[pid].name}</b>
                  {pa.hung ? (
                    <span className="tag" style={{ color: 'var(--warn)' }}>HUNG ASSEMBLY</span>
                  ) : (
                    <span className="tag" style={{ color: PARTIES[pa.cmParty!].color }}>{PARTIES[pa.cmParty!].short} GOVERNS</span>
                  )}
                </div>
                {!pa.hung && pa.cmName && (
                  <p className="stat-line" style={{ margin: '6px 0' }}>
                    Chief Minister: <b>{pa.cmName}</b> ({PARTIES[pa.cmParty!].short})
                    {pa.coalition.length > 0 && <> · with {pa.coalition.map(c => PARTIES[c.party].short).join(', ')}</>}
                    {' '}· approval {pa.cmApproval}%
                  </p>
                )}
                {pa.hung && <p className="stat-line" style={{ margin: '6px 0' }}>No party or coalition reached {pa.majority} of {pa.totalSeats}. Governor's rule or ongoing talks.</p>}
                {ranked.map(id => (
                  <div className="tally-row" key={id}>
                    <span className="tally-name">{PARTIES[id].short}</span>
                    <div className="tally-bar-bg">
                      <div className="tally-bar" style={{ width: `${Math.min(100, (pa.result.totalByParty[id] / pa.majority) * 100)}%`, background: PARTIES[id].color }} />
                    </div>
                    <span className="tally-num">{pa.result.totalByParty[id]}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>Party powerbrokers</h3>
        <p className="stat-line" style={{ marginBottom: 10 }}>
          Loyalty drifts with party unity each year. Below 35% they may walk out and take their seats with them —
          buying them off costs money and makes you look weak.
        </p>
        {meters.powerbrokers.map((pb, i) => (
          <div key={i} className="seat-row" style={{ opacity: pb.defected ? 0.5 : 1 }}>
            <span>
              <b>{pb.name}</b> — {pb.region}
              <span className="tag">{pb.bloc} seats</span>
              {pb.defected && <span className="tag" style={{ color: 'var(--danger)' }}>DEFECTED</span>}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="tag" style={{ color: pb.loyalty < 35 ? 'var(--danger)' : pb.loyalty < 60 ? 'var(--warn)' : 'var(--accent)' }}>
                loyalty {pb.loyalty.toFixed(0)}%
              </span>
              {!pb.defected && pb.loyalty < 70 && (
                <button className="btn btn-sm" onClick={() => setActionNote(appeasePowerbroker(i).text)}>Appease</button>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>Political crisis log</h3>
        {meters.crisisLog.length === 0 && <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>Nothing yet — the government is still finding its feet.</p>}
        {meters.crisisLog.map((c, i) => (
          <div key={i} className="wire-item"><div className="wire-time">Term year {c.year}</div><div>{c.text}</div></div>
        ))}
      </div>

      {activeCrisis && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: 20 }}>
          <div className="card" style={{ maxWidth: 480 }}>
            <h3>{activeCrisis.title}</h3>
            <p style={{ fontSize: 14, margin: '10px 0 16px', color: 'var(--text-dim)', lineHeight: 1.5 }}>{activeCrisis.body}</p>
            {activeCrisis.options.map(opt => (
              <button key={opt.label} className="btn" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8 }} onClick={() => resolveCrisis(opt)}>
                <b>{opt.label}</b>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{opt.effect}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function clamp(v: number) { return Math.max(0, Math.min(100, v)); }

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="meter">
      <div className="meter-label"><span>{label}</span><span>{value.toFixed(0)}%</span></div>
      <div className="meter-bar-bg"><div className="meter-bar" style={{ width: `${value}%`, background: color }} /></div>
    </div>
  );
}
