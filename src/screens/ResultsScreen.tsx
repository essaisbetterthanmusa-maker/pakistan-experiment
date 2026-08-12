import { useGameStore } from '../state/gameStore';
import { PARTIES, type PartyId } from '../data/parties';
import { PROVINCES, type ProvinceId } from '../data/provinces';
import { NA_MAJORITY } from '../data/provinces';
import { SENATE_SEATS, SENATE_MAJORITY } from '../engine/senate';

export default function ResultsScreen() {
  const { electionResult, provincialAssemblies, senateByParty, goToGovernmentFormation } = useGameStore();
  if (!electionResult) return null;

  const sortedNational = (Object.keys(electionResult.totalByParty) as PartyId[])
    .filter(id => electionResult.totalByParty[id] > 0)
    .sort((a, b) => electionResult.totalByParty[b] - electionResult.totalByParty[a]);

  const sortedSenate = senateByParty
    ? (Object.keys(senateByParty) as PartyId[]).filter(id => senateByParty[id] > 0).sort((a, b) => senateByParty[b] - senateByParty[a])
    : [];

  const provinceIds = provincialAssemblies ? (Object.keys(provincialAssemblies) as ProvinceId[]) : [];

  return (
    <div className="page-wrap">
      <div className="page-head">
        <h2>Full Election Results</h2>
        <p>National Assembly, all four provincial assemblies, and the Senate carryover — before you try to form a government.</p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 4 }}>National Assembly — final, with reserved seats</h3>
        <p className="stat-line" style={{ marginBottom: 12 }}>336 total seats (266 general + 60 women + 10 minority). Majority needs {NA_MAJORITY}.</p>
        {sortedNational.map(id => (
          <div className="tally-row" key={id}>
            <span className="tally-name">{PARTIES[id].short}</span>
            <div className="tally-bar-bg">
              <div className="tally-bar" style={{ width: `${Math.min(100, (electionResult.totalByParty[id] / NA_MAJORITY) * 100)}%`, background: PARTIES[id].color }} />
            </div>
            <span className="tally-num">{electionResult.totalByParty[id]}</span>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3 style={{ marginBottom: 4 }}>Provincial overview</h3>
        <p className="stat-line" style={{ marginBottom: 14 }}>Each province was fought as its own seat-by-seat election. A federal majority does not guarantee provincial control.</p>
        <div className="panel-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {provinceIds.map(pid => {
            const pa = provincialAssemblies![pid];
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
                {!pa.hung && pa.cmName ? (
                  <p className="stat-line" style={{ margin: '6px 0' }}>
                    Chief Minister designate: <b>{pa.cmName}</b> ({PARTIES[pa.cmParty!].short})
                    {pa.coalition.length > 0 && <> · with {pa.coalition.map(c => PARTIES[c.party].short).join(', ')}</>}
                  </p>
                ) : (
                  <p className="stat-line" style={{ margin: '6px 0' }}>No party or coalition reached {pa.majority} of {pa.totalSeats} seats.</p>
                )}
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

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 4 }}>Senate of Pakistan</h3>
        <p className="stat-line" style={{ marginBottom: 12 }}>
          {SENATE_SEATS} seats, majority {SENATE_MAJORITY}. Elected indirectly by provincial assemblies in staggered
          thirds — this NA result will only slowly change who holds it.
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

      <div style={{ textAlign: 'center' }}>
        <button className="btn btn-primary btn-lg" onClick={goToGovernmentFormation}>Proceed to Government Formation →</button>
      </div>
    </div>
  );
}
