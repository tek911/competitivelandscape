import { Router } from 'express';
import { capabilityController } from '../controllers/capability.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, asyncHandler(capabilityController.getAll.bind(capabilityController)));
router.get('/:id', optionalAuth, asyncHandler(capabilityController.getById.bind(capabilityController)));
router.post('/', authenticate, asyncHandler(capabilityController.create.bind(capabilityController)));
router.put('/:id', authenticate, asyncHandler(capabilityController.update.bind(capabilityController)));
router.delete('/:id', authenticate, asyncHandler(capabilityController.delete.bind(capabilityController)));

router.get('/:id/responses', optionalAuth, asyncHandler(capabilityController.getResponses.bind(capabilityController)));
router.post('/bulk', authenticate, asyncHandler(capabilityController.bulkCreate.bind(capabilityController)));
router.put('/bulk', authenticate, asyncHandler(capabilityController.bulkUpdate.bind(capabilityController)));

export { router as capabilityRoutes };
