import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes (no authentication required)
router.get('/', categoryController.getAllCategories);
router.get('/stats', categoryController.getCategoriesWithStats);
router.get('/:id', categoryController.getCategoryById);

// Admin only routes
router.post('/', authenticateToken, categoryController.createCategory);
router.put('/:id', authenticateToken, categoryController.updateCategory);
router.delete('/:id', authenticateToken, categoryController.deleteCategory);

export default router;