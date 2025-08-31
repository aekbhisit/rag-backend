/**
 * Bot Action Framework
 * FunctionCallMapper - Maps between OpenAI function calls and the action system
 */

import { v4 as uuidv4 } from 'uuid';
import { ActionType, ActionPayloadUnion, ActionResult } from './ActionTypes';
import { actionDispatcher } from './ActionDispatcher';

/**
 * Type for OpenAI function call parameters
 */
export interface FunctionCallParams {
  name: string;
  call_id?: string;
  arguments: string;
}

/**
 * Type for function call result
 */
export interface FunctionCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Mapping between function names and action types
 */
const functionToActionMap: Record<string, ActionType> = {
  // Navigation functions
  navigatePage: ActionType.NAVIGATE_PAGE,
  navigateSection: ActionType.NAVIGATE_SECTION,
  navigateBack: ActionType.NAVIGATE_BACK,
  
  // Selection functions
  selectItem: ActionType.SELECT_ITEM,
  selectOption: ActionType.SELECT_OPTION,
  selectTab: ActionType.SELECT_TAB,
  
  // Input functions
  fillInput: ActionType.FILL_INPUT,
  fillForm: ActionType.FILL_FORM,
  toggleControl: ActionType.TOGGLE_CONTROL,
  submitForm: ActionType.SUBMIT_FORM,
  
  // Interaction functions
  clickButton: ActionType.CLICK_BUTTON,
  expandCollapse: ActionType.EXPAND_COLLAPSE,
  openModal: ActionType.OPEN_MODAL,
  closeModal: ActionType.CLOSE_MODAL,
  playMedia: ActionType.PLAY_MEDIA,
  
  // Contextual functions
  mapZoom: ActionType.MAP_ZOOM,
  mapFocus: ActionType.MAP_FOCUS,
  filterContent: ActionType.FILTER_CONTENT,
  sortContent: ActionType.SORT_CONTENT,
  switchView: ActionType.SWITCH_VIEW,
};

/**
 * Check if a function name is mapped to an action
 */
export function isBotAction(functionName: string): boolean {
  return functionName in functionToActionMap;
}

/**
 * Handle a function call by mapping it to an action
 */
export async function handleFunctionCall(
  functionCall: FunctionCallParams
): Promise<FunctionCallResult> {
  try {
    // Check if this is a supported bot action
    if (!isBotAction(functionCall.name)) {
      return {
        success: false,
        error: `Function "${functionCall.name}" is not a supported bot action`,
      };
    }
    
    // Parse arguments
    let args: Record<string, any>;
    try {
      args = JSON.parse(functionCall.arguments);
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse arguments: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    
    // Get the corresponding action type
    const actionType = functionToActionMap[functionCall.name];
    
    // Log the function call
    console.log(`[FunctionCallMapper] Mapping function "${functionCall.name}" to action "${actionType}"`, args);
    
    // Execute the action
    const result = await actionDispatcher.executeAction(actionType, args);
    
    // Return result
    return {
      success: result.success,
      data: result.data,
      error: result.error,
    };
  } catch (error) {
    console.error(`[FunctionCallMapper] Error handling function call "${functionCall.name}":`, error);
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Define the OpenAI function schemas for the bot actions
 */
export function getBotActionFunctionDefinitions(): any[] {
  return [
    // Navigation functions
    {
      type: "function",
      name: "navigatePage",
      description: "Navigate to a different page in the application",
      parameters: {
        type: "object",
        properties: {
          pageName: {
            type: "string",
            description: "The page to navigate to (e.g., 'home', 'search_results', 'place_details')"
          },
          pageParams: {
            type: "object",
            description: "URL parameters for the page (e.g., {id: 'place123'})"
          }
        },
        required: ["pageName"]
      }
    },
    
    // Selection functions
    {
      type: "function",
      name: "selectItem",
      description: "Select an item from a list or grid of items",
      parameters: {
        type: "object",
        properties: {
          itemType: {
            type: "string",
            description: "The type of item to select (e.g., 'place', 'restaurant', 'product')"
          },
          itemId: {
            type: "string",
            description: "The identifier for the specific item to select"
          },
          listContext: {
            type: "string",
            description: "Optional context identifying which list contains the item"
          }
        },
        required: ["itemType", "itemId"]
      }
    },
    
    // Input functions
    {
      type: "function",
      name: "fillForm",
      description: "Fill form fields with values",
      parameters: {
        type: "object",
        properties: {
          formId: {
            type: "string",
            description: "The identifier for the form to fill"
          },
          formValues: {
            type: "object",
            description: "Key-value pairs of form field names and their values"
          },
          autoSubmit: {
            type: "boolean",
            description: "Whether to automatically submit the form after filling"
          }
        },
        required: ["formId", "formValues"]
      }
    },
    
    // Interaction functions
    {
      type: "function",
      name: "clickButton",
      description: "Click a button or interactive element",
      parameters: {
        type: "object",
        properties: {
          buttonId: {
            type: "string",
            description: "The identifier for the button to click"
          },
          contextId: {
            type: "string",
            description: "Optional context identifier if the button belongs to a specific item"
          }
        },
        required: ["buttonId"]
      }
    },
    
    // Contextual functions
    {
      type: "function",
      name: "filterContent",
      description: "Apply filters to content like search results or listings",
      parameters: {
        type: "object",
        properties: {
          filters: {
            type: "object",
            description: "Filter criteria to apply (e.g., {price: 'low', rating: 4})"
          },
          contentType: {
            type: "string",
            description: "The type of content to filter (e.g., 'restaurants', 'products')"
          },
          replace: {
            type: "boolean",
            description: "Whether to replace existing filters or add to them"
          }
        },
        required: ["filters", "contentType"]
      }
    }
  ];
} 