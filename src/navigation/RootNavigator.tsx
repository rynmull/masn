import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AACScreen } from '../screens/AAC/AACScreen';
import { HomeScreen } from '../screens/Caregiver/HomeScreen';

export type RootStackParamList = {
  Home: undefined;
  AAC: { profileId: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Caregiver Home' }} />
        <Stack.Screen name="AAC" component={AACScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
