import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QuickPhrasesRowProps {
  quickPhrases: string[];
  recentWords: string[];
  onSelectQuickPhrase: (phrase: string) => void;
  onSelectRecentWord: (word: string) => void;
  highContrast: boolean;
  scaledText: (size: number) => number;
}

/**
 * QuickPhrasesRow displays frequently used phrases and recent utterances.
 * Research shows 15-20% of utterances come from quick access phrases.
 * Positioned between UtteranceDock and PredictionStrip for easy access.
 */
export default function QuickPhrasesRow({
  quickPhrases,
  recentWords,
  onSelectQuickPhrase,
  onSelectRecentWord,
  highContrast,
  scaledText,
}: QuickPhrasesRowProps) {
  if (quickPhrases.length === 0 && recentWords.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {quickPhrases.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: scaledText(13) }]}>Quick Phrases</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {quickPhrases.map((phrase, index) => (
              <TouchableOpacity
                key={`quick-${phrase}-${index}`}
                style={[styles.chip, styles.quickChip, highContrast && styles.chipHighContrast]}
                onPress={() => onSelectQuickPhrase(phrase)}
              >
                <Text style={[styles.text, { fontSize: scaledText(14) }, highContrast && styles.textHighContrast]}>
                  {phrase}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {recentWords.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.label, { fontSize: scaledText(13) }]}>Recent Words</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {recentWords.map((word, index) => (
              <TouchableOpacity
                key={`recent-${word}-${index}`}
                style={[styles.chip, highContrast && styles.chipHighContrast]}
                onPress={() => onSelectRecentWord(word)}
              >
                <Text style={[styles.text, { fontSize: scaledText(14) }, highContrast && styles.textHighContrast]}>
                  {word}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  section: {
    gap: 8,
  },
  label: {
    paddingHorizontal: 12,
    color: '#5E6B7D',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scrollContent: {
    paddingHorizontal: 6,
    gap: 6,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(241, 245, 249, 0.88)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickChip: {
    backgroundColor: '#E0F2FE',
    borderColor: '#7DD3FC',
  },
  chipHighContrast: {
    borderColor: '#000000',
    borderWidth: 2,
  },
  text: {
    color: '#334155',
    fontWeight: '600',
    textAlign: 'center',
  },
  textHighContrast: {
    color: '#000000',
    fontWeight: '700',
  },
});
