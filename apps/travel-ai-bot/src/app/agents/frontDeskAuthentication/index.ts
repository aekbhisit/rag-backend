/**
 * Front Desk Authentication Agent Set
 */
import { AgentConfig } from "@/app/types";
// Note: transferAgents and transferBack are now core tools, no injection needed
import authenticationAgent from "./authentication";
import tourGuideAgent from "./tourGuide";

// Define the agent set
const agents: AgentConfig[] = [
  authenticationAgent,
  tourGuideAgent,
];

// Add transfer tools to each agent (forward transfers) and transfer back tools
// Note: transferAgents and transferBack are now core tools, no injection needed
export default agents;