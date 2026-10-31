import { useMemo } from 'react';
import * as THREE from 'three';
import { AISLE_WIDTH, AISLE_X, ROOM, ROWS, ROW_DEFS, rowDepth, rowZ, tierHeight } from '../layout';
import { makeGlowTexture } from '../textures';

const SCONCE_Z = [-9, -4, 1, 6, 11];
const LIT_SCONCES = new Set([-4, 6]);
const WALL_INSET = 0.05;

function Sconce({ x, z, glow, lit }: { x: number; z: number; glow: THREE.Texture; lit: boolean }) {
  const facing = x > 0 ? -Math.PI / 2 : Math.PI / 2;
  return (
    <group position={[x, 4.5, z]} rotation={[0, facing, 0]}>
      <mesh>
        <boxGeometry args={[0.18, 0.45, 0.08]} />
        <meshBasicMaterial color="#ffb347" />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[1.8, 2.4]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {lit && <pointLight color="#ffb347" intensity={6} distance={12} decay={1.5} position={[0, 0, 0.6]} />}
    </group>
  );
}

export function Theatre() {
  const glow = useMemo(() => makeGlowTexture(), []);
  const depth = ROOM.back - ROOM.front;
  const lastRow = ROWS.length - 1;
  const rearStart = rowZ(lastRow) + rowDepth(lastRow) / 2;
  const rearDepth = ROOM.back - rearStart;

  return (
    <group>
      {/* BackSide shell: walls facing away from the camera are culled, giving a dollhouse view from outside */}
      <mesh position={[0, ROOM.height / 2, ROOM.front + depth / 2]}>
        <boxGeometry args={[ROOM.width, ROOM.height, depth]} />
        <meshLambertMaterial color="#14161c" side={THREE.BackSide} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, ROOM.front + depth / 2]}>
        <planeGeometry args={[ROOM.width, depth]} />
        <meshLambertMaterial color="#2a2f3d" />
      </mesh>

      {ROWS.map((_, r) =>
        r === 0 ? null : (
          <mesh key={r} position={[0, tierHeight(r) / 2, rowZ(r)]}>
            <boxGeometry args={[ROOM.width - 0.02, tierHeight(r), rowDepth(r)]} />
            <meshLambertMaterial color="#272c39" />
          </mesh>
        ),
      )}
      <mesh position={[0, tierHeight(lastRow) / 2, rearStart + rearDepth / 2]}>
        <boxGeometry args={[ROOM.width - 0.02, tierHeight(lastRow), rearDepth]} />
        <meshLambertMaterial color="#272c39" />
      </mesh>

      {ROW_DEFS.map((def, r) => (
        <mesh key={r} position={[AISLE_X, tierHeight(r) + 0.012, rowZ(r) - rowDepth(r) / 2 + 0.03]}>
          <boxGeometry args={[AISLE_WIDTH * 0.85, 0.02, 0.04]} />
          <meshBasicMaterial color={def.premium ? '#e8b75a' : '#5eead4'} toneMapped={false} />
        </mesh>
      ))}

      {SCONCE_Z.flatMap((z) => [
        <Sconce key={`l${z}`} x={-ROOM.width / 2 + WALL_INSET} z={z} glow={glow} lit={LIT_SCONCES.has(z)} />,
        <Sconce key={`r${z}`} x={ROOM.width / 2 - WALL_INSET} z={z} glow={glow} lit={LIT_SCONCES.has(z)} />,
      ])}
    </group>
  );
}
