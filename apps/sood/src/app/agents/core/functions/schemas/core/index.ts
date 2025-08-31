/**
 * Core Schemas Index
 * Essential bot intelligence schemas that every agent should have
 */

export { intentionChangeSchema } from './intention';
export { transferAgentsSchema, transferBackSchema } from './transfer';

// Export all core schemas as array
import { intentionChangeSchema } from './intention';
import { transferAgentsSchema, transferBackSchema } from './transfer';

export const CORE_SCHEMAS = [
  intentionChangeSchema,
  transferAgentsSchema,
  transferBackSchema,
]; 