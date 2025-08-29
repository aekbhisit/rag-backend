/**
 * Core Schema: Transfer Management
 * Essential bot intelligence for agent transfer capabilities
 */
import { Tool } from '@/app/types';

export const transferAgentsSchema: Tool = {
  type: 'function',
  name: 'transferAgents',
  description: 'Transfer the conversation to another agent. Use this when the user needs specialized help or when you cannot adequately assist with their request.',
  parameters: {
    type: 'object',
    properties: {
      destination_agent: {
        type: 'string',
        description: 'The name of the agent to transfer to'
      },
      rationale_for_transfer: {
        type: 'string',
        description: 'Brief explanation of why the transfer is needed'
      },
      conversation_context: {
        type: 'string',
        description: 'Important context to pass to the receiving agent'
      }
    },
    required: ['destination_agent', 'rationale_for_transfer']
  }
};

export const transferBackSchema: Tool = {
  type: 'function',
  name: 'transferBack',
  description: 'Transfer back to the default agent when the specialized task is complete or when the user requests to return to general assistance.',
  parameters: {
    type: 'object',
    properties: {
      rationale_for_transfer: {
        type: 'string',
        description: 'Brief explanation of why transferring back'
      },
      conversation_context: {
        type: 'string',
        description: 'Summary of what was accomplished during this specialized session'
      }
    },
    required: ['rationale_for_transfer']
  }
}; 