import { AgentConfig } from "@/app/types";
import {
  CoreFunctionConfig,
  getCoreSchemasByConfig,
  getCoreHandlersByConfig,
  createTransferBackHandler,
} from "../../core/functions";
import { tourTaxiKnowledgeSearchHandler } from "../functions/handlers";
import { tourTaxiTools } from "../config/functions";

const CORE_CONFIG: CoreFunctionConfig = {
  core: true,
  ui: true,
  skill: true,
};

const coreSchemas = getCoreSchemasByConfig(CORE_CONFIG);
const coreHandlers = getCoreHandlersByConfig(CORE_CONFIG);

const tourTaxi: AgentConfig = {
  name: "tourTaxi",
  publicDescription: "Tours and taxi services info; book-like responses with RAG",
  instructions: `
    You assist with tours and taxi transfer information.
    - Use knowledgeSearch to retrieve tour packages, routes, pricing hints, and taxi info from our RAG.
    - Provide clear options and next steps. If in Thai, respond in Thai.
  `,
  tools: [...coreSchemas, ...tourTaxiTools],
  toolLogic: {
    ...coreHandlers,
    transferBack: createTransferBackHandler("tourTaxi"),
    knowledgeSearch: tourTaxiKnowledgeSearchHandler,
    tourTaxiKnowledgeSearch: tourTaxiKnowledgeSearchHandler,
  },
  transferSettings: {
    autoGenerateFirstMessage: false,
    waitForVoicePlayback: false,
  },
};

export default tourTaxi;


