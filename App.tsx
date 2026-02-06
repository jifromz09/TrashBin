/**
 * TrashBin App - Image Labeling with ML Kit
 *
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ImageLabelingComponent from './components/ImageLabeling';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ImageLabelingComponent />
    </SafeAreaProvider>
  );
}

export default App;
