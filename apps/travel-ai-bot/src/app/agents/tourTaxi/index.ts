import { injectTransferTools, injectTransferBackTools } from "../core/functions";
import { AgentConfig } from "@/app/types";
import tourTaxi from "./config/agentConfig";

const agent: AgentConfig = tourTaxi;

let agents = injectTransferTools([agent]);
agents = injectTransferBackTools(agents, "default");

export default agents;


