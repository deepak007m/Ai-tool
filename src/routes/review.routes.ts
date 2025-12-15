import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = Router();

// Public routes (authentication optional)
router.get('/service/:serviceId', reviewController.getServiceReviews);
router.get('/service/:serviceId/summary', reviewController.getServiceRatingSummary);

// Customer routes (authentication required)
router.post('/', authenticateToken, reviewController.createReview);
router.put('/:id', authenticateToken, reviewController.updateReview);
router.delete('/:id', authenticateToken, reviewController.deleteReview);
router.get('/customer/me', authenticateToken, reviewController.getCustomerReviews);

export default router;