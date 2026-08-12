import { useGameStore } from '../state/gameStore';

export default function StartScreen() {
  const startNewGame = useGameStore(s => s.startNewGame);
  return (
    <div className="center-screen">
      <span className="badge">Satirical political simulation — not a prediction</span>
      <h1 style={{ fontSize: 48, margin: '18px 0 8px' }}>THE PAKISTAN EXPERIMENT</h1>
      <p style={{ color: 'var(--text-dim)', maxWidth: 560, marginBottom: 28 }}>
        Fight a General Election seat by seat, form a government that might not survive the year,
        and find out whether winning the most votes is anything like winning power.
      </p>
      <button className="btn btn-primary" style={{ fontSize: 17, padding: '14px 34px' }} onClick={startNewGame}>
        Call the Election
      </button>
      <div className="disclaimer" style={{ marginTop: 40 }}>
        This is a fictionalized game inspired by the structure of Pakistan's electoral system. Constituencies,
        candidates, vote totals and events are procedurally generated for gameplay. Real political figures appear
        only as satirical characters — no real statements, results, or predictions are represented here.
      </div>
    </div>
  );
}
