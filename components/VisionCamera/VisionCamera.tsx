 import { StyleSheet } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';

export default function VisionCamera() {
  const devices = useCameraDevices('wide-angle-camera');
  const device = devices.back;

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={true}
    />
  );
}