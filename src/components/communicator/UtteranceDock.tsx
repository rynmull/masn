import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface UtteranceDockProps {
  phraseLabels: string[];
  typedPhrase: string;
  onTypedPhraseChange: (text: string) => void;
  onSubmitTypedPhrase: () => void;
  onBackspace: () => void;
  onClear: () => void;
  onSpeak: () => void;
  emotionSymbolUrl?: string;
  emotionShortLabel: string;
  highContrast: boolean;
  scaledText: (size: number) => number;
  isTabletLayout: boolean;
}

export default function UtteranceDock({
  phraseLabels,
  typedPhrase,
  onTypedPhraseChange,
  onSubmitTypedPhrase,
  onBackspace,
  onClear,
  onSpeak,
  emotionSymbolUrl,
  emotionShortLabel,
  highContrast,
  scaledText,
  isTabletLayout,
}: UtteranceDockProps) {
  return (
    <View style={[styles.wrapper, isTabletLayout && styles.wrapperTablet]}>
      <View style={[styles.card, highContrast && styles.cardHighContrast]}>
        <View style={styles.headerRow}>
          <Text style={[styles.eyebrow, { fontSize: scaledText(11) }]}>Utterance</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onBackspace}
              accessibilityRole="button"
              accessibilityLabel="Delete last word"
            >
              <Text style={styles.iconButtonText}>⌫</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={onClear}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text
            style={[
              styles.utteranceText,
              { fontSize: scaledText(isTabletLayout ? 30 : 24) },
              highContrast && styles.utteranceTextHighContrast,
            ]}
          >
            {phraseLabels.length === 0 ? 'Tap a button...' : phraseLabels.join(' ')}
          </Text>
        </ScrollView>
      </View>

      <View style={[styles.typeRow, isTabletLayout && styles.typeRowTablet]}>
        <TextInput
          style={styles.typeInput}
          value={typedPhrase}
          onChangeText={onTypedPhraseChange}
          placeholder="Type a word or phrase"
          placeholderTextColor="#64748B"
          onSubmitEditing={onSubmitTypedPhrase}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.secondaryButton} onPress={onSubmitTypedPhrase}>
          <Text style={styles.secondaryButtonText}>Add</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.speakButton} onPress={onSpeak}>
          <View style={styles.speakButtonContent}>
            <View style={styles.speakMoodBadge}>
              {emotionSymbolUrl ? (
                <Image source={{ uri: emotionSymbolUrl }} style={styles.speakMoodImage} resizeMode="contain" />
              ) : (
                <Text style={styles.speakMoodText}>{emotionShortLabel}</Text>
              )}
            </View>
            <Text style={styles.speakButtonText}>Speak</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 10,
    gap: 10,
  },
  wrapperTablet: {
    marginTop: 12,
    marginBottom: 14,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    boxShadow: '0px 10px 26px rgba(15, 23, 42, 0.18)',
    elevation: 5,
  },
  cardHighContrast: {
    borderColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  eyebrow: {
    color: '#93C5FD',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    minWidth: 42,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  clearButton: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  utteranceText: {
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 40,
    paddingRight: 12,
  },
  utteranceTextHighContrast: {
    color: '#FFFFFF',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeRowTablet: {
    alignItems: 'stretch',
  },
  typeInput: {
    flex: 1,
    minHeight: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 16,
  },
  secondaryButton: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  speakButton: {
    minHeight: 50,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#14B8A6',
    boxShadow: '0px 8px 18px rgba(15, 23, 42, 0.16)',
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  speakMoodBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakMoodImage: {
    width: 20,
    height: 20,
  },
  speakMoodText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  speakButtonText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 14,
  },
});
