import { create } from 'zustand';
import { DEMO_CORE_BOARD, DEMO_PROFILE } from '../data/demoCoreBoard';
import { AACProfile, Board, Tile } from '../types/models';

interface AACState {
  profile: AACProfile | null;
  activeBoard: Board | null;
  messageTiles: Tile[];

  setProfile: (profile: AACProfile) => void;
  setActiveBoard: (board: Board) => void;

  addTileToMessage: (tile: Tile) => void;
  backspace: () => void;
  clearMessage: () => void;
}

export const useAACStore = create<AACState>((set) => ({
  profile: DEMO_PROFILE,
  activeBoard: DEMO_CORE_BOARD,
  messageTiles: [],

  setProfile: (profile) => set({ profile }),
  setActiveBoard: (board) => set({ activeBoard: board }),

  addTileToMessage: (tile) =>
    set((state) => ({
      messageTiles: [...state.messageTiles, tile]
    })),
  backspace: () =>
    set((state) => ({
      messageTiles: state.messageTiles.slice(0, -1)
    })),
  clearMessage: () => set({ messageTiles: [] })
}));
