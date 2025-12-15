import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all categories
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        icon: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    console.error('Get all categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get category by ID
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        services: {
          select: {
            id: true,
            serviceTitle: true,
            price: true,
            city: true,
            avgRating: true,
            _count: {
              select: {
                reviews: true
              }
            }
          },
          take: 5, // Show first 5 services as preview
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create category (Admin only)
export const createCategory = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;

    // Check if current user is admin
    if (currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const { name, icon } = req.body;

    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        icon: icon?.trim() || null
      },
      select: {
        id: true,
        name: true,
        icon: true
      }
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    if ((error as any).code === 'P2002') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update category (Admin only)
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    // Check if current user is admin
    if (currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const { name, icon } = req.body;

    // Validate input
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: name.trim(),
        icon: icon?.trim() || null
      },
      select: {
        id: true,
        name: true,
        icon: true
      }
    });

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    if ((error as any).code === 'P2002') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete category (Admin only)
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const categoryId = parseInt(req.params.id);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    // Check if current user is admin
    if (currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    // Check if category has services
    const servicesCount = await prisma.service.count({
      where: { categoryId }
    });

    if (servicesCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing services. Please delete or reassign all services first.' 
      });
    }

    await prisma.category.delete({
      where: { id: categoryId }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get categories with service count
export const getCategoriesWithStats = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        icon: true,
        _count: {
          select: {
            services: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const categoriesWithStats = categories.map(category => ({
      ...category,
      serviceCount: category._count.services
    }));

    res.json(categoriesWithStats);
  } catch (error) {
    console.error('Get categories with stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};