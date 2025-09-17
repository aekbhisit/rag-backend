/**
 * Thai Resort Guide module exports
 */
// Note: transferAgents and transferBack are now core tools, no injection needed
import { AgentConfig } from "@/app/types";
import { thaiResortFunctions } from "./config/functions";
import { aiIntentionHandler } from "./services/aiIntentionHandler";
import thaiResortGuide from './config/agentConfig';

// Re-export the function handler 
export { useThaiResortFunctionHandler } from './hooks/useFunctionHandler';

// Re-export config, functions and data
export { 
  thaiResortFunctions,
  getThaiResortViewContext, 
  getAvailableArticles 
} from './config/functions';

export { 
  handleThaiResortFunctionCall 
} from './services/actionHandlers';

export {
  CATEGORIES,
  CATEGORY_NAMES,
  resortCategoriesData,
  getArticlesByCategory
} from './data/resortData';

// Update the agent with AI intention system prompt
const updatedThaiResortGuide: AgentConfig = {
  ...thaiResortGuide,
  instructions: aiIntentionHandler.getInitialSystemPrompt(),
  tools: thaiResortFunctions, // Ensure we have the intentionChange function
};

// Apply transfer tools (forward transfers) and transfer back tools
// Note: transferAgents and transferBack are now core tools, no injection needed
const agents = [updatedThaiResortGuide];

export default agents; 