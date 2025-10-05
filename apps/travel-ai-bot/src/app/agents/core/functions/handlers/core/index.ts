/**
 * Core Handlers Index
 * Essential bot intelligence handlers that every agent should have
 */

export { intentionChangeHandler } from './intention';
export { 
  transferAgentsHandler, 
  transferBackHandler, 
  createTransferBackHandler,
  type TransferBackArgs,
  type TransferBackResult 
} from './transfer';

// Export all core handlers as object
import { intentionChangeHandler } from './intention';
import { transferAgentsHandler, transferBackHandler } from './transfer';

export const CORE_HANDLERS = {
  intentionChange: intentionChangeHandler,
  transferAgents: transferAgentsHandler,
  transferBack: transferBackHandler,
}; 