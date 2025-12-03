import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Board, Tile } from '../types/models';
import { TileButton } from './Tile';

interface Props {
  board: Board;
  onTilePress: (tile: Tile) => void;
}

export const BoardGrid: React.FC<Props> = ({ board, onTilePress }) => {
  const rows = useMemo(() => {
    const sortedTiles = [...board.tiles].sort((a, b) => {
      if (a.position.row === b.position.row) {
        return a.position.col - b.position.col;
      }
      return a.position.row - b.position.row;
    });

    const arranged: Tile[][] = Array.from({ length: board.gridConfig.rows }, () => []);
    sortedTiles.forEach((tile) => {
      if (arranged[tile.position.row]) {
        arranged[tile.position.row][tile.position.col] = tile;
      }
    });
    return arranged;
  }, [board]);

  return (
    <View style={styles.container}>
      {rows.map((rowTiles, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {rowTiles.map((tile, colIndex) => (
            <TileButton key={tile?.id || `${rowIndex}-${colIndex}`} tile={tile} onPress={onTilePress} />
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%'
  },
  row: {
    flexDirection: 'row',
    flex: 1
  }
});
