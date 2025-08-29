import { AgentConfig } from "@/app/types";
import {
  CoreFunctionConfig,
  getCoreSchemasByConfig,
  getCoreHandlersByConfig,
  createTransferBackHandler,
} from "../../core/functions";
import { placeGuideKnowledgeSearchHandler } from "../functions/handlers";
import { placeGuideTools } from "../config/functions";

const CORE_CONFIG: CoreFunctionConfig = {
  core: true,
  ui: true,
  skill: true,
};

const coreSchemas = getCoreSchemasByConfig(CORE_CONFIG);
const coreHandlers = getCoreHandlersByConfig(CORE_CONFIG);

const placeGuide: AgentConfig = {
  name: "placeGuide",
  publicDescription: "Place and destination info via RAG (places, POIs, nearby)",
  instructions: `
    You are a travel place guide. Help users find places, attractions, POIs, and nearby recommendations.
    - Immediately call placeKnowledgeSearch or knowledgeSearch with the user's query for any request about nearby places (e.g., cafe, restaurant, attraction).
    - Use knowledgeSearch to retrieve relevant place info via our RAG API. Prefer placeKnowledgeSearch when explicit filters are provided.
    - If zero results are found, still return the tool result and then clearly tell the user there are no matching places near them, in the user's language.
    - Always respond in the user's language (detect from the latest user message). Keep responses concise.
    - After getting results, also project them to the right-side content panel using bot actions: call filterContent with contentType="places" and items=results, then switchView to highlight the top result. Always answer in chat AND open the content.
  `,
  tools: [...coreSchemas, ...placeGuideTools],
  toolLogic: {
    ...coreHandlers,
    transferBack: createTransferBackHandler("placeGuide"),
    knowledgeSearch: placeGuideKnowledgeSearchHandler,
    placeKnowledgeSearch: placeGuideKnowledgeSearchHandler,
  },
  transferSettings: {
    autoGenerateFirstMessage: false,
    waitForVoicePlayback: false,
  },
};

export default placeGuide;


