import { useState } from 'react';
import { useGameStore, type OppositionAction } from '../state/gameStore';
import { PARTIES } from '../data/parties';
import EstablishmentBadge from '../components/EstablishmentBadge';

const OPPOSITION_ACTIONS: OppositionAction[] = [
  { id: 'protest', label: 'Call a long march / public rally', detail: 'Puts bodies on the street. Builds momentum, dents the government — and invites a crackdown.' },
  { id: 'media', label: 'Run a media offensive', detail: 'Talk shows, headlines, viral clips. Steady, low-risk pressure.' },
  { id: 'alliance', label: 'Build an opposition alliance', detail: 'Bring other opposition parties onto a joint platform. Strength in numbers, credit shared.' },
  { id: 'defectors', label: 'Court government backbenchers', detail: 'Quietly work on their MNAs. If it leaks, you look like a schemer.' },
  { id: 'courts', label: 'Take the government to court', detail: 'Petition against a flagship policy. A hit lands hard; a dismissal hands them a win.' },
  { id: 'noconfidence', label: 'Move a no-confidence motion', detail: 'The real attempt. Fail it and your movement loses serious ground.' },
];

export default function OppositionScreen() {
  const { opposition, playerParty, leader, meters, callNextElection, takeOppositionAction, forceMinorityGovernment } = useGameStore();
  const [note, setNote] = useState<string | null>(null);
  const [toppled, setToppled] = useState(false);

  if (!opposition || !playerParty) return null;

  function act(a: OppositionAction) {
    const res = takeOppositionAction(a);
    setNote(res.text);
    if (res.toppled) setToppled(true);
  }

  return (
    <div className="page-wrap">
      <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2>In Opposition — {PARTIES[playerParty].short}{leader ? ` · ${leader.name}` : ''}</h2>
          <p>
            <b style={{ color: PARTIES[opposition.governingParty].color }}>{PARTIES[opposition.governingParty].short}</b> holds
            government. Your job is to get back into power — by bringing them down, or by winning the next election.
          </p>
        </div>
        <EstablishmentBadge />
      </div>

      <div className="panel-grid">
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>The struggle</h3>
          <Meter label="Your Movement's Momentum" value={opposition.momentum} color="var(--accent)" />
          <Meter label="Government Stability" value={opposition.govStability} color="var(--danger)" />
          <p className="stat-line" style={{ marginTop: 10 }}>
            Public approval {meters.publicApproval.toFixed(0)}% · Party unity {meters.partyUnity.toFixed(0)}%
          </p>
          <p className="stat-line">
            A no-confidence motion succeeds more often the further your momentum sits above their stability.
          </p>

          {toppled ? (
            <div style={{ marginTop: 18 }}>
              <p style={{ color: 'var(--accent)', fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
                The government has fallen. You can take power now — as a fragile minority — or force fresh elections and seek a real mandate.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={forceMinorityGovernment}>Take Power Now (Minority Government)</button>
                <button className="btn" onClick={callNextElection}>Force Fresh Elections</button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 18 }}>
              <button className="btn btn-primary" onClick={callNextElection}>Wait for the Next Election →</button>
            </div>
          )}
          {note && <p style={{ fontSize: 14, marginTop: 12, color: 'var(--accent-2)' }}>{note}</p>}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 6 }}>Opposition playbook</h3>
          <p className="stat-line" style={{ marginBottom: 12 }}>Actions taken: {opposition.actionsTaken}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {OPPOSITION_ACTIONS.map(a => (
              <button
                key={a.id}
                className={a.id === 'noconfidence' ? 'btn btn-danger' : 'btn'}
                disabled={toppled}
                onClick={() => act(a)}
                style={{ display: 'block', textAlign: 'left', padding: '12px 14px' }}
              >
                <b>{a.label}</b>
                <div style={{ fontSize: 12, color: a.id === 'noconfidence' ? 'rgba(255,255,255,.8)' : 'var(--text-dim)', marginTop: 4, fontWeight: 400, lineHeight: 1.45 }}>
                  {a.detail}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 10 }}>Opposition log</h3>
        {opposition.log.map((l, i) => (
          <div key={i} className="wire-item"><div>{l}</div></div>
        ))}
      </div>
    </div>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="meter">
      <div className="meter-label"><span>{label}</span><span>{value.toFixed(0)}%</span></div>
      <div className="meter-bar-bg"><div className="meter-bar" style={{ width: `${value}%`, background: color }} /></div>
    </div>
  );
}
