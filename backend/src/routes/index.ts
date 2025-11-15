import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { productSpaceRoutes } from './productSpace.routes';
import { capabilityRoutes } from './capability.routes';
import { vendorRoutes } from './vendor.routes';
import { documentRoutes } from './document.routes';
import { exportRoutes } from './export.routes';
import { settingsRoutes } from './settings.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/product-spaces', productSpaceRoutes);
router.use('/capabilities', capabilityRoutes);
router.use('/vendors', vendorRoutes);
router.use('/documents', documentRoutes);
router.use('/export', exportRoutes);
router.use('/settings', settingsRoutes);

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
