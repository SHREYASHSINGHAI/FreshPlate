import { Router } from 'express';
import { parseOrderTextController, fetchGmailReceiptsController } from '../../controllers/receipts.controller';
import { aiRecipeRateLimiter, generalRateLimiter } from '../../middleware/rateLimiter';
import { validateParseOrderTextRequest, validateGmailReceiptsRequest } from '../../middleware/validator';

const router = Router();

router.post('/parse-text', aiRecipeRateLimiter, validateParseOrderTextRequest, parseOrderTextController);
router.post('/fetch-gmail', generalRateLimiter, validateGmailReceiptsRequest, fetchGmailReceiptsController);

export default router;
