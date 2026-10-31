import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SCREEN_CENTER, seatById } from '../layout';
import { useStore } from '../store';

const OVERVIEW_POS = new THREE.Vector3(10, 15, 21);
const OVERVIEW_TARGET = new THREE.Vector3(0, 1.5, 0);
const DURATION = 1.4;
const MAX_YAW = 1.2;
const MAX_PITCH = 0.6;
const DRAG_SPEED = 0.004;

interface Transition {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromLook: THREE.Vector3;
  toLook: THREE.Vector3;
  t: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lookDir = new THREE.Vector3();

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useRef<OrbitControls | null>(null);
  const mode = useStore((s) => s.mode);
  const focusedSeat = useStore((s) => s.focusedSeat);
  const resetToken = useStore((s) => s.resetToken);

  const transition = useRef<Transition | null>(null);
  const currentLook = useRef(OVERVIEW_TARGET.clone());
  const look = useRef({ yaw: 0, pitch: 0, targetYaw: 0, targetPitch: 0, baseYaw: 0, basePitch: 0 });

  // Must be declared before the transition effect so it exists when that effect disables it.
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minDistance = 6;
    c.maxDistance = 40;
    c.maxPolarAngle = Math.PI * 0.48;
    c.target.copy(OVERVIEW_TARGET);
    controls.current = c;
    return () => {
      c.dispose();
      controls.current = null;
    };
  }, [camera, gl]);

  useEffect(() => {
    const seat = mode === 'pov' && focusedSeat ? seatById.get(focusedSeat) : undefined;
    const toPos = seat ? seat.eye.clone() : OVERVIEW_POS.clone();
    transition.current = {
      fromPos: camera.position.clone(),
      toPos,
      fromLook: currentLook.current.clone(),
      toLook: seat ? SCREEN_CENTER.clone() : OVERVIEW_TARGET.clone(),
      t: 0,
    };
    const f = SCREEN_CENTER.clone().sub(toPos).normalize();
    Object.assign(look.current, {
      yaw: 0,
      pitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      baseYaw: Math.atan2(f.x, f.z),
      basePitch: Math.asin(f.y),
    });
    if (controls.current) controls.current.enabled = false;
  }, [mode, focusedSeat, resetToken, camera]);

  useEffect(() => {
    if (mode !== 'pov') return;
    const el = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const l = look.current;
      l.targetYaw = THREE.MathUtils.clamp(l.targetYaw + (e.clientX - lastX) * DRAG_SPEED, -MAX_YAW, MAX_YAW);
      l.targetPitch = THREE.MathUtils.clamp(l.targetPitch + (e.clientY - lastY) * DRAG_SPEED, -MAX_PITCH, MAX_PITCH);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = () => {
      dragging = false;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [mode, gl]);

  useFrame((_, dt) => {
    const tr = transition.current;
    if (tr) {
      tr.t = Math.min(1, tr.t + dt / DURATION);
      const k = ease(tr.t);
      camera.position.lerpVectors(tr.fromPos, tr.toPos, k);
      currentLook.current.lerpVectors(tr.fromLook, tr.toLook, k);
      camera.lookAt(currentLook.current);
      if (tr.t >= 1) {
        transition.current = null;
        if (useStore.getState().mode === 'overview' && controls.current) {
          controls.current.target.copy(OVERVIEW_TARGET);
          controls.current.enabled = true;
          controls.current.update();
        }
      }
      return;
    }

    if (useStore.getState().mode === 'pov') {
      const l = look.current;
      const damp = 1 - Math.exp(-10 * dt);
      l.yaw += (l.targetYaw - l.yaw) * damp;
      l.pitch += (l.targetPitch - l.pitch) * damp;
      const yaw = l.baseYaw + l.yaw;
      const pitch = l.basePitch + l.pitch;
      const dir = lookDir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      currentLook.current.copy(camera.position).addScaledVector(dir, 10);
      camera.lookAt(currentLook.current);
    } else if (controls.current) {
      if (controls.current.enabled) controls.current.update();
      currentLook.current.copy(controls.current.target);
    }
  });

  return null;
}
