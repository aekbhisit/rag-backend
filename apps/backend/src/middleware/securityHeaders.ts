import { Request, Response, NextFunction } from 'express';

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Basic security headers (complements infrastructureSecurityMiddleware)
  
  // Content Security Policy (fallback if not set by infrastructure security)
  if (!res.getHeader('Content-Security-Policy')) {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
    );
  }

  // Additional security headers (if not already set)
  if (!res.getHeader('X-Content-Type-Options')) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  
  if (!res.getHeader('X-Frame-Options')) {
    res.setHeader('X-Frame-Options', 'DENY');
  }
  
  if (!res.getHeader('X-XSS-Protection')) {
    res.setHeader('X-XSS-Protection', '1; mode=block');
  }
  
  if (!res.getHeader('Referrer-Policy')) {
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  
  if (!res.getHeader('Permissions-Policy')) {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
  
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production' && !res.getHeader('Strict-Transport-Security')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}
