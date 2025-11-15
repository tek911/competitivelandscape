import { Router } from 'express';
import { documentController } from '../controllers/document.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { uploadSingle, validateFileUpload } from '../middleware/upload';
import { uploadLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/', authenticate, asyncHandler(documentController.getAll.bind(documentController)));
router.get('/:id', authenticate, asyncHandler(documentController.getById.bind(documentController)));
router.post(
  '/upload',
  authenticate,
  uploadLimiter,
  uploadSingle,
  validateFileUpload,
  asyncHandler(documentController.upload.bind(documentController))
);
router.delete('/:id', authenticate, asyncHandler(documentController.delete.bind(documentController)));

export { router as documentRoutes };
