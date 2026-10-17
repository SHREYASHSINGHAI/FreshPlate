import { Router } from 'express';
import { parseOrderTextController, fetchGmailReceiptsController } from '../../controllers/receipts.controller';
import { generalRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.post('/parse-text', generalRateLimiter, parseOrderTextController);
router.post('/fetch-gmail', generalRateLimiter, fetchGmailReceiptsController);

export default router;
