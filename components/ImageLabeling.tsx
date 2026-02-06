import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  Image,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageLabeling from '@react-native-ml-kit/image-labeling';
import styles from './styles';

export default function ImageLabelingComponent() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [classification, setClassification] = useState<string | null>(null);
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
    setClassification(null);

    try {
      const detectedLabels = await ImageLabeling.label(uri);
      // 
      const filteredLabels = detectedLabels.filter(
        (label) => label.confidence >= 0.6
      );
      
      // Check if any label contains plastic-related keywords
      const plasticKeywords = [
        'plastic', 'bottle', 'container', 'bag', 'package',
        'wrapper', 'cup', 'straw', 'utensil', 'recyclable',
        'polyethylene', 'pet', 'pvc', 'polystyrene'
      ];
      
      const isPlastic = filteredLabels.some((label) => {
        const labelText = label.text.toLowerCase();
        return plasticKeywords.some(keyword => labelText.includes(keyword));
      });
      
      setClassification(isPlastic ? 'Plastic' : 'Non-plastic');
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

      {classification && (
        <View style={styles.classificationContainer}>
          <Text style={styles.classificationText}>{classification}</Text>
        </View>
      )}
    </View>
  );
}
