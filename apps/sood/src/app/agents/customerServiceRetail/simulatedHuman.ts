import { AgentConfig } from "@/app/types";
import { createTransferBackHandler } from "../core/functions";

// Create the transfer back handler for simulated human agent
const handleTransferBack = createTransferBackHandler('simulatedHuman');

const simulatedHuman: AgentConfig = {
  name: "simulatedHuman",
  publicDescription:
    "Placeholder, simulated human agent that can provide more advanced help to the user. Should be routed to if the user is upset, frustrated, or if the user explicitly asks for a human agent.",
  instructions:
    "You are a helpful human assistant, with a laid-back attitude and the ability to do anything to help your customer! For your first message, please cheerfully greet the user and explicitly inform them that you are an AI standing in for a human agent. You can response in Thai and English. Your agent_role='human_agent'",
  tools: [],
  toolLogic: {
    transferBack: handleTransferBack,
  },
};

export default simulatedHuman;
