import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Image,
  Button,
  Switch,
} from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { detectObjects, FrameProcessorConfig, DetectedObject } from 'vision-camera-realtime-object-detection';
import { launchImageLibrary, launchCamera, ImagePickerResponse, Asset } from 'react-native-image-picker';
import { getBluetoothService } from '../services/BluetoothService';

interface MeasurementData {
  sensitivity: number; // distance in cm
  accuracy: number; // 0-10 score
  totalDetections: number;
  correctDetections: number;
}

type ViewMode = 'camera' | 'image';
type PermissionState = 'granted' | 'denied' | 'restricted' | null;

export default function ImageLabelingComponent() {
  const [viewMode, setViewMode] = useState<ViewMode>('camera');
  const [hasPermission, setHasPermission] = useState<PermissionState>(null);
  const [classification, setClassification] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [measurements, setMeasurements] = useState<MeasurementData>({
    sensitivity: 0,
    accuracy: 0,
    totalDetections: 0,
    correctDetections: 0,
  });
  const [isActive, setIsActive] = useState(true);
  const [autoOpenEnabled, setAutoOpenEnabled] = useState(false);
  const [binStatus, setBinStatus] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera>(null);
  const frameCountRef = useRef(0);
  const classificationHistoryRef = useRef<boolean[]>([]); // For temporal smoothing
  const lastOpenTimeRef = useRef<number>(0);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const HISTORY_SIZE = 5; // Number of frames to average over
  const AUTO_OPEN_COOLDOWN = 20000; // 20 seconds cooldown between auto-opens
  const AUTO_CLOSE_DELAY = 15000; // 15 seconds before auto-close
  
  const bluetoothService = getBluetoothService();

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const status = await Camera.getCameraPermissionStatus();
      if (status === 'authorized') {
        setHasPermission('granted');
        return;
      }

      if (status === 'restricted') {
        setHasPermission('restricted');
        return;
      }

      const requestStatus = await Camera.requestCameraPermission();
      if (requestStatus === 'authorized') {
        setHasPermission('granted');
      } else if (requestStatus === 'restricted') {
        setHasPermission('restricted');
      } else {
        setHasPermission('denied');
      }
    })();
  }, []);

  // Function to open bin via Bluetooth
  const openBinAutomatically = async () => {
    const now = Date.now();
    
    // Check cooldown period
    if (now - lastOpenTimeRef.current < AUTO_OPEN_COOLDOWN) {
      console.log('Auto-open on cooldown');
      return;
    }

    // Check if Bluetooth is connected
    if (!bluetoothService.isConnected()) {
      console.log('Bluetooth not connected - cannot auto-open');
      return;
    }

    console.log('Auto-opening bin - plastic detected!');
    lastOpenTimeRef.current = now;
    setBinStatus('opening');

    await bluetoothService.openBin(
      () => {
        console.log('Bin opened successfully');
        setBinStatus('open');
        
        // Clear any existing timer
        if (autoCloseTimerRef.current) {
          clearTimeout(autoCloseTimerRef.current);
        }
        
        // Set timer to auto-close after 15 seconds
        autoCloseTimerRef.current = setTimeout(() => {
          closeBinAutomatically();
        }, AUTO_CLOSE_DELAY);
      },
      (error) => {
        console.error('Failed to open bin:', error);
        setBinStatus('closed');
      }
    );
  };

  // Function to close bin via Bluetooth
  const closeBinAutomatically = async () => {
    console.log('Auto-closing bin after 15 seconds');
    setBinStatus('closing');

    await bluetoothService.closeBin(
      () => {
        console.log('Bin closed successfully');
        setBinStatus('closed');
      },
      (error) => {
        console.error('Failed to close bin:', error);
        setBinStatus('closed');
      }
    );
  };

  // Process static image with waste detection model
  // Note: vision-camera-realtime-object-detection only works with camera frames
  // For static images, we switch to camera mode so the frame processor can work
  // Captured photos are automatically processed by the frame processor during capture
  const processStaticImage = async (imageUri: string) => {
    setProcessingImage(true);
    setClassification(null);

    try {
      // Get image dimensions for distance estimation
      const imageInfo = await new Promise<{ width: number; height: number }>((resolve) => {
        Image.getSize(imageUri, (width, height) => resolve({ width, height }), () => resolve({ width: 1000, height: 1000 }));
      });

      // Switch to camera mode to enable the waste detection model processing
      // The frame processor will automatically process camera frames
      setViewMode('camera');
      setIsActive(true);
      
      // For captured photos: The frame processor already processed them during capture
      // The classification will be available from the frame processor
      // For gallery images: User needs to point camera at the image to process it
      
      // Clear processing state - frame processor will handle updates
      setTimeout(() => {
        setProcessingImage(false);
        // Classification will be updated by the frame processor automatically
      }, 1500);
      
    } catch (error) {
      console.error('Image processing failed:', error);
      setClassification('Error processing image');
      setProcessingImage(false);
    }
  };

  // Browse gallery - process images with waste detection model
  const browseImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 1,
        includeBase64: false,
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel || !response.assets?.[0]?.uri) {
          return;
        }
        const uri = response.assets[0].uri;
        if (uri) {
          setSelectedImage(uri);
          // Process the image with waste detection model
          processStaticImage(uri);
        }
      }
    );
  };

  // Take photo with camera - automatically processed by waste detection model via frame processor
  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          qualityPrioritization: 'speed',
        });

        if (photo.path) {
          const photoUri = `file://${photo.path}`;
          setSelectedImage(photoUri);
          // Photo is already processed by frame processor during capture
          // Process it again to ensure we have the classification
          processStaticImage(photoUri);
        }
      } catch (error) {
        console.error('Photo capture failed:', error);
      }
    } else {
      // Fallback: use image picker camera
      launchCamera(
        {
          mediaType: 'photo',
          quality: 1,
          includeBase64: false,
        },
        (response: ImagePickerResponse) => {
          if (response.didCancel || !response.assets?.[0]?.uri) {
            return;
          }
          const uri = response.assets[0].uri;
          if (uri) {
            setSelectedImage(uri);
            processStaticImage(uri);
          }
        }
      );
    }
  };

  // Estimate distance based on object size in frame
  const estimateDistance = (
    detectedObject: DetectedObject,
    frameWidth: number,
    frameHeight: number
  ): number => {
    // Object size in pixels
    const objectWidthPx = detectedObject.width * frameWidth;
    const objectHeightPx = detectedObject.height * frameHeight;
    const objectSizePx = Math.max(objectWidthPx, objectHeightPx);
    
    // Assuming average object size (e.g., plastic bottle ~10cm)
    // Larger objects in frame = closer, smaller = farther
    const assumedRealSize = 10; // cm (average plastic bottle width)
    const focalLength = 3.5; // mm (typical phone camera)
    const sensorWidth = 4.8; // mm (typical phone sensor)
    
    // Distance estimation formula: distance = (realSize * focalLength * frameWidth) / (pixelSize * sensorWidth)
    const distance = (assumedRealSize * focalLength * frameWidth) / (objectSizePx * sensorWidth);
    
    // Clamp between 5-50cm
    return Math.max(5, Math.min(50, distance));
  };

  // More accurate accuracy calculation - weighted by confidence and detection quality
  const calculateAccuracy = (
    detectedObjects: DetectedObject[],
    plasticDetection: { confidence: number }
  ): number => {
    if (detectedObjects.length === 0) return 0;
    
    // Weight detections by their confidence and relevance
    let weightedSum = 0;
    let totalWeight = 0;
    
    detectedObjects.forEach(obj => {
      obj.labels.forEach((label: { confidence: number }) => {
        const confidence = label.confidence;
        // Higher confidence detections get more weight
        const weight = confidence * confidence; // Square for emphasis
        weightedSum += confidence * weight;
        totalWeight += weight;
      });
    });
    
    // If we have a strong plastic detection, boost accuracy
    const plasticBoost = plasticDetection.confidence > 0.7 ? 0.1 : 0;
    
    const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
    const finalScore = Math.min(1, weightedAvg + plasticBoost);
    
    // Convert 0-1 to 0-10 score
    return Math.round(finalScore * 10);
  };

  // Plastic class configuration - supports both class IDs and labels
  // Model types:
  // 1. Plastic-specific models (antipasti, waste classification): Use class IDs
  // 2. General YOLO models (COCO): Use class labels
  // 3. Custom trained models: Update based on your training data
  
  // For plastic-specific models (antipasti, waste classification):
  // Class IDs typically: 0=plastics, 1=glass, 2=paper, 3=metal, 4=cardboard, 5=rubbish
  // Update these based on your specific model's class definitions
  const PLASTIC_CLASS_IDS = new Set<number>([
    0,  // plastics (antipasti model)
    // Add more IDs if your model uses different numbering
  ]);

  // For general YOLO models (COCO dataset) and label-based detection
  // Waste Detection YOLOv8 model classes: Cardboard, E-waste, Glass, Medical waste, 
  // Metal, Organic waste, Paper, Plastic
  const PLASTIC_CLASS_LABELS = new Set<string>([
    'plastic',       // Waste Detection YOLOv8 model (HrutikAdsare/waste-detection-yolov8)
    'plastics',      // antiplasti model, alternative spelling
    'bottle',        // COCO dataset (class 39) - often plastic
    'cup',           // COCO dataset (class 41) - often plastic
    'container',     // common waste classification
    'bag',          // common waste classification
    'plastic bottle', // explicit plastic items
    'plastic bag',   // explicit plastic items
    'plastic container', // explicit plastic items
  ]);

  // Enhanced plastic detection optimized for plastic-specific models
  // Prioritizes class ID detection (most reliable for plastic-specific models)
  const detectPlastic = (detectedObjects: DetectedObject[]): {
    isPlastic: boolean;
    confidence: number;
    bestMatch: { label: string; confidence: number } | null;
  } => {
    if (detectedObjects.length === 0) {
      return { isPlastic: false, confidence: 0, bestMatch: null };
    }

    let maxPlasticConfidence = 0;
    let bestPlasticMatch: { label: string; confidence: number } | null = null;
    let totalConfidence = 0;
    let plasticCount = 0;
    let hasExplicitPlasticClass = false; // Track if we found explicit "plastics" class

    // Analyze all detections
    detectedObjects.forEach(obj => {
      obj.labels.forEach((label: { label: string; confidence: number; classId?: number }) => {
        const labelText = label.label?.toLowerCase().trim() || '';
        const classId = label.classId;
        const confidence = label.confidence;

        // Priority 1: Check by class ID (most reliable for plastic-specific models)
        const isPlasticById = classId !== undefined && PLASTIC_CLASS_IDS.has(classId);
        
        // Priority 2: Check for explicit "plastics" or "plastic" labels (plastic-specific models)
        const isExplicitPlastic = labelText === 'plastics' || labelText === 'plastic';
        
        // Priority 3: Check by other label names (general YOLO models)
        const isPlasticByLabel = PLASTIC_CLASS_LABELS.has(labelText);

        if (isPlasticById || isExplicitPlastic || isPlasticByLabel) {
          plasticCount++;
          totalConfidence += confidence;
          
          // Explicit plastic classes get higher priority
          if (isPlasticById || isExplicitPlastic) {
            hasExplicitPlasticClass = true;
            // Boost confidence for explicit plastic detections
            const boostedConfidence = Math.min(1.0, confidence * 1.1);
            if (boostedConfidence > maxPlasticConfidence) {
              maxPlasticConfidence = boostedConfidence;
              bestPlasticMatch = { label: labelText, confidence: boostedConfidence };
            }
          } else if (confidence > maxPlasticConfidence) {
            maxPlasticConfidence = confidence;
            bestPlasticMatch = { label: labelText, confidence };
          }
        }
      });
    });

    // Weighted decision: consider both count and confidence
    const avgPlasticConfidence = plasticCount > 0 ? totalConfidence / plasticCount : 0;
    
    // Adaptive thresholds based on detection type
    // Lower threshold for explicit plastic classes (more reliable)
    // Higher threshold for general object classes (bottles, cups - could be glass/metal)
    let confidenceThreshold: number;
    if (hasExplicitPlasticClass) {
      // Explicit plastic detection - more reliable, lower threshold
      confidenceThreshold = plasticCount > 1 ? 0.3 : 0.5;
    } else {
      // General object detection - less reliable, higher threshold
      confidenceThreshold = plasticCount > 1 ? 0.5 : 0.7;
    }
    
    // Consider it plastic if:
    // 1. At least one high-confidence detection (explicit or general), OR
    // 2. Multiple detections with decent average confidence
    const isPlastic = maxPlasticConfidence >= confidenceThreshold || 
                      (plasticCount >= 2 && avgPlasticConfidence >= 0.5);

    return {
      isPlastic,
      confidence: maxPlasticConfidence,
      bestMatch: bestPlasticMatch,
    };
  };

  // Temporal smoothing: average classification over multiple frames
  const getSmoothedClassification = (isPlastic: boolean): boolean => {
    classificationHistoryRef.current.push(isPlastic);
    
    // Keep only recent history
    if (classificationHistoryRef.current.length > HISTORY_SIZE) {
      classificationHistoryRef.current.shift();
    }

    // Count plastic detections in history
    const plasticCount = classificationHistoryRef.current.filter(v => v).length;
    const threshold = Math.ceil(HISTORY_SIZE * 0.6); // 60% threshold

    return plasticCount >= threshold;
  };

  // Update classification and measurements on JS thread
  const updateClassification = (newClassification: string, isPlastic: boolean) => {
    setClassification(newClassification);
    
    // Trigger auto-open if enabled, plastic detected, and bin is closed
    // Works for both live camera and static images
    if (autoOpenEnabled && isPlastic && binStatus === 'closed') {
      openBinAutomatically();
    }
  };

  const updateMeasurements = (newMeasurements: MeasurementData) => {
    setMeasurements(newMeasurements);
  };

  // Frame processor configuration - optimized for accuracy
  // 
  // MODEL CONFIGURATION:
  // - 'yolov8n.tflite' (current): General COCO model - detects objects (bottles, cups)
  // - 'waste_detection.tflite' (recommended): Waste Detection YOLOv8 - detects plastic and 7 other waste types
  //   Source: https://huggingface.co/HrutikAdsare/waste-detection-yolov8
  //   Classes: Cardboard, E-waste, Glass, Medical waste, Metal, Organic waste, Paper, Plastic
  // 
  // To use the waste detection model:
  // 1. Run: python3 download_waste_model.py
  // 2. Change modelFile below to 'waste_detection.tflite'
  // 3. Run: npx react-native-asset && npm run android
  //
  const frameProcessorConfig: FrameProcessorConfig = {
    modelFile: 'waste_detection.tflite', // Waste Detection YOLOv8 model - detects Plastic and 7 other waste types
    scoreThreshold: 0.4, // Lower threshold to catch more detections, we filter in code
    maxResults: 10, // More results for better accuracy
  };

  // Frame processor for real-time detection
  const frameProcessor = useFrameProcessor((frame: any) => {
    'worklet';
    
    try {
      const detectedObjects: DetectedObject[] = detectObjects(frame, frameProcessorConfig);
      
      // Debug: Log detection count occasionally (simple logging without runOnJS)
      frameCountRef.current += 1;
      
      if (detectedObjects.length > 0) {
        // More accurate plastic detection
        const plasticDetection = detectPlastic(detectedObjects);
        
        // Apply temporal smoothing for more stable classification
        const smoothedIsPlastic = getSmoothedClassification(plasticDetection.isPlastic);
        
        // Calculate sensitivity (distance) - use the most confident detection
        const distances = detectedObjects.map(obj => 
          estimateDistance(obj, frame.width, frame.height)
        );
        
        // Weight distance by detection confidence
        let weightedDistanceSum = 0;
        let totalWeight = 0;
        detectedObjects.forEach((obj, idx) => {
          const maxConfidence = Math.max(...obj.labels.map((l: { confidence: number }) => l.confidence));
          const weight = maxConfidence;
          weightedDistanceSum += distances[idx] * weight;
          totalWeight += weight;
        });
        const avgDistance = totalWeight > 0 ? weightedDistanceSum / totalWeight : distances[0] || 0;
        
        // Calculate accuracy with plastic detection context
        const accuracyScore = calculateAccuracy(detectedObjects, plasticDetection);
        
        const classificationText = smoothedIsPlastic ? 'Plastic' : 'Non-plastic';
        
        // Update every 5 frames for more responsive but still smooth updates
        if (frameCountRef.current % 5 === 0) {
          // Update state directly - worklets-core handles the JS thread bridging
          updateClassification(classificationText, smoothedIsPlastic);
          
          updateMeasurements({
            sensitivity: Math.round(avgDistance),
            accuracy: accuracyScore,
            totalDetections: measurements.totalDetections + detectedObjects.length,
            correctDetections: measurements.correctDetections + (smoothedIsPlastic ? 1 : 0),
          });
        }
      }
    } catch (error) {
      console.error('Frame processing error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }, [measurements, autoOpenEnabled, binStatus]);

  // Get sensitivity rating (1-4)
  const getSensitivityRating = (distance: number): number => {
    if (distance >= 15) return 4;
    if (distance >= 11) return 3;
    if (distance >= 5) return 2;
    return 1;
  };

  // Get accuracy rating (1-4)
  const getAccuracyRating = (score: number): number => {
    if (score >= 9) return 4;
    if (score >= 7) return 3;
    if (score >= 4) return 2;
    return 1;
  };

  const getSensitivityLabel = (rating: number): string => {
    switch (rating) {
      case 4: return 'Very Sensitive, Very Effective';
      case 3: return 'Sensitive, Effective';
      case 2: return 'Insensitive, Ineffective';
      case 1: return 'Very Insensitive, Highly Ineffective';
      default: return '';
    }
  };

  const getAccuracyLabel = (rating: number): string => {
    switch (rating) {
      case 4: return 'Excellent Accuracy, Highly Effective';
      case 3: return 'Good Accuracy, Effective';
      case 2: return 'Poor Accuracy, Ineffective';
      case 1: return 'Very Poor Accuracy, Highly Ineffective';
      default: return '';
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === 'restricted') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera access is restricted</Text>
        <Text style={styles.errorSubtext}>
          Your device policy or profile is blocking camera usage. Please remove the restriction in system settings and restart the app.
        </Text>
      </View>
    );
  }

  if (hasPermission === 'denied') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorSubtext}>
          Please enable camera permission in your device settings
        </Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device available</Text>
      </View>
    );
  }

  const sensitivityRating = measurements.sensitivity > 0 
    ? getSensitivityRating(measurements.sensitivity) 
    : 0;
  const accuracyRating = measurements.accuracy > 0 
    ? getAccuracyRating(measurements.accuracy) 
    : 0;
  const overallAccuracy = measurements.totalDetections > 0 
    ? Math.round((measurements.correctDetections / measurements.totalDetections) * 10)
    : 0;

  return (
    <View style={styles.container}>
      {/* Mode Toggle Buttons */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity
          style={[styles.modeButton, viewMode === 'camera' && styles.modeButtonActive]}
          onPress={() => {
            setViewMode('camera');
            setIsActive(true);
            setSelectedImage(null);
          }}
        >
          <Text style={[styles.modeButtonText, viewMode === 'camera' && styles.modeButtonTextActive]}>
            Camera
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, viewMode === 'image' && styles.modeButtonActive]}
          onPress={() => {
            setViewMode('image');
            setIsActive(false);
            // If there's a selected image, process it when switching to image mode
            if (selectedImage) {
              // Keep camera active briefly to process, then switch
              setTimeout(() => {
                setIsActive(false);
              }, 2000);
            }
          }}
        >
          <Text style={[styles.modeButtonText, viewMode === 'image' && styles.modeButtonTextActive]}>
            Image
          </Text>
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      {viewMode === 'camera' && (
        <>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={isActive}
            frameProcessor={frameProcessor}
            frameProcessorFps={5}
            photo={true}
          />
          
          {/* Camera Controls */}
          <View style={styles.cameraControlsContainer}>
            <TouchableOpacity style={styles.controlButton} onPress={browseImage}>
              <Text style={styles.controlButtonText}>📷 Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <View style={styles.controlButtonPlaceholder} />
          </View>
        </>
      )}

      {/* Static Image View */}
      {viewMode === 'image' && (
        <>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.staticImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>No image selected</Text>
            </View>
          )}
          
          {/* Image Controls */}
          <View style={styles.imageControlsContainer}>
            <TouchableOpacity style={styles.imageControlButton} onPress={browseImage}>
              <Text style={styles.imageControlButtonText}>📁 Browse Gallery</Text>
            </TouchableOpacity>
            {hasPermission && (
              <TouchableOpacity style={styles.imageControlButton} onPress={takePhoto}>
                <Text style={styles.imageControlButtonText}>📷 Take Photo</Text>
              </TouchableOpacity>
            )}
            {/* Instruction for processing gallery images */}
            {selectedImage && viewMode === 'image' && (
              <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                  💡 Switch to Camera mode to process this image with the waste detection model
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Processing Indicator */}
      {processingImage && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Processing image...</Text>
        </View>
      )}
      
      {/* Classification Display */}
      {classification && (
        <View style={styles.classificationContainer}>
          <Text style={styles.classificationText}>{classification}</Text>
        </View>
      )}
      
      {/* Auto-Open Control */}
      <View style={styles.autoOpenContainer}>
        <View style={styles.autoOpenHeader}>
          <Text style={styles.autoOpenTitle}>🤖 Auto-Open Bin</Text>
          <Switch
            value={autoOpenEnabled}
            onValueChange={setAutoOpenEnabled}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={autoOpenEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        {autoOpenEnabled && (
          <View style={styles.autoOpenInfo}>
            <Text style={styles.autoOpenInfoText}>
              {bluetoothService.isConnected() 
                ? '✅ Connected - Will open when plastic detected' 
                : '⚠️ Connect to Smart Bin in Bluetooth tab first'}
            </Text>
            <Text style={styles.binStatusText}>
              Bin Status: {binStatus === 'closed' && '🔒 Closed'}
                         {binStatus === 'opening' && '⏫ Opening...'}
                         {binStatus === 'open' && '📂 Open'}
                         {binStatus === 'closing' && '⏬ Closing...'}
            </Text>
          </View>
        )}
      </View>
      
      {/* Measurement Display */}
      <View style={styles.measurementContainer}>
        <Text style={styles.measurementTitle}>Performance Metrics</Text>
        
        {measurements.sensitivity > 0 && (
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Sensitivity:</Text>
            <Text style={styles.metricValue}>
              {measurements.sensitivity} cm (Rating: {sensitivityRating})
            </Text>
          </View>
        )}
        
        {measurements.totalDetections > 0 && (
          <>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Accuracy:</Text>
              <Text style={styles.metricValue}>
                {overallAccuracy}/10 (Rating: {accuracyRating})
              </Text>
            </View>
            
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Detections:</Text>
              <Text style={styles.metricValue}>
                {measurements.correctDetections}/{measurements.totalDetections}
              </Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  classificationContainer: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
  },
  classificationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  autoOpenContainer: {
    position: 'absolute',
    top: 120,
    left: 10,
    right: 10,
    padding: 15,
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    borderRadius: 8,
    zIndex: 5,
  },
  autoOpenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoOpenTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  autoOpenInfo: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  autoOpenInfoText: {
    fontSize: 13,
    color: 'white',
    marginBottom: 5,
  },
  binStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  measurementContainer: {
    position: 'absolute',
    bottom: 50,
    left: 10,
    right: 10,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
  },
  measurementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  metricLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    marginTop: 50,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cameraControlsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  controlButtonPlaceholder: {
    width: 60,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  staticImage: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  placeholderText: {
    color: '#666',
    fontSize: 16,
  },
  imageControlsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  imageControlButton: {
    backgroundColor: 'rgba(0,122,255,0.8)',
    padding: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  imageControlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  instructionContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(0,122,255,0.2)',
    borderRadius: 8,
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
});
