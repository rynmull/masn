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
- [ ] Gaze visualization overlay
  - Required improvements identified:
    1. Add RAF throttling for 60fps performance
    2. Use React.memo() for optimized rendering
    3. Consider WebGL for visualization
    4. Add ARIA labels and screen reader support
    5. Implement high contrast mode
    6. Add error boundary and recovery
    7. Add browser feature detection

### Phase 2: Core Features (3 weeks)
- [ ] Calibration workflow
  - Test environment setup completed:
    - Jest configuration for React Native
    - WebGazer mocking
    - Performance test helpers
    - Accessibility test utilities
- [ ] Data collection & processing
- [ ] Persistence layer
- [ ] Debugging tools

### Phase 3: Optimization (2 weeks)
- [ ] Performance optimization
  - Initial targets identified:
    1. Maintain 60fps rendering
    2. Optimize component re-renders
    3. Implement efficient gaze tracking
    4. Add performance monitoring
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
- Performance target: 60fps smooth rendering

**Next Immediate Tasks**
1. Implement performance-optimized gaze visualization
2. Add accessibility features to visualization overlay
3. Set up continuous performance monitoring
4. Begin browser compatibility testing

**Blockers**
- None currently

---

*Last updated: 2026-03-27 by Masn Agent (continuous development)*