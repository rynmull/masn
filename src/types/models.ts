export type UUID = string;

export interface User {
  id: UUID;
  email: string;
  role: 'aac_user' | 'caregiver';
  displayName: string;
  createdAt: string;
}

export interface ContextRef {
  id: UUID;
  name: string; // e.g., Home, School
  icon?: string;
  sortOrder?: number;
}

export interface AACProfile {
  id: UUID;
  ownerUserId: UUID;
  linkedUserIds: UUID[];
  displayName: string;
  ageRange?: 'early_childhood' | 'school_age' | 'teen' | 'adult';
  primaryLanguage: string; // e.g., en
  accessNeeds?: string;
  contexts: ContextRef[];
  settings: {
    gridPreset: '4x4' | '5x6' | '6x8' | 'custom';
    gridConfig?: { rows: number; cols: number };
    showTextWithSymbols: boolean;
    voicePreference?: string;
  };
}

export type TileType = 'word' | 'phrase' | 'categoryLink' | 'function';

export interface Tile {
  id: UUID;
  boardId: UUID;
  label: string;
  spokenText: string;
  type: TileType;
  imageUri?: string;
  symbolId?: string;
  backgroundColor?: string;
  position: { row: number; col: number };
  isCore?: boolean;
  isFavorite?: boolean;
  targetBoardId?: UUID;
}

export interface Board {
  id: UUID;
  aacProfileId: UUID;
  name: string;
  description?: string;
  contextId?: UUID;
  gridConfig: { rows: number; cols: number };
  isCoreBoard: boolean;
  tiles: Tile[];
  sortOrder?: number;
}

export interface PhraseHistory {
  id: UUID;
  aacProfileId: UUID;
  phraseText: string;
  tokenTileIds: UUID[];
  timestamp: string;
  contextId?: UUID;
}
