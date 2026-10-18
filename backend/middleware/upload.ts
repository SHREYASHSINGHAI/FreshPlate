import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { config } from '../config/env';
import { ALLOWED_IMAGE_MIME_TYPES } from '../utils/imageUtils';

// Store files in memory buffer for immediate processing and passing to Gemini
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype.toLowerCase())) {
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

/**
 * Mobile-friendly upload handler that supports:
 * 1. Multipart form-data with any image field ('image', 'file', 'photo', 'receipt', etc.)
 * 2. Transparent passthrough for JSON base64 payloads
 */
export const flexibleImageUpload = (req: Request, res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  uploadMiddleware.any()(req, res, (err) => {
    if (err) return next(err);
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};
