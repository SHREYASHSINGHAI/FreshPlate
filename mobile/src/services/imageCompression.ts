import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';
import { CompressionResult } from '../types';

export const MAX_IMAGE_DIMENSION = 1080; // 1080px maximum width/height ceiling
export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024; // 2MB hard ceiling
export const TARGET_UPLOAD_SIZE_BYTES = 1.8 * 1024 * 1024; // 1.8MB target safety margin

export interface CompressionOptions {
  targetMaxSizeBytes?: number;
  maxDimension?: number;
  initialMaxWidth?: number;
  initialQuality?: number;
}

/**
 * Formats byte counts into human-readable strings (e.g. "1.42 MB", "820 KB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Retrieves the local file size in bytes using expo-file-system.
 */
export async function getLocalFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === 'number') {
      return info.size;
    }
    return 0;
  } catch (error) {
    console.warn('[ImageCompression] Unable to determine file size for URI:', uri, error);
    return 0;
  }
}

/**
 * Safely queries native image dimensions, returning null if inaccessible (e.g. headless tests).
 */
export function getImageDimensions(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    try {
      if (!Image || typeof Image.getSize !== 'function') {
        return resolve(null);
      }
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve(null)
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Performs progressive client-side image compression using expo-image-manipulator.
 * Scales images to a maximum width/height of 1080px while ensuring the resulting
 * file size remains strictly under 2MB for upload to the backend vision proxy.
 *
 * @param photoUri Original file URI from camera or gallery
 * @param options Target size constraints & initial quality settings
 */
export async function compressImageForUpload(
  photoUri: string,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    targetMaxSizeBytes = TARGET_UPLOAD_SIZE_BYTES,
    maxDimension = MAX_IMAGE_DIMENSION,
    initialQuality = 0.82
  } = options;

  const boundLimit = options.initialMaxWidth ? Math.min(options.initialMaxWidth, maxDimension) : maxDimension;
  const originalSizeBytes = await getLocalFileSize(photoUri);
  const dimensions = await getImageDimensions(photoUri);

  // Determine scaling axis to guarantee neither width nor height exceeds maxDimension (1080px)
  let resizeAction: { width?: number; height?: number } | null = null;
  if (dimensions && dimensions.width > 0 && dimensions.height > 0) {
    if (dimensions.height > dimensions.width && dimensions.height > boundLimit) {
      // Portrait: scale height to boundLimit (1080px max)
      resizeAction = { height: boundLimit };
    } else if (dimensions.width > boundLimit) {
      // Landscape or square: scale width to boundLimit (1080px max)
      resizeAction = { width: boundLimit };
    }
  } else {
    // If dimensions cannot be determined, default to capping width at boundLimit (1080px)
    resizeAction = { width: boundLimit };
  }

  const actions: ImageManipulator.Action[] = resizeAction ? [{ resize: resizeAction }] : [];

  // Pass 1: Standard high-fidelity scaling to max 1080px (82% quality)
  let result = await ImageManipulator.manipulateAsync(
    photoUri,
    actions,
    {
      compress: initialQuality,
      format: ImageManipulator.SaveFormat.JPEG
    }
  );

  let currentSizeBytes = await getLocalFileSize(result.uri);

  // Pass 2: Secondary compression if still exceeding target safety margin
  if (currentSizeBytes > targetMaxSizeBytes) {
    const secondaryLimit = Math.round(boundLimit * 0.85); // e.g. 918px
    const secondaryResize = (resizeAction && resizeAction.height) ? { height: secondaryLimit } : { width: secondaryLimit };
    result = await ImageManipulator.manipulateAsync(
      result.uri,
      [{ resize: secondaryResize }],
      {
        compress: 0.70,
        format: ImageManipulator.SaveFormat.JPEG
      }
    );

    currentSizeBytes = await getLocalFileSize(result.uri);
  }

  // Pass 3: Maximum emergency compression if still over 2MB ceiling
  if (currentSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    const emergencyLimit = Math.round(boundLimit * 0.70); // e.g. 756px
    const emergencyResize = (resizeAction && resizeAction.height) ? { height: emergencyLimit } : { width: emergencyLimit };
    result = await ImageManipulator.manipulateAsync(
      result.uri,
      [{ resize: emergencyResize }],
      {
        compress: 0.55,
        format: ImageManipulator.SaveFormat.JPEG
      }
    );

    currentSizeBytes = await getLocalFileSize(result.uri);
  }

  const compressionRatio = originalSizeBytes > 0
    ? Math.max(0, Math.round(((originalSizeBytes - currentSizeBytes) / originalSizeBytes) * 100))
    : 0;

  return {
    uri: result.uri,
    sizeBytes: currentSizeBytes,
    originalSizeBytes,
    compressionRatio,
    width: result.width,
    height: result.height
  };
}
