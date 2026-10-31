import * as THREE from 'three';
import { ROOM, SCREEN } from './layout';

type Channel = 'L' | 'C' | 'R' | 'SL' | 'SR';

export interface Speaker {
  id: string;
  label: string;
  position: [number, number, number];
  channel: Channel;
  level: number;
  wall: 'screen' | 'left' | 'right' | 'back';
}

const FRONT_Y = SCREEN.bottom + SCREEN.height * 0.55;
const FRONT_Z = SCREEN.z - 0.1;
const SIDE_X = ROOM.width / 2 - 0.15;
const BACK_Z = ROOM.back - 0.15;
const SURROUND_Y = 6.5;

export const SPEAKERS: Speaker[] = [
  { id: 'L', label: 'Front Left', position: [-SCREEN.width * 0.35, FRONT_Y, FRONT_Z], channel: 'L', level: 1, wall: 'screen' },
  { id: 'C', label: 'Centre', position: [0, FRONT_Y, FRONT_Z], channel: 'C', level: 1, wall: 'screen' },
  { id: 'R', label: 'Front Right', position: [SCREEN.width * 0.35, FRONT_Y, FRONT_Z], channel: 'R', level: 1, wall: 'screen' },
  ...[-7, -2, 3, 8].flatMap((z, i): Speaker[] => [
    { id: `Ls${i + 1}`, label: 'Left Surround', position: [-SIDE_X, SURROUND_Y, z], channel: 'SL', level: 0.5, wall: 'left' },
    { id: `Rs${i + 1}`, label: 'Right Surround', position: [SIDE_X, SURROUND_Y, z], channel: 'SR', level: 0.5, wall: 'right' },
  ]),
  { id: 'Lrs', label: 'Left Rear Surround', position: [-4, SURROUND_Y, BACK_Z], channel: 'SL', level: 0.5, wall: 'back' },
  { id: 'Rrs', label: 'Right Rear Surround', position: [4, SURROUND_Y, BACK_Z], channel: 'SR', level: 0.5, wall: 'back' },
];

class SurroundEngine {
  readonly listener = new THREE.AudioListener();
  private readonly ctx = this.listener.context;
  private readonly master = this.ctx.createGain();
  private readonly bus: Record<Channel | 'S', GainNode>;
  private media?: MediaElementAudioSourceNode;

  constructor() {
    const gain = (value = 1) => new GainNode(this.ctx, { gain: value });
    this.master.gain.value = 0;
    this.master.connect(this.listener.getInput());
    this.bus = { L: gain(), C: gain(), R: gain(), S: gain(), SL: gain(), SR: gain() };

    // Pro Logic-style surround: delayed, slightly decorrelated per side.
    this.bus.S.connect(new DelayNode(this.ctx, { delayTime: 0.015 })).connect(this.bus.SL);
    this.bus.S.connect(new DelayNode(this.ctx, { delayTime: 0.021 })).connect(this.bus.SR);

    for (const s of SPEAKERS) {
      const [x, y, z] = s.position;
      const panner = new PannerNode(this.ctx, {
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        refDistance: 4,
        rolloffFactor: 1,
        positionX: x,
        positionY: y,
        positionZ: z,
      });
      this.bus[s.channel].connect(gain(s.level)).connect(panner).connect(this.master);
    }

    const lfe = new BiquadFilterNode(this.ctx, { type: 'lowpass', frequency: 120 });
    this.bus.C.connect(lfe).connect(gain(0.6)).connect(this.master);
  }

  attach(video: HTMLVideoElement) {
    if (this.media) return;
    this.media = this.ctx.createMediaElementSource(video);
    // Force stereo so mono sources are upmixed to both sides instead of leaving the right channel silent.
    const stereo = new GainNode(this.ctx, { channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers' });
    const splitter = new ChannelSplitterNode(this.ctx, { numberOfOutputs: 2 });
    this.media.connect(stereo).connect(splitter);

    const half = () => new GainNode(this.ctx, { gain: 0.5 });
    splitter.connect(this.bus.L, 0);
    splitter.connect(this.bus.R, 1);
    splitter.connect(half(), 0).connect(this.bus.C);
    splitter.connect(half(), 1).connect(this.bus.C);
    splitter.connect(half(), 0).connect(this.bus.S);
    splitter.connect(new GainNode(this.ctx, { gain: -0.5 }), 1).connect(this.bus.S);
  }

  setMuted(muted: boolean) {
    if (!muted) this.resume();
    this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  resume() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }
}

let engine: SurroundEngine | undefined;
let registeredVideo: HTMLVideoElement | undefined;

export function registerVideo(video: HTMLVideoElement) {
  registeredVideo = video;
  engine?.attach(video);
}

export const peekSurround = () => engine;

// Created on first unmute so startup avoids AudioContext + HRTF setup.
export function getSurround() {
  if (!engine) {
    engine = new SurroundEngine();
    if (registeredVideo) engine.attach(registeredVideo);
  }
  return engine;
}
