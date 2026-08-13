import { useState } from 'react';
import { useGameStore } from './state/gameStore';
import StartScreen from './screens/StartScreen';
import PartySelect from './screens/PartySelect';
import CampaignScreen from './screens/CampaignScreen';
import ElectionNight from './screens/ElectionNight';
import ResultsScreen from './screens/ResultsScreen';
import GovernmentFormation from './screens/GovernmentFormation';
import GoverningHub from './screens/GoverningHub';
import OppositionScreen from './screens/OppositionScreen';

export default function App() {
  const phase = useGameStore(s => s.phase);
  const startNewGame = useGameStore(s => s.startNewGame);
  const [confirmNew, setConfirmNew] = useState(false);

  return (
    <div className="app-shell">
      {/* Progress is saved automatically, so an in-progress run resumes on
          reload. That means the player also needs a deliberate way out of it. */}
      {phase !== 'START' && (
        <div className="new-game-corner">
          {confirmNew ? (
            <>
              <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Abandon this game?</span>
              <button className="btn btn-sm btn-danger" onClick={() => { setConfirmNew(false); startNewGame(); }}>Yes, restart</button>
              <button className="btn btn-sm" onClick={() => setConfirmNew(false)}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-sm" onClick={() => setConfirmNew(true)}>New Game</button>
          )}
        </div>
      )}

      {phase === 'START' && <StartScreen />}
      {phase === 'PARTY_SELECT' && <PartySelect />}
      {phase === 'CAMPAIGN' && <CampaignScreen />}
      {phase === 'ELECTION_NIGHT' && <ElectionNight />}
      {phase === 'RESULTS' && <ResultsScreen />}
      {phase === 'GOVERNMENT_FORMATION' && <GovernmentFormation />}
      {phase === 'GOVERNING' && <GoverningHub />}
      {phase === 'OPPOSITION' && <OppositionScreen />}
    </div>
  );
}
