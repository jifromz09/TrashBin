import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import { Camera, useCameraDevice, CameraPermissionStatus } from 'react-native-vision-camera';

export default function VisionCamera() {
  const device = useCameraDevice('back');
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>('not-determined');

  const requestCameraPermissions = async () => {
    const status = await Camera.requestCameraPermission();
    setPermissionStatus(status);
  };

  useEffect(() => {
    (async () => {
      const status = await Camera.getCameraPermissionStatus();
      setPermissionStatus(status);
      if (status === 'not-determined') {
        const requestStatus = await Camera.requestCameraPermission();
        setPermissionStatus(requestStatus);
      }
    })();
  }, []);

  if (permissionStatus !== 'granted') {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission not granted: {permissionStatus}</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermissions}>
          <Text style={styles.buttonText}>Request Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonSecondary} onPress={() => Linking.openSettings()}>
          <Text style={styles.buttonText}>Open App Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.center}>
        <Text>Loading Camera...</Text>
      </View>
    );
  }

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
      photo={true}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  buttonSecondary: {
    marginTop: 8,
    backgroundColor: '#555',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});