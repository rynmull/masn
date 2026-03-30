import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PredictionStripProps {
  suggestions: string[];
  onSelect: (word: string, index: number) => void;
  showSymbols: boolean;
  symbolUrls: Record<string, string>;
  highContrast: boolean;
  scaledText: (size: number) => number;
}

export default function PredictionStrip({
  suggestions,
  onSelect,
  showSymbols,
  symbolUrls,
  highContrast,
  scaledText,
}: PredictionStripProps) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { fontSize: scaledText(13) }]}>Next</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {suggestions.map((word, index) => (
          <TouchableOpacity
            key={`${word}-${index}`}
            style={[styles.chip, highContrast && styles.chipHighContrast]}
            onPress={() => onSelect(word, index)}
          >
            <View style={styles.content}>
              {showSymbols && symbolUrls[word] ? (
                <Image source={{ uri: symbolUrls[word] }} style={styles.symbol} resizeMode="contain" />
              ) : null}
              <Text style={[styles.text, { fontSize: scaledText(15) }, highContrast && styles.textHighContrast]}>{word}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  label: {
    color: '#475569',
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  scrollContent: {
    paddingRight: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  chipHighContrast: {
    backgroundColor: '#000000',
    borderColor: '#FFFFFF',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  symbol: {
    width: 20,
    height: 20,
  },
  text: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  textHighContrast: {
    color: '#FFFFFF',
  },
});
