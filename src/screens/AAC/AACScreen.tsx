import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { BoardGrid } from '../../components/BoardGrid';
import { MessageBar } from '../../components/MessageBar';
import { demoBoard, demoProfile } from '../../data/coreBoard';
import { useAACStore } from '../../store/aacStore';
import { Tile } from '../../types/models';

export const AACScreen: React.FC = () => {
  const { addToken } = useAACStore();

  const handleTilePress = (tile: Tile) => {
    addToken(tile);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <MessageBar voicePreference={demoProfile.settings.voicePreference} />
      <View style={styles.header}>
        <Text style={styles.title}>{demoProfile.displayName} • Core Board</Text>
        <Text style={styles.subtitle}>Stable 4x4 grid with high-frequency core words</Text>
      </View>
      <View style={styles.gridContainer}>
        <BoardGrid board={demoBoard} onTilePress={handleTilePress} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc'
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
