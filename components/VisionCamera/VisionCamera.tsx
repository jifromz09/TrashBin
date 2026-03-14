 import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

type PermissionState = 'granted' | 'denied' | 'restricted' | null;

export default function VisionCamera() {
  const [permission, setPermission] = useState<PermissionState>(null);
  const device = useCameraDevice('back');

  const requestPermission = async () => {
    const status = await Camera.requestCameraPermission();
    if (status === 'granted') {
      setPermission('granted');
    } else {
      setPermission('denied');
    }
  };

  useEffect(() => {
    (async () => {
      const status = await Camera.getCameraPermissionStatus();
      if (status === 'granted') {
        setPermission('granted');
        return;
      }
      if (status === 'restricted') {
        setPermission('restricted');
        return;
      }
      await requestPermission();
    })();
  }, []);

  if (permission === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.text}>Checking camera permission...</Text>
      </View>
    );
  }

  if (permission === 'restricted') {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Camera access is restricted by your device settings or policy.</Text>
        <Text style={styles.subtext}>Please enable camera in system settings or remove any managed profile restrictions.</Text>
      </View>
    );
  }

  if (permission === 'denied') {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Camera permission denied.</Text>
        <Text style={styles.subtext}>Enable camera permission in settings and restart the app.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Request Permission Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonSecondary} onPress={() => Linking.openSettings()}>
          <Text style={styles.buttonText}>Open App Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>No camera device available.</Text>
        <Text style={styles.subtext}>This can happen on some devices or if camera is disabled.</Text>
      </View>
    );
  }

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    marginTop: 8,
  },
  error: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    color: '#ddd',
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    marginTop: 14,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonSecondary: {
    marginTop: 10,
    backgroundColor: '#555',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});