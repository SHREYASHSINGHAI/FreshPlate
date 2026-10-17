import { useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface UseImageCaptureResult {
  photoUri: string | null;
  isLoading: boolean;
  error: string | null;
  takePhoto: () => Promise<string | null>;
  pickFromGallery: () => Promise<string | null>;
  clearPhoto: () => void;
  hasCameraPermission: boolean | null;
  hasLibraryPermission: boolean | null;
}

/**
 * Custom React Native hook integrating native camera capture and photo library selection
 * via expo-image-picker and expo-camera permission APIs.
 */
export function useImageCapture(): UseImageCaptureResult {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasLibraryPermission, setHasLibraryPermission] = useState<boolean | null>(null);

  /**
   * Prompts user for camera permission if not already granted.
   */
  const ensureCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
      const granted = status === ImagePicker.PermissionStatus.GRANTED;
      setHasCameraPermission(granted);

      if (!granted) {
        if (!canAskAgain) {
          Alert.alert(
            'Camera Permission Required',
            'FreshPlate needs access to your camera to scan receipts and fridge items. Please enable it in system settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        } else {
          Alert.alert('Permission Denied', 'Camera access is required to take photos of receipts and pantries.');
        }
      }
      return granted;
    } catch (err: any) {
      console.error('[useImageCapture] Camera permission error:', err);
      setError('Failed to request camera permission.');
      return false;
    }
  }, []);

  /**
   * Prompts user for photo library permission if not already granted.
   */
  const ensureLibraryPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const granted = status === ImagePicker.PermissionStatus.GRANTED;
      setHasLibraryPermission(granted);

      if (!granted) {
        if (!canAskAgain) {
          Alert.alert(
            'Photo Library Permission Required',
            'FreshPlate needs access to your photo library to select receipt images. Please enable it in system settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
        } else {
          Alert.alert('Permission Denied', 'Photo library access is required to choose photos.');
        }
      }
      return granted;
    } catch (err: any) {
      console.error('[useImageCapture] Media library permission error:', err);
      setError('Failed to request photo library permission.');
      return false;
    }
  }, []);

  /**
   * Launches native camera to capture a fresh receipt or fridge photo.
   */
  const takePhoto = useCallback(async (): Promise<string | null> => {
    setError(null);
    const hasPermission = await ensureCameraPermission();
    if (!hasPermission) return null;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // Preserves full receipt aspect ratio
        quality: 0.85,        // Optimized balance of clarity & network transfer speed
        exif: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        return uri;
      }
      return null;
    } catch (err: any) {
      console.error('[useImageCapture] Launch camera error:', err);
      setError(err.message || 'Failed to capture photo with camera.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [ensureCameraPermission]);

  /**
   * Opens device photo gallery to select an existing receipt or fridge picture.
   */
  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    setError(null);
    const hasPermission = await ensureLibraryPermission();
    if (!hasPermission) return null;

    setIsLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        exif: false
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        return uri;
      }
      return null;
    } catch (err: any) {
      console.error('[useImageCapture] Launch library error:', err);
      setError(err.message || 'Failed to pick image from photo library.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [ensureLibraryPermission]);

  const clearPhoto = useCallback(() => {
    setPhotoUri(null);
    setError(null);
  }, []);

  return {
    photoUri,
    isLoading,
    error,
    takePhoto,
    pickFromGallery,
    clearPhoto,
    hasCameraPermission,
    hasLibraryPermission
  };
}
