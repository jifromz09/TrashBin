import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  Image,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageLabeling from '@react-native-ml-kit/image-labeling';
import styles from './styles';

export default function ImageLabelingComponent() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [labels, setLabels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImageAndLabel = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1,
    });

    if (result.didCancel || !result.assets?.[0]?.uri) {
      return;
    }

    const uri = result.assets[0].uri;
    setImageUri(uri);
    setLoading(true);
    setLabels([]);

    try {
      const detectedLabels = await ImageLabeling.imageLabeling(imageUri, {
        confidenceThreshold: 0.6,
    });
      setLabels(detectedLabels);
    } catch (error) {
      console.error('Image labeling failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Pick Image & Label" onPress={pickImageAndLabel} />

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.image} />
      )}

      {loading && <ActivityIndicator size="large" />}

      <FlatList
        data={labels}
        keyExtractor={(item) => item.index.toString()}
        renderItem={({ item }) => (
          <View style={styles.labelRow}>
            <Text style={styles.labelText}>{item.text}</Text>
            <Text style={styles.confidence}>
              {(item.confidence * 100).toFixed(1)}%
            </Text>
          </View>
        )}
      />
    </View>
  );
}
