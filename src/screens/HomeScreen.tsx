import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { getAllSql, runSql } from '../lib/db';
import type { AccessibilitySettings, SuggestionMode, TtsSettings, UserPopulation } from '../App';
import EmotionPicker from '../components/communicator/EmotionPicker';
import PredictionStrip from '../components/communicator/PredictionStrip';
import QuickPhrasesRow from '../components/communicator/QuickPhrasesRow';
import UtteranceDock from '../components/communicator/UtteranceDock';
import { resolveSymbolImageUrl } from '../utils/symbols';
import { EMOTION_OPTIONS, type EmotionPreset } from '../utils/ttsPresets';
import { speakText, stopAllSpeech } from '../utils/tts';

const POPULATION_PRESETS: Record<UserPopulation, {
  primaryCategories: string[];
  secondaryCategories: string[];
  quickPhrases: string[];
}> = {
  general: {
    primaryCategories: ['People', 'Food & Drink', 'Home', 'School', 'Actions', 'Feelings'],
    secondaryCategories: ['Activities', 'Places', 'Descriptors', 'Time', 'Questions'],
    quickPhrases: ['I need help', 'I want more', 'I need bathroom', 'I am all done', 'Can you help me', 'I want a break'],
  },
  'autism-child': {
    primaryCategories: ['People', 'Food & Drink', 'Home', 'Actions', 'Feelings', 'Activities'],
    secondaryCategories: ['School', 'Places', 'Descriptors', 'Time', 'Questions'],
    quickPhrases: ['I need a break', 'No thank you', 'I need help', 'All done', 'My turn', 'Can I have more'],
  },
  'stroke-adult': {
    primaryCategories: ['People', 'Actions', 'Feelings', 'Descriptors', 'Places', 'Questions'],
    secondaryCategories: ['Food & Drink', 'Home', 'School', 'Activities', 'Time'],
    quickPhrases: ['I need help', 'Please slow down', 'Yes', 'No', 'I am in pain', 'Call my family'],
  },
  'adult-nonverbal': {
    primaryCategories: ['People', 'Actions', 'Places', 'Feelings', 'Descriptors', 'Questions'],
    secondaryCategories: ['Food & Drink', 'Home', 'Activities', 'Time', 'School'],
    quickPhrases: ['I need assistance', 'Please wait', 'I agree', 'I disagree', 'I need water', 'I want privacy'],
  },
};
const NEXT_WORD_HINTS: Record<string, string[]> = {
  I: ['Want', 'Need', 'Like'],
  Want: ['More', 'Eat', 'Drink', 'Help'],
  Need: ['Help', 'Bathroom', 'Mom', 'Dad'],
  Eat: ['More', 'Drink', 'All done'],
  Drink: ['More', 'All done'],
  Help: ['Mom', 'Dad', 'Teacher'],
  Go: ['Home', 'Park', 'Outside', 'School'],
  No: ['Stop', 'Not'],
  Yes: ['More', 'Go'],
};

interface Word {
  label: string;
  speak: string;
  color: string;
  symbol?: string | null;
}

interface Vocabulary {
  [category: string]: Word[];
}

interface SuggestionCandidate {
  label: string;
  category: string;
  usage_count: number;
  last_used: string | null;
}

interface LabelCountRow {
  label: string;
  count: number;
}

interface UsageEventRow {
  id: number;
  label: string;
}

interface HomeScreenProps {
  vocabulary: Vocabulary;
  ttsSettings: TtsSettings;
  accessibilitySettings: AccessibilitySettings;
  onVocabularyChange: () => void;
  activeEmotionPreset: EmotionPreset;
  onQuickEmotionSelect: (emotion: EmotionPreset) => void;
  coreWordsOrder: string[];
  suggestionMode: SuggestionMode;
  userPopulation: UserPopulation;
}

export default function HomeScreen({
  vocabulary,
  ttsSettings,
  accessibilitySettings,
  onVocabularyChange,
  activeEmotionPreset,
  onQuickEmotionSelect,
  coreWordsOrder,
  suggestionMode,
  userPopulation,
}: HomeScreenProps) {
  const { width, height } = useWindowDimensions();
  const preset = useMemo(() => POPULATION_PRESETS[userPopulation] ?? POPULATION_PRESETS.general, [userPopulation]);
  const primaryCategories = preset.primaryCategories;
  const secondaryCategories = preset.secondaryCategories;
  const categories = [...primaryCategories, ...secondaryCategories];
  const quickPhraseTemplates = preset.quickPhrases;

  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [phraseLabels, setPhraseLabels] = useState<string[]>([]);
  const [typedPhrase, setTypedPhrase] = useState('');
  const [suggestedWords, setSuggestedWords] = useState<string[]>([]);
  const [recentPhrases, setRecentPhrases] = useState<string[]>([]);
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [symbolUrls, setSymbolUrls] = useState<Record<string, string>>({});
  const [emotionSymbolUrls, setEmotionSymbolUrls] = useState<Record<EmotionPreset, string>>({} as Record<EmotionPreset, string>);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionPreset>(activeEmotionPreset);
  const [currentSuggestionEventId, setCurrentSuggestionEventId] = useState<number | null>(null);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory(categories[0]);
      setShowMoreCategories(false);
    }
  }, [categories, selectedCategory]);

  const logSuggestionImpression = useCallback(async (
    lastWord: string,
    suggestions: string[],
    reasonMap: Record<string, string>
  ) => {
    if (suggestions.length === 0) {
      setCurrentSuggestionEventId(null);
      return;
    }

    try {
      const result = await runSql(
        `INSERT INTO suggestion_events (
          last_word,
          selected_category,
          top_candidates,
          reason_map,
          suggestion_mode
        ) VALUES (?, ?, ?, ?, ?);`,
        lastWord,
        selectedCategory,
        JSON.stringify(suggestions.slice(0, 6)),
        JSON.stringify(reasonMap),
        suggestionMode
      );

      setCurrentSuggestionEventId(
        typeof result.lastInsertRowId === 'number' ? result.lastInsertRowId : null
      );
    } catch (error) {
      console.warn('Failed to log suggestion impression:', error);
      setCurrentSuggestionEventId(null);
    }
  }, [selectedCategory, suggestionMode]);

  const spacingScale = accessibilitySettings.spacingPreset === 'compact'
    ? 0.9
    : accessibilitySettings.spacingPreset === 'loose'
      ? 1.15
      : 1;
  const isTabletLayout = width >= 960;
  const baseButtonMargin = accessibilitySettings.spacingPreset === 'compact'
    ? 8
    : accessibilitySettings.spacingPreset === 'loose'
      ? 12
      : 10;
  const buttonSize = Math.max(
    Math.min(width * (isTabletLayout ? 0.16 : 0.28) * spacingScale, height * 0.22 * spacingScale),
    isTabletLayout ? 72 : 56
  );
  const buttonMargin = isTabletLayout ? baseButtonMargin + 2 : baseButtonMargin;
  const scaledText = (size: number) => Math.max(12, Math.round(size * accessibilitySettings.textScale));
  const highContrast = accessibilitySettings.highContrast;
  const currentEmotionOption = EMOTION_OPTIONS.find(option => option.id === currentEmotion) ?? EMOTION_OPTIONS[0];
  const symbolSizeScale = accessibilitySettings.symbolSizePreset === 'small'
    ? 0.9
    : accessibilitySettings.symbolSizePreset === 'medium'
      ? 1
      : accessibilitySettings.symbolSizePreset === 'xlarge'
        ? 1.3
        : 1.15;
  const getSymbolSize = (isCore: boolean) => {
    const base = isCore ? 54 : 68;
    const maxSize = Math.floor((isCore ? buttonSize * 0.72 : buttonSize * 0.78));
    const computed = Math.round(scaledText(base) * symbolSizeScale);
    return Math.max(36, Math.min(computed, maxSize));
  };

  const speak = useCallback((text: string) => {
    void speakText(text, ttsSettings, currentEmotion);
  }, [currentEmotion, ttsSettings]);

  useEffect(() => {
    setCurrentEmotion(activeEmotionPreset);
  }, [activeEmotionPreset]);

  useEffect(() => {
    return () => {
      void stopAllSpeech();
    };
  }, []);

  const handleButtonPress = (item: Word) => {
    // Speak immediately
    speak(item.label);

    // Add to phrase builder
    setPhraseLabels(prev => [...prev, item.label]);

    // Update usage in DB
    void (async () => {
      await runSql(
        `INSERT INTO words (label, speak, color, category, usage_count) VALUES (?, ?, ?, ?, 1)
         ON CONFLICT(label) DO UPDATE SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP;`,
        item.label,
        item.speak,
        item.color,
        selectedCategory
      );
      await runSql(
        `INSERT INTO usage_events (label, category) VALUES (?, ?);`,
        item.label,
        selectedCategory
      );

      onVocabularyChange();
    })();
  };

  const handleSuggestionPress = (word: string, index: number) => {
    void (async () => {
      if (currentSuggestionEventId !== null) {
        try {
          await runSql(
            `UPDATE suggestion_events
             SET selected_label=?, selected_rank=?, accepted_top3=?, selected_at=CURRENT_TIMESTAMP
             WHERE id=?;`,
            word,
            index + 1,
            index < 3 ? 1 : 0,
            currentSuggestionEventId
          );
        } catch (error) {
          console.warn('Failed to update suggestion acceptance:', error);
        }
      }

      const allWordsFlat = Object.values(vocabulary).flat();
      const vocab = allWordsFlat.find(v => v.label === word);
      if (vocab) {
        handleButtonPress(vocab);
      }
    })();
  };

  const clearPhrase = () => {
    setPhraseLabels([]);
  };

  const backspacePhrase = () => {
    setPhraseLabels(prev => prev.slice(0, -1));
  };

  const speakPhrase = () => {
    const text = phraseLabels.join(' ').trim();
    if (text.trim()) {
      speak(text);
    }
  };

  const addTypedPhrase = () => {
    const normalized = typedPhrase
      .trim()
      .replace(/\s+/g, ' ');

    if (!normalized) return;

    const typedTokens = normalized.split(' ');
    setPhraseLabels(prev => [...prev, ...typedTokens]);
    setTypedPhrase('');
  };

  const fetchRecentPhrases = useCallback(async () => {
    try {
      // Fetch the 7 most recently used words from usage_events
      const rows = await getAllSql<{ label: string }>(
        `SELECT label
         FROM usage_events
         GROUP BY label
         ORDER BY MAX(used_at) DESC
         LIMIT 7;`
      );
      const recent = rows.map(row => row.label);
      setRecentPhrases(recent);
    } catch (error) {
      console.warn('Failed to fetch recent phrases:', error);
      setRecentPhrases([]);
    }
  }, []);

  const handleSelectRecentPhrase = (label: string) => {
    setPhraseLabels(prev => [...prev, label]);
  };

  const handleSelectQuickPhrase = (phrase: string) => {
    const tokens = phrase
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) return;
    setPhraseLabels(prev => [...prev, ...tokens]);
  };

  // ML-lite next-word reranker using local usage patterns and grammar hints.
  const fetchSuggestedWords = useCallback(async () => {
    if (phraseLabels.length === 0) {
      setSuggestedWords([]);
      setCurrentSuggestionEventId(null);
      return;
    }

    const usedLabels = new Set(phraseLabels);
    const lastWord = phraseLabels[phraseLabels.length - 1] ?? '';
    const grammarSuggestions = (NEXT_WORD_HINTS[lastWord] ?? []).filter(label => !usedLabels.has(label));
    const grammarRank = new Map(grammarSuggestions.map((label, index) => [label, index]));

    try {
      if (suggestionMode === 'classic') {
        const placeholderSql = phraseLabels.map(() => '?').join(',');
        const sql = `
          SELECT label FROM words
          WHERE label NOT IN (${placeholderSql})
          ORDER BY
            CASE WHEN category = ? THEN 0 ELSE 1 END,
            last_used DESC,
            usage_count DESC
          LIMIT 8;
        `;
        const rows = await getAllSql<{ label: string }>(sql, ...phraseLabels, selectedCategory);
        const merged = [...grammarSuggestions, ...rows.map(row => row.label)];
        const finalSuggestions = Array.from(new Set(merged)).slice(0, 6);
        setSuggestedWords(finalSuggestions);

        const reasonMap = finalSuggestions.slice(0, 3).reduce<Record<string, string>>((acc, label, rank) => {
          acc[label] = rank < grammarSuggestions.length
            ? 'Grammar hint'
            : 'Classic recency + category ranking';
          return acc;
        }, {});
        await logSuggestionImpression(lastWord, finalSuggestions, reasonMap);
        return;
      }

      const placeholderSql = phraseLabels.map(() => '?').join(',');
      const candidatesSql = `
        SELECT label, category, usage_count, last_used
        FROM words
        WHERE label NOT IN (${placeholderSql})
        LIMIT 80;
      `;
      const candidates = await getAllSql<SuggestionCandidate>(candidatesSql, ...phraseLabels);

      const dailyRows = await getAllSql<LabelCountRow>(
        `
          SELECT label, COUNT(*) AS count
          FROM usage_events
          WHERE used_at >= datetime('now', '-1 day')
          GROUP BY label;
        `
      );
      const weeklyRows = await getAllSql<LabelCountRow>(
        `
          SELECT label, COUNT(*) AS count
          FROM usage_events
          WHERE used_at >= datetime('now', '-7 day')
          GROUP BY label;
        `
      );
      const recentEvents = await getAllSql<UsageEventRow>(
        `
          SELECT id, label
          FROM usage_events
          ORDER BY id DESC
          LIMIT 600;
        `
      );

      const dailyCountByLabel = new Map(dailyRows.map(row => [row.label, row.count]));
      const weeklyCountByLabel = new Map(weeklyRows.map(row => [row.label, row.count]));
      const transitionCountByLabel = new Map<string, number>();

      const chronologicalEvents = [...recentEvents].reverse();
      for (let index = 0; index < chronologicalEvents.length - 1; index += 1) {
        const current = chronologicalEvents[index];
        const next = chronologicalEvents[index + 1];
        if (current.label !== lastWord || usedLabels.has(next.label)) continue;
        transitionCountByLabel.set(next.label, (transitionCountByLabel.get(next.label) ?? 0) + 1);
      }

      const maxDaily = Math.max(1, ...Array.from(dailyCountByLabel.values()));
      const maxWeekly = Math.max(1, ...Array.from(weeklyCountByLabel.values()));
      const maxTransitions = Math.max(1, ...Array.from(transitionCountByLabel.values()));

      const now = Date.now();
      const scored = candidates.map(candidate => {
        const usageScore = Math.log1p(Math.max(0, candidate.usage_count));

        const lastUsedMs = candidate.last_used ? Date.parse(candidate.last_used) : 0;
        const ageHours = lastUsedMs > 0 ? Math.max(0, (now - lastUsedMs) / (1000 * 60 * 60)) : 72;
        const recencyScore = Math.exp(-ageHours / 48);

        const dayScore = (dailyCountByLabel.get(candidate.label) ?? 0) / maxDaily;
        const weekScore = (weeklyCountByLabel.get(candidate.label) ?? 0) / maxWeekly;
        const transitionScore = (transitionCountByLabel.get(candidate.label) ?? 0) / maxTransitions;
        const categoryScore = candidate.category === selectedCategory ? 1 : 0;
        const grammarScore = grammarRank.has(candidate.label)
          ? 1 - ((grammarRank.get(candidate.label) ?? 0) / Math.max(1, grammarSuggestions.length))
          : 0;

        const score =
          (transitionScore * 0.34) +
          (grammarScore * 0.24) +
          (recencyScore * 0.14) +
          (dayScore * 0.12) +
          (weekScore * 0.08) +
          (usageScore * 0.05) +
          (categoryScore * 0.03);

        return {
          label: candidate.label,
          score,
        };
      });

      const ranked = scored
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
        .slice(0, 6);

      const merged = [...grammarSuggestions, ...ranked.map(item => item.label)];
      const finalSuggestions = Array.from(new Set(merged)).slice(0, 6);
      setSuggestedWords(finalSuggestions);

      const reasonMap = ranked.slice(0, 3).reduce<Record<string, string>>((acc, item) => {
        const reasonParts: string[] = [];
        if ((transitionCountByLabel.get(item.label) ?? 0) > 0) reasonParts.push('sequence match');
        if (grammarRank.has(item.label)) reasonParts.push('grammar hint');
        if ((dailyCountByLabel.get(item.label) ?? 0) > 0) reasonParts.push('recently used today');
        if (item.score >= 0.75) reasonParts.push('high confidence');
        acc[item.label] = reasonParts.length > 0 ? reasonParts.join(', ') : 'usage + recency blend';
        return acc;
      }, {});

      await logSuggestionImpression(lastWord, finalSuggestions, reasonMap);
    } catch (error) {
      console.log('Error fetching suggestions:', error);
      setSuggestedWords(grammarSuggestions.slice(0, 6));
      setCurrentSuggestionEventId(null);
    }
  }, [phraseLabels, selectedCategory, suggestionMode, logSuggestionImpression]);

  // Update suggestions whenever phrase changes
  useEffect(() => {
    void fetchSuggestedWords();
  }, [phraseLabels, fetchSuggestedWords]);

  // Fetch recent phrases on mount and when vocabulary changes
  useEffect(() => {
    void fetchRecentPhrases();
  }, [fetchRecentPhrases, onVocabularyChange]);

  const allWords = Object.values(vocabulary).flat();
  const effectiveCoreOrder = coreWordsOrder.length > 0 ? coreWordsOrder : ['I', 'Want', 'Need', 'More', 'Help', 'Stop', 'Go', 'Yes', 'No', 'Like', 'Not', 'Eat'];
  const coreWords = effectiveCoreOrder
    .map(label => allWords.find(word => word.label === label))
    .filter((word): word is Word => Boolean(word));
  const coreWordSet = new Set(coreWords.map(word => word.label));
  const currentVocab = vocabulary[selectedCategory] || [];
  const fringeWords = currentVocab.filter(word => !coreWordSet.has(word.label));

  useEffect(() => {
    if (!accessibilitySettings.showSymbols) return;

    let isCancelled = false;

    const loadSymbols = async () => {
      const pairs = await Promise.all(
        allWords.map(async word => {
          const url = await resolveSymbolImageUrl(word.symbol, word.label, accessibilitySettings.symbolProvider);
          return [word.label, url] as const;
        })
      );

      if (isCancelled) return;

      const map: Record<string, string> = {};
      pairs.forEach(([label, url]) => {
        if (url) map[label] = url;
      });
      setSymbolUrls(map);
    };

    void loadSymbols();

    return () => {
      isCancelled = true;
    };
  }, [accessibilitySettings.showSymbols, accessibilitySettings.symbolProvider, vocabulary]);

  const renderWordButton = (item: Word, variant: 'core' | 'fringe' = 'fringe') => {
    const isCore = variant === 'core';

    return (
      <TouchableOpacity
        key={`${variant}-${item.label}`}
        style={[
          styles.button,
          isCore ? styles.coreButton : styles.fringeButton,
          {
            width: isCore ? Math.max(buttonSize * 0.88, 84) : buttonSize,
            height: isCore ? Math.max(buttonSize * 0.78, 72) : buttonSize,
            margin: buttonMargin,
            backgroundColor: highContrast ? '#000000' : 'rgba(255, 255, 255, 0.72)',
            borderWidth: highContrast ? 3 : 1,
            borderColor: highContrast ? '#FFFFFF' : 'rgba(148, 163, 184, 0.42)',
          },
        ]}
        onPress={() => handleButtonPress(item)}
        accessibilityLabel={item.label}
        accessibilityRole="button"
        accessibilityHint={`Speak ${item.label}`}
      >
        {accessibilitySettings.showSymbols ? (
          <View style={styles.buttonContent}>
            {symbolUrls[item.label] ? (
              <Image
                source={{ uri: symbolUrls[item.label] }}
                style={[
                  styles.symbolImage,
                  {
                    width: getSymbolSize(isCore),
                    height: getSymbolSize(isCore),
                  },
                ]}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.symbolFallbackText, { fontSize: scaledText(isCore ? 12 : 14) }]}>AAC</Text>
            )}
            <Text style={[styles.buttonText, { fontSize: scaledText(isCore ? 12 : 14) }]}>{item.label}</Text>
          </View>
        ) : (
          <Text style={[styles.buttonText, { fontSize: scaledText(isCore ? 16 : 18) }]}>{item.label}</Text>
        )}
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    let isCancelled = false;

    const loadEmotionSymbols = async () => {
      const pairs = await Promise.all(
        EMOTION_OPTIONS.map(async option => {
          const url = await resolveSymbolImageUrl(
            `${accessibilitySettings.symbolProvider}:${option.symbolTerm}`,
            option.symbolTerm,
            accessibilitySettings.symbolProvider
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
  }, [accessibilitySettings.symbolProvider]);

  const hasSuggestions = phraseLabels.length > 0 && suggestedWords.length > 0;

  const handleEmotionSelect = (emotion: EmotionPreset) => {
    setCurrentEmotion(emotion);
    onQuickEmotionSelect(emotion);
  };

  const renderCategoryNavigation = () => (
    <View style={[
      styles.categoryStrip,
      highContrast && styles.sectionCardHighContrast,
      isTabletLayout && styles.categoryStripTablet,
    ]}>
      <View style={styles.categoryStripHeader}>
        <Text style={[styles.sectionEyebrow, { fontSize: scaledText(12) }]}>Browse by category</Text>
        <Text style={[styles.sectionTitle, { fontSize: scaledText(20) }]}>{selectedCategory}</Text>
      </View>

      {isTabletLayout ? (
        <View style={styles.tabsWrap}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.tab,
                styles.tabTablet,
                selectedCategory === cat && styles.tabActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedCategory === cat && styles.tabTextActive,
                  { fontSize: scaledText(14) },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <>
          <ScrollView
            horizontal
            style={styles.tabs}
            contentContainerStyle={styles.tabsContent}
            showsHorizontalScrollIndicator={false}
          >
            {primaryCategories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.tab,
                  selectedCategory === cat && styles.tabActive,
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setShowMoreCategories(false);
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedCategory === cat && styles.tabTextActive,
                    { fontSize: scaledText(14) },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.tab,
                styles.moreTab,
                (showMoreCategories || secondaryCategories.includes(selectedCategory)) && styles.tabActive,
              ]}
              onPress={() => setShowMoreCategories(prev => !prev)}
            >
              <Text
                style={[
                  styles.tabText,
                  (showMoreCategories || secondaryCategories.includes(selectedCategory)) && styles.tabTextActive,
                  { fontSize: scaledText(14) },
                ]}
              >
                More
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {(showMoreCategories || secondaryCategories.includes(selectedCategory)) ? (
            <View style={styles.secondaryTabsWrap}>
              {secondaryCategories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.tab,
                    styles.secondaryTab,
                    selectedCategory === cat && styles.tabActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      selectedCategory === cat && styles.tabTextActive,
                      { fontSize: scaledText(13) },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );

  const renderCoreWordsSection = () => (
    <View style={[styles.sectionCard, highContrast && styles.sectionCardHighContrast]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionEyebrow, { fontSize: scaledText(12) }]}>Always visible</Text>
        <Text style={[styles.sectionTitle, { fontSize: scaledText(20) }]}>Core Words</Text>
      </View>
      <View style={[styles.coreGrid, isTabletLayout && styles.coreGridTablet]}>
        {coreWords.map(word => renderWordButton(word, 'core'))}
      </View>
    </View>
  );

  const renderVocabularyGrid = () => (
    <View style={[styles.vocabularyPanel, highContrast && styles.sectionCardHighContrast]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionEyebrow, { fontSize: scaledText(12) }]}>Current board</Text>
        <Text style={[styles.sectionTitle, { fontSize: scaledText(20) }]}>{selectedCategory}</Text>
      </View>
      <View style={[styles.grid, isTabletLayout && styles.gridTablet]}>
        {fringeWords.map(item => renderWordButton(item))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={[styles.mainScrollContent, isTabletLayout && styles.mainScrollContentTablet]}
        showsVerticalScrollIndicator={false}
      >
        <UtteranceDock
          phraseLabels={phraseLabels}
          typedPhrase={typedPhrase}
          onTypedPhraseChange={setTypedPhrase}
          onSubmitTypedPhrase={addTypedPhrase}
          onBackspace={backspacePhrase}
          onClear={clearPhrase}
          onSpeak={speakPhrase}
          emotionSymbolUrl={emotionSymbolUrls[currentEmotion]}
          emotionShortLabel={currentEmotionOption.shortLabel}
          highContrast={highContrast}
          scaledText={scaledText}
          isTabletLayout={isTabletLayout}
        />

        <EmotionPicker
          currentEmotion={currentEmotion}
          emotionSymbolUrls={emotionSymbolUrls}
          onSelect={handleEmotionSelect}
        />

        <QuickPhrasesRow
          quickPhrases={quickPhraseTemplates}
          recentWords={recentPhrases}
          onSelectQuickPhrase={handleSelectQuickPhrase}
          onSelectRecentWord={handleSelectRecentPhrase}
          highContrast={highContrast}
          scaledText={scaledText}
        />

        {!isTabletLayout && renderCategoryNavigation()}

        {isTabletLayout ? (
          <View style={styles.boardShellTablet}>
            <View style={styles.tabletSidebar}>
              {renderCategoryNavigation()}
              <PredictionStrip
                suggestions={hasSuggestions ? suggestedWords : []}
                onSelect={handleSuggestionPress}
                showSymbols={accessibilitySettings.showSymbols}
                symbolUrls={symbolUrls}
                highContrast={highContrast}
                scaledText={scaledText}
              />
              <EmotionPicker
                currentEmotion={currentEmotion}
                emotionSymbolUrls={emotionSymbolUrls}
                onSelect={handleEmotionSelect}
                vertical
              />
              {renderCoreWordsSection()}
            </View>
            <View style={styles.tabletMainPanel}>
              {renderVocabularyGrid()}
            </View>
          </View>
        ) : (
          <>
            {renderCoreWordsSection()}
            <PredictionStrip
              suggestions={hasSuggestions ? suggestedWords : []}
              onSelect={handleSuggestionPress}
              showSymbols={accessibilitySettings.showSymbols}
              symbolUrls={symbolUrls}
              highContrast={highContrast}
              scaledText={scaledText}
            />
            {renderVocabularyGrid()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingBottom: 72,
  },
  mainScrollContentTablet: {
    paddingBottom: 32,
  },
  boardShellTablet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  tabletSidebar: {
    width: 320,
    flexShrink: 0,
  },
  tabletMainPanel: {
    flex: 1,
    minWidth: 0,
  },
  sectionCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1,
    borderColor: '#D7DFEA',
  },
  sectionCardHighContrast: {
    borderColor: '#FFFFFF',
  },
  sectionHeaderRow: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  sectionEyebrow: {
    color: '#5E6B7D',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    color: '#1F2937',
    fontWeight: '800',
  },
  coreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  coreGridTablet: {
    justifyContent: 'flex-start',
  },
  categoryStrip: {
    marginHorizontal: 12,
    marginBottom: 12,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: '#D7DFEA',
    zIndex: 5,
  },
  categoryStripTablet: {
    marginHorizontal: 0,
  },
  categoryStripHeader: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  tabs: {
    minHeight: 56,
  },
  tabsContent: {
    paddingHorizontal: 6,
  },
  tabsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 6,
    gap: 6,
  },
  secondaryTabsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 6,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(241, 245, 249, 0.88)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  tabTablet: {
    marginHorizontal: 0,
  },
  moreTab: {
    backgroundColor: '#E2E8F0',
  },
  secondaryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 0,
  },
  tabActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  tabText: {
    color: '#334155',
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
    paddingBottom: 32,
  },
  gridTablet: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  vocabularyPanel: {
    marginHorizontal: 12,
    marginBottom: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderWidth: 1,
    borderColor: '#D7DFEA',
  },
  button: {
    minWidth: 56,
    minHeight: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 6px 16px rgba(15, 23, 42, 0.10)',
    elevation: 4,
  },
  coreButton: {
    borderRadius: 18,
    shadowOpacity: 0.22,
  },
  fringeButton: {
    borderRadius: 16,
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  symbolText: {
    color: '#FFF',
    lineHeight: 24,
  },
  symbolImage: {
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  symbolFallbackText: {
    color: '#334155',
    fontWeight: '700',
    opacity: 0.8,
  },
});
