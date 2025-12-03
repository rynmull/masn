import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAACStore } from '../store/aacStore';
import { speak } from '../services/tts';
import { Tile } from '../types/models';
import { Pressable } from 'react-native';

interface Props {
  voicePreference?: string;
}

export const MessageBar: React.FC<Props> = ({ voicePreference }) => {
  const { selectedTiles, messageText, backspace, clear } = useAACStore();

  const handleSpeak = () => {
    speak(messageText(), voicePreference);
  };

  const handleBackspace = () => {
    backspace();
  };

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.message} numberOfLines={2}>
          {selectedTiles.map((tile: Tile) => tile.label).join(' ')}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.speak]} onPress={handleSpeak}>
          <Text style={styles.buttonText}>Speak</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleBackspace}>
          <Text style={styles.buttonText}>Backspace</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={clear}>
          <Text style={styles.buttonText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#e2e8f0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1'
  },
  textContainer: {
    minHeight: 56,
    justifyContent: 'center'
  },
  message: {
    fontSize: 20,
    color: '#0f172a',
    fontWeight: '600'
  },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10
  },
  button: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  speak: {
    backgroundColor: '#2563eb'
  },
  buttonText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 16
  }
});
