import { Router } from 'express';
import * as serviceController from '../controllers/service.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// Public routes (authentication optional for browsing)
router.get('/', serviceController.getServices);
router.get('/:id', optionalAuth, serviceController.getServiceById);

// Vendor routes (authentication required)
router.post('/', authenticateToken, serviceController.createService);
router.put('/:id', authenticateToken, serviceController.updateService);
router.delete('/:id', authenticateToken, serviceController.deleteService);
router.get('/vendor/me', authenticateToken, serviceController.getVendorServices);

export default router;