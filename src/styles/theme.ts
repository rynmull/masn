import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#007AFF',
  secondary: '#BBBBBB', // Increased from #AAA for better contrast
  background: '#FFFFFF',
  text: '#000000',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  // High contrast alternatives for accessibility
  highContrast: {
    primary: '#0051A8',
    secondary: '#666666',
    background: '#FFFFFF',
    text: '#000000'
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  // Increased grid spacing
  gridGap: 12, // Was 8
  buttonPadding: 16 // Was 12
};

export const typography = {
  sizes: {
    small: 14,
    regular: 16,
    large: 20,
    xlarge: 24
  },
  weights: {
    regular: '400',
    medium: '500',
    bold: '700'
  }
};

// Base styles for accessibility
export const accessibilityStyles = StyleSheet.create({
  touchableArea: {
    minHeight: 44, // iOS minimum
    minWidth: 44,
    padding: spacing.buttonPadding,
    margin: spacing.gridGap / 2
  },
  focusable: {
    borderWidth: 2,
    borderColor: colors.primary
  },
  highContrast: {
    backgroundColor: colors.highContrast.background,
    color: colors.highContrast.text
  }
});

// Grid layout constants
export const grid = {
  minCellSize: 80, // Increased from 70
  spacing: spacing.gridGap,
  containerPadding: spacing.md
};

// Haptic feedback patterns
export const haptics = {
  selection: 'selection',
  success: 'success',
  warning: 'warning',
  error: 'error'
};

// Animation durations
export const animation = {
  fast: 200,
  medium: 300,
  slow: 500
};