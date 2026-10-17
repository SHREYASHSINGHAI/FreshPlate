import { Router } from 'express';
import {
  scanReceiptController,
  getScanReceiptDocs,
  scanFridgeController,
  getScanFridgeDocs
} from '../../controllers/vision.controller';
import { visionRateLimiter } from '../../middleware/rateLimiter';
import { flexibleImageUpload } from '../../middleware/upload';

const router = Router();

/**
 * @route   GET /api/v1/scan-receipt
 * @desc    API schema, accepted parameters, and documentation
 */
router.get('/scan-receipt', getScanReceiptDocs);

/**
 * @route   POST /api/v1/scan-receipt
 * @desc    Parse grocery bills into normalized items, categories, quantities & shelf lives
 * @access  Public / Mobile
 * @content Multipart form-data ('image' / 'receipt' / 'file') OR JSON ({ imageBase64, mimeType })
 */
router.post(
  '/scan-receipt',
  visionRateLimiter,
  flexibleImageUpload,
  scanReceiptController
);

/**
 * @route   GET /api/v1/scan-fridge
 * @desc    API schema, accepted parameters, and documentation
 */
router.get('/scan-fridge', getScanFridgeDocs);

/**
 * @route   POST /api/v1/scan-fridge
 * @desc    Perform object recognition on fridge photos with spatial confidence & shelf locations
 * @access  Public / Mobile
 * @content Multipart form-data ('image' / 'photo' / 'file') OR JSON ({ imageBase64, mimeType })
 */
router.post(
  '/scan-fridge',
  visionRateLimiter,
  flexibleImageUpload,
  scanFridgeController
);

export default router;
