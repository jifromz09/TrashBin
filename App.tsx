/**
 * TrashBin App - Image Labeling with ML Kit & Bluetooth Control
 *
 * @format
 */

import React, { useState } from 'react';
import { StatusBar, useColorScheme, View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ImageLabelingComponent from './components/ImageLabeling';
import BluetoothScreen from './components/BluetoothScreen';
import {Camera} from 'react-native-vision-camera';

const permission = await Camera.requestCameraPermission();

type TabType = 'camera' | 'bluetooth';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState<TabType>('camera');
  

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      
      {/* Tab Content */}
      {activeTab === 'camera' ? <ImageLabelingComponent /> : <BluetoothScreen />}
      
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'camera' && styles.tabActive]}
          onPress={() => setActiveTab('camera')}
        >
          <Text style={[styles.tabIcon, activeTab === 'camera' && styles.tabIconActive]}>📷</Text>
          <Text style={[styles.tabText, activeTab === 'camera' && styles.tabTextActive]}>Camera</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bluetooth' && styles.tabActive]}
          onPress={() => setActiveTab('bluetooth')}
        >
          <Text style={[styles.tabIcon, activeTab === 'bluetooth' && styles.tabIconActive]}>🔵</Text>
          <Text style={[styles.tabText, activeTab === 'bluetooth' && styles.tabTextActive]}>Bluetooth</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingBottom: 15,
  },
  tabActive: {
    backgroundColor: '#f0f8ff',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabText: {
    fontSize: 12,
    color: '#666',
  },
  tabTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
});

export default App;
