/**
 * Place Guide Agent - Specialized agent for place information and recommendations
 */
import { getCoreSchemasByConfig, getCoreHandlersByConfig, type CoreFunctionConfig } from "../core/functions";
import placeGuide from "./config/agentConfig";

// Include core, skill, and UI tools for the place guide agent
const CORE_FUNCTION_CONFIG: CoreFunctionConfig = { core: true, skill: true, ui: true };
const coreSchemas = getCoreSchemasByConfig(CORE_FUNCTION_CONFIG);
const coreHandlers = getCoreHandlersByConfig(CORE_FUNCTION_CONFIG);

const agentWithCore = {
  ...placeGuide,
  tools: coreSchemas,
  toolLogic: coreHandlers,
};

export default agentWithCore;
