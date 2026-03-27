# Masn Development TODO

**Priority Order** (high → low)
- [x] **Caregiver Mode** (customization, vocabulary management, settings) ✅ Completed 2026-03-26
- [x] **Adaptive Word Prediction** (SQLite usage-based suggestions by count & recency) ✅ Completed 2026-03-26
- [x] **Testing & Accessibility Audit (P6)** ✅ Completed 2026-03-26
  - ✅ UI Testing completed: contrast ratios improved, button spacing optimized
  - ✅ Accessibility Testing completed: strong compliance across all features
  - ✅ Feature Improvements completed:
    1. Enhanced word prediction with paired suggestions
    2. Gesture controls for power users
    3. Save points for scanning sequences
    4. Advanced auditory feedback
- [x] **Emotional Tone TTS** (extended presets, voice selection) ✅ Completed 2026-03-26
- [x] **Cloud Sync (encrypted optional backup)** ✅ Completed 2026-03-26 (Phase 1+2+3)
- [x] **Advanced Accessibility** (switch control with automatic and two-switch modes, eye tracking foundation laid) ✅ Completed 2026-03-26
- [x] **Documentation & Deployment Guides (P7)** ✅ Completed 2026-03-27

**Current Features**

## Eye Tracking Integration (P8) - 8 Week Timeline
Technical specification completed: `/docs/specs/eye-tracking.md`

### Phase 1: Foundation (2 weeks)
- [x] Basic calibration UI prototype
- [x] WebGazer.js integration
- [x] EyeTrackingManager implementation
- [x] Gaze visualization overlay - Completed with features:
  - WebGL2 hardware-accelerated rendering
  - 60fps performance with RAF throttling
  - React.memo optimizations
  - Performance monitoring system
  - High-quality point sprite rendering
  - Accessibility support with ARIA
  - Browser feature detection

### Phase 2: Core Features (3 weeks)
- [ ] Full calibration workflow
- [ ] Data collection & processing
- [ ] Persistence layer
- [ ] Debugging tools

### Phase 3: Optimization (2 weeks)
- [ ] Performance optimization
  - Initial targets achieved:
    - 60fps smooth rendering ✅
    - Optimized component re-renders ✅
    - Efficient gaze tracking ✅
    - Performance monitoring ✅
- [ ] Error handling
- [ ] Browser compatibility
- [ ] Documentation updates

### Phase 4: Testing & Polish (1 week)
- [ ] Comprehensive testing
- [ ] UI/UX refinements
- [ ] Performance monitoring
- [ ] Final documentation

## Additional Planned Improvements
1. Enhanced UI Themes
   - High contrast options
   - Color-blind friendly modes
   - Dark/light variations
   - Custom theme builder

2. Machine Learning Enhancements
   - Advanced word prediction
   - Pattern recognition
   - Usage optimization
   - Personalized suggestions

**Implementation Notes**
- All changes must maintain offline-first architecture
- UI meets WCAG AA contrast minimums (4.5:1)
- SQLite schema: words(id, label, speak, color, category, usage_count, last_used), settings(key, value)
- Eye tracking implementation using WebGazer.js with 5-point calibration system
- Test coverage requirement: 80% across all metrics
- Performance target: 60fps smooth rendering ✅
- WebGL2 rendering for hardware acceleration ✅

**Next Immediate Tasks**
1. Complete full calibration workflow
2. Begin data collection system
3. Start persistence layer implementation
4. Design debugging tools

**Blockers**
- None currently

---

*Last updated: 2026-03-27 by Masn Agent (continuous development)*