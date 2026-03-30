# AAC Redesign Spec (2026-03-29)

## Goal
Reposition Masn from a promising AAC prototype into a profile-driven communication system that adapts to the user over time.

This spec defines the target UX model, core interaction patterns, personalization strategy, and implementation boundaries for the next major redesign.

## Product Statement
Masn should help a user communicate effectively today while building toward greater independence tomorrow.

The app must support:
- users who are symbol-first and need stable motor planning
- users who are combining symbols and literacy
- users who can type, customize, and communicate more generatively

The app must not feel like three different products. It should be one communication system with staged complexity.

## Design Principles

### 1. Communication First
The primary output is the utterance being built, not the settings, not the prediction model, and not the visual style.

### 2. Stable Motor Planning
Core words and key controls should not jump around unpredictably. Personalization should improve access without making the board feel unstable.

### 3. Progressive Complexity
The app should start simple and reveal more power only when the user is ready.

### 4. Transparent Adaptation
Prediction and personalization should feel helpful, not mysterious. The user should not have to understand the algorithm, but caregivers should be able to understand what changed and why.

### 5. Tablet-Quality AAC
Tablet layouts are a first-class target. The UI cannot remain a stretched phone layout.

### 6. Local-First Personalization
The app should learn from local usage and remain useful offline.

## User Growth Model

### Stage 1: Symbol-First
Primary goals:
- establish motor planning
- build trust in cause-and-effect communication
- keep cognitive load low

UI characteristics:
- large targets
- minimal categories
- prominent symbols
- limited suggestions
- optional text support

Recommended defaults:
- symbols on
- typing hidden
- simple board layout
- fixed core row
- strong spacing

### Stage 2: Mixed Symbol + Text
Primary goals:
- support phrase building
- increase generative language
- introduce more flexible navigation

UI characteristics:
- symbols plus text labels
- prediction with symbol support
- quick phrases
- broader categories
- optional typing row

Recommended defaults:
- symbols on
- typing available
- prediction on
- phrase builder emphasized

### Stage 3: Text-Forward Generative AAC
Primary goals:
- improve speed
- support typing and phrase recall
- preserve symbol support where still useful

UI characteristics:
- text input becomes primary or co-primary
- symbol board remains available
- quick phrases and recents become more important
- prediction expands to text workflows

Recommended defaults:
- typing prominent
- saved phrases visible
- symbol support optional by board

## Information Architecture

### Primary Modes
The app should have two high-level surfaces:
- Communicator
- Caregiver

The Communicator surface is for daily use.
The Caregiver surface is for setup, tuning, analytics, and vocabulary management.

### Communicator Structure
The communicator should be composed of these areas:

1. Utterance Dock
- current phrase
- backspace last token
- clear phrase
- speak phrase
- optional undo of last action

2. Quick Access Row
- quick phrases
- recents
- typing toggle
- profile-specific shortcuts

3. Core Vocabulary Zone
- stable, always available
- same placement across boards when possible

4. Board Navigation
- category or board switching
- ideally visible without excessive horizontal scrolling on tablet

5. Main Vocabulary Grid
- fringe vocabulary
- context-specific words
- symbol-first presentation when enabled

6. Prediction Strip
- symbol + text suggestions
- short reason tags when useful

7. Voice / Expression Controls
- emotion presets
- optional quick voice profile actions

### Caregiver Structure
Replace the current broad settings bucket with six domains:

1. Profiles
- create/select user profiles
- assign communication stage

2. Boards
- manage board templates
- control vocabulary subsets
- set default home board

3. Access
- motor settings
- visual settings
- symbol behavior

4. Voice
- engine
- voice identity
- emotion tuning

5. Vocabulary
- words
- categories
- quick phrases
- core words

6. Insights
- usage
- prediction acceptance
- vocabulary growth
- suggested additions

## Communicator Screen Spec

### Phone Layout
Top to bottom:

1. Utterance Dock
2. Quick Access Row
3. Prediction Strip
4. Core Vocabulary Zone
5. Category Selector
6. Main Vocabulary Grid

Rules:
- Speak belongs near the utterance, not floating far away
- destructive actions stay grouped with the utterance
- typing should be expandable, not always dominant
- prediction should never visually overpower core words

### Tablet Layout
Use a two-column structure.

Left column:
- core vocabulary
- board/category navigation
- quick phrases or recents

Right column:
- utterance dock
- prediction strip
- main vocabulary grid

Persistent elements:
- emotion controls stay visible but should not block targets
- utterance dock stays pinned near the top

Rules:
- no stretched phone layout
- no floating actions in odd corners
- no excessive horizontal scroll for essential navigation

## Utterance Dock Spec
The utterance dock is the communication center.

Must include:
- current utterance in large readable text
- symbol-aware token display when enabled later
- delete-last-token action
- clear action
- speak action

Should support later:
- undo
- edit token
- tap token to remove or replace
- phrase history

Visual requirements:
- highest visual prominence on screen
- strong contrast
- large touch targets
- pinned location

## Typing Spec
Typing should be a first-class option, but not forced on symbol-first users.

Requirements:
- typing row can be shown or hidden per profile
- typed text and tapped words should enter the same utterance model
- suggestions should work for typed tokens too
- the user should be able to mix typed and tapped words in one phrase

Future requirements:
- autocomplete
- keyboard layout tuning
- text-first home mode for advanced users

## Prediction Spec
Prediction should help with speed and growth, not simply expose ranking math.

User-facing requirements:
- symbol + text on each suggestion
- limited count to avoid overload
- stable placement near utterance flow
- optional compact reason tags such as:
  - Next
  - Recent
  - Frequent
  - Template

Caregiver-facing requirements:
- acceptance rate trends
- suggestion debugging
- evidence of learned patterns

Behavior rules:
- core words remain stable even if predictions adapt
- predictions must not reorder primary board buttons
- adaptation should favor helping, not surprising

## Personalization Model

### Profile-Based Personalization
Each user profile should eventually own:
- communication stage
- accessibility preferences
- voice preferences
- board set
- core word configuration
- quick phrases
- prediction profile

### Board-Based Personalization
Each board should be configurable with:
- name
- purpose or context
- vocabulary subset
- layout type
- pinned core words or quick actions
- symbol/text presentation settings

### Adaptive Personalization
Use local usage data to drive:
- recents
- favorite phrases
- suggested next words
- suggested new vocabulary
- stage progression prompts for caregivers

### Personalization Guardrails
Do not automatically:
- move core words constantly
- hide familiar vocabulary without caregiver intent
- radically restyle layouts based on short-term usage

## Visual Language

### Direction
Move away from heavy color coding as the primary information carrier.

Preferred visual approach:
- white base
- subtle glass or soft-surface containers
- strong typography
- restrained accent colors for state and intent
- symbols as primary semantic cue when enabled

### Color Rules
- use accent color for active state, speak, and important affordances
- do not depend on color alone to encode meaning
- maintain high-contrast option as an explicit profile setting

### Typography Rules
- utterance text must be larger than category and prediction text
- symbol labels should remain readable even at smaller scales
- caregiver controls can be denser than communicator controls

## Accessibility and Motor Planning

### Required Capabilities
- scalable target sizes
- scalable spacing
- text scale
- high contrast
- symbol on/off control
- stable core word location

### Next-Step Capabilities
- board templates for low dexterity
- simplified navigation mode
- reduced category count mode
- switch/scanning research path

## Quick Phrases and Recents
Add quick phrases as a formal product feature, not an afterthought.

Quick phrases should:
- be editable in caregiver mode
- be available per profile or per board
- support emotion defaults later

Recents should:
- reflect recent successful communication
- remain easy to clear or reset by caregiver
- never replace stable core access

## Caregiver UX Spec

### Profiles
Caregiver should be able to:
- create a profile
- set communication stage
- select recommended defaults
- switch active profile

### Boards
Caregiver should be able to:
- create or duplicate boards
- assign vocabulary by context
- set home board
- choose layout template

### Vocabulary
Caregiver should be able to:
- edit words and symbols
- manage categories
- pin core words
- create quick phrases

### Insights
Caregiver should be able to answer:
- what words are being used most
- which suggestions are helping
- what vocabulary seems missing
- whether the user is ready for a richer stage

## Engineering Boundaries

### Immediate Scope
These changes are worth doing first:
- redesign communicator layout for phone and tablet
- create clearer utterance dock
- formalize typing as an optional profile feature
- add quick phrases / recents surface
- reorganize caregiver IA around profiles, boards, access, voice, vocabulary, insights

### Near-Term Foundation
- extract prediction engine from screen component
- add profile model
- add board configuration model
- store personalization state per profile

### Explicitly Deferred
Do not build yet:
- cloud sync
- multi-user remote collaboration
- advanced scanning support without validating core layout first
- fully learned ML models beyond the current local approach
- over-automated rearrangement of board layouts

## Proposed Implementation Sequence

### Phase 1: UX Foundation
- redesign Home screen layout
- create utterance dock component
- add quick phrases row
- make typing toggleable by profile intent
- create tablet-aware layout rules

### Phase 2: Product Structure
- add profiles
- add board templates
- restructure caregiver mode IA
- extract prediction engine

### Phase 3: Adaptive AAC
- add recents/favorites
- add profile-specific personalization
- add vocabulary growth insights
- add stage progression guidance

## Success Criteria
The redesign is successful if:
- the main communication flow is understandable in seconds
- tablet use feels intentional, not stretched
- users can progress from symbol-first to mixed or text-forward use without changing apps
- caregivers can personalize the experience without digging through unrelated settings
- predictions improve speed without destabilizing motor planning

## Open Questions
- how many profiles should be supported before the UI becomes too complex?
- should quick phrases live at the profile level, board level, or both?
- when should typing appear by default for mixed-stage users?
- what tablet breakpoint should define the two-column communicator layout?
- how much prediction explanation should the end user see versus only the caregiver?