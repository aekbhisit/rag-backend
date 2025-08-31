import { AgentConfig, Tool } from "@/app/types";

/**
 * Dynamic Function Schema Injection
 * 
 * This module provides utilities for dynamically injecting transfer function schemas
 * into agent configurations based on their downstream agent relationships.
 * 
 * Key Features:
 * - Creates agent-specific transfer schemas with custom downstream agent lists
 * - Injects transferAgents function with enum constraints for valid targets
 * - Adds transferBack function to specialized agents
 * - Modifies agent configurations at runtime
 * 
 * This is different from static core functions - it's about runtime configuration
 * based on agent relationships defined in the agent index files.
 */

/**
 * Dynamically injects "transferAgents" function schema into agents based on their downstreamAgents configuration.
 * 
 * @param agentDefs - Array of agent configurations to modify
 * @returns Modified agent configurations with injected transfer tools
 */
export function injectTransferTools(agentDefs: AgentConfig[]): AgentConfig[] {
  // Iterate over each agent definition
  agentDefs.forEach((agentDef) => {
    const downstreamAgents = agentDef.downstreamAgents || [];

    // Only proceed if there are downstream agents
    if (downstreamAgents.length > 0) {
      // Build a list of downstream agents and their descriptions for the prompt
      const availableAgentsList = downstreamAgents
        .map(
          (dAgent) =>
            `- ${dAgent.name}: ${dAgent.publicDescription ?? "No description"}`
        )
        .join("\n");

      // Create the transfer_agent tool specific to this agent
      const transferAgentTool: Tool = {
        type: "function",
        name: "transferAgents",
        description: `Triggers a transfer of the user to a more specialized agent. 
  Calls escalate to a more specialized LLM agent or to a human agent, with additional context. 
  Only call this function if one of the available agents is appropriate. Don't transfer to your own agent type.
  
  Let the user know you're about to transfer them before doing so.
  
  Available Agents:
  ${availableAgentsList}
        `,
        parameters: {
          type: "object",
          properties: {
            rationale_for_transfer: {
              type: "string",
              description: "The reasoning why this transfer is needed.",
            },
            conversation_context: {
              type: "string",
              description:
                "Relevant context from the conversation that will help the recipient perform the correct action.",
            },
            destination_agent: {
              type: "string",
              description:
                "The more specialized destination_agent that should handle the user's intended request.",
              enum: downstreamAgents.map((dAgent) => dAgent.name),
            },
          },
          required: [
            "rationale_for_transfer",
            "conversation_context",
            "destination_agent",
          ],
        },
      };

      // Ensure the agent has a tools array
      if (!agentDef.tools) {
        agentDef.tools = [];
      }

      // Add the newly created tool to the current agent's tools
      agentDef.tools.push(transferAgentTool);
    }

    // so .stringify doesn't break with circular dependencies
    agentDef.downstreamAgents = agentDef.downstreamAgents?.map(
      ({ name, publicDescription }) => ({
        name,
        publicDescription,
      })
    );
  });

  return agentDefs;
}

/**
 * This adds a "transferBack" tool to specialized agents to allow them to transfer back to the default agent.
 */
export function injectTransferBackTools(agentDefs: AgentConfig[], defaultAgentName: string = "default"): AgentConfig[] {
  agentDefs.forEach((agentDef) => {
    // Skip adding transfer back tool to the default agent itself
    if (agentDef.name === defaultAgentName) {
      return;
    }

    // Create the transfer back tool
    const transferBackTool: Tool = {
      type: "function",
      name: "transferBack",
      description: `Transfer the user back to the main default agent when:
- The user wants to start over or explore other options
- The user asks for services outside your specialization
- The user indicates they want to return to the main menu
- The conversation is complete and they need general assistance

Let the user know you're transferring them back to the main assistant before doing so.`,
      parameters: {
        type: "object",
        properties: {
          rationale_for_transfer: {
            type: "string",
            description: "The reasoning why you're transferring back to the default agent.",
          },
          conversation_context: {
            type: "string",
            description: "Summary of what was accomplished and any context the default agent should know.",
          },
        },
        required: [
          "rationale_for_transfer",
          "conversation_context",
        ],
      },
    };

    // Ensure the agent has a tools array
    if (!agentDef.tools) {
      agentDef.tools = [];
    }

    // Add the transfer back tool to the current agent's tools
    agentDef.tools.push(transferBackTool);
  });

  return agentDefs;
}
