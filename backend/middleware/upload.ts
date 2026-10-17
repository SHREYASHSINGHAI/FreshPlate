import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { config } from '../config/env';

// Store files in memory buffer for immediate processing and passing to Gemini
const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif'
]);

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (allowedMimeTypes.has(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: JPEG, PNG, WebP, HEIC.`));
  }
};

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: config.uploadMaxSizeBytes,
    files: 1
  },
  fileFilter
});
