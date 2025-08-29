import { injectTransferTools, injectTransferBackTools } from "../core/functions";
import { AgentConfig } from "@/app/types";
import placeGuide from "./config/agentConfig";

const agent: AgentConfig = placeGuide;

let agents = injectTransferTools([agent]);
agents = injectTransferBackTools(agents, "default");

export default agents;


