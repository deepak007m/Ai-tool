import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
