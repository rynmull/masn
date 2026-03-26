import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as SQLite from 'expo-sqlite';
import { openDatabase } from 'expo-sqlite';

const db = openDatabase('masn.db');

interface Word {
  id?: number;
  label: string;
  speak: string;
  color: string;
  category: string;
  usage_count: number;
  last_used?: string;
}

interface Category {
  id?: number;
  name: string;
  color: string;
  icon?: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Home', color: '#4CAF50' },
  { name: 'School', color: '#3F51B5' },
  { name: 'Therapy', color: '#009688' },
  { name: 'Community', color: '#FF9800' },
  { name: 'Feelings', color: '#FFEB3B' },
  { name: 'Actions', color: '#E91E63' },
];

const DEFAULT_WORDS: Word[] = [
  { label: 'Mom', speak: 'Mom', color: '#4CAF50', category: 'Home', usage_count: 0 },
  { label: 'Dad', speak: 'Dad', color: '#4CAF50', category: 'Home', usage_count: 0 },
  { label: 'Sister', speak: 'Sister', color: '#4CAF50', category: 'Home', usage_count: 0 },
  { label: 'Brother', speak: 'Brother', color: '#4CAF50', category: 'Home', usage_count: 0 },
  { label: 'Want', speak: 'I want', color: '#2196F3', category: 'Home', usage_count: 0 },
  { label: 'Eat', speak: 'I want to eat', color: '#FF9800', category: 'Home', usage_count: 0 },
  { label: 'Drink', speak: 'I want a drink', color: '#2196F3', category: 'Home', usage_count: 0 },
  { label: 'More', speak: 'I want more', color: '#9C27B0', category: 'Home', usage_count: 0 },
  { label: 'All done', speak: 'I am all done', color: '#607D8B', category: 'Home', usage_count: 0 },
  { label: 'Help', speak: 'Please help me', color: '#F44336', category: 'Home', usage_count: 0 },
  { label: 'Yes', speak: 'Yes', color: '#4CAF50', category: 'Home', usage_count: 0 },
  { label: 'No', speak: 'No', color: '#F44336', category: 'Home', usage_count: 0 },
  { label: 'Teacher', speak: 'Teacher', color: '#3F51B5', category: 'School', usage_count: 0 },
  { label: 'Book', speak: 'I want a book', color: '#795548', category: 'School', usage_count: 0 },
  { label: 'Play', speak: 'I want to play', color: '#FFEB3B', category: 'School', usage_count: 0 },
  { label: 'Friends', speak: 'Friends', color: '#E91E63', category: 'School', usage_count: 0 },
  { label: 'Bathroom', speak: 'I need the bathroom', color: '#00BCD4', category: 'School', usage_count: 0 },
  { label: 'Therapist', speak: 'Therapist', color: '#009688', category: 'Therapy', usage_count: 0 },
  { label: 'Exercise', speak: 'I want to do exercises', color: '#FF5722', category: 'Therapy', usage_count: 0 },
  { label: 'Tired', speak: 'I am tired', color: '#9E9E9E', category: 'Therapy', usage_count: 0 },
  { label: 'Pain', speak: 'It hurts', color: '#F44336', category: 'Therapy', usage_count: 0 },
  { label: 'Car', speak: 'I want to go in the car', color: '#3F51B5', category: 'Community', usage_count: 0 },
  { label: 'Park', speak: 'I want to go to the park', color: '#4CAF50', category: 'Community', usage_count: 0 },
  { label: 'Store', speak: 'I want to go to the store', color: '#FF9800', category: 'Community', usage_count: 0 },
  { label: 'Home', speak: 'I want to go home', color: '#2196F3', category: 'Community', usage_count: 0 },
  { label: 'Happy', speak: 'I feel happy', color: '#FFEB3B', category: 'Feelings', usage_count: 0 },
  { label: 'Sad', speak: 'I feel sad', color: '#2196F3', category: 'Feelings', usage_count: 0 },
  { label: 'Angry', speak: 'I feel angry', color: '#F44336', category: 'Feelings', usage_count: 0 },
  { label: 'Scared', speak: 'I feel scared', color: '#9C27B0', category: 'Feelings', usage_count: 0 },
  { label: 'Sick', speak: 'I feel sick', color: '#607D8B', category: 'Feelings', usage_count: 0 },
  { label: 'Go', speak: "Let's go", color: '#4CAF50', category: 'Actions', usage_count: 0 },
  { label: 'Stop', speak: 'Stop', color: '#F44336', category: 'Actions', usage_count: 0 },
  { label: 'Wait', speak: 'Wait please', color: '#FF9800', category: 'Actions', usage_count: 0 },
  { label: 'Come', speak: 'Come here', color: '#2196F3', category: 'Actions', usage_count: 0 },
];

const CAREGIVER_PIN = '1234'; // In production: hash and store securely

const { width, height } = Dimensions.get('window');
const BUTTON_SIZE = Math.min(width * 0.18, height * 0.14);

export default function CaregiverScreen({ onExit }: { onExit: () => void }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'settings' | 'stats' | 'categories'>('vocabulary');

  // Vocabulary management state
  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState({ label: '', speak: '', color: '#2196F3', category: 'Home' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'label' | 'usage' | 'category'>('label');
  // Validation state
  const [wordErrors, setWordErrors] = useState<{label?: string; speak?: string}>({});

  // Category management state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#2196F3' });
  const [categoryErrors, setCategoryErrors] = useState<{name?: string}>({});
  // Quick add category from word modal
  const [quickCategoryInput, setQuickCategoryInput] = useState('');
  const [showQuickCategory, setShowQuickCategory] = useState(false);

  // TTS Settings state
  const [ttsSettings, setTtsSettings] = useState({ pitch: 1.0, rate: 0.9, voice: 'default' });
  const [emotionPreset, setEmotionPreset] = useState<'neutral' | 'happy' | 'calm' | 'urgent'>('neutral');
  const [previewSpeech, setPreviewSpeech] = useState<string>('');

  // Statistics state
  const [stats, setStats] = useState({ totalWords: 0, totalUsage: 0, topWords: [] as {word: string, count: number}[] });

  // Load data from DB
  useEffect(() => {
    initializeDB();
    loadData();
  }, []);

  const initializeDB = () => {
    db.transaction(tx => {
      // Categories table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          color TEXT,
          icon TEXT
        );`
      );
      // Words table (expanded from usage)
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
      // Settings table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );`
      );
    });
  };

  const loadData = () => {
    // Load categories
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM categories;', [], (_, { rows }) => {
        if (rows.length === 0) {
          // Seed default categories
          DEFAULT_CATEGORIES.forEach(cat => {
            db.transaction(t => t.executeSql('INSERT INTO categories (name, color) VALUES (?, ?);', [cat.name, cat.color]));
          });
          setCategories(DEFAULT_CATEGORIES);
        } else {
          const cats = rows._array;
          setCategories(cats);
        }
      });
    });

    // Load words
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM words;', [], (_, { rows }) => {
        if (rows.length === 0) {
          // Seed default words
          DEFAULT_WORDS.forEach(word => {
            db.transaction(t => t.executeSql(
              `INSERT INTO words (label, speak, color, category, usage_count) VALUES (?, ?, ?, ?, ?);`,
              [word.label, word.speak, word.color, word.category, word.usage_count]
            ));
          });
          setWords(DEFAULT_WORDS);
        } else {
          setWords(rows._array);
        }
      });
    });

    // Load TTS settings
    db.transaction(tx => {
      tx.executeSql("SELECT * FROM settings WHERE key='tts_pitch';", [], (_, { rows }) => {
        if (rows.length > 0) setTtsSettings(prev => ({ ...prev, pitch: parseFloat(rows.item(0).value) }));
      });
      tx.executeSql("SELECT * FROM settings WHERE key='tts_rate';", [], (_, { rows }) => {
        if (rows.length > 0) setTtsSettings(prev => ({ ...prev, rate: parseFloat(rows.item(0).value) }));
      });
    });
  };

  const loadStats = () => {
    db.transaction(tx => {
      tx.executeSql('SELECT COUNT(*) as total FROM words;', [], (_, { countRow }) => {
        setStats(prev => ({ ...prev, totalWords: countRow.item(0).total }));
      });
      tx.executeSql('SELECT SUM(usage_count) as total FROM words;', [], (_, { sumRow }) => {
        setStats(prev => ({ ...prev, totalUsage: sumRow.item(0).total || 0 }));
      });
      tx.executeSql('SELECT label, usage_count FROM words ORDER BY usage_count DESC LIMIT 10;', [], (_, { rows }) => {
        const top = rows._array.map((r: any) => ({ word: r.label, count: r.usage_count }));
        setStats(prev => ({ ...prev, topWords: top }));
      });
    });
  };

  // Category Management
  const validateCategory = (category: { name: string; color: string }) => {
    const errors: {name?: string} = {};
    if (!category.name.trim()) {
      errors.name = 'Category name is required';
    } else if (category.name.length > 30) {
      errors.name = 'Name must be 30 characters or less';
    } else if (!/^[A-Za-z0-9\s\-_]+$/.test(category.name)) {
      errors.name = 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    setCategoryErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCategory = () => {
    if (!validateCategory(newCategory)) {
      return;
    }

    const trimmedName = newCategory.name.trim();
    // Check for duplicate category name (case-insensitive)
    const exists = categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists && (!editingCategory || editingCategory.name.toLowerCase() !== trimmedName.toLowerCase())) {
      setCategoryErrors({ name: 'A category with this name already exists' });
      return;
    }

    db.transaction(tx => {
      if (editingCategory) {
        tx.executeSql(
          `UPDATE categories SET name=?, color=? WHERE id=?;`,
          [trimmedName, newCategory.color, editingCategory.id]
        );
        // Update category name in words table
        tx.executeSql(
          `UPDATE words SET category=? WHERE category=?;`,
          [trimmedName, editingCategory.name]
        );
      } else {
        tx.executeSql(
          `INSERT INTO categories (name, color) VALUES (?, ?);`,
          [trimmedName, newCategory.color]
        );
      }
    });
    setShowCategoryModal(false);
    setEditingCategory(null);
    setNewCategory({ name: '', color: '#2196F3' });
    setCategoryErrors({});
    loadData();
  };

  // Quick add category from word modal
  const handleQuickAddCategory = () => {
    if (!quickCategoryInput.trim()) return;
    const trimmedName = quickCategoryInput.trim();
    const exists = categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      setNewWord(prev => ({ ...prev, category: trimmedName }));
      setQuickCategoryInput('');
      setShowQuickCategory(false);
      return;
    }
    // Add new category with a default color
    const defaultColors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#607D8B', '#F44336', '#3F51B5', '#795548', '#00BCD4', '#E91E63', '#FFEB3B', '#009688'];
    const nextColor = defaultColors[categories.length % defaultColors.length];
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO categories (name, color) VALUES (?, ?);`,
        [trimmedName, nextColor]
      );
    });
    // Update local categories state and select the new category
    const newCat = { name: trimmedName, color: nextColor };
    setCategories(prev => [...prev, newCat]);
    setNewWord(prev => ({ ...prev, category: trimmedName }));
    setQuickCategoryInput('');
    setShowQuickCategory(false);
  };

  const handleDeleteCategory = (id: number, name: string) => {
    // Check if category is in use
    const wordCount = words.filter(w => w.category === name).length;
    let message = `Delete category "${name}"?`;
    if (wordCount > 0) {
      message += `\n\n${wordCount} word(s) will be reassigned to "Home".`;
    }

    Alert.alert('Delete Category', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          db.transaction(tx => {
            tx.executeSql('DELETE FROM categories WHERE id=?;', [id]);
            if (wordCount > 0) {
              tx.executeSql('UPDATE words SET category=? WHERE category=?;', ['Home', name]);
            }
          });
          loadData();
        },
      },
    ]);
  };

  const handleLogin = () => {
    if (pin === CAREGIVER_PIN) {
      setAuthenticated(true);
      loadStats();
    } else {
      Alert.alert('Incorrect PIN', 'The PIN you entered is not valid.');
    }
  };

  const validateWord = (word: { label: string; speak: string; color: string; category: string }) => {
    const errors: {label?: string; speak?: string} = {};
    if (!word.label.trim()) {
      errors.label = 'Label is required';
    } else if (word.label.length > 50) {
      errors.label = 'Label must be 50 characters or less';
    }
    if (!word.speak.trim()) {
      errors.speak = 'Speak text is required';
    } else if (word.speak.length > 200) {
      errors.speak = 'Speak text must be 200 characters or less';
    }
    setWordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveWord = () => {
    const wordData = editingWord || newWord;

    if (!validateWord(wordData)) {
      return; // Don't save if validation fails
    }

    // Check for duplicate label (case-insensitive) when adding new word
    if (!editingWord) {
      const exists = words.some(w => w.label.toLowerCase() === wordData.label.toLowerCase());
      if (exists) {
        setWordErrors({ label: 'A word with this label already exists' });
        return;
      }
    }

    db.transaction(tx => {
      if (editingWord) {
        tx.executeSql(
          `UPDATE words SET label=?, speak=?, color=?, category=? WHERE id=?;`,
          [wordData.label.trim(), wordData.speak.trim(), wordData.color, wordData.category, editingWord.id]
        );
      } else {
        tx.executeSql(
          `INSERT INTO words (label, speak, color, category, usage_count) VALUES (?, ?, ?, ?, 0);`,
          [wordData.label.trim(), wordData.speak.trim(), wordData.color, wordData.category]
        );
      }
    });
    setShowAddModal(false);
    setEditingWord(null);
    setNewWord({ label: '', speak: '', color: '#2196F3', category: 'Home' });
    setWordErrors({});
    loadData();
  };

  const handleDeleteWord = (id: number) => {
    Alert.alert('Delete Word', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          db.transaction(tx => tx.executeSql('DELETE FROM words WHERE id=?;', [id]));
          loadData();
        },
      },
    ]);
  };

  const handleSaveSettings = () => {
    db.transaction(tx => {
      tx.executeSql("INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_pitch', ?);", [ttsSettings.pitch.toString()]);
      tx.executeSql("INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_rate', ?);", [ttsSettings.rate.toString()]);
    });
    Alert.alert('Settings Saved', 'TTS settings have been updated.');
  };

  const getEmotionSettings = (emotion: typeof emotionPreset) => {
    switch (emotion) {
      case 'happy':
        return { pitch: 1.2, rate: 1.05 };
      case 'calm':
        return { pitch: 0.95, rate: 0.85 };
      case 'urgent':
        return { pitch: 1.1, rate: 1.15 };
      default:
        return { pitch: 1.0, rate: 0.9 };
    }
  };

  const applyEmotionPreset = (emotion: typeof emotionPreset) => {
    const settings = getEmotionSettings(emotion);
    setTtsSettings(prev => ({ ...prev, pitch: settings.pitch, rate: settings.rate }));
    setEmotionPreset(emotion);
  };

  if (!authenticated) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>Caregiver Mode</Text>
        <TextInput
          style={styles.pinInput}
          placeholder="Enter PIN"
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          value={pin}
          onChangeText={setPin}
        />
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Enter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Back to App</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredWords = selectedCategory === 'All' ? words : words.filter(w => w.category === selectedCategory);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onExit}>
          <Text style={styles.exitLink}>← Exit</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Caregiver Mode</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.tabs}>
        {(['vocabulary', 'categories', 'settings', 'stats'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'vocabulary' && (
          <>
            {/* Search and sort controls */}
            <View style={styles.controlsRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search words..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Sort:</Text>
                <TouchableOpacity style={styles.sortButton} onPress={() => setSortBy(sortBy === 'label' ? 'usage' : sortBy === 'usage' ? 'category' : 'label')}>
                  <Text style={styles.sortButtonText}>
                    {sortBy === 'label' ? 'A-Z' : sortBy === 'usage' ? 'Usage' : 'Category'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.categoryFilter}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedCategory === 'All' && styles.filterChipActive]}
                  onPress={() => setSelectedCategory('All')}
                >
                  <Text style={styles.filterChipText}>All ({words.length})</Text>
                </TouchableOpacity>
                {categories.map(cat => {
                  const count = words.filter(w => w.category === cat.name).length;
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      style={[styles.filterChip, selectedCategory === cat.name && styles.filterChipActive]}
                      onPress={() => setSelectedCategory(cat.name)}
                    >
                      <Text style={styles.filterChipText}>{cat.name} ({count})</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.filterChip, { backgroundColor: '#333', borderColor: '#666' }]}
                  onPress={() => { setEditingCategory(null); setNewCategory({ name: '', color: '#2196F3' }); setShowCategoryModal(true); }}
                >
                  <Text style={[styles.filterChipText, { color: '#03DAC6' }]}>+ New Category</Text>
                </TouchableOpacity>
              </ScrollView>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
                <Text style={styles.addButtonText}>+ Add Word</Text>
              </TouchableOpacity>
            </View>

            {/* Filtered and sorted words */}
            {(() => {
              let filtered = words.filter(w =>
                w.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                w.speak.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (selectedCategory !== 'All') {
                filtered = filtered.filter(w => w.category === selectedCategory);
              }
              // Sort
              filtered.sort((a, b) => {
                if (sortBy === 'label') return a.label.localeCompare(b.label);
                if (sortBy === 'usage') return b.usage_count - a.usage_count;
                return a.category.localeCompare(b.category);
              });

              if (filtered.length === 0) {
                return (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No words found.</Text>
                  </View>
                );
              }

              return filtered.map(word => (
                <View key={word.id} style={styles.wordRow}>
                  <View style={[styles.wordColor, { backgroundColor: word.color }]} />
                  <View style={styles.wordInfo}>
                    <Text style={styles.wordLabel}>{word.label}</Text>
                    <Text style={styles.wordMeta}>{word.category} • Used {word.usage_count} times</Text>
                  </View>
                  <TouchableOpacity onPress={() => setEditingWord(word)}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => word.id && handleDeleteWord(word.id)}>
                    <Text style={styles.deleteLink}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ));
            })()}
          </>
        )}

        {activeTab === 'categories' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Category Management</Text>
              <TouchableOpacity
                style={styles.addCategoryButton}
                onPress={() => { setEditingCategory(null); setNewCategory({ name: '', color: '#2196F3' }); setShowCategoryModal(true); }}
              >
                <Text style={styles.addCategoryButtonText}>+ New Category</Text>
              </TouchableOpacity>
            </View>
            {categories.map(cat => {
              const wordCount = words.filter(w => w.category === cat.name).length;
              return (
                <View key={cat.id} style={styles.categoryRow}>
                  <View style={[styles.categoryColor, { backgroundColor: cat.color }]} />
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <Text style={styles.categoryMeta}>{wordCount} word(s)</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => { setEditingCategory(cat); setNewCategory({ name: cat.name, color: cat.color }); setShowCategoryModal(true); }}
                  >
                    <Text style={styles.iconButtonText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => cat.id && handleDeleteCategory(cat.id, cat.name)}
                  >
                    <Text style={styles.iconButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {activeTab === 'settings' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>TTS Voice Settings</Text>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Pitch</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ttsSettings.pitch.toFixed(2)}
                  keyboardType="decimal-pad"
                  onChangeText={text => setTtsSettings(prev => ({ ...prev, pitch: parseFloat(text) || 1.0 }))}
                />
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Rate</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ttsSettings.rate.toFixed(2)}
                  keyboardType="decimal-pad"
                  onChangeText={text => setTtsSettings(prev => ({ ...prev, rate: parseFloat(text) || 0.9 }))}
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emotion Presets</Text>
              {(['neutral', 'happy', 'calm', 'urgent'] as const).map(emotion => {
                const presets = {
                  neutral: { pitch: 1.0, rate: 0.9 },
                  happy: { pitch: 1.2, rate: 1.05 },
                  calm: { pitch: 0.95, rate: 0.85 },
                  urgent: { pitch: 1.1, rate: 1.15 },
                };
                const isActive = emotionPreset === emotion;
                return (
                  <TouchableOpacity
                    key={emotion}
                    style={[styles.emotionButton, isActive && styles.emotionButtonActive]}
                    onPress={() => applyEmotionPreset(emotion)}
                  >
                    <Text style={styles.emotionText}>
                      {emotion.charAt(0).toUpperCase() + emotion.slice(1)} (Pitch: {presets[emotion].pitch}, Rate: {presets[emotion].rate})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === 'stats' && (
          <>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Words</Text>
              <Text style={styles.statValue}>{stats.totalWords}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Uses</Text>
              <Text style={styles.statValue}>{stats.totalUsage}</Text>
            </View>

            <Text style={styles.sectionTitle}>Top Words</Text>
            {stats.topWords.length === 0 ? (
              <Text style={styles.emptyText}>No usage data yet.</Text>
            ) : (
              stats.topWords.map((item, idx) => (
                <View key={idx} style={styles.topWordRow}>
                  <Text style={styles.topWordRank}>#{idx + 1}</Text>
                  <Text style={styles.topWordLabel}>{item.word}</Text>
                  <Text style={styles.topWordCount}>{item.count} uses</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal || !!editingWord} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingWord ? 'Edit Word' : 'Add New Word'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Label (e.g., 'Mom')"
              value={editingWord ? editingWord.label : newWord.label}
              onChangeText={text => editingWord
                ? setEditingWord({ ...editingWord, label: text })
                : setNewWord(prev => ({ ...prev, label: text }))}
            />
            {wordErrors.label && <Text style={styles.errorText}>{wordErrors.label}</Text>}
            <TextInput
              style={styles.input}
              placeholder="Speak text (e.g., 'I want mom')"
              value={editingWord ? editingWord.speak : newWord.speak}
              onChangeText={text => editingWord
                ? setEditingWord({ ...editingWord, speak: text })
                : setNewWord(prev => ({ ...prev, speak: text }))}
            />
            {wordErrors.speak && <Text style={styles.errorText}>{wordErrors.speak}</Text>}
            <Text style={styles.inputLabel}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
              {['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#607D8B', '#F44336', '#3F51B5', '#795548', '#00BCD4', '#E91E63', '#FFEB3B', '#009688'].map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }, (newWord.color === color || editingWord?.color === color) && styles.colorSwatchSelected]}
                  onPress={() => editingWord
                    ? setEditingWord({ ...editingWord, color })
                    : setNewWord(prev => ({ ...prev, color }))}
                />
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.name}
                  style={[styles.categoryChip, (newWord.category === cat.name || editingWord?.category === cat.name) && styles.categoryChipActive]}
                  onPress={() => editingWord
                    ? setEditingWord({ ...editingWord, category: cat.name })
                    : setNewWord(prev => ({ ...prev, category: cat.name }))}
                >
                  <Text style={styles.categoryChipText}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
              {!showQuickCategory ? (
                <TouchableOpacity
                  style={[styles.categoryChip, { backgroundColor: '#333', borderColor: '#666' }]}
                  onPress={() => setShowQuickCategory(true)}
                >
                  <Text style={[styles.categoryChipText, { color: '#03DAC6' }]}>+ New</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.quickCategoryRow}>
                  <TextInput
                    style={styles.quickCategoryInput}
                    placeholder="New category name"
                    value={quickCategoryInput}
                    onChangeText={setQuickCategoryInput}
                    onSubmitEditing={handleQuickAddCategory}
                    autoFocus
                  />
                  <TouchableOpacity style={styles.quickCategoryAdd} onPress={handleQuickAddCategory}>
                    <Text style={styles.quickCategoryAddText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickCategoryCancel} onPress={() => { setShowQuickCategory(false); setQuickCategoryInput(''); }}>
                    <Text style={styles.quickCategoryCancelText}>×</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
            {wordErrors.category && <Text style={styles.errorText}>{wordErrors.category}</Text>}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowAddModal(false); setEditingWord(null); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleSaveWord}>
                <Text style={styles.confirmButtonText}>{editingWord ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingCategory ? 'Edit Category' : 'Add New Category'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Category name (e.g., 'Home')"
              value={newCategory.name}
              onChangeText={text => setNewCategory(prev => ({ ...prev, name: text }))}
              autoFocus={!editingCategory}
            />
            {categoryErrors.name && <Text style={styles.errorText}>{categoryErrors.name}</Text>}
            <Text style={styles.inputLabel}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorPicker}>
              {['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#607D8B', '#F44336', '#3F51B5', '#795548', '#00BCD4', '#E91E63', '#FFEB3B', '#009688'].map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorSwatch, { backgroundColor: color }, newCategory.color === color && styles.colorSwatchSelected]}
                  onPress={() => setNewCategory(prev => ({ ...prev, color }))}
                />
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowCategoryModal(false); setEditingCategory(null); setNewCategory({ name: '', color: '#2196F3' }); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleSaveCategory}>
                <Text style={styles.confirmButtonText}>{editingCategory ? 'Save' : 'Add'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  authTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  pinInput: {
    backgroundColor: '#1E1E1E',
    color: '#FFF',
    fontSize: 24,
    padding: 15,
    borderRadius: 12,
    width: '100%',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 8,
  },
  loginButton: {
    backgroundColor: '#6200EE',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginBottom: 15,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  exitButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  exitButtonText: {
    color: '#AAA',
    fontSize: 16,
  },

  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
  },
  exitLink: {
    color: '#03DAC6',
    fontSize: 16,
  },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#6200EE',
  },
  tabText: {
    color: '#AAA',
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },

  content: {
    padding: 16,
  },

  // Vocabulary tab
  categoryFilter: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  filterChipActive: {
    backgroundColor: '#6200EE',
    borderColor: '#6200EE',
  },
  filterChipText: {
    color: '#AAA',
    fontSize: 13,
  },

  // Vocabulary tab controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    color: '#FFF',
    padding: 10,
    borderRadius: 6,
    marginRight: 12,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    color: '#AAA',
    marginRight: 8,
    fontSize: 14,
  },
  sortButton: {
    backgroundColor: '#444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sortButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },

  // Categories tab
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addCategoryButton: {
    backgroundColor: '#03DAC6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addCategoryButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  categoryMeta: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 2,
  },
  iconButton: {
    padding: 6,
    marginLeft: 8,
  },
  iconButtonText: {
    fontSize: 18,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#777',
    fontStyle: 'italic',
  },

  addButton: {
    backgroundColor: '#03DAC6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  addButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  wordColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  wordInfo: {
    flex: 1,
  },
  wordLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  wordMeta: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 2,
  },
  editLink: {
    color: '#03DAC6',
    marginRight: 16,
    fontSize: 14,
  },
  deleteLink: {
    color: '#F44336',
    fontSize: 14,
  },

  // Settings tab
  section: {
    marginBottom: 24,
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    color: '#CCC',
    fontSize: 16,
    flex: 1,
  },
  numberInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFF',
    width: 80,
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
  emotionButton: {
    backgroundColor: '#2A2A2A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  emotionButtonActive: {
    backgroundColor: '#6200EE',
    borderColor: '#6200EE',
  },
  emotionText: {
    color: '#AAA',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Stats tab
  statCard: {
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  statLabel: {
    color: '#AAA',
    fontSize: 14,
  },
  statValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptyText: {
    color: '#777',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  topWordRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#1E1E1E',
    borderRadius: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  topWordRank: {
    color: '#888',
    width: 30,
  },
  topWordLabel: {
    color: '#FFF',
    flex: 1,
    fontSize: 15,
  },
  topWordCount: {
    color: '#AAA',
    fontSize: 13,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    width: '90%',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#2A2A2A',
    color: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  inputLabel: {
    color: '#AAA',
    marginBottom: 8,
    fontSize: 14,
  },
  colorPicker: {
    marginBottom: 12,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#FFF',
  },
  categoryPicker: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  categoryChipActive: {
    backgroundColor: '#6200EE',
    borderColor: '#6200EE',
  },
  categoryChipText: {
    color: '#AAA',
    fontSize: 13,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  quickCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quickCategoryInput: {
    backgroundColor: '#2A2A2A',
    color: '#FFF',
    padding: 8,
    borderRadius: 6,
    width: 150,
    marginRight: 8,
    fontSize: 14,
  },
  quickCategoryAdd: {
    backgroundColor: '#03DAC6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 6,
  },
  quickCategoryAddText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '600',
  },
  quickCategoryCancel: {
    backgroundColor: '#444',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCategoryCancelText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: 10,
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#AAA',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#6200EE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
