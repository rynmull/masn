import { AACProfile, Board, Tile } from '../types/models';

export const DEMO_PROFILE_ID = 'demo-profile-1';
const DEMO_BOARD_ID = 'demo-core-board-1';

const tiles: Tile[] = [
  {
    id: 'tile-i',
    boardId: DEMO_BOARD_ID,
    label: 'I',
    spokenText: 'I',
    type: 'word',
    position: { row: 0, col: 0 },
    isCore: true
  },
  {
    id: 'tile-you',
    boardId: DEMO_BOARD_ID,
    label: 'you',
    spokenText: 'you',
    type: 'word',
    position: { row: 0, col: 1 },
    isCore: true
  },
  {
    id: 'tile-want',
    boardId: DEMO_BOARD_ID,
    label: 'want',
    spokenText: 'want',
    type: 'word',
    position: { row: 0, col: 2 },
    isCore: true
  },
  {
    id: 'tile-more',
    boardId: DEMO_BOARD_ID,
    label: 'more',
    spokenText: 'more',
    type: 'word',
    position: { row: 0, col: 3 },
    isCore: true
  },
  {
    id: 'tile-help',
    boardId: DEMO_BOARD_ID,
    label: 'help',
    spokenText: 'help',
    type: 'word',
    position: { row: 1, col: 0 },
    isCore: true
  },
  {
    id: 'tile-stop',
    boardId: DEMO_BOARD_ID,
    label: 'stop',
    spokenText: 'stop',
    type: 'word',
    position: { row: 1, col: 1 },
    isCore: true
  },
  {
    id: 'tile-go',
    boardId: DEMO_BOARD_ID,
    label: 'go',
    spokenText: 'go',
    type: 'word',
    position: { row: 1, col: 2 },
    isCore: true
  },
  {
    id: 'tile-like',
    boardId: DEMO_BOARD_ID,
    label: 'like',
    spokenText: 'like',
    type: 'word',
    position: { row: 1, col: 3 },
    isCore: true
  },
  {
    id: 'tile-not',
    boardId: DEMO_BOARD_ID,
    label: 'not',
    spokenText: 'not',
    type: 'word',
    position: { row: 2, col: 0 },
    isCore: true
  },
  {
    id: 'tile-that',
    boardId: DEMO_BOARD_ID,
    label: 'that',
    spokenText: 'that',
    type: 'word',
    position: { row: 2, col: 1 },
    isCore: true
  },
  {
    id: 'tile-this',
    boardId: DEMO_BOARD_ID,
    label: 'this',
    spokenText: 'this',
    type: 'word',
    position: { row: 2, col: 2 },
    isCore: true
  },
  {
    id: 'tile-finished',
    boardId: DEMO_BOARD_ID,
    label: 'finished',
    spokenText: 'finished',
    type: 'word',
    position: { row: 2, col: 3 },
    isCore: true
  },
  {
    id: 'tile-yes',
    boardId: DEMO_BOARD_ID,
    label: 'yes',
    spokenText: 'yes',
    type: 'word',
    position: { row: 3, col: 0 },
    isCore: true
  },
  {
    id: 'tile-no',
    boardId: DEMO_BOARD_ID,
    label: 'no',
    spokenText: 'no',
    type: 'word',
    position: { row: 3, col: 1 },
    isCore: true
  },
  {
    id: 'tile-here',
    boardId: DEMO_BOARD_ID,
    label: 'here',
    spokenText: 'here',
    type: 'word',
    position: { row: 3, col: 2 },
    isCore: true
  },
  {
    id: 'tile-there',
    boardId: DEMO_BOARD_ID,
    label: 'there',
    spokenText: 'there',
    type: 'word',
    position: { row: 3, col: 3 },
    isCore: true
  }
];

export const DEMO_PROFILE: AACProfile = {
  id: DEMO_PROFILE_ID,
  ownerUserId: 'caregiver-demo',
  linkedUserIds: ['caregiver-demo'],
  displayName: 'Demo Child',
  ageRange: 'school_age',
  primaryLanguage: 'en',
  accessNeeds: 'Direct touch, high contrast',
  contexts: [{ id: 'home-context', name: 'Home', sortOrder: 0 }],
  settings: {
    gridPreset: '4x4',
    showTextWithSymbols: true,
    voicePreference: undefined
  }
};

export const DEMO_CORE_BOARD: Board = {
  id: DEMO_BOARD_ID,
  aacProfileId: DEMO_PROFILE_ID,
  name: 'Core Words',
  description: 'Starter core vocabulary for emerging communicators',
  contextId: 'home-context',
  gridConfig: { rows: 4, cols: 4 },
  isCoreBoard: true,
  tiles,
  sortOrder: 0
};
