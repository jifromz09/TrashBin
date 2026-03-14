import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Camera } from 'react-native-vision-camera';

export default function ImageLabelingComponent() {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'restricted' | 'not-determined'>('not-determined');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const status = await Camera.getCameraPermissionStatus();
      setPermission(status);
      if (status === 'not-determined') {
        const newStatus = await Camera.requestCameraPermission();
        setPermission(newStatus);
      }
      setLoading(false);
    })();
  }, []);

  const requestPermission = async () => {
    const newStatus = await Camera.requestCameraPermission();
    setPermission(newStatus);
  };

  if (loading) {
    return (
      <View style={styles.container}><Text style={styles.header}>Checking camera permission...</Text></View>
    );
  }

  if (permission !== 'granted') {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Camera Permission: {permission}</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}><Text style={styles.buttonText}>Request Camera Permission</Text></TouchableOpacity>
        <TouchableOpacity style={styles.buttonSecondary} onPress={() => Linking.openSettings()}><Text style={styles.buttonText}>Open App Settings</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Camera permission granted ✅</Text>
      <Text style={styles.text}>You can now use camera features in this tab.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', padding: 16 },
  header: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  text: { color: '#ccc', fontSize: 14, textAlign: 'center' },
  button: { backgroundColor: '#2196F3', borderRadius: 8, padding: 10, marginTop: 8 },
  buttonSecondary: { backgroundColor: '#555', borderRadius: 8, padding: 10, marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
