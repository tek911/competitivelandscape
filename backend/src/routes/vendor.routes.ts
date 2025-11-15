import { Router } from 'express';
import { vendorController } from '../controllers/vendor.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, asyncHandler(vendorController.getAll.bind(vendorController)));
router.get('/:id', optionalAuth, asyncHandler(vendorController.getById.bind(vendorController)));
router.post('/', authenticate, asyncHandler(vendorController.create.bind(vendorController)));
router.put('/:id', authenticate, asyncHandler(vendorController.update.bind(vendorController)));
router.delete('/:id', authenticate, asyncHandler(vendorController.delete.bind(vendorController)));

router.post('/:id/refresh-logo', authenticate, asyncHandler(vendorController.refreshLogo.bind(vendorController)));
router.post('/:id/upload-logo', authenticate, asyncHandler(vendorController.uploadLogo.bind(vendorController)));

export { router as vendorRoutes };
