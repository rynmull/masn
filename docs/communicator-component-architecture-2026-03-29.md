# Communicator Component Architecture (2026-03-29)

## Purpose
Translate the AAC redesign spec into concrete UI components and ownership boundaries for the Communicator surface.

This document is implementation-facing. It defines what should be extracted from the current Home screen and where state should live during the first refactor.

## Initial Component Tree

### `HomeScreen`
Owns:
- selected category
- current utterance tokens
- typed input draft
- suggestion results
- symbol URL maps
- current emotion selection
- responsive layout mode

Responsibilities:
- orchestrate board-level data
- run prediction fetch logic
- load symbol assets
- map vocabulary data into core and fringe sections
- pass event handlers into child components

### `UtteranceDock`
Owns no durable state.

Receives:
- utterance tokens
- typed text draft
- handlers for type, add, speak, clear, delete-last-token
- current emotion badge asset
- responsive mode info

Responsibilities:
- present the active utterance prominently
- keep destructive and speak actions near the utterance
- expose optional text input workflow

### `PredictionStrip`
Owns no durable state.

Receives:
- suggestion list
- symbol URLs
- suggestion press handler
- display settings

Responsibilities:
- render symbol + text suggestions
- preserve compact, glanceable prediction UI

### `EmotionPicker`
Owns no durable state.

Receives:
- selected emotion
- symbol URLs
- select handler
- orientation mode

Responsibilities:
- render voice/emotion selection as a dedicated control group
- support horizontal phone layout and vertical tablet layout

### `CoreWordsSection`
Initial refactor phase:
- remains assembled inside `HomeScreen`

Later extraction:
- move into dedicated section component when board templates are introduced

Responsibilities:
- render stable, always-available vocabulary
- remain visually distinct from fringe vocabulary

### `CategoryNavigation`
Initial refactor phase:
- remains assembled inside `HomeScreen`

Later extraction:
- split into phone and tablet variants once boards replace simple categories

Responsibilities:
- switch visible fringe vocabulary scope
- support horizontal scroll on phone and wrapped grid on tablet

### `VocabularyGrid`
Initial refactor phase:
- remains assembled inside `HomeScreen`

Later extraction:
- extract when board layout templates and motor presets are introduced

Responsibilities:
- render fringe vocabulary targets
- preserve button sizing and symbol behavior

## State Ownership Rules

### Keep in `HomeScreen` for now
- phrase tokens
- typed input
- selected category
- suggestion state
- symbol asset maps
- current emotion state

Reason:
The first refactor should improve structure and layout without introducing unnecessary state indirection.

### Move out later
- prediction engine
- profile settings
- board configuration
- quick phrases and recents
- analytics-derived personalization

Reason:
Those should move only when profile and board models are added.

## Responsive Layout Model

### Phone
Order:
1. `UtteranceDock`
2. `EmotionPicker` horizontal
3. `PredictionStrip`
4. `CoreWordsSection`
5. `CategoryNavigation`
6. `VocabularyGrid`

### Tablet
Top:
1. `UtteranceDock`
2. `PredictionStrip`

Two-column board area:

Left column:
- `EmotionPicker` vertical
- `CoreWordsSection`
- `CategoryNavigation`

Right column:
- `VocabularyGrid`

## Refactor Boundaries

### Phase 1
- extract `UtteranceDock`
- extract `PredictionStrip`
- extract `EmotionPicker`
- add tablet breakpoint and two-column foundation

### Phase 2
- extract `CoreWordsSection`
- extract `CategoryNavigation`
- extract `VocabularyGrid`
- introduce quick phrases and recents row

### Phase 3
- add board templates and profile-aware communicator variants
- connect layout decisions to profile stage

## Guardrails
- do not move prediction logic and layout refactor in the same deep architectural pass
- do not introduce profile model in this UI-only foundation step
- do not destabilize core word placement while improving layout
- keep current vocabulary behavior functionally equivalent during extraction