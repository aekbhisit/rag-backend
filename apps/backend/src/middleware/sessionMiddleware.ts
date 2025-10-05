import { Request, Response, NextFunction } from 'express';
import { sessionService, SessionData } from '../services/sessionService';

declare global {
  namespace Express {
    interface Request {
      session?: SessionData;
    }
  }
}

export interface SessionMiddlewareOptions {
  required?: boolean;
  allowGuest?: boolean;
  updateLastAccessed?: boolean;
}

export function sessionMiddleware(options: SessionMiddlewareOptions = {}) {
  const { 
    required = false, 
    allowGuest = false, 
    updateLastAccessed = true 
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionId = extractSessionId(req);
      
      if (!sessionId) {
        if (required) {
          return res.status(401).json({ error: 'Session required' });
        }
        if (!allowGuest) {
          return res.status(401).json({ error: 'Authentication required' });
        }
        return next();
      }

      const session = await sessionService.getSession(sessionId);
      
      if (!session) {
        if (required) {
          return res.status(401).json({ error: 'Invalid or expired session' });
        }
        return next();
      }

      // Check if session is still valid
      if (!session.isActive || new Date(session.expiresAt) < new Date()) {
        if (required) {
          return res.status(401).json({ error: 'Session expired' });
        }
        return next();
      }

      // Attach session to request
      req.session = session;

      // Update last accessed time if requested
      if (updateLastAccessed) {
        await sessionService.updateLastAccessed(sessionId);
      }

      next();
    } catch (error) {
      console.error('Session middleware error:', error);
      if (required) {
        return res.status(500).json({ error: 'Session validation failed' });
      }
      next();
    }
  };
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session) {
    return res.status(401).json({ error: 'Valid session required' });
  }
  next();
}

export function requireValidSession(req: Request, res: Response, next: NextFunction) {
  if (!req.session || !req.session.isActive || new Date(req.session.expiresAt) < new Date()) {
    return res.status(401).json({ error: 'Valid session required' });
  }
  next();
}

export function requireTenantMatch(tenantId: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session) {
      return res.status(401).json({ error: 'Session required' });
    }
    
    if (req.session.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Tenant access denied' });
    }
    
    next();
  };
}

function extractSessionId(req: Request): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // If it's a session ID (UUID format), return it
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      return token;
    }
  }

  // Check session cookie
  const sessionCookie = req.cookies?.sessionId;
  if (sessionCookie) {
    return sessionCookie;
  }

  // Check query parameter (for development/testing)
  if (req.query.sessionId && typeof req.query.sessionId === 'string') {
    return req.query.sessionId;
  }

  return null;
}

export function createSessionCookie(sessionId: string, res: Response) {
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie('sessionId');
}
