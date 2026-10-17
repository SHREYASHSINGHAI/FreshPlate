import { Request, Response, NextFunction } from 'express';
import { parseOrderTextService, fetchGmailReceiptsService } from '../services/receipt.service';

export async function parseOrderTextController(req: Request, res: Response, next: NextFunction) {
  try {
    const { text, source } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Order text is required.' });
    }

    const ingredients = await parseOrderTextService(text, source);
    return res.status(200).json({ success: true, ingredients });
  } catch (error) {
    next(error);
  }
}

export async function fetchGmailReceiptsController(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid Bearer authorization token.' });
    }

    const token = authHeader.split(' ')[1];
    const ingredients = await fetchGmailReceiptsService(token);
    return res.status(200).json({ success: true, ingredients });
  } catch (error) {
    next(error);
  }
}
