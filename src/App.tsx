import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, TouchableOpacity, Text, View } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { openDatabase } from 'expo-sqlite';
import SyncService from './services/SyncService';
import { registerBackgroundSync } from './services/BackgroundSyncService';
import HomeScreen from './screens/HomeScreen';
import CaregiverScreen from './screens/CaregiverScreen';

const db = openDatabase('masn.db');

type AppMode = 'user' | 'caregiver';

const DEFAULT_WORDS = [
  { label: 'Mom', speak: 'Mom', color: '#4CAF50', category: 'Home' },
  { label: 'Dad', speak: 'Dad', color: '#4CAF50', category: 'Home' },
  { label: 'Sister', speak: 'Sister', color: '#4CAF50', category: 'Home' },
  { label: 'Brother', speak: 'Brother', color: '#4CAF50', category: 'Home' },
  { label: 'Want', speak: 'I want', color: '#2196F3', category: 'Home' },
  { label: 'Eat', speak: 'I want to eat', color: '#FF9800', category: 'Home' },
  { label: 'Drink', speak: 'I want a drink', color: '#2196F3', category: 'Home' },
  { label: 'More', speak: 'I want more', color: '#9C27B0', category: 'Home' },
  { label: 'All done', speak: 'I am all done', color: '#607D8B', category: 'Home' },
  { label: 'Help', speak: 'Please help me', color: '#F44336', category: 'Home' },
  { label: 'Yes', speak: 'Yes', color: '#4CAF50', category: 'Home' },
  { label: 'No', speak: 'No', color: '#F44336', category: 'Home' },
  { label: 'Teacher', speak: 'Teacher', color: '#3F51B5', category: 'School' },
  { label: 'Book', speak: 'I want a book', color: '#795548', category: 'School' },
  { label: 'Play', speak: 'I want to play', color: '#FFEB3B', category: 'School' },
  { label: 'Friends', speak: 'Friends', color: '#E91E63', category: 'School' },
  { label: 'Bathroom', speak: 'I need the bathroom', color: '#00BCD4', category: 'School' },
  { label: 'Therapist', speak: 'Therapist', color: '#009688', category: 'Therapy' },
  { label: 'Exercise', speak: 'I want to do exercises', color: '#FF5722', category: 'Therapy' },
  { label: 'Tired', speak: 'I am tired', color: '#9E9E9E', category: 'Therapy' },
  { label: 'Pain', speak: 'It hurts', color: '#F44336', category: 'Therapy' },
  { label: 'Car', speak: 'I want to go in the car', color: '#3F51B5', category: 'Community' },
  { label: 'Park', speak: 'I want to go to the park', color: '#4CAF50', category: 'Community' },
  { label: 'Store', speak: 'I want to go to the store', color: '#FF9800', category: 'Community' },
  { label: 'Home', speak: 'I want to go home', color: '#2196F3', category: 'Community' },
  { label: 'Happy', speak: 'I feel happy', color: '#FFEB3B', category: 'Feelings' },
  { label: 'Sad', speak: 'I feel sad', color: '#2196F3', category: 'Feelings' },
  { label: 'Angry', speak: 'I feel angry', color: '#F44336', category: 'Feelings' },
  { label: 'Scared', speak: 'I feel scared', color: '#9C27B0', category: 'Feelings' },
  { label: 'Sick', speak: 'I feel sick', color: '#607D8B', category: 'Feelings' },
  { label: 'Go', speak: "Let's go", color: '#4CAF50', category: 'Actions' },
  { label: 'Stop', speak: 'Stop', color: '#F44336', category: 'Actions' },
  { label: 'Wait', speak: 'Wait please', color: '#FF9800', category: 'Actions' },
  { label: 'Come', speak: 'Come here', color: '#2196F3', category: 'Actions' },
  { label: 'Help', speak: 'Please help', color: '#9C27B0', category: 'Actions' },
];

interface WordItem {
  label: string;
  speak: string;
  color: string;
}
type Vocabulary = Record<string, WordItem[]>;

export default function App() {
  const [mode, setMode] = useState<AppMode>('user');
  const [vocabulary, setVocabulary] = useState<Vocabulary>({});
  const [ttsSettings, setTtsSettings] = useState({ pitch: 1.0, rate: 0.9, voice: '' });

  // Load shared data (vocabulary & TTS settings) from database
  useEffect(() => {
    initializeDB();
    SyncService.initialize().then(async () => {
      console.log('SyncService initialized');
      // Register background sync task
      await registerBackgroundSync();
    });
    loadSharedData();
  }, []);

  const initializeDB = () => {
    db.transaction(tx => {
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT UNIQUE,
          speak TEXT,
          color TEXT,
          category TEXT,
          usage_count INTEGER DEFAULT 0,
          last_used DATETIME
        );`
      );
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );`
      );
    });
  };

  const loadSharedData = () => {
    // Check if words table is empty and seed defaults if needed
    db.transaction(tx => {
      tx.executeSql('SELECT COUNT(*) as count FROM words;', [], (_, { rows }) => {
        if (rows.item(0).count === 0) {
          DEFAULT_WORDS.forEach(word => {
            db.transaction(t => t.executeSql(
              `INSERT INTO words (label, speak, color, category, usage_count) VALUES (?, ?, ?, ?, ?);`,
              [word.label, word.speak, word.color, word.category, 0]
            ));
          });
        }
      });
    });

    // Load all words and group by category
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM words;', [], (_, { rows }) => {
        const words = rows._array as Array<{ label: string; speak: string; color: string; category: string }>;
        const grouped: Record<string, Array<{ label: string; speak: string; color: string }>> = {};
        words.forEach(word => {
          if (!grouped[word.category]) grouped[word.category] = [];
          grouped[word.category].push({
            label: word.label,
            speak: word.speak,
            color: word.color,
          });
        });
        setVocabulary(grouped);
      });
    });

    // Load TTS settings (pitch, rate, voice)
    db.transaction(tx => {
      tx.executeSql("SELECT * FROM settings WHERE key='tts_pitch';", [], (_, { rows }) => {
        if (rows.length > 0) setTtsSettings(prev => ({ ...prev, pitch: parseFloat(rows.item(0).value) }));
      });
      tx.executeSql("SELECT * FROM settings WHERE key='tts_rate';", [], (_, { rows }) => {
        if (rows.length > 0) setTtsSettings(prev => ({ ...prev, rate: parseFloat(rows.item(0).value) }));
      });
      tx.executeSql("SELECT * FROM settings WHERE key='tts_voice';", [], (_, { rows }) => {
        if (rows.length > 0) setTtsSettings(prev => ({ ...prev, voice: rows.item(0).value }));
      });
    });
  };

  const refreshVocabulary = useCallback(() => {
    loadSharedData();
  }, []);

  // If in caregiver mode, show caregiver screen
  if (mode === 'caregiver') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <CaregiverScreen onExit={() => setMode('user')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.caregiverToggle}>
        <TouchableOpacity onPress={() => setMode('caregiver')}>
          <Text style={styles.caregiverLink}>Caregiver</Text>
        </TouchableOpacity>
      </View>
      <HomeScreen vocabulary={vocabulary} ttsSettings={ttsSettings} onVocabularyChange={refreshVocabulary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  caregiverToggle: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    padding: 4,
  },
  caregiverLink: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
});
