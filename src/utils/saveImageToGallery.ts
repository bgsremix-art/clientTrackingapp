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
  } catch (error) {
    console.error('Download failed:', error);
    return null;
  }
};

export const saveImageToGallery = async (uri: string) => {
  try {
    // Request permission (writeOnly: true is safer for iOS)
    const { status, granted, canAskAgain } = await MediaLibrary.requestPermissionsAsync(true);
    
    if (status !== 'granted' && !granted) {
      Alert.alert('Permission Denied', 'Please enable photo library access in your iPhone settings.');
      return false;
    }

    const localUri = await getLocalImageUri(uri);
    if (!localUri) {
      Alert.alert('Error', 'Failed to prepare the image for saving.');
      return false;
    }

    // Attempt 1: Create Asset and Album (Best for organization)
    try {
      const asset = await MediaLibrary.createAssetAsync(localUri);
      await MediaLibrary.createAlbumAsync('ClientTracking', asset, false);
      return true;
    } catch (albumError) {
      console.log('Album creation failed, trying direct save:', albumError);
      
      // Attempt 2: Direct save to library (Fallback)
      await MediaLibrary.saveToLibraryAsync(localUri);
      return true;
    }
  } catch (error: any) {
    console.error('Save to gallery error:', error);
    Alert.alert('Save Error', error.message || 'An unknown error occurred while saving.');
    return false;
  }
};
