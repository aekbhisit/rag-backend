/**
 * Core Schema: Intention Management
 * Essential bot intelligence for intention detection and adaptation
 */
import { Tool } from '@/app/types';

export const intentionChangeSchema: Tool = {
  type: 'function',
  name: 'intentionChange',
  description: '🚨 CRITICAL: Call this function whenever you detect a change in user intention or communication style. You MUST call this on your first interaction and whenever the user changes their needs, goals, or preferred communication style. This is mandatory for proper AI behavior adaptation.',
  parameters: {
    type: 'object',
    properties: {
      currentIntention: {
        type: 'string',
        description: 'The user\'s current primary intention',
        enum: ['explore', 'learn', 'decide', 'act']
      },
      previousIntention: {
        type: 'string',
        description: 'The user\'s previous intention (if known)',
        enum: ['explore', 'learn', 'decide', 'act', 'unknown']
      },
      communicationStyle: {
        type: 'string',
        description: 'The user\'s preferred communication style',
        enum: ['guided', 'quick', 'detailed']
      },
      confidenceLevel: {
        type: 'number',
        description: 'Confidence level of intention detection (0-1)'
      },
      triggerReason: {
        type: 'string',
        description: 'What in the user\'s message indicated this intention change (e.g., "User asked for specific details - learning mode", "User said quickly - wants brief responses")'
      }
    },
    required: ['currentIntention', 'communicationStyle', 'triggerReason']
  }
}; 