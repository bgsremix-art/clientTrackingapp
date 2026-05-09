import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

// Download remote image (if needed) and return a local file URI.
const getLocalImageUri = async (uri: string) => {
  try {
    if (!uri.startsWith('http')) {
      return uri; // already a local file
    }

    const cleanName = uri.split('?')[0].split('/').pop() || `client-photo-${Date.now()}.jpg`;
    const hasImageExtension = /\.(jpg|jpeg|png|heic|webp)$/i.test(cleanName);
    const filename = hasImageExtension ? cleanName : `${cleanName}.jpg`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    
    console.log('Downloading image to:', fileUri);
    const downloadResult = await FileSystem.downloadAsync(uri, fileUri);
    return downloadResult.uri;
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
