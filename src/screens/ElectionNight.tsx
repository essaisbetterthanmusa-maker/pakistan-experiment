import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { PARTIES, type PartyId } from '../data/parties';
import { PROVINCE_LIST, NA_MAJORITY } from '../data/provinces';
import type { SeatResult } from '../engine/types';
import EstablishmentBadge from '../components/EstablishmentBadge';

const DURATION_MS = 160_000; // ~2.5 min real time for the full count
const START_HOUR = 12; // 12:00 PM
const END_HOURS = 16; // spans to 4:00 AM

function clockLabel(fraction: number) {
  const totalMinutes = fraction * END_HOURS * 60;
  let hour24 = (START_HOUR + Math.floor(totalMinutes / 60)) % 24;
  const min = Math.floor(totalMinutes % 60);
  const isAM = hour24 < 12 || hour24 === 24;
  let hour12 = hour24 % 12; if (hour12 === 0) hour12 = 12;
  return `${hour12}:${String(min).padStart(2, '0')} ${isAM ? 'AM' : 'PM'}`;
}

export default function ElectionNight() {
  const { electionResult, runElection, goToResults } = useGameStore();
  const [elapsed, setElapsed] = useState(0);
  const [wire, setWire] = useState<{ time: string; text: string }[]>([]);
  const [ticker, setTicker] = useState<string[]>([]);
  const [provinceFilter, setProvinceFilter] = useState<'ALL' | typeof PROVINCE_LIST[number]['id']>('ALL');
  const [establishmentOfferShown, setEstablishmentOfferShown] = useState(false);
  const [establishmentOfferOpen, setEstablishmentOfferOpen] = useState(false);
  const startRef = useRef<number | null>(null);
  const lastRevealedIdx = useRef(0);
  const timerRef = useRef<number>(0);

  useEffect(() => {
    if (electionResult) return;
    // Defer to the next tick so the screen shell paints first — running the
    // simulation synchronously on mount blocked the transition into election
    // night long enough that switching from Campaign looked like a freeze.
    const id = window.setTimeout(() => runElection(), 0);
    return () => window.clearTimeout(id);
  }, [electionResult, runElection]);

  const results = electionResult?.seatResults ?? [];
  const minTime = results[0]?.reportTimeMinutes ?? 0;
  const maxTime = results[results.length - 1]?.reportTimeMinutes ?? 1;

  const [revealedCount, setRevealedCount] = useState(0);
  const done = results.length > 0 && revealedCount >= results.length;

  useEffect(() => {
    if (results.length === 0) return;
    // Driven by wall-clock time on an interval rather than requestAnimationFrame:
    // rAF is suspended entirely while the tab is in the background, which froze
    // the whole count if the player switched away mid-election. setInterval keeps
    // firing (throttled) when hidden, and reading Date.now() means the count is
    // always correct for real elapsed time and catches up instantly on return.
    function tick() {
      if (startRef.current === null) startRef.current = Date.now();
      const e = Math.min(1, (Date.now() - startRef.current) / DURATION_MS);
      setElapsed(e);
      const mappedMinutes = minTime + e * (maxTime - minTime);
      let idx = lastRevealedIdx.current;
      while (idx < results.length && results[idx].reportTimeMinutes <= mappedMinutes) idx++;
      if (idx !== lastRevealedIdx.current) {
        const newly = results.slice(lastRevealedIdx.current, idx);
        lastRevealedIdx.current = idx;
        setRevealedCount(idx);
        pushEvents(newly, e);
      }
      if (e >= 0.5 && !establishmentOfferShown) {
        setEstablishmentOfferShown(true);
        setEstablishmentOfferOpen(true);
      }
      if (e >= 1) window.clearInterval(timerRef.current);
    }
    tick();
    timerRef.current = window.setInterval(tick, 120);
    return () => window.clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.length]);

  function pushEvents(newly: SeatResult[], e: number) {
    const label = clockLabel(e);
    const notable = newly.filter(r => r.upset || (r.seat.category === 'stronghold' && r.upset) || r.margin < 1500);
    const items: string[] = [];
    for (const r of notable.slice(0, 4)) {
      if (r.upset) items.push(`${r.seat.id} FLIPS — ${PARTIES[r.winner.party].short} takes a seat previously favoring ${PARTIES[r.seat.favoredParty].short}`);
      else if (r.margin < 1500) items.push(`${r.seat.id} razor-thin: ${PARTIES[r.winner.party].short} wins by ${r.margin.toLocaleString()} votes`);
    }
    if (items.length) {
      setTicker(prev => [...items, ...prev].slice(0, 40));
      setWire(prev => [{ time: label, text: items[0] }, ...prev].slice(0, 30));
    }
  }

  const revealed = results.slice(0, revealedCount);
  const filteredRevealed = provinceFilter === 'ALL' ? revealed : revealed.filter(r => r.seat.province === provinceFilter);

  const tally = useMemo(() => {
    const t: Record<PartyId, number> = {} as any;
    for (const r of revealed) t[r.winner.party] = (t[r.winner.party] ?? 0) + 1;
    return t;
  }, [revealed]);

  const sortedParties = (Object.keys(tally) as PartyId[])
    .filter(id => tally[id] > 0)
    .sort((a, b) => tally[b] - tally[a]);

  const totalGeneralReporting = revealed.length;

  return (
    <div className="election-night">
      <div className="en-top">
        <div>
          <b style={{ color: 'var(--accent-2)' }}>THE PAKISTAN EXPERIMENT</b>
          <span style={{ marginLeft: 12, color: 'var(--text-dim)' }}>ELECTION NIGHT</span>
        </div>
        <div className="en-clock">{clockLabel(elapsed)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <EstablishmentBadge compact />
          <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Reporting {totalGeneralReporting} / {results.length}</span>
        </div>
      </div>

      <div className="en-left">
        <h3 style={{ marginBottom: 10 }}>National Tally</h3>
        {sortedParties.map(id => (
          <div className="tally-row" key={id}>
            <span className="tally-name">{PARTIES[id].short}</span>
            <div className="tally-bar-bg">
              <div className="tally-bar" style={{ width: `${Math.min(100, (tally[id] / NA_MAJORITY) * 100)}%`, background: PARTIES[id].color }} />
            </div>
            <span className="tally-num">{tally[id]}</span>
          </div>
        ))}
        <div className="majority-track" style={{ marginTop: 14 }}>
          <div className="majority-marker" style={{ left: '100%' }} title={`Majority (${NA_MAJORITY} of 336, projected)`} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>General seats only — reserved seats (60 women, 10 minority) allocated after count. Majority needs {NA_MAJORITY}/336 overall.</p>

        <h3 style={{ margin: '20px 0 8px' }}>Provinces</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setProvinceFilter('ALL')}>All</button>
          {PROVINCE_LIST.map(p => (
            <button key={p.id} className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setProvinceFilter(p.id)}>{p.id}</button>
          ))}
        </div>
      </div>

      <div className="en-center">
        <h3 style={{ marginBottom: 10 }}>{provinceFilter === 'ALL' ? 'National' : provinceFilter} Seat Board ({filteredRevealed.length} declared)</h3>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 10 }}>Each square is one constituency, colored by the party that won it. Hover a square for details, or read the list below.</p>
        <div className="legend-row">
          {sortedParties.map(id => (
            <span className="legend-item" key={id}><span className="legend-dot" style={{ background: PARTIES[id].color }} />{PARTIES[id].short}</span>
          ))}
        </div>
        <div className="seat-board">
          {filteredRevealed.map(r => (
            <div
              key={r.seat.id}
              className="seat-chip flash"
              title={`${r.seat.name} — ${PARTIES[r.winner.party].short} (${r.winner.candidateName})`}
              style={{ background: PARTIES[r.winner.party].color }}
            />
          ))}
        </div>

        <h3 style={{ margin: '22px 0 10px' }}>Latest declarations</h3>
        <div className="declare-list">
          {[...filteredRevealed].reverse().slice(0, 12).map(r => (
            <div className="declare-row" key={r.seat.id}>
              <span className="legend-dot" style={{ background: PARTIES[r.winner.party].color, flexShrink: 0 }} />
              <span className="declare-seat">{r.seat.name}</span>
              <span className="declare-winner">{r.winner.candidateName} <b>({PARTIES[r.winner.party].short})</b></span>
              <span className="declare-margin">won by {r.margin.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {done && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <h2>ALL GENERAL SEATS DECLARED</h2>
            <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={goToResults}>See Full Results →</button>
          </div>
        )}
      </div>

      <div className="en-right">
        <h3 style={{ marginBottom: 10 }}>Live Wire</h3>
        {wire.map((w, i) => (
          <div className="wire-item" key={i}>
            <div className="wire-time">{w.time}</div>
            <div>{w.text}</div>
          </div>
        ))}
        {establishmentOfferOpen && (
          <EstablishmentOffer onClose={() => setEstablishmentOfferOpen(false)} />
        )}
      </div>

      <div className="en-bottom">
        <div className="ticker-scroll" style={{ display: 'inline-block', animation: 'ticker 40s linear infinite' }}>
          {ticker.length === 0 ? <span className="ticker-item">Counting underway across all constituencies…</span> :
            ticker.map((t, i) => <span className="ticker-item" key={i}><b>BREAKING</b> — {t}</span>)}
        </div>
      </div>
    </div>
  );
}

function EstablishmentOffer({ onClose }: { onClose: () => void }) {
  const advanceGoverning = useGameStore(s => s.advanceGoverning);
  const [choice, setChoice] = useState<string | null>(null);
  return (
    <div className="card" style={{ borderColor: 'var(--warn)', marginBottom: 14 }}>
      <b style={{ color: 'var(--warn)' }}>PRIVATE CONTACT</b>
      <p style={{ fontSize: 12, margin: '6px 0' }}>
        "An intermediary has been in touch. No majority looks certain yet — several undecided independents could be
        steered your way, if you're willing to keep the relationship 'working'."
      </p>
      {!choice ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button className="btn" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => { setChoice('accept'); advanceGoverning({ establishment: 'FAVOURED' }); }}>Accept</button>
          <button className="btn" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => { setChoice('negotiate'); advanceGoverning({ establishment: 'WORKING' }); }}>Negotiate</button>
          <button className="btn btn-danger" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => { setChoice('refuse'); advanceGoverning({ establishment: 'COLD' }); }}>Refuse</button>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>
            {choice === 'accept' && 'Understood. This will shape how government formation goes — nothing is guaranteed.'}
            {choice === 'negotiate' && 'A cautious middle path. The relationship stays workable, for now.'}
            {choice === 'refuse' && 'Message sent. Don\'t expect favors during coalition talks.'}
          </p>
          <button className="btn" style={{ fontSize: 12, padding: '5px 10px', marginTop: 8 }} onClick={onClose}>Close</button>
        </>
      )}
    </div>
  );
}
