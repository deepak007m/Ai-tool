const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface Service {
  id: number;
  serviceTitle: string;
  description: string;
  price: number;
  phone: string;
  city: string;
  categoryId: number;
  image?: string;
  avgRating: number;
  vendor: {
    id: number;
    name: string;
    photo?: string;
  };
  category: {
    id: number;
    name: string;
    icon?: string;
  };
  _count: {
    reviews: number;
    negotiations: number;
  };
}

export interface Category {
  id: number;
  name: string;
  icon?: string;
}

export interface ServiceFilters {
  page?: number;
  limit?: number;
  categoryId?: number;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  vendorId?: number;
  search?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  services?: T[];
  categories?: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Helper function to make API calls
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API call failed');
    }

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Services API
export const servicesApi = {
  // Get services with filters
  getServices: async (filters: ServiceFilters = {}): Promise<PaginatedResponse<Service>> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    return apiCall<PaginatedResponse<Service>>(`/services?${params.toString()}`);
  },

  // Get service by ID
  getServiceById: async (id: number): Promise<Service> => {
    return apiCall<Service>(`/services/${id}`);
  },

  // Get categories
  getCategories: async (): Promise<Category[]> => {
    return apiCall<Category[]>('/categories');
  },

  // Get categories with stats
  getCategoriesWithStats: async (): Promise<(Category & { serviceCount: number })[]> => {
    return apiCall<(Category & { serviceCount: number })[]>('/categories/stats');
  },
};

// Utility functions
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
};

export const formatRating = (rating: number): string => {
  return rating.toFixed(1);
};

export const getRatingStars = (rating: number): string => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);
};