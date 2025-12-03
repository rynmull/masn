import { create } from 'zustand';
import { Tile } from '../types/models';

interface AACState {
  selectedTiles: Tile[];
  addToken: (tile: Tile) => void;
  backspace: () => void;
  clear: () => void;
  messageText: () => string;
}

export const useAACStore = create<AACState>((set, get) => ({
  selectedTiles: [],
  addToken: (tile) =>
    set((state) => ({
      selectedTiles: [...state.selectedTiles, tile]
    })),
  backspace: () =>
    set((state) => ({
      selectedTiles: state.selectedTiles.slice(0, -1)
    })),
  clear: () => set({ selectedTiles: [] }),
  messageText: () => get().selectedTiles.map((t) => t.spokenText).join(' ')
}));
