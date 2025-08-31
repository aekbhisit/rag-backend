/**
 * Default Agent - Entry point that can redirect to other agents
 */
import { injectTransferTools } from "../core/functions";
import welcomeAgent from "./config/agentConfig";
// import thaiResortGuide from "../thaiResortGuide";
// import customerServiceRetail from "../customerServiceRetail";
// import frontDeskAuthentication from "../frontDeskAuthentication";

// Add other agents as downstream options for transfer
const agentWithDownstreams = {
  ...welcomeAgent,
  downstreamAgents: [
    { name: "thaiResortGuide", publicDescription: "Thai resort guide for information about resorts and destinations" },
    { name: "customerServiceRetail", publicDescription: "Customer service for retail inquiries and returns" },
    { name: "frontDeskAuthentication", publicDescription: "Front desk services and authentication" }
  ]
};

// Add transfer tools
const agents = injectTransferTools([agentWithDownstreams]);

export default agents; 