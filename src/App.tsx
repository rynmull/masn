import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, StyleSheet, StatusBar, TouchableOpacity, Text, View } from 'react-native';
import HomeScreen from './screens/HomeScreen';
import CaregiverScreen from './screens/CaregiverScreen';
import { execSql, getAllSql, getFirstSql, runSql } from './lib/db';
import { DEFAULT_SYMBOL_PROVIDER, type SymbolProviderId } from './utils/symbols';
import { CORE_WORD_LABELS, DEFAULT_WORDS, LEGACY_DEFAULT_SPEAK_BY_LABEL } from './utils/defaultVocabulary';
import { getEmotionSettings, type EmotionPreset } from './utils/ttsPresets';
import { isForceLocalOnlyMode } from './utils/runtimeFlags';
import type { TtsEngine } from './utils/tts';

type AppMode = 'user' | 'caregiver';
export type SpacingPreset = 'compact' | 'standard' | 'loose';
export type SymbolSizePreset = 'small' | 'medium' | 'large' | 'xlarge';
export type SuggestionMode = 'classic' | 'smart';
export type UserPopulation = 'general' | 'autism-child' | 'stroke-adult' | 'adult-nonverbal';

export interface AccessibilitySettings {
  highContrast: boolean;
  textScale: number;
  spacingPreset: SpacingPreset;
  showSymbols: boolean;
  symbolProvider: SymbolProviderId;
  symbolSizePreset: SymbolSizePreset;
}

export interface TtsSettings {
  pitch: number;
  rate: number;
  engine: TtsEngine;
  elevenLabsVoiceId: string;
  localVoicePackId: string;
  adaptiveStyleEnabled: boolean;
  offlineOnlyMode: boolean;
  expressiveVoiceEnabled: boolean;
  styleLearningEnabled: boolean;
  styleLearningRate: number;
  emotionIntensity: number;
  emotionIntensityByPreset: Record<EmotionPreset, number>;
}

const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  textScale: 1,
  spacingPreset: 'standard',
  showSymbols: true,
  symbolProvider: DEFAULT_SYMBOL_PROVIDER,
  symbolSizePreset: 'large',
};

export default function App() {
  const forceLocalOnlyMode = isForceLocalOnlyMode();
  const [mode, setMode] = useState<AppMode>('user');
  const [vocabulary, setVocabulary] = useState<Record<string, Array<{ label: string; speak: string; color: string; symbol?: string | null }>>>({});
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
  const [emotionPreset, setEmotionPreset] = useState<EmotionPreset>('neutral');
  const [accessibilitySettings, setAccessibilitySettings] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY_SETTINGS);
  const [coreWordsOrder, setCoreWordsOrder] = useState<string[]>(CORE_WORD_LABELS);
  const [suggestionMode, setSuggestionMode] = useState<SuggestionMode>('smart');
  const [userPopulation, setUserPopulation] = useState<UserPopulation>('general');

  // Load shared data (vocabulary & TTS settings) from database
  useEffect(() => {
    const bootstrap = async () => {
      await initializeDB();
      await loadSharedData();
    };

    void bootstrap().catch(error => {
      console.error('App bootstrap failed:', error);
    });
  }, []);

  const initializeDB = async () => {
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

  const loadSharedData = async () => {
    // Ensure starter vocabulary exists without overwriting custom edits.
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

    // Load all words and group by category
    const words = await getAllSql<{ label: string; speak: string; symbol?: string | null; color: string; category: string }>('SELECT * FROM words;');
    const grouped: Record<string, Array<{ label: string; speak: string; color: string; symbol?: string | null }>> = {};
    words.forEach(word => {
      if (!grouped[word.category]) grouped[word.category] = [];
      grouped[word.category].push({
        label: word.label,
        speak: word.speak,
        color: word.color,
        symbol: word.symbol,
      });
    });
    setVocabulary(grouped);

    // Load TTS settings
    const pitchRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_pitch';");
    if (pitchRow?.value) setTtsSettings(prev => ({ ...prev, pitch: parseFloat(pitchRow.value) }));

    const rateRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_rate';");
    if (rateRow?.value) setTtsSettings(prev => ({ ...prev, rate: parseFloat(rateRow.value) }));

    const emotionPresetRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='tts_emotion_preset';");
    if (
      emotionPresetRow?.value === 'neutral' ||
      emotionPresetRow?.value === 'happy' ||
      emotionPresetRow?.value === 'sad' ||
      emotionPresetRow?.value === 'angry' ||
      emotionPresetRow?.value === 'calm'
    ) {
      setEmotionPreset(emotionPresetRow.value);
    }

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

    const suggestionModeRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='suggestion_mode';");
    if (suggestionModeRow?.value === 'classic' || suggestionModeRow?.value === 'smart') {
      setSuggestionMode(suggestionModeRow.value);
    }

    const userPopulationRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='user_population';");
    if (
      userPopulationRow?.value === 'general' ||
      userPopulationRow?.value === 'autism-child' ||
      userPopulationRow?.value === 'stroke-adult' ||
      userPopulationRow?.value === 'adult-nonverbal'
    ) {
      setUserPopulation(userPopulationRow.value);
    }

    // Load accessibility settings
    const highContrastRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='accessibility_high_contrast';");
    const textScaleRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='accessibility_text_scale';");
    const spacingPresetRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='accessibility_spacing_preset';");
    const showSymbolsRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='accessibility_show_symbols';");
    const symbolProviderRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='accessibility_symbol_provider';");
    const symbolSizePresetRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='accessibility_symbol_size_preset';");
    const coreWordsOrderRow = await getFirstSql<{ value: string }>("SELECT value FROM settings WHERE key='core_words_order';");

    const nextSettings: AccessibilitySettings = {
      highContrast: highContrastRow?.value === 'true' ? true : DEFAULT_ACCESSIBILITY_SETTINGS.highContrast,
      textScale: textScaleRow?.value ? parseFloat(textScaleRow.value) : DEFAULT_ACCESSIBILITY_SETTINGS.textScale,
      spacingPreset: spacingPresetRow?.value === 'compact' || spacingPresetRow?.value === 'loose'
        ? spacingPresetRow.value
        : DEFAULT_ACCESSIBILITY_SETTINGS.spacingPreset,
      showSymbols: showSymbolsRow?.value === 'false' ? false : DEFAULT_ACCESSIBILITY_SETTINGS.showSymbols,
      symbolProvider: symbolProviderRow?.value === 'pcs' || symbolProviderRow?.value === 'symbolstix'
        ? symbolProviderRow.value
        : DEFAULT_ACCESSIBILITY_SETTINGS.symbolProvider,
      symbolSizePreset: symbolSizePresetRow?.value === 'small' || symbolSizePresetRow?.value === 'medium' || symbolSizePresetRow?.value === 'xlarge'
        ? symbolSizePresetRow.value
        : DEFAULT_ACCESSIBILITY_SETTINGS.symbolSizePreset,
    };

    setAccessibilitySettings(nextSettings);

    if (coreWordsOrderRow?.value) {
      try {
        const parsed = JSON.parse(coreWordsOrderRow.value) as unknown;
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map(item => item.trim());

          if (normalized.length > 0) {
            setCoreWordsOrder(Array.from(new Set(normalized)));
          }
        }
      } catch {
        setCoreWordsOrder(CORE_WORD_LABELS);
      }
    } else {
      setCoreWordsOrder(CORE_WORD_LABELS);
    }
  };

  const refreshVocabulary = useCallback(() => {
    void loadSharedData().catch(error => {
      console.error('Vocabulary refresh failed:', error);
    });
  }, []);

  const applyEmotionPreset = useCallback((emotion: EmotionPreset) => {
    const next = getEmotionSettings(emotion);
    setEmotionPreset(emotion);
    setTtsSettings(prev => ({ ...prev, ...next }));

    void (async () => {
      await runSql("INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_pitch', ?);", next.pitch.toString());
      await runSql("INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_rate', ?);", next.rate.toString());
      await runSql("INSERT OR REPLACE INTO settings (key, value) VALUES ('tts_emotion_preset', ?);", emotion);
    })().catch(error => {
      console.error('Failed to save emotion preset TTS settings:', error);
    });
  }, []);

  const updateLiveTtsSettings = useCallback((next: TtsSettings) => {
    setTtsSettings(next);
  }, []);

  const updateCoreWordsOrder = useCallback((nextOrder: string[]) => {
    const normalized = Array.from(new Set(nextOrder.map(item => item.trim()).filter(Boolean)));
    setCoreWordsOrder(normalized);

    void runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('core_words_order', ?);",
      JSON.stringify(normalized)
    ).catch(error => {
      console.error('Failed to save core words order:', error);
    });
  }, []);

  const updateSuggestionMode = useCallback((nextMode: SuggestionMode) => {
    setSuggestionMode(nextMode);
    void runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('suggestion_mode', ?);",
      nextMode
    ).catch(error => {
      console.error('Failed to save suggestion mode:', error);
    });
  }, []);

  const updateUserPopulation = useCallback((nextPopulation: UserPopulation) => {
    setUserPopulation(nextPopulation);
    void runSql(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('user_population', ?);",
      nextPopulation
    ).catch(error => {
      console.error('Failed to save user population:', error);
    });
  }, []);

  // If in caregiver mode, show caregiver screen
  if (mode === 'caregiver') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <CaregiverScreen
          onExit={() => setMode('user')}
          accessibilitySettings={accessibilitySettings}
          onSettingsSaved={refreshVocabulary}
          onTtsSettingsChange={updateLiveTtsSettings}
          activeEmotionPreset={emotionPreset}
          onQuickEmotionSelect={applyEmotionPreset}
          coreWordsOrder={coreWordsOrder}
          onCoreWordsOrderChange={updateCoreWordsOrder}
          suggestionMode={suggestionMode}
          onSuggestionModeChange={updateSuggestionMode}
          userPopulation={userPopulation}
          onUserPopulationChange={updateUserPopulation}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.caregiverToggle}>
        <TouchableOpacity style={styles.caregiverButton} onPress={() => setMode('caregiver')}>
          <Text style={styles.caregiverLink}>Caregiver</Text>
        </TouchableOpacity>
      </View>
      <HomeScreen
        vocabulary={vocabulary}
        ttsSettings={ttsSettings}
        accessibilitySettings={accessibilitySettings}
        onVocabularyChange={refreshVocabulary}
        activeEmotionPreset={emotionPreset}
        onQuickEmotionSelect={applyEmotionPreset}
        coreWordsOrder={coreWordsOrder}
        suggestionMode={suggestionMode}
        userPopulation={userPopulation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  caregiverToggle: {
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  caregiverButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  caregiverLink: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
