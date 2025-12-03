import React, { useMemo } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { BoardGrid } from '../../components/BoardGrid';
import { MessageBar } from '../../components/MessageBar';
import { useAACStore } from '../../store/aacStore';
import { speakPhrase } from '../../services/tts';
import { Tile } from '../../types/models';

export const AACScreen: React.FC = () => {
  const { activeBoard, profile, messageTiles, addTileToMessage, backspace, clearMessage } = useAACStore();

  const handleTilePress = (tile: Tile) => {
    addTileToMessage(tile);
  };

  const phrase = useMemo(() => messageTiles.map((t) => t.spokenText).join(' '), [messageTiles]);

  const handleSpeak = () => {
    speakPhrase(phrase, { voiceId: profile?.settings.voicePreference });
  };

  if (!activeBoard) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <Text style={styles.title}>No board selected</Text>
        <Text style={styles.subtitle}>Choose a profile from the caregiver home to begin.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <MessageBar
        tiles={messageTiles}
        onSpeak={handleSpeak}
        onBackspace={backspace}
        onClear={clearMessage}
      />
      <View style={styles.header}>
        <Text style={styles.title}>{profile?.displayName} • {activeBoard.name}</Text>
        <Text style={styles.subtitle}>{activeBoard.description || 'Core communication board'}</Text>
      </View>
      <View style={styles.gridContainer}>
        <BoardGrid board={activeBoard} onTilePress={handleTilePress} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12
  }
});
