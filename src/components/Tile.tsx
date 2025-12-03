import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tile } from '../types/models';

interface Props {
  tile: Tile;
  onPress: (tile: Tile) => void;
}

export const TileButton: React.FC<Props> = ({ tile, onPress }) => {
  return (
    <Pressable
      onPress={() => onPress(tile)}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: tile.backgroundColor || '#f4f4f5' },
        pressed && styles.pressed
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.label}>{tile.label}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    minHeight: 90,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }]
  },
  content: {
    alignItems: 'center'
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a'
  }
});
