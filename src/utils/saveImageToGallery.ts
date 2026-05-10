import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

// Download remote image (if needed) and return a local file URI.
const getLocalImageUri = async (uri: string) => {
  try {
    if (!uri.startsWith('http')) {
      return uri; // already a local file
    }

    const cleanName = uri.split('?')[0].split('/').pop() || 'photo.jpg';
    const safeName = cleanName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const hasImageExtension = /\.(jpg|jpeg|png|heic|webp)$/i.test(safeName);
    const filename = hasImageExtension ? safeName : `${safeName}.jpg`;
    const fileUri = `${FileSystem.documentDirectory}dl_${Date.now()}_${filename}`;
    
    console.log('Downloading image to:', fileUri);
    
    // Instead of FileSystem.downloadAsync (which fails in ESign due to background task entitlement issues),
    // we use a standard foreground fetch and write the file manually.
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64data = reader.result as string;
          const base64 = base64data.split(',')[1]; // remove the data:image/...;base64, prefix
          
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log('Successfully wrote file to', fileUri);
          resolve(fileUri);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image blob'));
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    console.error('Download failed:', error);
    Alert.alert('Prep Error', `Failed to download: ${error.message}`);
    return null;
  }
};

export const saveImageToGallery = async (uri: string) => {
  try {
    console.log('Requesting permissions...');
    const { status, granted } = await MediaLibrary.requestPermissionsAsync(true);
    
    if (status !== 'granted' && !granted) {
      Alert.alert('Permission Denied', `Status: ${status}. Please enable photo access in Settings.`);
      return false;
    }

    console.log('Getting local URI for:', uri);
    const localUri = await getLocalImageUri(uri);
    if (!localUri) return false;

    console.log('Attempting to save asset:', localUri);
    
    // Attempt 1: Direct save (Most compatible for signed IPAs)
    try {
      await MediaLibrary.saveToLibraryAsync(localUri);
      return true;
    } catch (saveError: any) {
      console.log('Direct save failed, trying Album method:', saveError.message);
      
      // Attempt 2: Asset + Album method
      const asset = await MediaLibrary.createAssetAsync(localUri);
      await MediaLibrary.createAlbumAsync('ClientTracking', asset, false);
      return true;
    }
  } catch (error: any) {
    console.error('Final Save Error:', error);
    Alert.alert('System Error', `iOS Error: ${error.message || 'Unknown'}`);
    return false;
  }
};
