/**
 * Front Desk Authentication Agent Set
 */
import { AgentConfig } from "@/app/types";
import { injectTransferTools, injectTransferBackTools } from "../core/functions";
import authenticationAgent from "./authentication";
import tourGuideAgent from "./tourGuide";

// Define the agent set
const agents: AgentConfig[] = [
  authenticationAgent,
  tourGuideAgent,
];

// Add transfer tools to each agent (forward transfers) and transfer back tools
let agentsWithTransfers = injectTransferTools(agents);
agentsWithTransfers = injectTransferBackTools(agentsWithTransfers, "default");

export default agentsWithTransfers;