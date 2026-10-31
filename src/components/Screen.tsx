import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCREEN } from '../layout';
import { registerVideo } from '../audio';
import { useStore } from '../store';
import { makeTextTexture } from '../textures';

const VIDEO_SRC = '/Dolby_Surround.mp4';
const VIDEO_TYPE = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
const FALLBACK_FPS = 24;

type VideoStatus = 'loading' | 'ready' | 'unsupported';

const STATUS_TEXT: Record<Exclude<VideoStatus, 'ready'>, string> = {
  loading: 'Loading trailer…',
  unsupported: "This browser can't play the trailer (H.264) — open in Chrome or Safari",
};

function drawFallback(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, message: string) {
  const hue = (t * 15) % 360;
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, `hsl(${hue}, 65%, 22%)`);
  bg.addColorStop(1, `hsl(${(hue + 70) % 360}, 65%, 10%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 6; i++) {
    const x = (Math.sin(t * 0.5 + i * 1.3) * 0.4 + 0.5) * w;
    const y = (Math.cos(t * 0.4 + i * 1.7) * 0.35 + 0.5) * h;
    const r = h * (0.18 + 0.06 * Math.sin(t + i));
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `bold ${Math.round(h / 8)}px system-ui, sans-serif`;
  ctx.fillText('SEAT VIEW PREVIEW', w / 2, h / 2 - h / 25);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `${Math.round(h / 21)}px system-ui, sans-serif`;
  ctx.fillText(message, w / 2, h / 2 + h / 13);
}

function drawProgress(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number) {
  const barW = w * 0.4;
  const x = (w - barW) / 2;
  const y = h / 2 + h / 6;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, barW, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(x, y, barW * progress, 4);
}

function bufferedFraction(video: HTMLVideoElement) {
  const { buffered, duration } = video;
  if (!buffered.length || !Number.isFinite(duration) || duration <= 0) return null;
  return Math.min(1, buffered.end(buffered.length - 1) / duration);
}

// Circular arc through the screen edges: centre sits at z=0, edges come forward by the sagitta.
function curvedPlane(width: number, height: number, sagitta: number, arcWidth = width) {
  const half = arcWidth / 2;
  const radius = (sagitta * sagitta + half * half) / (2 * sagitta);
  const geometry = new THREE.PlaneGeometry(width, height, 64, 1);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, radius - Math.sqrt(radius * radius - x * x));
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function Screen() {
  const muted = useStore((s) => s.muted);
  const playing = useStore((s) => s.playing);
  const video = useMemo(() => {
    const v = document.createElement('video');
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    if (v.canPlayType(VIDEO_TYPE)) v.src = VIDEO_SRC;
    return v;
  }, []);
  const [status, setStatus] = useState<VideoStatus>(() => (video.src ? 'loading' : 'unsupported'));
  const videoReady = status === 'ready';

  const videoTexture = useMemo(() => {
    const t = new THREE.VideoTexture(video);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [video]);

  const fallback = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    drawFallback(ctx, canvas.width, canvas.height, 0, STATUS_TEXT.loading);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { ctx, texture, w: canvas.width, h: canvas.height, lastDraw: 0 };
  }, []);

  const logo = useMemo(
    () => makeTextTexture('IMAX', { width: 256, height: 96, font: 'bold 56px system-ui, sans-serif', color: '#d7dbe3', background: '#1b1e25' }),
    [],
  );

  useEffect(() => {
    registerVideo(video);
    // Some browsers fire loadeddata for the audio track even when the video codec is unsupported.
    const onReady = () => setStatus(video.videoWidth > 0 ? 'ready' : 'unsupported');
    const onError = () => setStatus('unsupported');
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('error', onError);
    return () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('error', onError);
      video.pause();
    };
  }, [video]);

  useEffect(() => {
    video.muted = muted;
    if (playing && videoReady) video.play().catch(() => undefined);
    else video.pause();
  }, [video, muted, playing, videoReady]);

  useFrame(({ clock }) => {
    if (videoReady || !playing) return;
    const t = clock.elapsedTime;
    if (t - fallback.lastDraw < 1 / FALLBACK_FPS) return;
    fallback.lastDraw = t;
    const progress = status === 'loading' ? bufferedFraction(video) : null;
    const message =
      progress === null ? STATUS_TEXT[status as Exclude<VideoStatus, 'ready'>] : `Loading trailer… ${Math.round(progress * 100)}%`;
    drawFallback(fallback.ctx, fallback.w, fallback.h, t, message);
    if (progress !== null) drawProgress(fallback.ctx, fallback.w, fallback.h, progress);
    fallback.texture.needsUpdate = true;
  });

  const cy = SCREEN.bottom + SCREEN.height / 2;
  const sagitta = SCREEN.width * SCREEN.curve;
  const screenGeometry = useMemo(() => curvedPlane(SCREEN.width, SCREEN.height, sagitta), [sagitta]);
  const maskGeometry = useMemo(
    () => curvedPlane(SCREEN.width + 1.2, SCREEN.height + 1.2, sagitta, SCREEN.width),
    [sagitta],
  );

  return (
    <group>
      <mesh position={[0, cy, SCREEN.z - 0.02]} geometry={maskGeometry}>
        <meshBasicMaterial color="#050505" />
      </mesh>
      <mesh position={[0, cy, SCREEN.z]} geometry={screenGeometry}>
        <meshBasicMaterial map={videoReady ? videoTexture : fallback.texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, SCREEN.bottom - 0.9, SCREEN.z + 0.02]}>
        <planeGeometry args={[1.2, 0.45]} />
        <meshBasicMaterial map={logo} toneMapped={false} />
      </mesh>
      {/* Spill light from the screen onto the audience; default target is the origin near row A */}
      <spotLight position={[0, cy, SCREEN.z + 0.5]} color="#cfd8ff" angle={0.9} penumbra={1} intensity={1.2} decay={0} />
    </group>
  );
}
