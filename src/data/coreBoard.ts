import { AACProfile, Board, Tile } from '../types/models';

const profileId = 'profile-demo';
const boardId = 'board-core-demo';

const tiles: Tile[] = [
  { id: 'tile-i', boardId, label: 'I', spokenText: 'I', type: 'word', position: { row: 0, col: 0 }, isCore: true },
  { id: 'tile-you', boardId, label: 'you', spokenText: 'you', type: 'word', position: { row: 0, col: 1 }, isCore: true },
  { id: 'tile-want', boardId, label: 'want', spokenText: 'want', type: 'word', position: { row: 0, col: 2 }, isCore: true },
  { id: 'tile-more', boardId, label: 'more', spokenText: 'more', type: 'word', position: { row: 0, col: 3 }, isCore: true },
  { id: 'tile-help', boardId, label: 'help', spokenText: 'help', type: 'word', position: { row: 1, col: 0 }, isCore: true },
  { id: 'tile-stop', boardId, label: 'stop', spokenText: 'stop', type: 'word', position: { row: 1, col: 1 }, isCore: true },
  { id: 'tile-go', boardId, label: 'go', spokenText: 'go', type: 'word', position: { row: 1, col: 2 }, isCore: true },
  { id: 'tile-like', boardId, label: 'like', spokenText: 'like', type: 'word', position: { row: 1, col: 3 }, isCore: true },
  { id: 'tile-not', boardId, label: 'not', spokenText: 'not', type: 'word', position: { row: 2, col: 0 }, isCore: true },
  { id: 'tile-that', boardId, label: 'that', spokenText: 'that', type: 'word', position: { row: 2, col: 1 }, isCore: true },
  { id: 'tile-this', boardId, label: 'this', spokenText: 'this', type: 'word', position: { row: 2, col: 2 }, isCore: true },
  { id: 'tile-finished', boardId, label: 'finished', spokenText: 'finished', type: 'word', position: { row: 2, col: 3 }, isCore: true },
  { id: 'tile-yes', boardId, label: 'yes', spokenText: 'yes', type: 'word', position: { row: 3, col: 0 }, isCore: true },
  { id: 'tile-no', boardId, label: 'no', spokenText: 'no', type: 'word', position: { row: 3, col: 1 }, isCore: true },
  { id: 'tile-here', boardId, label: 'here', spokenText: 'here', type: 'word', position: { row: 3, col: 2 }, isCore: true },
  { id: 'tile-there', boardId, label: 'there', spokenText: 'there', type: 'word', position: { row: 3, col: 3 }, isCore: true }
];

export const demoBoard: Board = {
  id: boardId,
  aacProfileId: profileId,
  name: 'Core Words',
  description: 'Starter core vocabulary for emerging communicators',
  contextId: undefined,
  gridConfig: { rows: 4, cols: 4 },
  isCoreBoard: true,
  tiles
};

export const demoProfile: AACProfile = {
  id: profileId,
  ownerUserId: 'caregiver-demo',
  linkedUserIds: ['caregiver-demo'],
  displayName: 'Demo Child',
  ageRange: 'early_childhood',
  primaryLanguage: 'en',
  accessNeeds: 'Direct touch, high contrast',
  contexts: [{ id: 'home-context', name: 'Home', sortOrder: 0 }],
  settings: {
    gridPreset: '4x4',
    gridConfig: { rows: 4, cols: 4 },
    showTextWithSymbols: true,
    voicePreference: undefined
  }
};
