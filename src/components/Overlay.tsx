import { useEffect, useRef } from 'react';
import { neighbor, seatById, verdict, type Direction, type Seat } from '../layout';
import { useStore } from '../store';
import { MiniMap } from './MiniMap';

const KEY_DIRECTIONS: Record<string, Direction> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'forward',
  ArrowDown: 'back',
};

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS = {
  soundOn: 'M11 5 6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  soundOff: 'M11 5 6 9H3v6h3l5 4V5zM16 9l6 6M22 9l-6 6',
  camera: 'M3 7h11v10H3zM14 10l6-3v10l-6-3M6 4a2 2 0 1 0 0 .01M11 4a2 2 0 1 0 0 .01',
  play: 'M4 4h16v16H4zM10 8.5v7l6-3.5z',
  pause: 'M4 4h16v16H4zM10 9v6M14 9v6',
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  heatmap: 'M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z',
};

const ScoreBadge = ({ seat }: { seat: Seat }) => (
  <span className={`score score-${verdict(seat.score).toLowerCase()}`}>
    {seat.score} · {verdict(seat.score)}
  </span>
);

function HoverTooltip() {
  const hovered = useStore((s) => s.hoveredSeat);
  const mode = useStore((s) => s.mode);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`;
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, []);

  const seat = hovered && mode === 'overview' ? seatById.get(hovered) : undefined;
  return (
    <div ref={ref} className="tooltip" style={{ opacity: seat ? 1 : 0 }}>
      {seat && (
        <>
          <strong>
            Seat {seat.id}
            {seat.premium && <span className="prime-tag">Prime</span>}
          </strong>
          <span className="muted">{seat.zone}</span>
          <ScoreBadge seat={seat} />
        </>
      )}
    </div>
  );
}

export function Overlay() {
  const mode = useStore((s) => s.mode);
  const focused = useStore((s) => s.focusedSeat);
  const selected = useStore((s) => s.selectedSeat);
  const muted = useStore((s) => s.muted);
  const playing = useStore((s) => s.playing);
  const previous = useStore((s) => s.previousSeat);
  const heatmap = useStore((s) => s.heatmap);
  const { exitPov, toggleSelect, toggleMute, togglePlay, resetView, enterPov, swapSeat, toggleHeatmap } = useStore.getState();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { mode, focusedSeat } = useStore.getState();
      if (mode !== 'pov' || !focusedSeat) return;
      if (e.key === 'Escape') return exitPov();
      if (e.key === 'c' || e.key === 'C') return swapSeat();
      const dir = KEY_DIRECTIONS[e.key];
      if (!dir) return;
      e.preventDefault();
      const next = neighbor(seatById.get(focusedSeat)!, dir);
      if (next) enterPov(next.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exitPov, enterPov, swapSeat]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  };

  const seat = focused ? seatById.get(focused) : undefined;
  const previousSeat = previous ? seatById.get(previous) : undefined;

  return (
    <div className="overlay">
      <div className="toolbar">
        <button className={muted ? '' : 'active'} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
          <Icon d={muted ? ICONS.soundOff : ICONS.soundOn} />
        </button>
        <button className={mode === 'overview' ? 'active' : ''} onClick={resetView} title="Theatre overview">
          <Icon d={ICONS.camera} />
        </button>
        <button onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
          <Icon d={playing ? ICONS.pause : ICONS.play} />
        </button>
        <button onClick={toggleFullscreen} title="Fullscreen">
          <Icon d={ICONS.fullscreen} />
        </button>
        <button className={heatmap ? 'active' : ''} onClick={toggleHeatmap} title="View quality heat-map" aria-pressed={heatmap}>
          <Icon d={ICONS.heatmap} />
        </button>
      </div>

      {mode === 'overview' && (
        <div className="legend">
          {heatmap ? (
            <span className="heat-legend">
              Worse <i className="heat-bar" /> Better
            </span>
          ) : (
            <>
              <span><i className="dot available" />Standard</span>
              <span><i className="dot prime" />Prime</span>
              <span><i className="dot best" />Best view</span>
            </>
          )}
          {selected && <span><i className="dot selected" />{selected}</span>}
        </div>
      )}

      <HoverTooltip />

      {mode === 'overview' && <div className="hint">Click a seat to preview</div>}

      {mode === 'pov' && seat && (
        <>
          <div className="hint top">Drag to look · Arrows to move · C compare · Esc exit</div>
          <MiniMap />
          <div className="pov-bar">
            <button className="ghost" onClick={exitPov}>Exit</button>
            <span className="pov-seat">
              {seat.id}
              {seat.premium && <span className="prime-tag">Prime</span>}
              <ScoreBadge seat={seat} />
            </span>
            {previousSeat && (
              <button className="ghost" onClick={swapSeat} title="Compare with previous seat (C)">
                ⇄ {previousSeat.id}
              </button>
            )}
            <button className={selected === seat.id ? 'primary done' : 'primary'} onClick={toggleSelect}>
              {selected === seat.id ? 'Selected' : 'Select'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
