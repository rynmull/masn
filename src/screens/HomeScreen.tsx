import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  useWindowDimensions,
  AccessibilityInfo
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, grid, haptics, accessibilityStyles } from '../styles/theme';
import { useAccessibilitySettings } from '../hooks/useAccessibilitySettings';
import { usePrediction } from '../hooks/usePrediction';
import { useVoice } from '../hooks/useVoice';
import { useStorage } from '../hooks/useStorage';

export const HomeScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { settings } = useAccessibilitySettings();
  const { predictions, updateContext } = usePrediction();
  const { speak, getVoiceForEmotion } = useVoice();
  const { incrementUsage } = useStorage();
  
  // Scanning refs
  const scanTimer = useRef<NodeJS.Timeout>();
  const currentIndex = useRef(0);
  const gridRef = useRef<View>(null);

  // Enhanced haptic feedback
  const triggerHaptic = async (type: keyof typeof haptics) => {
    if (settings.hapticFeedback) {
      switch (type) {
        case 'selection':
          await Haptics.selectionAsync();
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    }
  };

  // Handle button press with enhanced feedback
  const handlePress = async (word: string, emotion?: string) => {
    await triggerHaptic('selection');
    const voice = getVoiceForEmotion(emotion);
    await speak(word, voice);
    await incrementUsage(word);
    updateContext(word);
    
    // Announce for screen readers
    AccessibilityInfo.announceForAccessibility(word);
  };

  // Switch control navigation
  const handleSwitch1 = () => {
    triggerHaptic('selection');
    if (settings.scanType === 'two_switch') {
      currentIndex.current = (currentIndex.current + 1) % totalButtons;
      updateHighlight();
    }
  };

  const handleSwitch2 = () => {
    const button = buttons[currentIndex.current];
    if (button) {
      handlePress(button.word, button.emotion);
    }
  };

  // Auto scanning
  useEffect(() => {
    if (settings.scanType === 'automatic') {
      scanTimer.current = setInterval(() => {
        currentIndex.current = (currentIndex.current + 1) % totalButtons;
        updateHighlight();
      }, settings.scanInterval);
    }
    return () => clearInterval(scanTimer.current);
  }, [settings.scanType, settings.scanInterval]);

  // Save points for long sequences
  const savePoint = useRef<number>(0);
  const setSavePoint = () => {
    savePoint.current = currentIndex.current;
    triggerHaptic('success');
  };

  const returnToSavePoint = () => {
    currentIndex.current = savePoint.current;
    updateHighlight();
    triggerHaptic('warning');
  };

  // Gesture handling for power users
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    lastTime: 0
  });

  const handleGestureStart = (x: number, y: number) => {
    gestureRef.current = {
      startX: x,
      startY: y,
      lastTime: Date.now()
    };
  };

  const handleGestureEnd = (x: number, y: number) => {
    const dx = x - gestureRef.current.startX;
    const dy = y - gestureRef.current.startY;
    const duration = Date.now() - gestureRef.current.lastTime;

    // Quick swipe detection
    if (duration < 300) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        if (dx > 50) {
          // Right swipe - next category
          handleCategoryChange(1);
        } else if (dx < -50) {
          // Left swipe - previous category
          handleCategoryChange(-1);
        }
      } else {
        // Vertical swipe
        if (dy > 50) {
          // Down swipe - set save point
          setSavePoint();
        } else if (dy < -50) {
          // Up swipe - return to save point
          returnToSavePoint();
        }
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}
          ref={gridRef}
          onTouchStart={e => handleGestureStart(e.nativeEvent.pageX, e.nativeEvent.pageY)}
          onTouchEnd={e => handleGestureEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)}>
      <View style={styles.predictionBar}>
        {predictions.map((word, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.predictionButton, accessibilityStyles.touchableArea]}
            onPress={() => handlePress(word)}
            accessible={true}
            accessibilityLabel={word}
            accessibilityRole="button">
            <Text style={styles.predictionText}>{word}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonGrid}>
        {/* Grid buttons here */}
      </View>

      {settings.scanType === 'two_switch' && (
        <View style={styles.switchControls}>
          <TouchableOpacity
            style={[styles.switchButton, accessibilityStyles.touchableArea]}
            onPress={handleSwitch1}
            accessible={true}
            accessibilityLabel="Next Item"
            accessibilityRole="button">
            <Text style={styles.switchButtonText}>Next</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchButton, accessibilityStyles.touchableArea]}
            onPress={handleSwitch2}
            accessible={true}
            accessibilityLabel="Select Item"
            accessibilityRole="button">
            <Text style={styles.switchButtonText}>Select</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  predictionBar: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary
  },
  predictionButton: {
    ...accessibilityStyles.touchableArea,
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginHorizontal: 4
  },
  predictionText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '500'
  },
  buttonGrid: {
    flex: 1,
    padding: grid.containerPadding,
    gap: grid.spacing
  },
  switchControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.secondary
  },
  switchButton: {
    ...accessibilityStyles.touchableArea,
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 0.45
  },
  switchButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center'
  }
});