import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function createValidationMiddleware(schema: z.ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validatedData = schema.parse(data);
      req[target] = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.warn('Validation failed:', error.errors);
        // Don't break the app, just log and continue
        next();
      } else {
        next(error);
      }
    }
  };
}

export function optionalValidation(schema: z.ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      if (data && Object.keys(data).length > 0) {
        const validatedData = schema.parse(data);
        req[target] = validatedData;
      }
      next();
    } catch (error) {
      console.warn('Optional validation failed:', error);
      next(); // Continue without validation
    }
  };
}
