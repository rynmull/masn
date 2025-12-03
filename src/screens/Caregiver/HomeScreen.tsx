import React from 'react';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { DEMO_CORE_BOARD, DEMO_PROFILE, DEMO_PROFILE_ID } from '../../data/demoCoreBoard';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAACStore } from '../../store/aacStore';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setProfile, setActiveBoard, clearMessage } = useAACStore();

  const handleProfilePress = () => {
    setProfile(DEMO_PROFILE);
    setActiveBoard(DEMO_CORE_BOARD);
    clearMessage();
    navigation.navigate('AAC', { profileId: DEMO_PROFILE_ID });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Masn – Profiles</Text>
        <Text style={styles.subtitle}>Choose a profile to start communicating.</Text>
      </View>
      <FlatList
        data={[DEMO_PROFILE]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={handleProfilePress}>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.displayName}</Text>
              <Text style={styles.cardMeta}>{item.ageRange === 'school_age' ? 'School age' : 'AAC User'}</Text>
              <Text style={styles.cardMeta}>Primary language: {item.primaryLanguage.toUpperCase()}</Text>
              <Text style={styles.cardLink}>Open AAC</Text>
            </View>
          </Pressable>
        )}
      />
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
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0'
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a'
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#475569'
  },
  listContent: {
    padding: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  cardBody: {
    gap: 6
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  cardMeta: {
    fontSize: 14,
    color: '#475569'
  },
  cardLink: {
    marginTop: 8,
    color: '#2563eb',
    fontWeight: '700'
  }
});
