import 'regenerator-runtime/runtime';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import GameEngine from './game/systems/GameEngine.tsx';

export default function App() {
  return (
    <>
      <StatusBar hidden />
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#08070c' }}>
          <GameEngine />
        </SafeAreaView>
      </SafeAreaProvider>
    </>
  );
}
