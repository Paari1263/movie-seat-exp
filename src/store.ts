import { create } from 'zustand';

type Mode = 'overview' | 'pov';

interface State {
  mode: Mode;
  hoveredSeat: string | null;
  focusedSeat: string | null;
  selectedSeat: string | null;
  previousSeat: string | null;
  heatmap: boolean;
  muted: boolean;
  playing: boolean;
  resetToken: number;
  setHovered: (id: string | null) => void;
  enterPov: (id: string) => void;
  swapSeat: () => void;
  toggleHeatmap: () => void;
  exitPov: () => void;
  toggleSelect: () => void;
  toggleMute: () => void;
  togglePlay: () => void;
  resetView: () => void;
}

export const useStore = create<State>()((set, get) => ({
  mode: 'overview',
  hoveredSeat: null,
  focusedSeat: null,
  selectedSeat: null,
  previousSeat: null,
  heatmap: false,
  muted: true,
  playing: true,
  resetToken: 0,
  setHovered: (id) => set({ hoveredSeat: id }),
  enterPov: (id) =>
    set((s) => ({
      mode: 'pov',
      focusedSeat: id,
      previousSeat: s.focusedSeat && s.focusedSeat !== id ? s.focusedSeat : s.previousSeat,
    })),
  swapSeat: () => {
    const { previousSeat, enterPov } = get();
    if (previousSeat) enterPov(previousSeat);
  },
  toggleHeatmap: () => set((s) => ({ heatmap: !s.heatmap })),
  exitPov: () => set({ mode: 'overview' }),
  toggleSelect: () =>
    set((s) => ({ selectedSeat: s.selectedSeat === s.focusedSeat ? null : s.focusedSeat })),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  resetView: () => set((s) => ({ mode: 'overview', resetToken: s.resetToken + 1 })),
}));
