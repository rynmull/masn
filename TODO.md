# Masn Development TODO

**Priority Order** (high → low)
- [x] **Caregiver Mode** (customization, vocabulary management, settings) ✅ Completed 2026-03-26
- [x] **Adaptive Word Prediction** (SQLite usage-based suggestions by count & recency) ✅ Completed 2026-03-26
- [x] **Vocabulary Expansion UI** (improved word add/edit with validation, quick category creation, missing category modal added) ✅ Completed 2026-03-26
- [P3] Emotional Tone TTS (extend presets, add voice selection)
- [P4] Cloud Sync (encrypted optional backup)
- [P5] Advanced Accessibility (switch control, eye tracking support)
- [P6] Testing & Accessibility Audit
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

**Implementation Notes**
- All changes must maintain offline-first architecture
- UI must meet WCAG AA contrast minimums (4.5:1)
- SQLite schema: words(id, label, speak, color, category, usage_count, last_used), settings(key, value)
- Next priority: Vocabulary Expansion UI (improve add/edit UX + category management)

** blockers**
- None currently

---

*Last updated: 2026-03-26 by Masn Agent (continuous development)*
