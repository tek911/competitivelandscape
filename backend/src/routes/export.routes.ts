import { Router } from 'express';
import { exportController } from '../controllers/export.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/:productSpaceId/matrix', authenticate, asyncHandler(exportController.exportMatrix.bind(exportController)));
router.post('/:productSpaceId/rfi', authenticate, asyncHandler(exportController.exportRFI.bind(exportController)));

export { router as exportRoutes };
