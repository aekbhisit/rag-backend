import { Request, Response, NextFunction } from 'express';

interface SanitizedError {
  message: string;
  code: string;
  timestamp: string;
  requestId?: string;
}

const sensitivePatterns = [
  /password/gi,
  /secret/gi,
  /token/gi,
  /key/gi,
  /auth/gi,
  /credential/gi,
];

function sanitizeError(error: any): SanitizedError {
  let message = error?.message || 'Internal server error';
  
  // Remove sensitive information
  sensitivePatterns.forEach(pattern => {
    message = message.replace(pattern, '[REDACTED]');
  });
  
  return {
    message,
    code: error?.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  };
}

export function sanitizeErrorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const sanitized = sanitizeError(err);
  
  // Log original error for debugging (server-side only)
  console.error('Error occurred:', {
    originalError: err,
    sanitized,
    requestId: (req as any).request_id,
    endpoint: req.originalUrl,
    method: req.method,
  });
  
  // Send sanitized error to client
  res.status(500).json(sanitized);
}
