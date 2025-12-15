import { Router } from 'express';
import * as negotiationController from '../controllers/negotiation.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Customer routes
router.post('/', negotiationController.createNegotiation);
router.get('/', negotiationController.getNegotiations);
router.get('/stats', negotiationController.getNegotiationStats);
router.get('/:id', negotiationController.getNegotiationById);
router.delete('/:id', negotiationController.cancelNegotiation);

// Vendor routes (for status updates)
router.put('/:id/status', negotiationController.updateNegotiationStatus);

export default router;