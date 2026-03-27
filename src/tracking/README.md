# Eye Tracking Core

This directory contains the core eye tracking functionality for Masn AAC.

## Structure

```
tracking/
├── core/
│   ├── hardware/       # Hardware abstraction layer
│   ├── calibration/    # Calibration system
│   └── prediction/     # Gaze prediction algorithms
├── ui/
│   ├── feedback/       # Visual feedback components
│   └── settings/       # Configuration interface
└── data/
    ├── profiles/       # User calibration profiles
    └── analytics/      # Usage data and optimization
```

## Development Status

Currently in planning phase. See `/docs/eye-tracking/DESIGN.md` for full feature design and timeline.