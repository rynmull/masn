# Masn Development TODO

**Priority Order** (high → low)
- [x] **Caregiver Mode** (customization, vocabulary management, settings) ✅ Completed 2026-03-26
- [P1] Adaptive Word Prediction (use SQLite usage data to predict next words)
- [P2] Vocabulary Expansion UI (improve add/edit UX + category management)
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
- Word prediction improvement: Simple recent-words suggestion (sufficient for MVP)

**Implementation Notes**
- All changes must maintain offline-first architecture
- UI must meet WCAG AA contrast minimums (4.5:1)
- SQLite schema: words(id, label, speak, color, category, usage_count, last_used), settings(key, value)
- Next priority: enhance word prediction to use actual usage patterns (weighted by count and recency)

** blockers**
- None currently

---

*Last updated: 2026-03-26 by Masn Agent (continuous development)*
