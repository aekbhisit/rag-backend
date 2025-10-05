import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/tokenService';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    tenantId: string;
  };
}

export function jwtAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No JWT token provided - continue with existing auth
    return next();
  }
  
  const token = authHeader.substring(7);
  const payload = tokenService.verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  req.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
  };
  
  next();
}

export function requireJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!req.user.role || req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
