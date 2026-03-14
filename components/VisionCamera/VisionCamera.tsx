import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';

const AUTHORIZED = "authorized";

export default function VisionCamera() {
  const device = useCameraDevice('back');
  const [hasPermission, setHasPermission] = useState(false);
  

  useEffect(() => {
    const requestPermission = async () => {
      const status = await Camera.requestCameraPermission();
      if(!status || status != AUTHORIZED) return;
      setHasPermission(status === 'authorized');
    };

    requestPermission();
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>No Camera Permission</Text>
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
  },
});