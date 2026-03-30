import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EMOTION_OPTIONS, type EmotionPreset } from '../../utils/ttsPresets';

interface EmotionPickerProps {
  currentEmotion: EmotionPreset;
  emotionSymbolUrls: Record<string, string>;
  onSelect: (emotion: EmotionPreset) => void;
  vertical?: boolean;
}

export default function EmotionPicker({
  currentEmotion,
  emotionSymbolUrls,
  onSelect,
  vertical = false,
}: EmotionPickerProps) {
  return (
    <View style={[styles.wrapper, vertical ? styles.wrapperVertical : styles.wrapperHorizontal]}>
      <Text style={styles.title}>Voice</Text>
      <View style={[styles.buttonRow, vertical && styles.buttonColumn]}>
        {EMOTION_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.button,
              currentEmotion === option.id && styles.buttonActive,
            ]}
            onPress={() => onSelect(option.id)}
            accessibilityLabel={`${option.label} voice`}
          >
            {emotionSymbolUrls[option.id] ? (
              <Image
                source={{ uri: emotionSymbolUrls[option.id] }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.buttonText}>{option.shortLabel}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D7DFEA',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  wrapperHorizontal: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  wrapperVertical: {
    marginBottom: 12,
  },
  title: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  buttonActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  image: {
    width: 36,
    height: 36,
  },
});