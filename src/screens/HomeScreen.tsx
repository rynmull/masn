import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as SQLite from 'expo-sqlite';
import { openDatabase } from 'expo-sqlite';

const db = openDatabase('masn.db');

const CATEGORIES = ['Home', 'School', 'Therapy', 'Community', 'Feelings', 'Actions'];

interface Word {
  label: string;
  speak: string;
  color: string;
}

interface Vocabulary {
  [category: string]: Word[];
}

interface TtsSettings {
  pitch: number;
  rate: number;
  voice?: string;
}

interface HomeScreenProps {
  vocabulary: Vocabulary;
  ttsSettings: TtsSettings;
  onVocabularyChange: () => void;
}

const { width, height } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width * 0.22, height * 0.18);

export default function HomeScreen({ vocabulary, ttsSettings, onVocabularyChange }: HomeScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [phrase, setPhrase] = useState<string[]>([]);
  const [suggestedWords, setSuggestedWords] = useState<string[]>([]);

  const speak = useCallback((text: string) => {
    const options: Speech.SpeechOptions = {
      language: 'en-US',
      pitch: ttsSettings.pitch,
      rate: ttsSettings.rate,
    };
    if (ttsSettings.voice && ttsSettings.voice.trim() !== '') {
      options.voice = ttsSettings.voice;
    }
    Speech.speak(text, options);
  }, [ttsSettings]);

  const handleButtonPress = (item: Word) => {
    // Speak immediately
    speak(item.speak);

    // Add to phrase builder
    setPhrase(prev => [...prev, item.label]);

    // Update usage in DB
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO words (label, speak, color, category, usage_count) VALUES (?, ?, ?, ?, 1)
         ON CONFLICT(label) DO UPDATE SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP;`,
        [item.label, item.speak, item.color, selectedCategory]
      );
    });
  };

  const clearPhrase = () => setPhrase([]);

  const speakPhrase = () => {
    const text = phrase.join(' ');
    if (text.trim()) {
      speak(text);
    }
  };

  // Fetch word suggestions based on usage and recency
  const fetchSuggestedWords = useCallback(() => {
    if (phrase.length === 0) {
      setSuggestedWords([]);
      return;
    }
    db.transaction(tx => {
      const placeholders = phrase.map(() => '?').join(',');
      const sql = `
        SELECT label FROM words
        WHERE label NOT IN (${placeholders})
        ORDER BY usage_count DESC, last_used DESC
        LIMIT 4;
      `;
      tx.executeSql(
        sql,
        phrase,
        (_, { rows }) => {
          const labels = rows._array.map((row: any) => row.label);
          setSuggestedWords(labels);
        },
        (_, error) => {
          console.log('Error fetching suggestions:', error);
          setSuggestedWords([]);
          return false;
        }
      );
    });
  }, [phrase]);

  // Update suggestions whenever phrase changes
  useEffect(() => {
    fetchSuggestedWords();
  }, [phrase, fetchSuggestedWords]);

  const currentVocab = vocabulary[selectedCategory] || [];

  return (
    <View style={styles.container}>
      {/* Phrase builder bar */}
      <View style={styles.phraseBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text style={styles.phraseText}>
            {phrase.length === 0 ? 'Tap a button...' : phrase.join(' ')}
          </Text>
        </ScrollView>
        <TouchableOpacity style={styles.clearButton} onPress={clearPhrase}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Suggested next words */}
      {phrase.length > 0 && suggestedWords.length > 0 && (
        <View style={styles.suggestionsRow}>
          <Text style={styles.suggestionsLabel}>Try:</Text>
          {suggestedWords.map((word, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.suggestionChip, { backgroundColor: '#333' }]}
              onPress={() => {
                // Search across all categories for the word
                const allWords = Object.values(vocabulary).flat();
                const vocab = allWords.find(v => v.label === word);
                if (vocab) handleButtonPress(vocab);
              }}
            >
              <Text style={styles.suggestionText}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Category tabs */}
      <ScrollView horizontal style={styles.tabs} showsHorizontalScrollIndicator={false}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.tab,
              selectedCategory === cat && styles.tabActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[
              styles.tabText,
              selectedCategory === cat && styles.tabTextActive,
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Button grid */}
      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {currentVocab.map((item, idx) => (
          <TouchableOpacity
            key={`${item.label}-${idx}`}
            style={[styles.button, { backgroundColor: item.color }]}
            onPress={() => handleButtonPress(item)}
            accessibilityLabel={item.label}
            accessibilityRole="button"
            accessibilityHint={`Speak ${item.speak}`}
          >
            <Text style={styles.buttonText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Speak phrase button */}
      <TouchableOpacity style={styles.speakButton} onPress={speakPhrase}>
        <Text style={styles.speakButtonText}>🔊 Speak Phrase</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 20,
  },
  phraseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#333',
  },
  phraseText: {
    color: '#FFF',
    fontSize: 24,
    marginRight: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  suggestionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 12,
  },
  suggestionsLabel: {
    color: '#AAA',
    marginRight: 8,
    fontSize: 14,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  suggestionText: {
    color: '#FFF',
    fontSize: 14,
  },
  tabs: {
    maxHeight: 50,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#444',
  },
  tabActive: {
    backgroundColor: '#6200EE',
    borderColor: '#6200EE',
  },
  tabText: {
    color: '#AAA',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#FFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingBottom: 80,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    margin: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  speakButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#03DAC6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  speakButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
