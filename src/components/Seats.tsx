import { useLayoutEffect, useMemo, useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BEST_SEATS, ROWS, SEATS, SEAT_X_MAX, SEAT_X_MIN, heatHue, rowZ, tierHeight, type Seat } from '../layout';
import { useStore } from '../store';
import { makeTextTexture } from '../textures';

const COLORS = {
  available: new THREE.Color('#6b7899'),
  premium: new THREE.Color('#d4a843'),
  best: new THREE.Color('#86efac'),
  hovered: new THREE.Color('#a3b4dc'),
  focused: new THREE.Color('#2f7cf6'),
  selected: new THREE.Color('#22c55e'),
};

const BEST_IDS = new Set(BEST_SEATS.map((s) => s.id));

type Part = [w: number, h: number, d: number, x: number, y: number, z: number, rx?: number];

// Seats face -Z (toward the screen); origin is the floor point under the seat centre.
const STANDARD_PARTS: Part[] = [
  [0.4, 0.36, 0.4, 0, 0.18, 0],
  [0.52, 0.12, 0.5, 0, 0.42, -0.04],
  [0.54, 0.7, 0.1, 0, 0.82, 0.24, 0.15],
  [0.06, 0.06, 0.5, -0.3, 0.64, -0.02],
  [0.06, 0.06, 0.5, 0.3, 0.64, -0.02],
  [0.06, 0.6, 0.08, -0.3, 0.32, 0.15],
  [0.06, 0.6, 0.08, 0.3, 0.32, 0.15],
];

const RECLINER_PARTS: Part[] = [
  [0.72, 0.36, 0.7, 0, 0.18, 0],
  [0.72, 0.16, 0.72, 0, 0.44, -0.02],
  [0.76, 0.85, 0.18, 0, 0.88, 0.4, 0.3],
  [0.7, 0.1, 0.4, 0, 0.3, -0.58, -0.25],
  [0.12, 0.62, 0.82, -0.43, 0.31, 0],
  [0.12, 0.62, 0.82, 0.43, 0.31, 0],
];

function buildGeometry(parts: Part[]) {
  const boxes = parts.map(([w, h, d, x, y, z, rx]) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (rx) g.rotateX(rx);
    g.translate(x, y, z);
    return g;
  });
  const merged = mergeGeometries(boxes)!;
  boxes.forEach((b) => b.dispose());
  return merged;
}

const STANDARD_SEATS = SEATS.filter((s) => !s.premium);
const PREMIUM_SEATS = SEATS.filter((s) => s.premium);

function RowLabels() {
  const textures = useMemo(() => ROWS.map((r) => makeTextTexture(r)), []);
  return (
    <group>
      {ROWS.flatMap((row, i) =>
        [SEAT_X_MIN - 0.8, SEAT_X_MAX + 0.8].map((x) => (
          <sprite key={`${row}${x}`} position={[x, tierHeight(i) + 0.6, rowZ(i)]} scale={[0.45, 0.45, 1]}>
            <spriteMaterial map={textures[i]} transparent depthWrite={false} />
          </sprite>
        )),
      )}
    </group>
  );
}

function SeatGroup({ seats, parts, baseColor }: { seats: Seat[]; parts: Part[]; baseColor: THREE.Color }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const geometry = useMemo(() => buildGeometry(parts), [parts]);
  const heatColors = useMemo(() => seats.map((s) => new THREE.Color().setHSL(heatHue(s.score), 0.7, 0.45)), [seats]);
  const heatmap = useStore((s) => s.heatmap);
  const hovered = useStore((s) => s.hoveredSeat);
  const focused = useStore((s) => s.focusedSeat);
  const selected = useStore((s) => s.selectedSeat);
  const setHovered = useStore((s) => s.setHovered);
  const enterPov = useStore((s) => s.enterPov);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    seats.forEach((s, i) => {
      m.makeTranslation(s.position.x, s.position.y, s.position.z);
      ref.current.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [seats]);

  useLayoutEffect(() => {
    seats.forEach((s, i) => {
      const c =
        s.id === selected
          ? COLORS.selected
          : s.id === focused
            ? COLORS.focused
            : s.id === hovered
              ? COLORS.hovered
              : heatmap
                ? heatColors[i]
                : BEST_IDS.has(s.id)
                  ? COLORS.best
                  : baseColor;
      ref.current.setColorAt(i, c);
    });
    ref.current.instanceColor!.needsUpdate = true;
  }, [seats, baseColor, heatColors, heatmap, hovered, focused, selected]);

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const id = seats[e.instanceId].id;
    if (id !== useStore.getState().hoveredSeat) setHovered(id);
    document.body.style.cursor = 'pointer';
  };

  const onOut = () => {
    setHovered(null);
    document.body.style.cursor = 'auto';
  };

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // Ignore clicks that were really orbit/look drags.
    if (e.delta > 5 || e.instanceId === undefined) return;
    e.stopPropagation();
    enterPov(seats[e.instanceId].id);
  };

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, seats.length]}
      onPointerMove={onMove}
      onPointerOut={onOut}
      onClick={onClick}
    >
      <meshLambertMaterial transparent opacity={0.72} />
    </instancedMesh>
  );
}

export function Seats() {
  return (
    <group>
      <SeatGroup seats={STANDARD_SEATS} parts={STANDARD_PARTS} baseColor={COLORS.available} />
      <SeatGroup seats={PREMIUM_SEATS} parts={RECLINER_PARTS} baseColor={COLORS.premium} />
      <RowLabels />
    </group>
  );
}
