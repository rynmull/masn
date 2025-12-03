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
  name: string; // e.g., "Home", "School", "Community"
  icon?: string;
  sortOrder?: number;
}

export interface AACProfile {
  id: UUID;
  ownerUserId: UUID; // caregiver who manages this AAC profile
  linkedUserIds: UUID[]; // caregivers/therapists with access
  displayName: string;
  ageRange?: 'early_childhood' | 'school_age' | 'teen' | 'adult';
  primaryLanguage: string; // e.g., 'en'
  accessNeeds?: string; // free-text notes
  contexts: ContextRef[];
  settings: {
    gridPreset?: '4x4' | '5x6' | '6x8' | 'custom';
    showTextWithSymbols: boolean;
    voicePreference?: string; // TTS voice id
  };
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

export type TileType = 'word' | 'phrase' | 'categoryLink' | 'function';

export interface Tile {
  id: UUID;
  boardId: UUID;
  label: string; // visible text
  spokenText: string; // what TTS says
  type: TileType;
  imageUri?: string; // symbol asset or photo URI
  symbolId?: string; // reference into symbol set
  backgroundColor?: string; // used for category/POS coloring
  position: { row: number; col: number };
  isCore?: boolean;
  isFavorite?: boolean;
  targetBoardId?: UUID; // for categoryLink tiles
}

export interface PhraseHistory {
  id: UUID;
  aacProfileId: UUID;
  phraseText: string;
  tokenTileIds: UUID[];
  timestamp: string; // ISO string
  contextId?: UUID;
}
