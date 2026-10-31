import { Canvas } from '@react-three/fiber';
import { CameraRig } from './components/CameraRig';
import { Overlay } from './components/Overlay';
import { Screen } from './components/Screen';
import { Seats } from './components/Seats';
import { SurroundSound } from './components/SurroundSound';
import { Theatre } from './components/Theatre';

export default function App() {
  return (
    <div className="app">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [10, 15, 21], fov: 55, near: 0.05, far: 200 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#000']} />
        <fog attach="fog" args={['#000', 35, 70]} />
        <ambientLight intensity={0.45} />
        <hemisphereLight args={['#5a6a90', '#101218', 0.6]} />
        <directionalLight position={[0, 12, 4]} intensity={0.5} color="#c8d2ff" />
        <Theatre />
        <Screen />
        <Seats />
        <SurroundSound />
        <CameraRig />
      </Canvas>
      <Overlay />
    </div>
  );
}
