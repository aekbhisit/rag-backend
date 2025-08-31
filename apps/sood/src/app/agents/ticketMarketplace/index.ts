/**
 * Ticket Marketplace Agent
 * 
 * Intelligent AI agent for ticket discovery, search, and purchase
 * with integrated RAG capabilities and Bot Action Framework support.
 */

import { injectTransferTools, injectTransferBackTools } from '../core/functions';
import { AgentConfig } from "@/app/types";
import { ticketMarketplaceFunctions } from "./config/functions";
import ticketMarketplaceAgent from './config/agentConfig';
import * as handlers from './functions/handlers';

// Create tool logic mapping
const toolLogic = {
  searchTickets: handlers.searchTickets,
  getRecommendations: handlers.getRecommendations,
  getTicketDetails: handlers.getTicketDetails,
  displayTickets: handlers.displayTickets,
  checkPricing: handlers.checkPricing,
  getVenueInfo: handlers.getVenueInfo,
  findSimilarTickets: handlers.findSimilarTickets,
  getTrendingTickets: handlers.getTrendingTickets,
  initiatePurchase: handlers.initiatePurchase,
  // Add placeholder handlers for remaining functions
  contactSeller: async (args: any) => ({ success: true, message: 'Message sent to seller!' }),
  saveTicket: async (args: any) => ({ success: true, message: 'Ticket saved to your favorites!' }),
  setPriceAlert: async (args: any) => ({ success: true, message: 'Price alert set up successfully!' })
};

// Update the agent configuration with functions and logic
const updatedTicketMarketplaceAgent: AgentConfig = {
  ...ticketMarketplaceAgent,
  tools: ticketMarketplaceFunctions,
  toolLogic
};

// Apply transfer tools (forward transfers) and transfer back tools
let agents = injectTransferTools([updatedTicketMarketplaceAgent]);
agents = injectTransferBackTools(agents, "default");

export default agents;

// Export individual components for testing and modularity
export { 
  ticketMarketplaceFunctions,
  toolLogic,
  updatedTicketMarketplaceAgent
};

// Re-export handlers for direct access
export * from './functions/handlers';
export * from './config/functions';