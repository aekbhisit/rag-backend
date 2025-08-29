import { AgentConfig } from "@/app/types";
import salesAgent from "./sales";
import { injectTransferTools, injectTransferBackTools } from "../core/functions";
import authenticationAgent from "./authentication";
import returnsAgent from "./returns";
import simulatedHuman from "./simulatedHuman";

// Create a fresh array with all the agents
const agents: AgentConfig[] = [
  salesAgent,
  authenticationAgent,
  returnsAgent,
  simulatedHuman,
];

// Add transfer tools for each agent (forward transfers) and transfer back tools
let agentsWithTransfers = injectTransferTools(agents);
agentsWithTransfers = injectTransferBackTools(agentsWithTransfers, "default");

export default agentsWithTransfers;