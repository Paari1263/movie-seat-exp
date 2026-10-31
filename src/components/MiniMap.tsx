import { BEST_SEATS, ROWS, SEATS, SEAT_X_MAX, SEAT_X_MIN, heatHue, rowZ } from '../layout';
import { useStore } from '../store';

const BEST_IDS = new Set(BEST_SEATS.map((s) => s.id));

const PAD = 0.8;
const X0 = SEAT_X_MIN - PAD;
const X1 = SEAT_X_MAX + PAD;
const SCREEN_GAP = 1.6;
const Z0 = rowZ(0) - PAD - SCREEN_GAP;
const Z1 = rowZ(ROWS.length - 1) + PAD;
const WIDTH = 160;
const SCALE = WIDTH / (X1 - X0);
const HEIGHT = (Z1 - Z0) * SCALE;

const sx = (x: number) => (x - X0) * SCALE;
const sz = (z: number) => (z - Z0) * SCALE;

export function MiniMap() {
  const focused = useStore((s) => s.focusedSeat);
  const previous = useStore((s) => s.previousSeat);
  const selected = useStore((s) => s.selectedSeat);
  const heatmap = useStore((s) => s.heatmap);
  const enterPov = useStore((s) => s.enterPov);

  const fill = (id: string, premium: boolean, score: number) => {
    if (id === selected) return '#22c55e';
    if (id === focused) return '#2f7cf6';
    if (heatmap) return `hsl(${heatHue(score) * 360}, 70%, 45%)`;
    if (BEST_IDS.has(id)) return '#86efac';
    return premium ? '#d4a843' : '#4b5570';
  };

  return (
    <div className="minimap" aria-label="Seat map">
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <rect x={WIDTH * 0.15} y={4} width={WIDTH * 0.7} height={4} rx={2} fill="#cbd5e1" opacity={0.8} />
        <text x={WIDTH / 2} y={20} textAnchor="middle" fontSize={8} fill="#94a3b8">
          SCREEN
        </text>
        {SEATS.map((s) => (
          <circle
            key={s.id}
            cx={sx(s.position.x)}
            cy={sz(s.position.z)}
            r={s.premium ? 2.8 : 1.9}
            fill={fill(s.id, s.premium, s.score)}
            stroke={s.id === previous ? '#e2e8f0' : 'none'}
            strokeWidth={1.2}
            onClick={() => enterPov(s.id)}
          >
            <title>{`${s.id} · view ${s.score}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
