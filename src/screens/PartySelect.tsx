import { useState } from 'react';
import { PLAYABLE_PARTIES } from '../data/parties';
import { LEADERS_BY_PARTY, type LeaderOption } from '../data/leaders';
import { useGameStore } from '../state/gameStore';
import type { PartyId } from '../data/parties';

export default function PartySelect() {
  const [party, setParty] = useState<PartyId | null>(null);
  const [leader, setLeader] = useState<LeaderOption | null>(null);
  const choosePartyAndLeader = useGameStore(s => s.choosePartyAndLeader);

  function selectParty(p: PartyId) {
    setParty(p);
    setLeader(null);
  }

  return (
    <div className="center-screen">
      <h2 className="section-title">Choose your political force</h2>
      <p className="section-sub">
        Geography is destiny. Pick where your strength already lies — and where you'll have to fight for every seat.
      </p>
      <div className="party-grid">
        {PLAYABLE_PARTIES.map(p => (
          <button
            key={p.id}
            className={`party-card${party === p.id ? ' selected' : ''}`}
            style={{ '--pc': p.color } as any}
            onClick={() => selectParty(p.id)}
          >
            <div className="party-card-head"><span className="party-dot" style={{ '--pc': p.color } as any} /><b>{p.short}</b></div>
            <div className="party-card-ideology">{p.ideology}</div>
            <div className="party-card-desc">{p.description}</div>
          </button>
        ))}
      </div>

      {party && (
        <>
          <h2 className="section-title" style={{ marginTop: 34 }}>Choose your leader</h2>
          <p className="section-sub">Real figures come with real baggage — establishment ties, family name, movement politics and all.</p>
          <div className="party-grid">
            {LEADERS_BY_PARTY[party].map(opt => (
              <button
                key={opt.id}
                className={`party-card${leader?.id === opt.id ? ' selected' : ''}`}
                onClick={() => setLeader(opt)}
              >
                <div className="party-card-head">
                  <b>{opt.name}</b>
                  {opt.real && <span className="tag tag-real">real figure</span>}
                </div>
                <div className="party-card-ideology">{opt.role}</div>
                <div className="party-card-desc">{opt.blurb}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <button
        className="btn btn-primary btn-lg"
        style={{ marginTop: 30 }}
        disabled={!party || !leader}
        onClick={() => party && leader && choosePartyAndLeader(party, leader)}
      >
        Begin the Campaign
      </button>

      <div className="disclaimer" style={{ marginTop: 28 }}>
        Real figures appear only as fictionalized, satirical characters. No real statements, quotes, or predictions
        are attributed to them — every event, dialogue line and outcome here is generated for gameplay.
      </div>
    </div>
  );
}
