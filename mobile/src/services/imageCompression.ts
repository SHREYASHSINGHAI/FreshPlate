import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { CompressionResult } from '../types';

export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024; // 2MB hard ceiling
export const TARGET_UPLOAD_SIZE_BYTES = 1.8 * 1024 * 1024; // 1.8MB target safety margin

export interface CompressionOptions {
  targetMaxSizeBytes?: number;
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
 * Performs progressive client-side image compression using expo-image-manipulator
 * to ensure camera/gallery photos remain strictly under 2MB while preserving
 * sharp OCR text and object clarity for Gemini Vision.
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
    initialMaxWidth = 1600,
    initialQuality = 0.82
  } = options;

  const originalSizeBytes = await getLocalFileSize(photoUri);

  // Pass 1: Standard high-fidelity compression (1600px width, 82% quality)
  let result = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: initialMaxWidth } }],
    {
      compress: initialQuality,
      format: ImageManipulator.SaveFormat.JPEG
    }
  );

  let currentSizeBytes = await getLocalFileSize(result.uri);

  // Pass 2: Secondary compression if still exceeding target (1300px width, 70% quality)
  if (currentSizeBytes > targetMaxSizeBytes) {
    console.log(
      `[ImageCompression] Pass 1 yielded ${formatBytes(currentSizeBytes)} (> ${formatBytes(targetMaxSizeBytes)}). Running Pass 2...`
    );

    result = await ImageManipulator.manipulateAsync(
      result.uri,
      [{ resize: { width: 1300 } }],
      {
        compress: 0.70,
        format: ImageManipulator.SaveFormat.JPEG
      }
    );

    currentSizeBytes = await getLocalFileSize(result.uri);
  }

  // Pass 3: Maximum emergency compression if still over 2MB ceiling (1080px width, 55% quality)
  if (currentSizeBytes > MAX_UPLOAD_SIZE_BYTES) {
    console.warn(
      `[ImageCompression] Pass 2 still yielded ${formatBytes(currentSizeBytes)}. Applying Pass 3 aggressive compression...`
    );

    result = await ImageManipulator.manipulateAsync(
      result.uri,
      [{ resize: { width: 1080 } }],
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

  console.log(
    `[ImageCompression] Finished. Original: ${formatBytes(originalSizeBytes)} ➔ Compressed: ${formatBytes(currentSizeBytes)} (${compressionRatio}% reduction)`
  );

  return {
    uri: result.uri,
    sizeBytes: currentSizeBytes,
    originalSizeBytes,
    compressionRatio,
    width: result.width,
    height: result.height
  };
}
