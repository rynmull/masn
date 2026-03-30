import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { getEmotionSettings } from '../utils/ttsPresets';
import { execSql, getAllSql, getFirstSql, runSql } from '../lib/db';
import type { AccessibilitySettings, SuggestionMode, TtsSettings, UserPopulation } from '../App';
import {
  getSymbolTerm,
  isSymbolProviderImplemented,
  resolveSymbolImageUrl,
  SYMBOL_PROVIDER_OPTIONS,
  toProviderSymbol,
  type SymbolProviderId,
} from '../utils/symbols';
import { EMOTION_OPTIONS, type EmotionPreset } from '../utils/ttsPresets';
import { hashPin, verifyPin, getSavedPinHash, savePinHash } from '../utils/pinManager';
import { DEFAULT_CATEGORIES, DEFAULT_WORDS, LEGACY_DEFAULT_SPEAK_BY_LABEL } from '../utils/defaultVocabulary';
import { speakText, stopAllSpeech } from '../utils/tts';
import { recordVoiceFeedback } from '../utils/tts';
import { isLocalTtsBridgeInstalled } from '../utils/localTtsBridge';
import { isForceLocalOnlyMode } from '../utils/runtimeFlags';

interface Word {
  id?: number;
  label: string;
  speak: string;
  symbol?: string | null;
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

interface SuggestionDebugRow {
  id: number;
  last_word: string | null;
  selected_category: string | null;
  top_candidates: string | null;
  reason_map: string | null;
  suggestion_mode: string | null;
  selected_label: string | null;
  selected_rank: number | null;
  shown_at: string | null;
}

interface LocalVoicePack {
  id: string;
  name: string;
  age_band: string;
  gender: string;
  locale: string;
  manifest_uri: string | null;
  is_installed: number;
}

const STARTER_LOCAL_VOICE_PACKS: Array<{
  id: string;
  name: string;
  age_band: string;
  gender: 'male' | 'female';
  locale: string;
  manifest_uri: string;
}> = [
  {
    id: 'adult_female_en_us_a1',
    name: 'Adult Female EN-US A1',
    age_band: 'adult',
    gender: 'female',
    locale: 'en-US',
    manifest_uri: 'voice_lab/packs/adult_female_en_us_a1/manifest.json',
  },
  {
    id: 'adult_male_en_us_b1',
    name: 'Adult Male EN-US B1',
    age_band: 'adult',
    gender: 'male',
    locale: 'en-US',
    manifest_uri: 'voice_lab/packs/adult_male_en_us_b1/manifest.json',
  },
  {
    id: 'older_female_en_us_c1',
    name: 'Older Female EN-US C1',
    age_band: 'older_adult',
    gender: 'female',
    locale: 'en-US',
    manifest_uri: 'voice_lab/packs/older_female_en_us_c1/manifest.json',
  },
  {
    id: 'older_male_en_us_d1',
    name: 'Older Male EN-US D1',
    age_band: 'older_adult',
    gender: 'male',
    locale: 'en-US',
    manifest_uri: 'voice_lab/packs/older_male_en_us_d1/manifest.json',
  },
];

const BUNDLED_LOCAL_VOICE_PACK_IDS = new Set(['adult_female_en_us_a1', 'adult_male_en_us_b1']);

const COMMON_AAC_TERMS = ['mother', 'father', 'help', 'eat', 'drink', 'bathroom', 'happy', 'sad', 'stop', 'go'];
const DEFAULT_EMOTION_PREVIEW_TEXT = 'I need help now';
const CALIBRATION_PHRASES = ['I need help right now', 'I am feeling happy today', 'Please wait with me'];

type SpacingPreset = AccessibilitySettings['spacingPreset'];

export default function CaregiverScreen({
  onExit,
  accessibilitySettings,
  onSettingsSaved,
  onTtsSettingsChange,
  activeEmotionPreset,
  onQuickEmotionSelect,
  coreWordsOrder,
  onCoreWordsOrderChange,
  suggestionMode,
  onSuggestionModeChange,
  userPopulation,
  onUserPopulationChange,
}: {
  onExit: () => void;
  accessibilitySettings: AccessibilitySettings;
  onSettingsSaved: () => void;
  onTtsSettingsChange: (next: TtsSettings) => void;
  activeEmotionPreset: EmotionPreset;
  onQuickEmotionSelect: (emotion: EmotionPreset) => void;
  coreWordsOrder: string[];
  onCoreWordsOrderChange: (nextOrder: string[]) => void;
  suggestionMode: SuggestionMode;
  onSuggestionModeChange: (nextMode: SuggestionMode) => void;
  userPopulation: UserPopulation;
  onUserPopulationChange: (nextPopulation: UserPopulation) => void;
}) {
  const forceLocalOnlyMode = isForceLocalOnlyMode();
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [savedPinHash, setSavedPinHash] = useState<string | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'settings' | 'stats'>('vocabulary');

  // Vocabulary management state
  const [words, setWords] = useState<Word[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWord, setNewWord] = useState({ label: '', speak: '', symbol: '', color: '#2196F3', category: 'Home' });

  // TTS Settings state
  const [ttsSettings, setTtsSettings] = useState<TtsSettings>({
    pitch: 1.0,
    rate: 0.9,
    engine: 'native',
    elevenLabsVoiceId: '',
    localVoicePackId: '',
    adaptiveStyleEnabled: true,
    offlineOnlyMode: forceLocalOnlyMode,
    expressiveVoiceEnabled: true,
    styleLearningEnabled: true,
    styleLearningRate: 0.85,
    emotionIntensity: 1,
    emotionIntensityByPreset: {
      neutral: 1,
      happy: 1,
      sad: 1,
      angry: 1,
      calm: 1,
    },
  });
  const [accessibilityConfig, setAccessibilityConfig] = useState<AccessibilitySettings>(accessibilitySettings);
  const [emotionSymbolUrls, setEmotionSymbolUrls] = useState<Record<EmotionPreset, string>>({} as Record<EmotionPreset, string>);
  const [coreWordsDraft, setCoreWordsDraft] = useState<string[]>(coreWordsOrder);
  const [coreWordCandidate, setCoreWordCandidate] = useState<string>('');
  const [suggestionModeDraft, setSuggestionModeDraft] = useState<SuggestionMode>(suggestionMode);
  const [userPopulationDraft, setUserPopulationDraft] = useState<UserPopulation>(userPopulation);
  const [emotionPreviewText, setEmotionPreviewText] = useState(DEFAULT_EMOTION_PREVIEW_TEXT);
  const [isEmotionPreviewPlaying, setIsEmotionPreviewPlaying] = useState(false);
  const emotionPreviewRunRef = useRef(0);
  const [localVoicePacks, setLocalVoicePacks] = useState<LocalVoicePack[]>([]);
  const [newVoicePack, setNewVoicePack] = useState({
    id: '',
    name: '',
    age_band: '',
    gender: 'female' as 'male' | 'female',
    locale: '',
    manifest_uri: '',
  });

  // Statistics state
  const [stats, setStats] = useState({
    totalWords: 0,
    totalUsage: 0,
    topWords: [] as {word: string, count: number}[],
    topWordsDay: [] as {word: string, count: number}[],
    topWordsWeek: [] as {word: string, count: number}[],
    suggestionAcceptanceTop3: 0,
    suggestionSelections: 0,
    suggestionDebug: [] as Array<{
      lastWord: string;
      mode: string;
      picked: string;
      rank: number;
      top: string[];
      reason: string;
    }>,
  });

  // Load data from DB
  useEffect(() => {
    const bootstrap = async () => {
      await initializeDB();
      await loadData();
    };

    void bootstrap().catch(error => {
      console.error('Caregiver bootstrap failed:', error);
    });
  }, []);

  useEffect(() => {
    setAccessibilityConfig(accessibilitySettings);
  }, [accessibilitySettings]);

  useEffect(() => {
    setCoreWordsDraft(coreWordsOrder);
  }, [coreWordsOrder]);

  useEffect(() => {
    setSuggestionModeDraft(suggestionMode);
  }, [suggestionMode]);

  useEffect(() => {
    setUserPopulationDraft(userPopulation);
  }, [userPopulation]);

  useEffect(() => {
    let isCancelled = false;

    const loadEmotionSymbols = async () => {
      const pairs = await Promise.all(
        EMOTION_OPTIONS.map(async option => {
          const url = await resolveSymbolImageUrl(
            `${accessibilityConfig.symbolProvider}:${option.symbolTerm}`,
            option.symbolTerm,
            accessibilityConfig.symbolProvider
          );
          return [option.id, url] as const;
        })
      );

      if (isCancelled) return;

      const nextMap = {} as Record<EmotionPreset, string>;
      pairs.forEach(([id, url]) => {
        if (url) nextMap[id] = url;
      });
      setEmotionSymbolUrls(nextMap);
    };

    void loadEmotionSymbols();

    return () => {
      isCancelled = true;
    };
  }, [accessibilityConfig.symbolProvider]);

  useEffect(() => {
    if (!authenticated || activeTab !== 'stats') return;

    void loadStats().catch(error => {
      console.error('Stats refresh failed:', error);
    });
  }, [activeTab, authenticated]);

  useEffect(() => {
    return () => {
      emotionPreviewRunRef.current += 1;
      void stopAllSpeech();
    };
  }, []);

  const initializeDB = async () => {
    // Categories table
    await execSql(
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        color TEXT,
        icon TEXT
      );`
    );
    // Words table (expanded from usage)
    await execSql(
      `CREATE TABLE IF NOT EXISTS words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT UNIQUE,
        speak TEXT,
        symbol TEXT,
        color TEXT,
        category TEXT,
        usage_count INTEGER DEFAULT 0,
        last_used DATETIME
      );`
    );
    try {
      await execSql('ALTER TABLE words ADD COLUMN symbol TEXT;');
    } catch {
      // Column already exists on upgraded installs.
    }
    // Settings table
    await execSql(
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );`
    );
    await execSql(
      `CREATE TABLE IF NOT EXISTS usage_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT,
        category TEXT,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    );
    await execSql(
      `CREATE TABLE IF NOT EXISTS suggestion_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        last_word TEXT,
        selected_category TEXT,
        top_candidates TEXT,
        reason_map TEXT,
        suggestion_mode TEXT,
        selected_label TEXT,
        selected_rank INTEGER,
        accepted_top3 INTEGER DEFAULT 0,
        shown_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        selected_at DATETIME
      );`
    );
    await execSql(
      `CREATE TABLE IF NOT EXISTS voice_learning_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        emotion TEXT,
        signal INTEGER,
        replay_ms INTEGER,
        text_len INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    );
    await execSql(
      `CREATE TABLE IF NOT EXISTS local_voice_packs (
        id TEXT PRIMARY KEY,
        name TEXT,
        age_band TEXT,
        gender TEXT,
        locale TEXT,
        manifest_uri TEXT,
        is_installed INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    );
    try {
      await execSql('ALTER TABLE local_voice_packs ADD COLUMN gender TEXT;');
    } catch {
      // Column already exists on upgraded installs.
    }
    try {
      await execSql("UPDATE local_voice_packs SET gender=gender_identity WHERE (gender IS NULL OR gender='') AND gender_identity IS NOT NULL;");
    } catch {
      // Legacy column may not exist on fresh installs.
    }
  };

  const loadData = async () => {
    // Load categories
    for (const cat of DEFAULT_CATEGORIES) {
      await runSql('INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?);', cat.name, cat.color);
    }
    const nextCategories = await getAllSql<Category>('SELECT * FROM categories;');
    setCategories(nextCategories.length > 0 ? nextCategories : DEFAULT_CATEGORIES as Category[]);

    // Load words
    for (const word of DEFAULT_WORDS) {
      await runSql(
        `INSERT OR IGNORE INTO words (label, speak, symbol, color, category, usage_count) VALUES (?, ?, ?, ?, ?, ?);`,
        word.label,
        word.speak,
        word.symbol ?? null,
        word.color,
        word.category,
        word.usage_count
      );

      const legacySpeak = LEGACY_DEFAULT_SPEAK_BY_LABEL[word.label];
      if (legacySpeak && legacySpeak !== word.speak) {
        await runSql(
          'UPDATE words SET speak=? WHERE label=? AND speak=?;',
          word.speak,
          word.label,
          legacySpeak
        );
      }
    }
    const wordRows = await getAllSql<Word>('SELECT * FROM words;');
    setWords(wordRows.length > 0 ? wordRows : DEFAULT_WORDS as Word[]);

    // Load TTS settings
    const pitchRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_pitch';");
    if (pitchRow?.value) setTtsSettings(prev => ({ ...prev, pitch: parseFloat(pitchRow.value) }));

    const rateRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_rate';");
    if (rateRow?.value) setTtsSettings(prev => ({ ...prev, rate: parseFloat(rateRow.value) }));

    const ttsEngineRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_engine';");
    if (
      ttsEngineRow?.value === 'native' ||
      ttsEngineRow?.value === 'elevenlabs' ||
      ttsEngineRow?.value === 'proprietary' ||
      ttsEngineRow?.value === 'local' ||
      ttsEngineRow?.value === 'chatterbox'
    ) {
      const engine = ttsEngineRow.value;
      if (forceLocalOnlyMode && engine !== 'native' && engine !== 'local') {
        setTtsSettings(prev => ({ ...prev, engine: 'native' }));
      } else {
        setTtsSettings(prev => ({ ...prev, engine }));
      }
    }

    const elevenLabsVoiceIdRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='elevenlabs_voice_id';");
    if (elevenLabsVoiceIdRow?.value) {
      setTtsSettings(prev => ({ ...prev, elevenLabsVoiceId: elevenLabsVoiceIdRow.value }));
    }

    const localVoicePackIdRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='local_voice_pack_id';");
    if (localVoicePackIdRow?.value) {
      setTtsSettings(prev => ({ ...prev, localVoicePackId: localVoicePackIdRow.value }));
    }

    const adaptiveStyleEnabledRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_adaptive_style_enabled';");
    if (adaptiveStyleEnabledRow?.value === 'true' || adaptiveStyleEnabledRow?.value === 'false') {
      setTtsSettings(prev => ({ ...prev, adaptiveStyleEnabled: adaptiveStyleEnabledRow.value === 'true' }));
    }

    const offlineOnlyModeRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_offline_only_mode';");
    if (offlineOnlyModeRow?.value === 'true' || offlineOnlyModeRow?.value === 'false') {
      setTtsSettings(prev => ({ ...prev, offlineOnlyMode: forceLocalOnlyMode || offlineOnlyModeRow.value === 'true' }));
    }

    const expressiveVoiceRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_expressive_voice_enabled';");
    if (expressiveVoiceRow?.value === 'true' || expressiveVoiceRow?.value === 'false') {
      setTtsSettings(prev => ({ ...prev, expressiveVoiceEnabled: expressiveVoiceRow.value === 'true' }));
    }

    const styleLearningRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_style_learning_enabled';");
    if (styleLearningRow?.value === 'true' || styleLearningRow?.value === 'false') {
      setTtsSettings(prev => ({ ...prev, styleLearningEnabled: styleLearningRow.value === 'true' }));
    }

    const styleLearningRateRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_style_learning_rate';");
    if (styleLearningRateRow?.value) {
      const parsed = parseFloat(styleLearningRateRow.value);
      if (Number.isFinite(parsed)) {
        setTtsSettings(prev => ({ ...prev, styleLearningRate: Math.max(0, Math.min(1, parsed)) }));
      }
    }

    const emotionIntensityRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_emotion_intensity';");
    if (emotionIntensityRow?.value) {
      const parsed = parseFloat(emotionIntensityRow.value);
      if (Number.isFinite(parsed)) {
        setTtsSettings(prev => ({ ...prev, emotionIntensity: Math.max(0.5, Math.min(1.6, parsed)) }));
      }
    }

    const emotionIntensityByPresetRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_emotion_intensity_by_preset';");
    if (emotionIntensityByPresetRow?.value) {
      try {
        const parsed = JSON.parse(emotionIntensityByPresetRow.value) as Partial<Record<EmotionPreset, number>>;
        setTtsSettings(prev => ({
          ...prev,
          emotionIntensityByPreset: {
            neutral: Number.isFinite(parsed.neutral) ? Math.max(0.6, Math.min(1.8, parsed.neutral ?? 1)) : prev.emotionIntensityByPreset.neutral,
            happy: Number.isFinite(parsed.happy) ? Math.max(0.6, Math.min(1.8, parsed.happy ?? 1)) : prev.emotionIntensityByPreset.happy,
            sad: Number.isFinite(parsed.sad) ? Math.max(0.6, Math.min(1.8, parsed.sad ?? 1)) : prev.emotionIntensityByPreset.sad,
            angry: Number.isFinite(parsed.angry) ? Math.max(0.6, Math.min(1.8, parsed.angry ?? 1)) : prev.emotionIntensityByPreset.angry,
            calm: Number.isFinite(parsed.calm) ? Math.max(0.6, Math.min(1.8, parsed.calm ?? 1)) : prev.emotionIntensityByPreset.calm,
          },
        }));
      } catch {
        // Ignore malformed settings payload.
      }
    }

    let installedVoicePacks = await getAllSql<LocalVoicePack>(
      `SELECT id, name, age_band, gender, locale, manifest_uri, is_installed
       FROM local_voice_packs
       ORDER BY name ASC;`
    );

    if (installedVoicePacks.length === 0) {
      for (const pack of STARTER_LOCAL_VOICE_PACKS) {
        const isInstalled = BUNDLED_LOCAL_VOICE_PACK_IDS.has(pack.id) ? 1 : 0;
        await runSql(
          `INSERT OR REPLACE INTO local_voice_packs (id, name, age_band, gender, locale, manifest_uri, is_installed)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          pack.id,
          pack.name,
          pack.age_band,
          pack.gender,
          pack.locale,
          pack.manifest_uri,
          isInstalled
        );
      }

      installedVoicePacks = await getAllSql<LocalVoicePack>(
        `SELECT id, name, age_band, gender, locale, manifest_uri, is_installed
         FROM local_voice_packs
         ORDER BY name ASC;`
      );
    }

    setLocalVoicePacks(installedVoicePacks);
  };

  const loadStats = async () => {
    const totalWordsRow = await getFirstSql<{ total: number }>('SELECT COUNT(*) as total FROM words;');
    const totalUsageRow = await getFirstSql<{ total: number | null }>('SELECT SUM(usage_count) as total FROM words;');
    const topWordRows = await getAllSql<{ label: string; usage_count: number }>(
      'SELECT label, usage_count FROM words ORDER BY usage_count DESC LIMIT 10;'
    );
    const topDayRows = await getAllSql<{ label: string; count: number }>(
      `SELECT label, COUNT(*) as count
       FROM usage_events
       WHERE used_at >= datetime('now', '-1 day')
       GROUP BY label
       ORDER BY count DESC, label ASC
       LIMIT 8;`
    );
    const topWeekRows = await getAllSql<{ label: string; count: number }>(
      `SELECT label, COUNT(*) as count
       FROM usage_events
       WHERE used_at >= datetime('now', '-7 day')
       GROUP BY label
       ORDER BY count DESC, label ASC
       LIMIT 8;`
    );
    const suggestionTotals = await getFirstSql<{ total: number | null }>(
      `SELECT COUNT(*) as total FROM suggestion_events WHERE selected_label IS NOT NULL;`
    );
    const suggestionTop3Hits = await getFirstSql<{ total: number | null }>(
      `SELECT COUNT(*) as total FROM suggestion_events WHERE selected_label IS NOT NULL AND accepted_top3 = 1;`
    );
    const debugRows = await getAllSql<SuggestionDebugRow>(
      `SELECT id, last_word, selected_category, top_candidates, reason_map, suggestion_mode, selected_label, selected_rank, shown_at
       FROM suggestion_events
       WHERE selected_label IS NOT NULL
       ORDER BY id DESC
       LIMIT 5;`
    );

    const selections = suggestionTotals?.total ?? 0;
    const top3Hits = suggestionTop3Hits?.total ?? 0;
    const acceptanceTop3 = selections > 0 ? (top3Hits / selections) * 100 : 0;

    setStats(prev => ({
      ...prev,
      totalWords: totalWordsRow?.total ?? 0,
      totalUsage: totalUsageRow?.total ?? 0,
      topWords: topWordRows.map(r => ({ word: r.label, count: r.usage_count })),
      topWordsDay: topDayRows.map(r => ({ word: r.label, count: r.count })),
      topWordsWeek: topWeekRows.map(r => ({ word: r.label, count: r.count })),
      suggestionAcceptanceTop3: acceptanceTop3,
      suggestionSelections: selections,
      suggestionDebug: debugRows.map(row => {
        let top: string[] = [];
        let reason = 'No reason logged';

        try {
          const parsedTop = JSON.parse(row.top_candidates ?? '[]') as unknown;
          if (Array.isArray(parsedTop)) {
            top = parsedTop.filter((item): item is string => typeof item === 'string').slice(0, 3);
          }
        } catch {
          top = [];
        }

        try {
          const parsedReasons = JSON.parse(row.reason_map ?? '{}') as Record<string, string>;
          if (row.selected_label && parsedReasons[row.selected_label]) {
            reason = parsedReasons[row.selected_label];
          } else if (top.length > 0 && parsedReasons[top[0]]) {
            reason = parsedReasons[top[0]];
          }
        } catch {
          reason = 'No reason logged';
        }

        return {
          lastWord: row.last_word ?? 'n/a',
          mode: row.suggestion_mode ?? 'n/a',
          picked: row.selected_label ?? 'n/a',
          rank: row.selected_rank ?? 0,
          top,
          reason,
        };
      }),
    }));
  };

  // Load saved PIN hash on first mount
  useEffect(() => {
    const loadPinHash = async () => {
      try {
        const hash = await getSavedPinHash();
        setSavedPinHash(hash);
        if (!hash) {
          setShowPinSetup(true); // First-time setup
        }
      } catch (error) {
        console.error('Error loading PIN:', error);
        setShowPinSetup(true); // Fallback to setup on error
      }
    };
    void loadPinHash();
  }, []);

  const handleLogin = async () => {
    if (!savedPinHash) {
      Alert.alert('PIN Not Set', 'Caregiver PIN must be set first.');
      return;
    }
    try {
      const isValid = await verifyPin(pin, savedPinHash);
      if (isValid) {
        setAuthenticated(true);
        setPin('');
        void loadStats().catch(error => {
          console.error('Stats load failed:', error);
        });
      } else {
        Alert.alert('Incorrect PIN', 'The PIN you entered is not valid.');
        setPin('');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred during login.');
    }
  };

  const handleSetPin = async () => {
    if (newPin.length < 4) {
      Alert.alert('PIN Too Short', 'PIN must be at least 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'The PINs you entered do not match.');
      return;
    }
    try {
      const hash = await hashPin(newPin);
      await savePinHash(hash);
      setSavedPinHash(hash);
      setNewPin('');
      setConfirmPin('');
      setShowPinSetup(false);
      Alert.alert('Success', 'Caregiver PIN has been set.');
    } catch (error) {
      console.error('Error setting PIN:', error);
      Alert.alert('Error', 'Failed to set PIN.');
    }
  };

  const handleSaveWord = async () => {
    if (!editingWord && !newWord.label) return;

    const wordData = editingWord || newWord;
    const normalizedLabel = wordData.label.trim();
    const normalizedSpeak = wordData.speak.trim() || normalizedLabel;
    const normalizedSymbol = wordData.symbol?.trim()
      ? toProviderSymbol(wordData.symbol.trim(), accessibilityConfig.symbolProvider)
      : null;
    if (editingWord) {
      await runSql(
        `UPDATE words SET label=?, speak=?, symbol=?, color=?, category=? WHERE id=?;`,
        normalizedLabel,
        normalizedSpeak,
        normalizedSymbol,
        wordData.color,
        wordData.category,
        editingWord.id ?? 0
      );
    } else {
      await runSql(
        `INSERT INTO words (label, speak, symbol, color, category, usage_count) VALUES (?, ?, ?, ?, ?, 0);`,
        normalizedLabel,
        normalizedSpeak,
        normalizedSymbol,
        wordData.color,
        wordData.category
      );
    }
    setShowAddModal(false);
    setEditingWord(null);
    setNewWord({ label: '', speak: '', symbol: '', color: '#2196F3', category: 'Home' });
    await loadData();
  };

  const handleDeleteWord = (id: number) => {
    Alert.alert('Delete Word', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await runSql('DELETE FROM words WHERE id=?;', id);
            await loadData();
          })().catch(error => {
            console.error('Delete word failed:', error);
          });
        },
      },
    ]);
  };

  const moveCoreWord = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= coreWordsDraft.length) return;

    setCoreWordsDraft(prev => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const removeCoreWord = (label: string) => {
    setCoreWordsDraft(prev => prev.filter(item => item !== label));
  };

  const addCoreWord = () => {
    if (!coreWordCandidate) return;
    setCoreWordsDraft(prev => (prev.includes(coreWordCandidate) ? prev : [...prev, coreWordCandidate]));
    setCoreWordCandidate('');
  };

  const handleSaveSettings = async () => {
    await runSql("INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_pitch', ?);", ttsSettings.pitch.toString());
    await runSql("INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_rate', ?);", ttsSettings.rate.toString());
    await runSql("INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_engine', ?);", ttsSettings.engine);
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('elevenlabs_voice_id', ?);",
      ttsSettings.elevenLabsVoiceId.trim()
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('local_voice_pack_id', ?);",
      ttsSettings.localVoicePackId.trim()
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_adaptive_style_enabled', ?);",
      ttsSettings.adaptiveStyleEnabled ? 'true' : 'false'
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_offline_only_mode', ?);",
      ttsSettings.offlineOnlyMode ? 'true' : 'false'
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_expressive_voice_enabled', ?);",
      ttsSettings.expressiveVoiceEnabled ? 'true' : 'false'
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_style_learning_enabled', ?);",
      ttsSettings.styleLearningEnabled ? 'true' : 'false'
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_style_learning_rate', ?);",
      ttsSettings.styleLearningRate.toString()
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_emotion_intensity', ?);",
      ttsSettings.emotionIntensity.toString()
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_emotion_intensity_by_preset', ?);",
      JSON.stringify(ttsSettings.emotionIntensityByPreset)
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('accessibility_high_contrast', ?);",
      accessibilityConfig.highContrast ? 'true' : 'false'
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('accessibility_text_scale', ?);",
      accessibilityConfig.textScale.toString()
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('accessibility_spacing_preset', ?);",
      accessibilityConfig.spacingPreset
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('accessibility_show_symbols', ?);",
      accessibilityConfig.showSymbols ? 'true' : 'false'
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('accessibility_symbol_provider', ?);",
      accessibilityConfig.symbolProvider
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('accessibility_symbol_size_preset', ?);",
      accessibilityConfig.symbolSizePreset
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('core_words_order', ?);",
      JSON.stringify(coreWordsDraft)
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('suggestion_mode', ?);",
      suggestionModeDraft
    );
    await runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('user_population', ?);",
      userPopulationDraft
    );
    onTtsSettingsChange(ttsSettings);
    onCoreWordsOrderChange(coreWordsDraft);
    onSuggestionModeChange(suggestionModeDraft);
    onUserPopulationChange(userPopulationDraft);
    onSettingsSaved();
    Alert.alert('Settings Saved', 'TTS settings have been updated.');
  };

  const applyEmotionPreset = (emotion: EmotionPreset) => {
    const settings = getEmotionSettings(emotion);
    setTtsSettings(prev => ({ ...prev, pitch: settings.pitch, rate: settings.rate }));
    onTtsSettingsChange({ ...ttsSettings, ...settings });
    onQuickEmotionSelect(emotion);
  };

  const submitVoiceFeedback = (emotion: EmotionPreset, feedback: 'flat' | 'good' | 'intense') => {
    void recordVoiceFeedback(emotion, feedback)
      .then(() => {
        Alert.alert('Feedback Saved', `Marked ${emotion} voice as ${feedback}. Adaptive style will learn over time.`);
      })
      .catch(error => {
        console.error('Voice feedback save failed:', error);
      });
  };

  const normalizeVoicePackId = (raw: string) => {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');
  };

  const addLocalVoicePack = async () => {
    const normalizedId = normalizeVoicePackId(newVoicePack.id || newVoicePack.name);
    if (!normalizedId) {
      Alert.alert('Missing ID', 'Provide a voice pack ID or name.');
      return;
    }

    const packName = newVoicePack.name.trim() || normalizedId;
    await runSql(
      `INSERT OR REPLACE INTO local_voice_packs (id, name, age_band, gender, locale, manifest_uri, is_installed)
       VALUES (?, ?, ?, ?, ?, ?, 1);`,
      normalizedId,
      packName,
      newVoicePack.age_band.trim(),
      newVoicePack.gender,
      newVoicePack.locale.trim(),
      newVoicePack.manifest_uri.trim() || null
    );

    const installedVoicePacks = await getAllSql<LocalVoicePack>(
      `SELECT id, name, age_band, gender, locale, manifest_uri, is_installed
       FROM local_voice_packs
       ORDER BY name ASC;`
    );
    setLocalVoicePacks(installedVoicePacks);
    setNewVoicePack({ id: '', name: '', age_band: '', gender: 'female', locale: '', manifest_uri: '' });

    if (!ttsSettings.localVoicePackId) {
      setTtsSettings(prev => ({ ...prev, localVoicePackId: normalizedId }));
    }
  };

  const removeLocalVoicePack = (packId: string) => {
    Alert.alert('Remove Voice Pack', `Remove ${packId}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await runSql('DELETE FROM local_voice_packs WHERE id=?;', packId);
            const installedVoicePacks = await getAllSql<LocalVoicePack>(
              `SELECT id, name, age_band, gender, locale, manifest_uri, is_installed
               FROM local_voice_packs
               ORDER BY name ASC;`
            );
            setLocalVoicePacks(installedVoicePacks);
            if (ttsSettings.localVoicePackId === packId) {
              setTtsSettings(prev => ({ ...prev, localVoicePackId: '' }));
            }
          })().catch(error => {
            console.error('Remove local voice pack failed:', error);
          });
        },
      },
    ]);
  };

  const runQuickCalibration = () => {
    const profileByEngine = ttsSettings.engine === 'native'
      ? { styleLearningRate: 0.9, emotionIntensity: 1.18 }
      : { styleLearningRate: 0.78, emotionIntensity: 1.02 };

    setTtsSettings(prev => ({
      ...prev,
      expressiveVoiceEnabled: true,
      styleLearningEnabled: true,
      styleLearningRate: profileByEngine.styleLearningRate,
      emotionIntensity: profileByEngine.emotionIntensity,
      emotionIntensityByPreset: {
        neutral: 0.95,
        happy: 1.15,
        sad: 1.05,
        angry: 1.12,
        calm: 0.9,
      },
    }));

    Alert.alert(
      'Calibration Applied',
      'Quick calibration tuned learning strength and emotion curve. Use Preview to confirm and then Save Settings.'
    );
  };

  const previewCalibrationWizard = () => {
    const runId = Date.now();
    emotionPreviewRunRef.current = runId;
    setIsEmotionPreviewPlaying(true);

    void (async () => {
      try {
        await stopAllSpeech();

        const sequence: Array<{ text: string; emotion: EmotionPreset }> = [
          { text: CALIBRATION_PHRASES[0], emotion: 'neutral' },
          { text: CALIBRATION_PHRASES[1], emotion: 'happy' },
          { text: CALIBRATION_PHRASES[0], emotion: 'sad' },
          { text: CALIBRATION_PHRASES[2], emotion: 'calm' },
          { text: CALIBRATION_PHRASES[0], emotion: 'angry' },
        ];

        for (const step of sequence) {
          if (emotionPreviewRunRef.current !== runId) return;

          const preset = getEmotionSettings(step.emotion);
          await speakText(
            step.text,
            { ...ttsSettings, pitch: preset.pitch, rate: preset.rate },
            step.emotion
          );

          await new Promise(resolve => {
            setTimeout(resolve, estimateEmotionPreviewDelay(step.text, preset.rate));
          });
        }
      } catch (error) {
        console.error('Calibration preview failed:', error);
      } finally {
        if (emotionPreviewRunRef.current === runId) {
          setIsEmotionPreviewPlaying(false);
        }
      }
    })();
  };

  const estimateEmotionPreviewDelay = (text: string, rate: number) => {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const punctuationCount = (text.match(/[,.!?]/g) ?? []).length;
    const baseDurationMs = (wordCount * 520) + (punctuationCount * 180) + 900;
    return Math.max(1800, Math.round(baseDurationMs / Math.max(rate, 0.5)));
  };

  const stopEmotionPreview = () => {
    emotionPreviewRunRef.current += 1;
    setIsEmotionPreviewPlaying(false);
    void stopAllSpeech();
  };

  const previewEmotion = (emotion: EmotionPreset) => {
    const previewText = emotionPreviewText.trim() || DEFAULT_EMOTION_PREVIEW_TEXT;
    const preset = getEmotionSettings(emotion);

    stopEmotionPreview();
    setIsEmotionPreviewPlaying(true);

    void (async () => {
      try {
        await speakText(
          previewText,
          { ...ttsSettings, pitch: preset.pitch, rate: preset.rate },
          emotion
        );
      } catch (error) {
        console.error('Emotion preview failed:', error);
      } finally {
        const delay = estimateEmotionPreviewDelay(previewText, preset.rate);
        setTimeout(() => {
          setIsEmotionPreviewPlaying(false);
        }, delay);
      }
    })();
  };

  const previewAllEmotions = () => {
    const previewText = emotionPreviewText.trim() || DEFAULT_EMOTION_PREVIEW_TEXT;
    const runId = Date.now();
    emotionPreviewRunRef.current = runId;
    setIsEmotionPreviewPlaying(true);

    void (async () => {
      try {
        await stopAllSpeech();

        for (const option of EMOTION_OPTIONS) {
          if (emotionPreviewRunRef.current !== runId) return;

          const preset = getEmotionSettings(option.id);
          await speakText(
            previewText,
            { ...ttsSettings, pitch: preset.pitch, rate: preset.rate },
            option.id
          );

          await new Promise(resolve => {
            setTimeout(resolve, estimateEmotionPreviewDelay(previewText, preset.rate));
          });
        }
      } catch (error) {
        console.error('Emotion sequence preview failed:', error);
      } finally {
        if (emotionPreviewRunRef.current === runId) {
          setIsEmotionPreviewPlaying(false);
        }
      }
    })();
  };

  if (!authenticated) {
    if (showPinSetup) {
      return (
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>Set Caregiver PIN</Text>
          <Text style={styles.settingHint}>Create a 4-6 digit PIN to protect caregiver settings.</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="New PIN (4+ digits)"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            value={newPin}
            onChangeText={setNewPin}
          />
          <TextInput
            style={styles.pinInput}
            placeholder="Confirm PIN"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            value={confirmPin}
            onChangeText={setConfirmPin}
          />
          <TouchableOpacity style={styles.loginButton} onPress={() => void handleSetPin()}>
            <Text style={styles.loginButtonText}>Set PIN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exitButton} onPress={onExit}>
            <Text style={styles.exitButtonText}>Back to App</Text>
          </TouchableOpacity>
        </View>
      );
    }

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
        <TouchableOpacity style={styles.loginButton} onPress={() => void handleLogin()}>
          <Text style={styles.loginButtonText}>Enter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Back to App</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredWords = selectedCategory === 'All' ? words : words.filter(w => w.category === selectedCategory);
  const availableCoreCandidates = words
    .map(word => word.label)
    .filter(label => !coreWordsDraft.includes(label));
  const localBridgeInstalled = isLocalTtsBridgeInstalled();

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
        {(['vocabulary', 'settings', 'stats'] as const).map(tab => (
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
            <View style={styles.categoryFilter}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, selectedCategory === 'All' && styles.filterChipActive]}
                  onPress={() => setSelectedCategory('All')}
                >
                  <Text style={[styles.filterChipText, selectedCategory === 'All' && styles.filterChipTextActive]}>All</Text>
                </TouchableOpacity>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.name}
                    style={[styles.filterChip, selectedCategory === cat.name && styles.filterChipActive]}
                    onPress={() => setSelectedCategory(cat.name)}
                  >
                    <Text style={[styles.filterChipText, selectedCategory === cat.name && styles.filterChipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
                <Text style={styles.addButtonText}>+ Add Word</Text>
              </TouchableOpacity>
            </View>

            {filteredWords.map(word => (
              <View key={word.id} style={styles.wordRow}>
                <View style={[styles.wordColor, { backgroundColor: word.color }]} />
                <View style={styles.wordInfo}>
                  <Text style={styles.wordLabel}>{word.label}</Text>
                  <Text style={styles.wordMeta}>Symbol: {getSymbolTerm(word.symbol, word.label)}</Text>
                  <Text style={styles.wordMeta}>{word.category} • Used {word.usage_count} times</Text>
                </View>
                <TouchableOpacity onPress={() => setEditingWord(word)}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => word.id && handleDeleteWord(word.id)}>
                  <Text style={styles.deleteLink}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Core Words Layout</Text>
              <Text style={styles.providerNote}>Reorder or pin your highest-priority words for the top board.</Text>

              {coreWordsDraft.length === 0 ? (
                <Text style={styles.emptyText}>No core words pinned yet.</Text>
              ) : (
                coreWordsDraft.map((label, index) => (
                  <View key={`core-${label}-${index}`} style={styles.coreWordRow}>
                    <Text style={styles.coreWordLabel}>{label}</Text>
                    <View style={styles.coreWordActions}>
                      <TouchableOpacity style={styles.coreWordActionButton} onPress={() => moveCoreWord(index, -1)}>
                        <Text style={styles.coreWordActionText}>Up</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.coreWordActionButton} onPress={() => moveCoreWord(index, 1)}>
                        <Text style={styles.coreWordActionText}>Down</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.coreWordRemoveButton} onPress={() => removeCoreWord(label)}>
                        <Text style={styles.coreWordRemoveText}>Unpin</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              <Text style={styles.settingLabel}>Pin New Core Word</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {availableCoreCandidates.map(label => (
                  <TouchableOpacity
                    key={`candidate-${label}`}
                    style={[styles.categoryChip, coreWordCandidate === label && styles.categoryChipActive]}
                    onPress={() => setCoreWordCandidate(label)}
                  >
                    <Text style={[styles.categoryChipText, coreWordCandidate === label && styles.categoryChipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.addButton} onPress={addCoreWord}>
                <Text style={styles.addButtonText}>+ Pin Selected</Text>
              </TouchableOpacity>
            </View>
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
              <Text style={styles.settingLabel}>Voice Engine</Text>
              <View style={styles.presetRow}>
                {(forceLocalOnlyMode
                  ? (['local', 'native'] as const)
                  : (['local', 'native', 'elevenlabs', 'chatterbox', 'proprietary'] as const)
                ).map(engine => (
                  <TouchableOpacity
                    key={engine}
                    style={[
                      styles.presetButton,
                      ttsSettings.engine === engine && styles.presetButtonActive,
                    ]}
                    onPress={() => setTtsSettings(prev => ({ ...prev, engine }))}
                  >
                    <Text style={styles.presetButtonText}>
                      {engine === 'local' ? 'Local (Offline AI)'
                        : engine === 'native' ? 'Native'
                          : engine === 'elevenlabs' ? 'ElevenLabs'
                            : engine === 'chatterbox' ? 'Chatterbox Turbo'
                            : 'Proprietary'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {ttsSettings.engine === 'local' && (
                <>
                  <Text style={styles.providerNote}>
                    Local engine is currently routed to native speech while on-device AI voice runtime is being integrated.
                  </Text>
                  <Text style={styles.providerNote}>
                    Bridge status: {localBridgeInstalled ? 'Installed (using local model runtime)' : 'Not installed (native fallback)'}
                  </Text>
                  <Text style={styles.settingLabel}>Installed Voice Packs</Text>
                  {localVoicePacks.length === 0 ? (
                    <Text style={styles.providerNote}>No local packs yet. Import one below.</Text>
                  ) : (
                    <View style={styles.voicePackList}>
                      {localVoicePacks.map(pack => (
                        <View key={`pack-${pack.id}`} style={styles.voicePackRow}>
                          <TouchableOpacity
                            style={styles.voicePackSelect}
                            onPress={() => {
                              if (pack.is_installed !== 1) return;
                              setTtsSettings(prev => ({ ...prev, localVoicePackId: pack.id }));
                            }}
                          >
                            <Text style={styles.voicePackName}>{pack.name}</Text>
                            <Text style={styles.voicePackMeta}>{pack.id} • {pack.age_band || 'n/a'} • {pack.gender || 'n/a'} • {pack.locale || 'n/a'}</Text>
                            {pack.is_installed !== 1 ? <Text style={styles.providerNote}>Not installed (missing model assets)</Text> : null}
                          </TouchableOpacity>
                          <View style={styles.voicePackActions}>
                            {ttsSettings.localVoicePackId === pack.id ? (
                              <Text style={styles.voicePackActive}>Selected</Text>
                            ) : null}
                            <TouchableOpacity onPress={() => removeLocalVoicePack(pack.id)}>
                              <Text style={styles.deleteLink}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.settingLabel}>Import Voice Pack Metadata</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pack ID (e.g., adult_en_us_f01)"
                    value={newVoicePack.id}
                    onChangeText={text => setNewVoicePack(prev => ({ ...prev, id: text }))}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Display Name"
                    value={newVoicePack.name}
                    onChangeText={text => setNewVoicePack(prev => ({ ...prev, name: text }))}
                  />
                  <View style={styles.inlineInputRow}>
                    <TextInput
                      style={[styles.input, styles.inlineInput]}
                      placeholder="Age band"
                      value={newVoicePack.age_band}
                      onChangeText={text => setNewVoicePack(prev => ({ ...prev, age_band: text }))}
                    />
                  </View>
                  <Text style={styles.settingLabel}>Gender</Text>
                  <View style={styles.presetRow}>
                    {(['female', 'male'] as const).map(option => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.presetButton,
                          newVoicePack.gender === option && styles.presetButtonActive,
                        ]}
                        onPress={() => setNewVoicePack(prev => ({ ...prev, gender: option }))}
                      >
                        <Text style={styles.presetButtonText}>{option === 'female' ? 'Female' : 'Male'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Locale (e.g., en-US)"
                    value={newVoicePack.locale}
                    onChangeText={text => setNewVoicePack(prev => ({ ...prev, locale: text }))}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Manifest URI (optional)"
                    value={newVoicePack.manifest_uri}
                    onChangeText={text => setNewVoicePack(prev => ({ ...prev, manifest_uri: text }))}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity style={styles.addButton} onPress={() => void addLocalVoicePack()}>
                    <Text style={styles.addButtonText}>+ Import Local Pack</Text>
                  </TouchableOpacity>
                </>
              )}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Expressive Voice</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, ttsSettings.expressiveVoiceEnabled && styles.toggleButtonActive]}
                  onPress={() => setTtsSettings(prev => ({ ...prev, expressiveVoiceEnabled: !prev.expressiveVoiceEnabled }))}
                >
                  <Text style={styles.toggleButtonText}>{ttsSettings.expressiveVoiceEnabled ? 'On' : 'Off'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Adaptive Style Learning</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, ttsSettings.adaptiveStyleEnabled && styles.toggleButtonActive]}
                  onPress={() => setTtsSettings(prev => ({ ...prev, adaptiveStyleEnabled: !prev.adaptiveStyleEnabled }))}
                >
                  <Text style={styles.toggleButtonText}>{ttsSettings.adaptiveStyleEnabled ? 'On' : 'Off'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Offline Only Mode</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, ttsSettings.offlineOnlyMode && styles.toggleButtonActive]}
                  onPress={() => {
                    if (forceLocalOnlyMode) return;
                    setTtsSettings(prev => ({ ...prev, offlineOnlyMode: !prev.offlineOnlyMode }));
                  }}
                >
                  <Text style={styles.toggleButtonText}>{ttsSettings.offlineOnlyMode ? 'On' : 'Off'}</Text>
                </TouchableOpacity>
              </View>
              {forceLocalOnlyMode ? (
                <Text style={styles.providerNote}>Local-only mode is enforced by EXPO_PUBLIC_FORCE_LOCAL_ONLY=true.</Text>
              ) : null}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Style Learning</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, ttsSettings.styleLearningEnabled && styles.toggleButtonActive]}
                  onPress={() => setTtsSettings(prev => ({ ...prev, styleLearningEnabled: !prev.styleLearningEnabled }))}
                >
                  <Text style={styles.toggleButtonText}>{ttsSettings.styleLearningEnabled ? 'On' : 'Off'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Learning Strength</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ttsSettings.styleLearningRate.toFixed(2)}
                  keyboardType="decimal-pad"
                  onChangeText={text => setTtsSettings(prev => ({
                    ...prev,
                    styleLearningRate: Math.max(0, Math.min(1, parseFloat(text) || 0)),
                  }))}
                />
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Emotion Intensity</Text>
                <TextInput
                  style={styles.numberInput}
                  value={ttsSettings.emotionIntensity.toFixed(2)}
                  keyboardType="decimal-pad"
                  onChangeText={text => setTtsSettings(prev => ({
                    ...prev,
                    emotionIntensity: Math.max(0.5, Math.min(1.6, parseFloat(text) || 1)),
                  }))}
                />
              </View>
              <Text style={styles.settingLabel}>Per-Emotion Tuning</Text>
              <View style={styles.emotionTuningGrid}>
                {EMOTION_OPTIONS.map(option => (
                  <View key={`tune-${option.id}`} style={styles.emotionTuningCell}>
                    <Text style={styles.emotionTuningLabel}>{option.label}</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={(ttsSettings.emotionIntensityByPreset[option.id] ?? 1).toFixed(2)}
                      keyboardType="decimal-pad"
                      onChangeText={text => setTtsSettings(prev => ({
                        ...prev,
                        emotionIntensityByPreset: {
                          ...prev.emotionIntensityByPreset,
                          [option.id]: Math.max(0.6, Math.min(1.8, parseFloat(text) || 1)),
                        },
                      }))}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.previewControlRow}>
                <TouchableOpacity
                  style={styles.previewActionButton}
                  onPress={runQuickCalibration}
                >
                  <Text style={styles.previewActionText}>Run Quick Calibration</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewActionButton, isEmotionPreviewPlaying && styles.previewActionButtonActive]}
                  onPress={previewCalibrationWizard}
                >
                  <Text style={styles.previewActionText}>{isEmotionPreviewPlaying ? 'Replaying' : 'Preview Wizard'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.providerNote}>
                Quick Calibration applies a strong default profile, then Preview Wizard speaks sample phrases across emotions so you can fine-tune.
              </Text>
              {ttsSettings.engine === 'elevenlabs' && (
                <>
                  <Text style={styles.settingLabel}>ElevenLabs Voice ID</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Voice ID (optional)"
                    value={ttsSettings.elevenLabsVoiceId}
                    onChangeText={text => setTtsSettings(prev => ({ ...prev, elevenLabsVoiceId: text }))}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.providerNote}>
                    Add EXPO_PUBLIC_ELEVENLABS_API_KEY in your environment. Native voice is used automatically if unavailable.
                  </Text>
                </>
              )}
              {ttsSettings.engine === 'proprietary' && (
                <Text style={styles.providerNote}>
                  Set EXPO_PUBLIC_PROPRIETARY_TTS_URL (and optional EXPO_PUBLIC_PROPRIETARY_TTS_API_KEY) in your environment. Native voice is used automatically if unavailable.
                </Text>
              )}
              {ttsSettings.engine === 'chatterbox' && (
                <Text style={styles.providerNote}>
                  Set EXPO_PUBLIC_CHATTERBOX_TTS_URL (and optional EXPO_PUBLIC_CHATTERBOX_TTS_API_KEY / EXPO_PUBLIC_CHATTERBOX_VOICE_ID). Native voice is used automatically if unavailable.
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Accessibility</Text>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>High Contrast</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, accessibilityConfig.highContrast && styles.toggleButtonActive]}
                  onPress={() => setAccessibilityConfig(prev => ({ ...prev, highContrast: !prev.highContrast }))}
                >
                  <Text style={styles.toggleButtonText}>{accessibilityConfig.highContrast ? 'On' : 'Off'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Show Symbols</Text>
                <TouchableOpacity
                  style={[styles.toggleButton, accessibilityConfig.showSymbols && styles.toggleButtonActive]}
                  onPress={() => setAccessibilityConfig(prev => ({ ...prev, showSymbols: !prev.showSymbols }))}
                >
                  <Text style={styles.toggleButtonText}>{accessibilityConfig.showSymbols ? 'On' : 'Off'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Text Scale</Text>
                <TextInput
                  style={styles.numberInput}
                  value={accessibilityConfig.textScale.toFixed(2)}
                  keyboardType="decimal-pad"
                  onChangeText={text => setAccessibilityConfig(prev => ({
                    ...prev,
                    textScale: Math.max(0.8, Math.min(1.5, parseFloat(text) || 1)),
                  }))}
                />
              </View>

              <Text style={styles.settingLabel}>Spacing Preset</Text>
              <View style={styles.presetRow}>
                {(['compact', 'standard', 'loose'] as SpacingPreset[]).map(preset => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetButton,
                      accessibilityConfig.spacingPreset === preset && styles.presetButtonActive,
                    ]}
                    onPress={() => setAccessibilityConfig(prev => ({ ...prev, spacingPreset: preset }))}
                  >
                    <Text style={styles.presetButtonText}>{preset.charAt(0).toUpperCase() + preset.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.settingLabel}>Symbol Provider</Text>
              <View style={styles.providerRow}>
                {SYMBOL_PROVIDER_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.providerButton,
                      accessibilityConfig.symbolProvider === option.id && styles.providerButtonActive,
                    ]}
                    onPress={() =>
                      setAccessibilityConfig(prev => ({
                        ...prev,
                        symbolProvider: option.id as SymbolProviderId,
                      }))
                    }
                  >
                    <Text style={styles.providerButtonText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!isSymbolProviderImplemented(accessibilityConfig.symbolProvider) && (
                <Text style={styles.providerNote}>
                  Selected provider is not yet fully wired. ARASAAC terms will be retained in storage.
                </Text>
              )}

              <Text style={styles.settingLabel}>Symbol Size</Text>
              <View style={styles.presetRow}>
                {(['small', 'medium', 'large', 'xlarge'] as const).map(size => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.presetButton,
                      accessibilityConfig.symbolSizePreset === size && styles.presetButtonActive,
                    ]}
                    onPress={() => setAccessibilityConfig(prev => ({ ...prev, symbolSizePreset: size }))}
                  >
                    <Text style={styles.presetButtonText}>{size === 'xlarge' ? 'X-Large' : size.charAt(0).toUpperCase() + size.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.settingLabel}>Suggestion Mode</Text>
              <View style={styles.presetRow}>
                {(['classic', 'smart'] as const).map(mode => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.presetButton,
                      suggestionModeDraft === mode && styles.presetButtonActive,
                    ]}
                    onPress={() => setSuggestionModeDraft(mode)}
                  >
                    <Text style={styles.presetButtonText}>{mode === 'smart' ? 'Smart ML-lite' : 'Classic'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.settingLabel}>Target User Group</Text>
              <View style={styles.presetRow}>
                {([
                  { id: 'general', label: 'General AAC' },
                  { id: 'autism-child', label: 'Autism Child' },
                  { id: 'stroke-adult', label: 'Stroke Adult' },
                  { id: 'adult-nonverbal', label: 'Adult Nonverbal' },
                ] as const).map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.presetButton,
                      userPopulationDraft === option.id && styles.presetButtonActive,
                    ]}
                    onPress={() => setUserPopulationDraft(option.id)}
                  >
                    <Text style={styles.presetButtonText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.providerNote}>
                Adapts quick phrases and category priority while keeping core words stable.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emotion Presets</Text>
              <Text style={styles.settingLabel}>Test Phrase</Text>
              <TextInput
                style={styles.input}
                value={emotionPreviewText}
                onChangeText={setEmotionPreviewText}
                placeholder="Type a sample phrase"
                placeholderTextColor="#777"
              />
              <View style={styles.previewControlRow}>
                <TouchableOpacity
                  style={[styles.previewActionButton, isEmotionPreviewPlaying && styles.previewActionButtonActive]}
                  onPress={previewAllEmotions}
                >
                  <Text style={styles.previewActionText}>{isEmotionPreviewPlaying ? 'Replay All' : 'Play All'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewActionButton, styles.previewStopButton]}
                  onPress={stopEmotionPreview}
                >
                  <Text style={styles.previewActionText}>Stop</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.previewChipRow}>
                {EMOTION_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={`preview-${option.id}`}
                    style={styles.previewChip}
                    onPress={() => previewEmotion(option.id)}
                  >
                    <Text style={styles.previewChipText}>Test {option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.providerNote}>
                Preview uses the same phrase for each emotion so you can compare contrast by ear.
              </Text>
              <Text style={styles.settingLabel}>Adaptive Feedback (for selected emotion)</Text>
              <View style={styles.previewControlRow}>
                <TouchableOpacity
                  style={styles.previewActionButton}
                  onPress={() => submitVoiceFeedback(activeEmotionPreset, 'flat')}
                >
                  <Text style={styles.previewActionText}>Too Flat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.previewActionButton}
                  onPress={() => submitVoiceFeedback(activeEmotionPreset, 'good')}
                >
                  <Text style={styles.previewActionText}>Good</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.previewActionButton}
                  onPress={() => submitVoiceFeedback(activeEmotionPreset, 'intense')}
                >
                  <Text style={styles.previewActionText}>Too Intense</Text>
                </TouchableOpacity>
              </View>
              {EMOTION_OPTIONS.map(option => {
                const presets = getEmotionSettings(option.id);
                const isActive = activeEmotionPreset === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.emotionButton, isActive && styles.emotionButtonActive]}
                    onPress={() => applyEmotionPreset(option.id)}
                  >
                    <Text style={styles.emotionText}>
                      {option.label} (Pitch: {presets.pitch}, Rate: {presets.rate})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={() => void handleSaveSettings()}>
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

            <Text style={styles.sectionTitle}>Top Today</Text>
            {stats.topWordsDay.length === 0 ? (
              <Text style={styles.emptyText}>No taps in the last 24 hours.</Text>
            ) : (
              stats.topWordsDay.map((item, idx) => (
                <View key={`day-${idx}`} style={styles.topWordRow}>
                  <Text style={styles.topWordRank}>#{idx + 1}</Text>
                  <Text style={styles.topWordLabel}>{item.word}</Text>
                  <Text style={styles.topWordCount}>{item.count} taps</Text>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Top 7 Days</Text>
            {stats.topWordsWeek.length === 0 ? (
              <Text style={styles.emptyText}>No taps in the last 7 days.</Text>
            ) : (
              stats.topWordsWeek.map((item, idx) => (
                <View key={`week-${idx}`} style={styles.topWordRow}>
                  <Text style={styles.topWordRank}>#{idx + 1}</Text>
                  <Text style={styles.topWordLabel}>{item.word}</Text>
                  <Text style={styles.topWordCount}>{item.count} taps</Text>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Suggestion Acceptance</Text>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Top 3 Suggestion Acceptance</Text>
              <Text style={styles.statValueSmall}>{stats.suggestionAcceptanceTop3.toFixed(1)}%</Text>
              <Text style={styles.statSubtext}>{stats.suggestionSelections} suggestion taps tracked</Text>
            </View>

            <Text style={styles.sectionTitle}>Suggestion Debug</Text>
            {stats.suggestionDebug.length === 0 ? (
              <Text style={styles.emptyText}>No suggestion selections logged yet.</Text>
            ) : (
              stats.suggestionDebug.map((item, idx) => (
                <View key={`debug-${idx}`} style={styles.debugCard}>
                  <Text style={styles.debugTitle}>Last: {item.lastWord} • Mode: {item.mode}</Text>
                  <Text style={styles.debugText}>Picked: {item.picked} (rank #{item.rank || '-'})</Text>
                  <Text style={styles.debugText}>Top 3 shown: {item.top.length > 0 ? item.top.join(', ') : 'n/a'}</Text>
                  <Text style={styles.debugReason}>Why: {item.reason}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.emotionRail}>
        <Text style={styles.emotionRailTitle}>Voice</Text>
        {EMOTION_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.emotionQuickButton,
              activeEmotionPreset === option.id && styles.emotionQuickButtonActive,
            ]}
            onPress={() => applyEmotionPreset(option.id)}
          >
            {emotionSymbolUrls[option.id] ? (
              <Image
                source={{ uri: emotionSymbolUrls[option.id] }}
                style={styles.emotionQuickImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.emotionQuickButtonText}>{option.shortLabel}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

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
            <TextInput
              style={styles.input}
              placeholder="Speak text (optional, defaults to label)"
              value={editingWord ? editingWord.speak : newWord.speak}
              onChangeText={text => editingWord
                ? setEditingWord({ ...editingWord, speak: text })
                : setNewWord(prev => ({ ...prev, speak: text }))}
            />
            <TextInput
              style={styles.input}
              placeholder="AAC symbol term (optional, e.g., mother)"
              value={editingWord ? getSymbolTerm(editingWord.symbol, editingWord.label) : getSymbolTerm(newWord.symbol, newWord.label)}
              onChangeText={text => editingWord
                ? setEditingWord({ ...editingWord, symbol: text.trim() ? toProviderSymbol(text, accessibilityConfig.symbolProvider) : null })
                : setNewWord(prev => ({ ...prev, symbol: text.trim() ? toProviderSymbol(text, accessibilityConfig.symbolProvider) : '' }))}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {COMMON_AAC_TERMS.map(term => (
                <TouchableOpacity
                  key={term}
                  style={styles.categoryChip}
                  onPress={() => editingWord
                    ? setEditingWord({ ...editingWord, symbol: toProviderSymbol(term, accessibilityConfig.symbolProvider) })
                    : setNewWord(prev => ({ ...prev, symbol: toProviderSymbol(term, accessibilityConfig.symbolProvider) }))}
                >
                  <Text style={styles.categoryChipText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
                  <Text
                    style={[
                      styles.categoryChipText,
                      (newWord.category === cat.name || editingWord?.category === cat.name) && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowAddModal(false); setEditingWord(null); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={() => void handleSaveWord()}>
                <Text style={styles.confirmButtonText}>{editingWord ? 'Save' : 'Add'}</Text>
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
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  authTitle: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  settingHint: {
    color: '#475569',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  pinInput: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    fontSize: 24,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    width: '100%',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 8,
  },
  loginButton: {
    backgroundColor: '#1D4ED8',
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
    color: '#334155',
    fontSize: 16,
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingRight: 54,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '600',
  },
  exitLink: {
    color: '#1D4ED8',
    fontSize: 16,
  },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#1D4ED8',
  },
  tabText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0F172A',
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
    backgroundColor: '#EEF2F7',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  filterChipText: {
    color: '#334155',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '500',
  },
  wordMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  editLink: {
    color: '#1D4ED8',
    marginRight: 16,
    fontSize: 14,
  },
  deleteLink: {
    color: '#F44336',
    fontSize: 14,
  },
  coreWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  coreWordLabel: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  coreWordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coreWordActionButton: {
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  coreWordActionText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  coreWordRemoveButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  coreWordRemoveText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },

  // Settings tab
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    color: '#0F172A',
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
    color: '#334155',
    fontSize: 16,
    flex: 1,
  },
  numberInput: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    width: 80,
    padding: 8,
    borderRadius: 6,
    textAlign: 'center',
  },
  toggleButton: {
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  toggleButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  toggleButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  presetButton: {
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  presetButtonActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  presetButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  providerButton: {
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  providerButtonActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  providerButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  providerNote: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
  voicePackList: {
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  voicePackRow: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  voicePackSelect: {
    gap: 4,
  },
  voicePackName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  voicePackMeta: {
    color: '#475569',
    fontSize: 12,
  },
  voicePackActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voicePackActive: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineInput: {
    flex: 1,
  },
  emotionTuningGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  emotionTuningCell: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  emotionTuningLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  emotionButton: {
    backgroundColor: '#EEF2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  emotionButtonActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  emotionText: {
    color: '#1E293B',
    fontSize: 14,
  },
  previewControlRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  previewActionButton: {
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  previewActionButtonActive: {
    backgroundColor: '#3949AB',
    borderColor: '#5C6BC0',
  },
  previewStopButton: {
    backgroundColor: '#3A1F26',
    borderColor: '#8B2A3A',
  },
  previewActionText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  previewChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  previewChip: {
    backgroundColor: '#EEF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  previewChipText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 14,
  },
  statValue: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statValueSmall: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
  },
  statSubtext: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
  },
  emptyText: {
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  topWordRow: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    marginBottom: 6,
    alignItems: 'center',
  },
  topWordRank: {
    color: '#64748B',
    width: 30,
  },
  topWordLabel: {
    color: '#0F172A',
    flex: 1,
    fontSize: 15,
  },
  topWordCount: {
    color: '#475569',
    fontSize: 13,
  },
  debugCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  debugTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  debugText: {
    color: '#475569',
    fontSize: 12,
    marginBottom: 2,
  },
  debugReason: {
    color: '#8FD6FF',
    fontSize: 12,
    marginTop: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '90%',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  inputLabel: {
    color: '#475569',
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
    borderColor: '#0F172A',
  },
  categoryPicker: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#EEF2F7',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  categoryChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  categoryChipText: {
    color: '#334155',
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    color: '#475569',
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emotionRail: {
    position: 'absolute',
    right: 8,
    top: 120,
    width: 42,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  emotionRailTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  emotionQuickButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  emotionQuickButtonActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  emotionQuickButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emotionQuickImage: {
    width: 24,
    height: 24,
  },
});
