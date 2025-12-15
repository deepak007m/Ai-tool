import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import categoryRoutes from './category.routes';
import serviceRoutes from './service.routes';
import negotiationRoutes from './negotiation.routes';
import reviewRoutes from './review.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/services', serviceRoutes);
router.use('/negotiations', negotiationRoutes);
router.use('/reviews', reviewRoutes);

export default router;
