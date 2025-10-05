import { z } from 'zod';

export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(6); // Keep existing requirement
export const uuidSchema = z.string().uuid();
export const tenantIdSchema = z.string().uuid();

export const userRoleSchema = z.enum(['admin', 'operator', 'viewer']);
export const userStatusSchema = z.enum(['active', 'inactive', 'pending']);

export const paginationSchema = z.object({
  limit: z.string().transform(Number).default('50'),
  offset: z.string().transform(Number).default('0'),
});

export const searchSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
});
