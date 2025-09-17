import { AgentConfig } from "@/app/types";
import salesAgent from "./sales";
// Note: transferAgents and transferBack are now core tools, no injection needed
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

// Note: transferAgents and transferBack are now core tools, no injection needed
export default agents;