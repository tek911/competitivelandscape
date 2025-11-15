import { Router } from 'express';
import { productSpaceController } from '../controllers/productSpace.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, asyncHandler(productSpaceController.getAll.bind(productSpaceController)));
router.get('/:id', optionalAuth, asyncHandler(productSpaceController.getById.bind(productSpaceController)));
router.post('/', authenticate, asyncHandler(productSpaceController.create.bind(productSpaceController)));
router.put('/:id', authenticate, asyncHandler(productSpaceController.update.bind(productSpaceController)));
router.delete('/:id', authenticate, asyncHandler(productSpaceController.delete.bind(productSpaceController)));

router.get('/:id/capabilities', optionalAuth, asyncHandler(productSpaceController.getCapabilities.bind(productSpaceController)));
router.get('/:id/vendors', optionalAuth, asyncHandler(productSpaceController.getVendors.bind(productSpaceController)));
router.post('/:id/update-capabilities', authenticate, asyncHandler(productSpaceController.updateCapabilities.bind(productSpaceController)));
router.get('/:id/competitive-intelligence', optionalAuth, asyncHandler(productSpaceController.getCompetitiveIntelligence.bind(productSpaceController)));

export { router as productSpaceRoutes };
