import { Request, Response, NextFunction } from 'express';
import { applicationRegistry } from '../services/applicationRegistry';

export function infrastructureSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.get('Origin');
  const app = applicationRegistry.getApplicationByOrigin(origin || '');
  
  // Set application-specific security headers
  if (app) {
    // Content Security Policy based on application type
    if (app.appId === 'admin-web') {
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + // Admin needs more flexibility
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "font-src 'self' https:; " +
        "connect-src 'self' wss:; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'"
      );
    } else if (app.appId === 'travel-ai-bot') {
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: https: blob:; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' wss: https://api.openai.com; " +
        "media-src 'self' blob:; " +
        "frame-ancestors 'self'; " +
        "base-uri 'self'; " +
        "form-action 'self'"
      );
    } else {
      // Default restrictive CSP
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self'; " +
        "img-src 'self' data:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'"
      );
    }

    // Application-specific headers
    res.setHeader('X-Application-ID', app.appId);
    res.setHeader('X-Security-Level', app.securityLevel);
    
    // Rate limiting headers based on app config
    res.setHeader('X-RateLimit-Window', String(app.rateLimitConfig.windowMs));
    res.setHeader('X-RateLimit-Limit', String(app.rateLimitConfig.maxRequests));
  }

  // Common security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN'); // Allow frames for travel-ai-bot
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(self), camera=(self)');
  
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Cross-Origin policies
  if (origin) {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }

  next();
}
