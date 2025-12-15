import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const reviewSchema = z.object({
  serviceId: z.number().int('Service ID must be an integer'),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  comment: z.string().max(500, 'Comment must be less than 500 characters').optional()
});

// Create review (Customer only)
export const createReview = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const customerId = user.userId;

    // Check if user is customer or admin
    if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Customer role required.' });
    }

    // Validate input
    const validatedData = reviewSchema.parse(req.body);

    // Verify service exists
    const service = await prisma.service.findUnique({
      where: { id: validatedData.serviceId }
    });

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check if customer is trying to review their own service
    if (service.vendorId === customerId) {
      return res.status(400).json({ error: 'Cannot review your own service' });
    }

    // Check if customer has already reviewed this service
    const existingReview = await prisma.review.findFirst({
      where: {
        serviceId: validatedData.serviceId,
        customerId
      }
    });

    if (existingReview) {
      return res.status(400).json({ 
        error: 'You have already reviewed this service' 
      });
    }

    // Check if customer has an accepted negotiation for this service
    const acceptedNegotiation = await prisma.negotiation.findFirst({
      where: {
        serviceId: validatedData.serviceId,
        customerId,
        status: 'ACCEPTED'
      }
    });

    if (!acceptedNegotiation && user.role !== 'ADMIN') {
      return res.status(400).json({ 
        error: 'You can only review services you have successfully negotiated for' 
      });
    }

    const review = await prisma.$transaction(async (tx) => {
      // Create the review
      const newReview = await tx.review.create({
        data: {
          serviceId: validatedData.serviceId,
          customerId,
          rating: validatedData.rating,
          comment: validatedData.comment?.trim() || null
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              photo: true
            }
          }
        }
      });

      // Calculate new average rating using database aggregation
      const ratingStats = await tx.review.aggregate({
        where: { serviceId: validatedData.serviceId },
        _avg: { rating: true },
        _count: { rating: true }
      });

      // Update service's average rating
      await tx.service.update({
        where: { id: validatedData.serviceId },
        data: {
          avgRating: ratingStats._avg.rating || 0
        }
      });

      return {
        ...newReview,
        avgRating: ratingStats._avg.rating || 0,
        totalReviews: ratingStats._count.rating
      };
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get reviews for a service
export const getServiceReviews = async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.serviceId);
    
    if (isNaN(serviceId)) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total, stats] = await Promise.all([
      prisma.review.findMany({
        where: { serviceId },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              photo: true
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.review.count({ where: { serviceId } }),
      prisma.review.aggregate({
        where: { serviceId },
        _avg: { rating: true },
        _count: { rating: true }
      })
    ]);

    res.json({
      reviews,
      stats: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count.rating
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get service reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get reviews by customer
export const getCustomerReviews = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const customerId = user.userId;

    // Check if user is customer or admin
    if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Customer role required.' });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { customerId },
        include: {
          service: {
            select: {
              id: true,
              serviceTitle: true,
              city: true,
              image: true,
              vendor: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.review.count({ where: { customerId } })
    ]);

    res.json({
      reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get customer reviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update review (Customer only - can only update own reviews)
export const updateReview = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const reviewId = parseInt(req.params.id);
    
    if (isNaN(reviewId)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    // Check if user is customer or admin
    if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Customer role required.' });
    }

    // Validate input (rating and comment are optional for update)
    const validatedData = reviewSchema.partial().parse(req.body);

    // Get existing review
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check ownership (admin can update any review)
    if (user.role !== 'ADMIN' && existingReview.customerId !== user.userId) {
      return res.status(403).json({ error: 'Access denied. You can only update your own reviews.' });
    }

    const review = await prisma.$transaction(async (tx) => {
      // Update the review
      const updatedReview = await tx.review.update({
        where: { id: reviewId },
        data: {
          ...validatedData,
          comment: validatedData.comment?.trim() || null,
          updatedAt: new Date()
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              photo: true
            }
          }
        }
      });

      // Recalculate average rating if rating was updated
      if (validatedData.rating !== undefined) {
        const ratingStats = await tx.review.aggregate({
          where: { serviceId: existingReview.serviceId },
          _avg: { rating: true },
          _count: { rating: true }
        });

        await tx.service.update({
          where: { id: existingReview.serviceId },
          data: {
            avgRating: ratingStats._avg.rating || 0
          }
        });
      }

      return updatedReview;
    });

    res.json(review);
  } catch (error) {
    console.error('Update review error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors 
      });
    }
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete review (Customer only - can only delete own reviews)
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const reviewId = parseInt(req.params.id);
    
    if (isNaN(reviewId)) {
      return res.status(400).json({ error: 'Invalid review ID' });
    }

    // Check if user is customer or admin
    if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Customer role required.' });
    }

    // Get existing review
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check ownership (admin can delete any review)
    if (user.role !== 'ADMIN' && existingReview.customerId !== user.userId) {
      return res.status(403).json({ error: 'Access denied. You can only delete your own reviews.' });
    }

    await prisma.$transaction(async (tx) => {
      // Delete the review
      await tx.review.delete({
        where: { id: reviewId }
      });

      // Recalculate average rating
      const ratingStats = await tx.review.aggregate({
        where: { serviceId: existingReview.serviceId },
        _avg: { rating: true },
        _count: { rating: true }
      });

      await tx.service.update({
        where: { id: existingReview.serviceId },
        data: {
          avgRating: ratingStats._avg.rating || 0
        }
      });
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    if ((error as any).code === 'P2025') {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get service rating summary
export const getServiceRatingSummary = async (req: Request, res: Response) => {
  try {
    const serviceId = parseInt(req.params.serviceId);
    
    if (isNaN(serviceId)) {
      return res.status(400).json({ error: 'Invalid service ID' });
    }

    const [stats, ratingDistribution] = await Promise.all([
      prisma.review.aggregate({
        where: { serviceId },
        _avg: { rating: true },
        _count: { rating: true }
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { serviceId },
        _count: { rating: true }
      })
    ]);

    // Create rating distribution (1-5 stars)
    const distribution = [1, 2, 3, 4, 5].map(rating => {
      const found = ratingDistribution.find(r => r.rating === rating);
      return {
        rating,
        count: found?._count.rating || 0
      };
    });

    res.json({
      averageRating: stats._avg.rating || 0,
      totalReviews: stats._count.rating,
      ratingDistribution: distribution
    });
  } catch (error) {
    console.error('Get service rating summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};