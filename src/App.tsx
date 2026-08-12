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
  return (
    <div className="app-shell">
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
