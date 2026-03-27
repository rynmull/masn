# Masn Development TODO

**Priority Order** (high → low)
- [x] **Caregiver Mode** (customization, vocabulary management, settings) ✅ Completed 2026-03-26
- [x] **Adaptive Word Prediction** (SQLite usage-based suggestions by count & recency) ✅ Completed 2026-03-26
- [P6-in-progress] Testing & Accessibility Audit
  - UI/UX Testing in progress (Sub-agent 1)
  - Accessibility Testing in progress (Sub-agent 2)
  - Timeline estimate: 48-72 hours for comprehensive testing and fixes
- [x] **Emotional Tone TTS** (extended presets, voice selection) ✅ Completed 2026-03-26
- [x] **Cloud Sync (encrypted optional backup)** ✅ Completed 2026-03-26 (Phase 1+2+3)
- [x] **Advanced Accessibility** (switch control with automatic and two-switch modes, eye tracking foundation laid) ✅ Completed 2026-03-26
- [P7] Documentation & Deployment Guides

**Completed Sprint (2026-03-26)**
- Caregiver Mode implemented:
  - PIN authentication (default 1234)
  - Full vocabulary CRUD (add/edit/delete words)
  - Category filtering and color customization
  - TTS settings (pitch, rate) with emotion presets (neutral, happy, calm, urgent)
  - Usage statistics dashboard
  - SQLite-driven data store (words, settings)
  - Seamless mode toggle from user screen
- Adaptive Word Prediction enhanced:
  - Replaced ephemeral recent-words buffer with database-driven suggestions
  - Uses combined scoring: usage_count (primary) and last_used (tiebreaker)
  - Queries top 4 words not already in phrase, ordered by usage_count DESC, last_used DESC
  - Suggestions refresh automatically on phrase changes
  - Offline-first, maintains performance with local SQLite
- Emotional Tone TTS expanded:
  - Added voice selection: caregiver can choose from available device voices (via `Speech.getAvailableVoicesAsync()`)
  - Extended emotion presets from 4 to 8: neutral, happy, calm, urgent, excited, sad, whisper, stern
  - Each preset applies appropriate pitch and rate values to convey emotion
  - Voice setting persisted in SQLite settings table (tts_voice)
  - HomeScreen speak function now applies selected voice
  - Maintains offline-first architecture; voice selection uses on-device TTS voices
- **Cloud Sync (Phase 1+2+3)**:
  - `SyncService` with AES-CBC encryption using randomly generated key stored in SecureStore
  - Backup: exports all words, categories, and non-sensitive settings to encrypted file in app document directory
  - Restore: pick encrypted backup file via DocumentPicker and restore with merge (preserving existing PIN and sync config)
  - Caregiver Settings UI: toggle enable sync, manual backup, restore, last backup timestamp display
  - Added dependencies: `crypto-js` for AES, `expo-document-picker` for file selection
  - **Phase 3**: Automatic background sync scheduling. Implemented `BackgroundSyncService` using `expo-background-fetch` and `expo-task-manager`. Registers a daily background task that triggers an encrypted backup when cloud sync is enabled and the last backup is older than 24 hours. Task persists after app close and device reboot. Fully offline-first; no network required for backup.

**Implementation Notes**
- All changes must maintain offline-first architecture
- UI must meet WCAG AA contrast minimums (4.5:1)
- SQLite schema: words(id, label, speak, color, category, usage_count, last_used), settings(key, value)
- Testing & Accessibility Audit in progress (started 2026-03-26)
  - UI/UX Testing Phase: Validating WCAG compliance, navigation flows, and interaction patterns
  - Accessibility Testing Phase: Verifying switch control, eye tracking, screen reader compatibility

**Blockers**
- None currently

---

*Last updated: 2026-03-26 by Masn Agent (continuous development)*