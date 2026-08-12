import { useMemo } from 'react';
import { useGameStore } from '../state/gameStore';
import { PROVINCE_LIST } from '../data/provinces';
import { PARTIES } from '../data/parties';
import EstablishmentBadge from '../components/EstablishmentBadge';

export default function CampaignScreen() {
  const { seats, playerParty, leader, campaign, climate, updateCampaignSpend, updateMediaSpend, toggleTargetSeat, recruitElectable, rejectElectable, finishCampaign } = useGameStore();

  const winnableSeats = useMemo(() => {
    if (!playerParty) return [];
    return seats
      .map(seat => {
        const mine = seat.slates.find(s => s.party === playerParty);
        const sorted = [...seat.slates].sort((a, b) => b.baseline - a.baseline);
        const rank = sorted.findIndex(s => s.party === playerParty);
        return { seat, mine, rank };
      })
      .filter(x => x.mine && x.rank >= 0 && x.rank <= 2)
      .sort((a, b) => (a.rank - b.rank) || ((b.mine?.baseline ?? 0) - (a.mine?.baseline ?? 0)))
      .slice(0, 40);
  }, [seats, playerParty]);

  const electableTargets = useMemo(() => {
    return seats
      .map(seat => ({ seat, strongest: [...seat.slates].sort((a, b) => b.candidateStrength - a.candidateStrength)[0] }))
      .filter(x => x.strongest && x.strongest.candidateStrength >= 8 && x.strongest.party !== playerParty)
      .slice(0, 25);
  }, [seats, playerParty]);

  const remaining = campaign.totalBudget - campaign.spent;

  return (
    <div className="app-shell">
      <div className="campaign-header">
        <div>
          <h2>Campaign — {playerParty && PARTIES[playerParty].short}{leader ? ` · ${leader.name}` : ''}</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginTop: 4 }}>Rs {remaining.toFixed(0)}M of Rs {campaign.totalBudget}M remaining</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <EstablishmentBadge />
          <button className="btn btn-primary" onClick={finishCampaign}>Go to Polling Day →</button>
        </div>
      </div>

      {climate && climate.events.length > 0 && (
        <div className="card" style={{ margin: '16px 20px 0', borderColor: 'var(--accent-2)' }}>
          <h3 style={{ marginBottom: 8, color: 'var(--accent-2)' }}>The political weather this cycle</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {climate.events.map(e => (
              <div key={e.id} style={{ fontSize: 14 }}>
                <b>{e.headline}</b>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2 }}>{e.detail}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dimmer)', marginTop: 10 }}>
            These forces reshape party strength across every constituency — no two elections play out the same way.
          </p>
        </div>
      )}

      <div className="campaign-layout">
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Provincial spend</h3>
          {PROVINCE_LIST.map(p => (
            <div className="province-row" key={p.id}>
              <span style={{ width: 90 }}>{p.id}</span>
              <input
                type="range" min={0} max={40} step={1}
                value={campaign.provinceSpend[p.id]}
                onChange={e => updateCampaignSpend(p.id, Number(e.target.value))}
              />
              <span style={{ fontFamily: 'var(--mono)', width: 32, textAlign: 'right' }}>{campaign.provinceSpend[p.id]}</span>
            </div>
          ))}
          <h3 style={{ margin: '20px 0 10px' }}>National media push</h3>
          <div className="province-row">
            <span style={{ width: 90 }}>TV / Digital</span>
            <input type="range" min={0} max={30} step={1} value={campaign.mediaSpend} onChange={e => updateMediaSpend(Number(e.target.value))} />
            <span style={{ fontFamily: 'var(--mono)', width: 32, textAlign: 'right' }}>{campaign.mediaSpend}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 14, lineHeight: 1.5 }}>
            Spend has diminishing returns — spreading thin across every province wastes it. Which seats can you realistically flip?
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <h3 style={{ marginBottom: 6 }}>Targeted ground game ({campaign.targetedSeats.length}/12)</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>Winnable or close seats for your party — pick where to put organizers and rallies.</p>
          <div className="seat-list" style={{ marginBottom: 18 }}>
            {winnableSeats.map(({ seat, rank }) => {
              const targeted = campaign.targetedSeats.includes(seat.id);
              return (
                <div key={seat.id} className={`seat-row${targeted ? ' targeted' : ''}`} onClick={() => toggleTargetSeat(seat.id)} style={{ cursor: 'pointer' }}>
                  <span>{seat.name} <span className="tag">{seat.category}</span> <span className="tag">{rank === 0 ? 'leading' : rank === 1 ? 'close 2nd' : '3rd'}</span></span>
                  <span>{targeted ? '✓ targeted' : 'target'}</span>
                </div>
              );
            })}
          </div>

          <h3 style={{ marginBottom: 6 }}>Electables you could recruit</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>
            Strong local networks currently aligned elsewhere. Recruit them and their vote bank comes with them — refuse an approach and they may run as a vote-splitting independent.
          </p>
          <div className="seat-list">
            {electableTargets.map(({ seat, strongest }) => {
              const recruited = campaign.recruitedElectables.includes(seat.id);
              const rejected = campaign.rejectedElectables.includes(seat.id);
              return (
                <div key={seat.id} className="seat-row">
                  <span>{seat.name} — {strongest.candidateName} <span className="tag">{PARTIES[strongest.party].short}</span> <span className="tag">strength {strongest.candidateStrength}</span></span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-sm" style={{ background: recruited ? 'var(--accent)' : undefined, color: recruited ? '#04180f' : undefined }} onClick={() => recruitElectable(seat.id)}>Recruit</button>
                    <button className="btn btn-sm" style={{ background: rejected ? 'var(--danger)' : undefined }} onClick={() => rejectElectable(seat.id)}>Refuse</button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
