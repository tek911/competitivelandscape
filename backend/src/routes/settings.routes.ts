import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/bedrock', authenticate, asyncHandler(settingsController.getBedrockConfig.bind(settingsController)));
router.post('/bedrock', authenticate, authorize(UserRole.ADMIN), asyncHandler(settingsController.updateBedrockConfig.bind(settingsController)));
router.post('/bedrock/test', authenticate, asyncHandler(settingsController.testBedrockConnection.bind(settingsController)));

router.get('/', authenticate, authorize(UserRole.ADMIN), asyncHandler(settingsController.getAllSettings.bind(settingsController)));
router.post('/', authenticate, authorize(UserRole.ADMIN), asyncHandler(settingsController.updateSetting.bind(settingsController)));
router.delete('/:key', authenticate, authorize(UserRole.ADMIN), asyncHandler(settingsController.deleteSetting.bind(settingsController)));

export { router as settingsRoutes };
