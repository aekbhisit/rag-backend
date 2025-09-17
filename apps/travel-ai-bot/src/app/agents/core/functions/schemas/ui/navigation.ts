/**
 * UI Schema: Navigation
 * Actions that work with bot action framework for navigation
 */
import { Tool } from '@/app/types';

export const navigateToMainSchema: Tool = {
  type: 'function',
  name: 'navigateToMain',
  description: 'Navigate to the main page or home view using bot action framework. Use when user wants to return to the main interface or start over.',
  parameters: {
    type: 'object',
    properties: {
      resetState: {
        type: 'boolean',
        description: 'Whether to reset the current state when navigating to main page'
      },
      welcomeMessage: {
        type: 'string',
        description: 'Custom welcome message to display on main page'
      }
    },
    required: []
  }
};

export const navigateToPreviousSchema: Tool = {
  type: 'function',
  name: 'navigateToPrevious',
  description: 'Navigate back to the previous view in the navigation hierarchy using bot action framework.',
  parameters: {
    type: 'object',
    properties: {
      steps: {
        type: 'number',
        description: 'Number of steps to go back (default: 1)'
      }
    },
    required: []
  }
};

export const navigateSchema: Tool = {
  type: 'function',
  name: 'navigate',
  description: 'Navigate the UI to a given in-app URI path.',
  parameters: {
    type: 'object',
    properties: {
      uri: { 
        type: 'string', 
        description: 'Target in-app URI path, e.g., \'/travel/taxi\'' 
      }
    },
    required: ['uri']
  }
}; 