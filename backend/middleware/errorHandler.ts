import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Backend Error]', err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File size too large. Maximum allowed size is 15MB.'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`
    });
  }

  if (err.message && err.message.startsWith('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }

  const isUnavailable = 
    err?.status === 503 || 
    err?.message?.includes('503') || 
    err?.message?.includes('UNAVAILABLE') || 
    err?.code === 503;

  if (isUnavailable) {
    return res.status(503).json({
      success: false,
      error: 'The AI model is currently experiencing high demand. Please try again in a few moments.'
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred.'
  });
}
