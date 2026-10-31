import * as THREE from 'three';

export const LEFT_COUNT = 8;
export const RIGHT_COUNT = 12;
export const SEAT_PITCH = 0.62;
export const AISLE_WIDTH = 1.3;
export const ROW_DEPTH = 1.15;
export const FIRST_ROW_Z = -3;
export const RISER = 0.32;
export const EYE_HEIGHT = 1.15;

export const ROOM = { width: 22, height: 12, front: -12.5, back: 12.5 };
// curve: screen depth (sagitta) as a fraction of its width.
export const SCREEN = { width: 16, height: 8, z: -12.3, bottom: 2.6, curve: 0.05 };
export const SCREEN_CENTER = new THREE.Vector3(0, SCREEN.bottom + SCREEN.height / 2, SCREEN.z);

interface RowDef {
  label: string;
  premium: boolean;
  depth: number;
  pitch: number;
  left: number;
  right: number;
}

const STANDARD_ROW = { premium: false, depth: ROW_DEPTH, pitch: SEAT_PITCH, left: LEFT_COUNT, right: RIGHT_COUNT };

// Prime recliners: wider pitch and deeper row, blocks aligned to the same aisle.
export const ROW_DEFS: RowDef[] = [
  ...'ABCDEFGHIJK'.split('').map((label) => ({ label, ...STANDARD_ROW })),
  { label: 'P', premium: true, depth: 1.8, pitch: 1.0, left: 5, right: 7 },
];
export const ROWS = ROW_DEFS.map((r) => r.label);

const STANDARD_WIDTH = (LEFT_COUNT + RIGHT_COUNT) * SEAT_PITCH + AISLE_WIDTH;
export const AISLE_X = -STANDARD_WIDTH / 2 + LEFT_COUNT * SEAT_PITCH + AISLE_WIDTH / 2;

const ROW_Z = ROW_DEFS.reduce<number[]>((acc, r, i) => {
  acc.push(i === 0 ? FIRST_ROW_Z : acc[i - 1] + ROW_DEFS[i - 1].depth / 2 + r.depth / 2);
  return acc;
}, []);

// Prime rows get an extra riser so reclined eyes clear the seat backs in front.
const PREMIUM_LIFT = 0.55;
export const tierHeight = (rowIndex: number) => rowIndex * RISER + (ROW_DEFS[rowIndex]?.premium ? PREMIUM_LIFT : 0);
export const rowZ = (rowIndex: number) => ROW_Z[rowIndex];
export const rowDepth = (rowIndex: number) => ROW_DEFS[rowIndex].depth;

export interface Seat {
  id: string;
  row: string;
  rowIndex: number;
  number: number;
  premium: boolean;
  position: THREE.Vector3;
  eye: THREE.Vector3;
  score: number;
  zone: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const IDEAL_DISTANCE_RATIO = 1.15;

// 0-100: distance vs screen width, horizontal off-axis angle, and neck tilt to screen centre.
function rateView(eye: THREE.Vector3) {
  const dz = eye.z - SCREEN_CENTER.z;
  const distance = clamp01(1 - Math.abs(dz / SCREEN.width - IDEAL_DISTANCE_RATIO) / 1.0);
  const horizontal = clamp01(1 - Math.abs(Math.atan2(eye.x - SCREEN_CENTER.x, dz)) / 0.6);
  const vertical = clamp01(1 - Math.abs(Math.atan2(SCREEN_CENTER.y - eye.y, dz)) / 0.55);
  return Math.round(100 * (0.45 * distance + 0.35 * horizontal + 0.2 * vertical));
}

function zoneOf(rowIndex: number, premium: boolean, x: number) {
  const depth = premium ? 'Prime' : rowIndex < 4 ? 'Front' : rowIndex < 8 ? 'Middle' : 'Back';
  const side = Math.abs(x) < 1.6 ? 'Centre' : x < 0 ? 'Left' : 'Right';
  return `${depth} · ${side}`;
}

export function verdict(score: number) {
  if (score >= 88) return 'Excellent';
  if (score >= 75) return 'Great';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

export const SEATS: Seat[] = ROW_DEFS.flatMap((def, rowIndex) => {
  const leftEdge = AISLE_X - AISLE_WIDTH / 2 - def.left * def.pitch;
  return Array.from({ length: def.left + def.right }, (_, n) => {
    const x = leftEdge + def.pitch / 2 + n * def.pitch + (n >= def.left ? AISLE_WIDTH : 0);
    const y = tierHeight(rowIndex);
    const z = rowZ(rowIndex);
    // Recliners sit lower and further back.
    const eye = def.premium ? new THREE.Vector3(x, y + 1.0, z + 0.25) : new THREE.Vector3(x, y + EYE_HEIGHT, z + 0.1);
    return {
      id: `${def.label}${n + 1}`,
      row: def.label,
      rowIndex,
      number: n + 1,
      premium: def.premium,
      position: new THREE.Vector3(x, y, z),
      eye,
      score: rateView(eye),
      zone: zoneOf(rowIndex, def.premium, x),
    };
  });
});

// Top ~7.5% of the room, keeping any seats tied with the cut-off score.
const BEST_SHARE = 0.075;
const ranked = [...SEATS].sort((a, b) => b.score - a.score);
const bestCutoff = ranked[Math.max(0, Math.round(SEATS.length * BEST_SHARE) - 1)].score;
export const BEST_SEATS = ranked.filter((s) => s.score >= bestCutoff);
export const SCORE_MIN = Math.min(...SEATS.map((s) => s.score));
export const SCORE_MAX = Math.max(...SEATS.map((s) => s.score));
// 0 (red, worst in this room) .. 1/3 (green, best in this room) as an HSL hue fraction.
export const heatHue = (score: number) => clamp01((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) / 3;

export const SEAT_X_MIN = Math.min(...SEATS.map((s) => s.position.x));
export const SEAT_X_MAX = Math.max(...SEATS.map((s) => s.position.x));

export const seatById = new Map(SEATS.map((s) => [s.id, s]));
const seatsByRow = ROWS.map((row) => SEATS.filter((s) => s.row === row));

export type Direction = 'left' | 'right' | 'forward' | 'back';

function nearestInRow(rowIndex: number, x: number) {
  const row = seatsByRow[rowIndex];
  if (!row) return undefined;
  return row.reduce((best, s) => (Math.abs(s.position.x - x) < Math.abs(best.position.x - x) ? s : best));
}

export function neighbor(seat: Seat, dir: Direction): Seat | undefined {
  switch (dir) {
    case 'left':
      return seatById.get(`${seat.row}${seat.number - 1}`);
    case 'right':
      return seatById.get(`${seat.row}${seat.number + 1}`);
    case 'forward':
      return nearestInRow(seat.rowIndex - 1, seat.position.x);
    case 'back':
      return nearestInRow(seat.rowIndex + 1, seat.position.x);
  }
}
