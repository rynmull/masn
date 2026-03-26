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

const VOCABULARY: Record<string, Array<{ label: string; speak: string; color: string }>> = {
  Home: [
    { label: 'Mom', speak: 'Mom', color: '#4CAF50' },
    { label: 'Dad', speak: 'Dad', color: '#4CAF50' },
    { label: 'Sister', speak: 'Sister', color: '#4CAF50' },
    { label: 'Brother', speak: 'Brother', color: '#4CAF50' },
    { label: 'Want', speak: 'I want', color: '#2196F3' },
    { label: 'Eat', speak: 'I want to eat', color: '#FF9800' },
    { label: 'Drink', speak: 'I want a drink', color: '#2196F3' },
    { label: 'More', speak: 'I want more', color: '#9C27B0' },
    { label: 'All done', speak: 'I am all done', color: '#607D8B' },
    { label: 'Help', speak: 'Please help me', color: '#F44336' },
    { label: 'Yes', speak: 'Yes', color: '#4CAF50' },
    { label: 'No', speak: 'No', color: '#F44336' },
  ],
  School: [
    { label: 'Teacher', speak: 'Teacher', color: '#3F51B5' },
    { label: 'Book', speak: 'I want a book', color: '#795548' },
    { label: 'Play', speak: 'I want to play', color: '#FFEB3B' },
    { label: 'Friends', speak: 'Friends', color: '#E91E63' },
    { label: 'Bathroom', speak: 'I need the bathroom', color: '#00BCD4' },
  ],
  Therapy: [
    { label: 'Therapist', speak: 'Therapist', color: '#009688' },
    { label: 'Exercise', speak: 'I want to do exercises', color: '#FF5722' },
    { label: 'Tired', speak: 'I am tired', color: '#9E9E9E' },
    { label: 'Pain', speak: 'It hurts', color: '#F44336' },
  ],
  Community: [
    { label: 'Car', speak: 'I want to go in the car', color: '#3F51B5' },
    { label: 'Park', speak: 'I want to go to the park', color: '#4CAF50' },
    { label: 'Store', speak: 'I want to go to the store', color: '#FF9800' },
    { label: 'Home', speak: 'I want to go home', color: '#2196F3' },
  ],
  Feelings: [
    { label: 'Happy', speak: 'I feel happy', color: '#FFEB3B' },
    { label: 'Sad', speak: 'I feel sad', color: '#2196F3' },
    { label: 'Angry', speak: 'I feel angry', color: '#F44336' },
    { label: 'Scared', speak: 'I feel scared', color: '#9C27B0' },
    { label: 'Sick', speak: 'I feel sick', color: '#607D8B' },
    { label: 'Tired', speak: 'I feel tired', color: '#795548' },
  ],
  Actions: [
    { label: 'Go', speak: 'Let's go', color: '#4CAF50' },
    { label: 'Stop', speak: 'Stop', color: '#F44336' },
    { label: 'Wait', speak: 'Wait please', color: '#FF9800' },
    { label: 'Come', speak: 'Come here', color: '#2196F3' },
    { label: 'Help', speak: 'Please help', color: '#9C27B0' },
  ],
};

const { width, height } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width * 0.22, height * 0.18);

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [phrase, setPhrase] = useState<string[]>([]);
  const [recentWords, setRecentWords] = useState<string[]>([]);

  // Initialize DB
  useEffect(() => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word TEXT UNIQUE,
          count INTEGER DEFAULT 1,
          last_used DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
      );
    });
  }, []);

  const speak = useCallback((text: string) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
    });
  }, []);

  const handleButtonPress = (item: { label: string; speak: string; color: string }) => {
    // Speak immediately
    speak(item.speak);

    // Add to phrase builder
    setPhrase(prev => [...prev, item.label]);

    // Update usage in DB
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO usage (word, count, last_used) VALUES (?, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(word) DO UPDATE SET count = count + 1, last_used = CURRENT_TIMESTAMP;`,
        [item.label]
      );
    });

    // Update recent words locally (for quick suggestions)
    setRecentWords(prev => {
      const filtered = prev.filter(w => w !== item.label);
      return [item.label, ...filtered].slice(0, 10);
    });
  };

  const clearPhrase = () => setPhrase([]);

  const speakPhrase = () => {
    const text = phrase.join(' ');
    if (text.trim()) {
      speak(text);
    }
  };

  const getSuggestedWords = () => {
    // Very simple suggestion: recent words not already in phrase
    return recentWords.filter(w => !phrase.includes(w)).slice(0, 4);
  };

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
      {phrase.length > 0 && (
        <View style={styles.suggestionsRow}>
          <Text style={styles.suggestionsLabel}>Try:</Text>
          {getSuggestedWords().map((word, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.suggestionChip, { backgroundColor: '#333' }]}
              onPress={() => {
                const vocab = VOCABULARY[selectedCategory].find(v => v.label === word);
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
        {VOCABULARY[selectedCategory].map((item, idx) => (
          <TouchableOpacity
            key={idx}
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
