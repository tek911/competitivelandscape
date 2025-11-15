import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', asyncHandler(authController.register.bind(authController)));
router.post('/login', asyncHandler(authController.login.bind(authController)));
router.get('/profile', authenticate, asyncHandler(authController.getProfile.bind(authController)));
router.put('/profile', authenticate, asyncHandler(authController.updateProfile.bind(authController)));
router.post('/change-password', authenticate, asyncHandler(authController.changePassword.bind(authController)));

export { router as authRoutes };
