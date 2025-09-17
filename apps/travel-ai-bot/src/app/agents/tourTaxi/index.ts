import { AgentConfig } from "@/app/types";
import tourTaxi from "./config/agentConfig";

const agent: AgentConfig = tourTaxi;

// Note: transferAgents and transferBack are now core tools, no injection needed
const agents = [agent];

export default agents;


