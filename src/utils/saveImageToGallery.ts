import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

// Download remote image (if needed) and return a local file URI.
const getLocalImageUri = async (uri: string) => {
  if (!uri.startsWith('http')) {
    return uri; // already a local file
  }

  const cleanName = uri.split('?')[0].split('/').pop() || `client-photo-${Date.now()}.jpg`;
  const hasImageExtension = /\.(jpg|jpeg|png|heic|webp)$/i.test(cleanName);
  const filename = hasImageExtension ? cleanName : `${cleanName}.jpg`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  const downloadResult = await FileSystem.downloadAsync(uri, fileUri);
  return downloadResult.uri;
};

export const saveImageToGallery = async (uri: string) => {
  // Request permission to add photos to the user's library (iOS add‑only, Android normal).
  const { status } = await MediaLibrary.requestPermissionsAsync(true);
  
  if (status !== 'granted') {
    // Permission denied – caller can show an error message.
    return false;
  }

  // Ensure the image is stored locally before saving.
  const localUri = await getLocalImageUri(uri);

  // Unified approach that works on both iOS and Android:
  const asset = await MediaLibrary.createAssetAsync(localUri);
  await MediaLibrary.createAlbumAsync('ClientTracking', asset, false);
  return true;
};
