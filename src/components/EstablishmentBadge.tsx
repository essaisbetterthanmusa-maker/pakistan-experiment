import { useGameStore } from '../state/gameStore';
import type { EstablishmentStance } from '../engine/types';

const STANCE_COLOR: Record<EstablishmentStance, string> = {
  HOSTILE: 'var(--danger)',
  COLD: 'var(--warn)',
  NEUTRAL: 'var(--text-dim)',
  WORKING: 'var(--accent)',
  FAVOURED: 'var(--accent-2)',
};

const STANCE_LABEL: Record<EstablishmentStance, string> = {
  HOSTILE: 'Hostile',
  COLD: 'Cold',
  NEUTRAL: 'Neutral',
  WORKING: 'Working relationship',
  FAVOURED: 'Favoured',
};

export default function EstablishmentBadge({ compact = false }: { compact?: boolean }) {
  const stance = useGameStore(s => s.meters.establishment);
  return (
    <span
      title="The Establishment: Pakistan's military-security apparatus, which shapes electables, alliances and government survival from behind the scenes."
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: compact ? 11 : 12, fontWeight: 700,
        padding: compact ? '3px 8px' : '5px 11px',
        borderRadius: 20, border: `1px solid ${STANCE_COLOR[stance]}`,
        color: STANCE_COLOR[stance], background: 'var(--bg-panel-2)',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: STANCE_COLOR[stance], display: 'inline-block' }} />
      ESTABLISHMENT: {STANCE_LABEL[stance].toUpperCase()}
    </span>
  );
}
