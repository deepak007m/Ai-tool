import { Request, Response } from 'express';
import { PrismaClient, NegotiationStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const negotiationSchema = z.object({
  serviceId: z.number().int('Service ID must be an integer'),
  offerPrice: z.number().positive('Offer price must be positive')
});

const statusUpdateSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED'])
});

// Create negotiation (Customer only)
export const createNegotiation = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const customerId = user.userId;

    // Check if user is customer or admin
    if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Customer role required.' });
    }

    // Validate input
    const validatedData = negotiationSchema.parse(req.body);

    // Verify service exists
    const service = await prisma.service.findUnique({
      where: { id: validatedData.serviceId },
      include: {
        vendor: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check if customer is trying to negotiate their own service
    if (service.vendorId === customerId) {
      return res.status(400).json({ error: 'Cannot negotiate your own service' });
    }

    // Check if there's already a pending negotiation for this service and customer
    const existingNegotiation = await prisma.negotiation.findFirst({
      where: {
        serviceId: validatedData.serviceId,
        customerId,
        status: 'PENDING'
      }
    });

    if (existingNegotiation) {
      return res.status(400).json({ 
        error: 'You already have a pending negotiation for this service' 
      });
    }

    const negotiation = await prisma.negotiation.create({
      data: {
        serviceId: validatedData.serviceId,
        customerId,
        offerPrice: validatedData.offerPrice
      },
      include: {
        service: {
          select: {
            id: true,
            serviceTitle: true,
            price: true,
            city: true,
            vendor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(negotiation);
  } catch (error) {
    console.error('Create negotiation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get negotiations based on user role
export const getNegotiations = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { 
      page = 1, 
      limit = 10, 
      status,
      serviceId 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    // Filter based on user role
    if (user.role === 'CUSTOMER') {
      where.customerId = user.userId;
    } else if (user.role === 'VENDOR') {
      where.service = {
        vendorId: user.userId
      };
    }
    // Admin can see all negotiations (no additional filter)

    if (status) where.status = status;
    if (serviceId) where.serviceId = Number(serviceId);

    const [negotiations, total] = await Promise.all([
      prisma.negotiation.findMany({
        where,
        include: {
          service: {
            select: {
              id: true,
              serviceTitle: true,
              price: true,
              city: true,
              image: true,
              vendor: {
                select: {
                  id: true,
                  name: true,
                  photo: true
                }
              }
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              photo: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.negotiation.count({ where })
    ]);

    res.json({
      negotiations,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get negotiations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get negotiation by ID
export const getNegotiationById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const negotiationId = parseInt(req.params.id);
    
    if (isNaN(negotiationId)) {
      return res.status(400).json({ error: 'Invalid negotiation ID' });
    }

    const negotiation = await prisma.negotiation.findUnique({
      where: { id: negotiationId },
      include: {
        service: {
          select: {
            id: true,
            serviceTitle: true,
            description: true,
            price: true,
            phone: true,
            city: true,
            image: true,
            vendor: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                photo: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photo: true
          }
        }
      }
    });

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Check access permissions
    const canAccess = 
      user.role === 'ADMIN' ||
      (user.role === 'CUSTOMER' && negotiation.customerId === user.userId) ||
      (user.role === 'VENDOR' && negotiation.service.vendorId === user.userId);

    if (!canAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(negotiation);
  } catch (error) {
    console.error('Get negotiation by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update negotiation status (Vendor only)
export const updateNegotiationStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const negotiationId = parseInt(req.params.id);
    
    if (isNaN(negotiationId)) {
      return res.status(400).json({ error: 'Invalid negotiation ID' });
    }

    // Check if user is vendor or admin
    if (user.role !== 'VENDOR' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Vendor role required.' });
    }

    // Validate input
    const validatedData = statusUpdateSchema.parse(req.body);

    // Get existing negotiation
    const existingNegotiation = await prisma.negotiation.findUnique({
      where: { id: negotiationId },
      include: {
        service: {
          select: {
            vendorId: true
          }
        }
      }
    });

    if (!existingNegotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Check ownership (admin can update any negotiation)
    if (user.role !== 'ADMIN' && existingNegotiation.service.vendorId !== user.userId) {
      return res.status(403).json({ error: 'Access denied. You can only update negotiations for your own services.' });
    }

    // Check if negotiation is still pending
    if (existingNegotiation.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cannot update negotiation that is not pending' });
    }

    const negotiation = await prisma.negotiation.update({
      where: { id: negotiationId },
      data: {
        status: validatedData.status as NegotiationStatus,
        updatedAt: new Date()
      },
      include: {
        service: {
          select: {
            id: true,
            serviceTitle: true,
            price: true,
            city: true,
            vendor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json(negotiation);
  } catch (error) {
    console.error('Update negotiation status error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Negotiation not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel negotiation (Customer only)
export const cancelNegotiation = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const negotiationId = parseInt(req.params.id);
    
    if (isNaN(negotiationId)) {
      return res.status(400).json({ error: 'Invalid negotiation ID' });
    }

    // Check if user is customer or admin
    if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Customer role required.' });
    }

    // Get existing negotiation
    const existingNegotiation = await prisma.negotiation.findUnique({
      where: { id: negotiationId }
    });

    if (!existingNegotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Check ownership (admin can cancel any negotiation)
    if (user.role !== 'ADMIN' && existingNegotiation.customerId !== user.userId) {
      return res.status(403).json({ error: 'Access denied. You can only cancel your own negotiations.' });
    }

    // Check if negotiation is still pending
    if (existingNegotiation.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cannot cancel negotiation that is not pending' });
    }

    await prisma.negotiation.delete({
      where: { id: negotiationId }
    });

    res.json({ message: 'Negotiation cancelled successfully' });
  } catch (error) {
    console.error('Cancel negotiation error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Negotiation not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get negotiation statistics (for vendors and admin)
export const getNegotiationStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    let where: any = {};
    
    // Filter based on user role
    if (user.role === 'VENDOR') {
      where.service = {
        vendorId: user.userId
      };
    } else if (user.role === 'CUSTOMER') {
      where.customerId = user.userId;
    }
    // Admin can see all stats (no additional filter)

    const [total, pending, accepted, rejected] = await Promise.all([
      prisma.negotiation.count({ where }),
      prisma.negotiation.count({ 
        where: { ...where, status: 'PENDING' } 
      }),
      prisma.negotiation.count({ 
        where: { ...where, status: 'ACCEPTED' } 
      }),
      prisma.negotiation.count({ 
        where: { ...where, status: 'REJECTED' } 
      })
    ]);

    res.json({
      total,
      pending,
      accepted,
      rejected,
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0
    });
  } catch (error) {
    console.error('Get negotiation stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};