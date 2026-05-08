import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

const getLocalImageUri = async (uri: string) => {
  if (!uri.startsWith('http')) {
    return uri;
  }

  const cleanName = uri.split('?')[0].split('/').pop() || `client-photo-${Date.now()}.jpg`;
  const hasImageExtension = /\.(jpg|jpeg|png|heic|webp)$/i.test(cleanName);
  const filename = hasImageExtension ? cleanName : `${cleanName}.jpg`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  const downloadResult = await FileSystem.downloadAsync(uri, fileUri);

  return downloadResult.uri;
};

export const saveImageToGallery = async (uri: string) => {
  const { status } = await MediaLibrary.requestPermissionsAsync(true);

  if (status !== 'granted') {
    return false;
  }

  const localUri = await getLocalImageUri(uri);

  if (Platform.OS === 'ios') {
    await MediaLibrary.saveToLibraryAsync(localUri);
    return true;
  }

  const asset = await MediaLibrary.createAssetAsync(localUri);
  await MediaLibrary.createAlbumAsync('ClientTracking', asset, false);

  return true;
};
