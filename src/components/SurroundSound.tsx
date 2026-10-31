import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { SPEAKERS, getSurround, peekSurround, type Speaker } from '../audio';
import { useStore } from '../store';

const WALL_ROTATION: Record<Speaker['wall'], number> = {
  screen: 0,
  left: Math.PI / 2,
  right: -Math.PI / 2,
  back: Math.PI,
};

export function SurroundSound() {
  const camera = useThree((s) => s.camera);
  const muted = useStore((s) => s.muted);

  useEffect(() => {
    if (muted) {
      peekSurround()?.setMuted(true);
      return;
    }
    const surround = getSurround();
    camera.add(surround.listener);
    surround.setMuted(false);
  }, [muted, camera]);

  useEffect(
    () => () => {
      const surround = peekSurround();
      if (surround) camera.remove(surround.listener);
    },
    [camera],
  );

  return (
    <group>
      {SPEAKERS.filter((s) => s.wall !== 'screen').map((s) => (
        // Single-sided panel facing into the room so it's culled in the outside dollhouse view.
        <mesh key={s.id} position={s.position} rotation={[0, WALL_ROTATION[s.wall], 0]}>
          <planeGeometry args={[0.55, 0.75]} />
          <meshLambertMaterial color="#1a1d24" />
        </mesh>
      ))}
    </group>
  );
}
