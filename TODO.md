# Masn Development TODO

**Priority Order** (high → low)
- [P0] Caregiver Mode (customization, vocabulary management, settings)
- [P1] Emotional Tone TTS (pitch/rate/emotion presets)
- [P2] Adaptive Word Prediction (ML-based, learns user patterns)
- [P3] Vocabulary Expansion UI (add/edit words, categories)
- [P4] Cloud Sync (encrypted optional backup)
- [P5] Advanced Accessibility (switch control, eye tracking support)
- [P6] Testing & Accessibility Audit
- [P7] Documentation & Deployment Guides

**Current Sprint Focus**
- Caregiver Mode: separate mode with PIN/password, allows editing vocabulary, managing categories, adjusting TTS settings, and viewing usage statistics
- Word Prediction: transition from recent-words to contextual prediction using SQLite usage data

**Implementation Notes**
- All changes must maintain offline-first architecture
- UI must meet WCAG AA contrast minimums (4.5:1)
- SQLite database schema may need extensions for caregiver data

** blockers**
- None currently

---

*Last updated: 2026-03-26 by Masn Agent (continuous development)*
