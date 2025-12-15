import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const serviceSchema = z.object({
  serviceTitle: z.string().min(3, 'Service title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().positive('Price must be positive'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  categoryId: z.number().int('Category ID must be an integer'),
  image: z.string().url('Image must be a valid URL').optional().or(z.literal(''))
});

// Create service (Vendor only)
export const createService = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const vendorId = user.userId;

    // Check if user is vendor or admin
    if (user.role !== 'VENDOR' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Vendor role required.' });
    }

    // Validate input
    const validatedData = serviceSchema.parse(req.body);

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId }
    });

    if (!category) {
      return res.status(400).json({ error: 'Category not found' });
    }

    const service = await prisma.service.create({
      data: {
        vendorId,
        serviceTitle: validatedData.serviceTitle,
        description: validatedData.description,
        price: validatedData.price,
        phone: validatedData.phone,
        city: validatedData.city,
        categoryId: validatedData.categoryId,
        image: validatedData.image || null
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true
          }
        }
      }
    });

    res.status(201).json(service);
  } catch (error) {
    console.error('Create service error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get services with filtering and pagination
export const getServices = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      categoryId, 
      city, 
      minPrice, 
      maxPrice,
      vendorId,
      search 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (categoryId) where.categoryId = Number(categoryId);
    if (city) where.city = { contains: String(city), mode: 'insensitive' };
    if (vendorId) where.vendorId = Number(vendorId);
    if (minPrice) where.price = { ...where.price, gte: Number(minPrice) };
    if (maxPrice) where.price = { ...where.price, lte: Number(maxPrice) };
    if (search) {
      where.OR = [
        { serviceTitle: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              photo: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              icon: true
            }
          },
          _count: {
            select: {
              reviews: true,
              negotiations: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { avgRating: 'desc' }
      }),
      prisma.service.count({ where })
    ]);

    res.json({
      services,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get service by ID
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.id);
    
    if (isNaN(serviceId)) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photo: true,
            city: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true
          }
        },
        reviews: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                photo: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // Latest 10 reviews
        },
        negotiations: {
          where: { status: 'ACCEPTED' },
          select: {
            id: true,
            offerPrice: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Get service by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update service (Vendor only - can only update own services)
export const updateService = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const serviceId = parseInt(req.params.id);
    
    if (isNaN(serviceId)) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    // Check if user is vendor or admin
    if (user.role !== 'VENDOR' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Vendor role required.' });
    }

    // Get existing service
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check ownership (admin can update any service)
    if (user.role !== 'ADMIN' && existingService.vendorId !== user.userId) {
      return res.status(403).json({ error: 'Access denied. You can only update your own services.' });
    }

    // Validate input
    const validatedData = serviceSchema.partial().parse(req.body);

    // Verify category if provided
    if (validatedData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: validatedData.categoryId }
      });

      if (!category) {
        return res.status(400).json({ error: 'Category not found' });
      }
    }

    const service = await prisma.service.update({
      where: { id: serviceId },
      data: {
        ...validatedData,
        image: validatedData.image || null,
        updatedAt: new Date()
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            icon: true
          }
        }
      }
    });

    res.json(service);
  } catch (error) {
    console.error('Update service error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete service (Vendor only - can only delete own services)
export const deleteService = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const serviceId = parseInt(req.params.id);
    
    if (isNaN(serviceId)) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    // Check if user is vendor or admin
    if (user.role !== 'VENDOR' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Vendor role required.' });
    }

    // Get existing service
    const existingService = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check ownership (admin can delete any service)
    if (user.role !== 'ADMIN' && existingService.vendorId !== user.userId) {
      return res.status(403).json({ error: 'Access denied. You can only delete your own services.' });
    }

    await prisma.service.delete({
      where: { id: serviceId }
    });

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Service not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get vendor's services
export const getVendorServices = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const vendorId = user.userId;

    // Check if user is vendor or admin
    if (user.role !== 'VENDOR' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Vendor role required.' });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where: { vendorId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              icon: true
            }
          },
          _count: {
            select: {
              reviews: true,
              negotiations: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.service.count({ where: { vendorId } })
    ]);

    res.json({
      services,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get vendor services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};