/**
 * Agent configurations for the voice-controlled UI system.
 * 
 * This file serves as the entry point for all agent configurations.
 * Each agent set is organized into its own directory with a consistent structure.
 */

import { AllAgentConfigsType } from "@/app/types";
import frontDeskAuthentication from "./frontDeskAuthentication";
import customerServiceRetail from "./customerServiceRetail";
import thaiResortGuide from "./thaiResortGuide";
import defaultAgent from "./default";
import placeGuide from "./placeGuide";
import tourTaxi from "./tourTaxi";

/**
 * Collection of all available agent sets in the application.
 * Each key represents a scenario that can be selected in the UI.
 */
export const allAgentSets: AllAgentConfigsType = {
  default: defaultAgent,
  thaiResortGuide,
  customerServiceRetail,
  frontDeskAuthentication,
  placeGuide,
  tourTaxi,
};

// Default agent set to use when the application starts
export const defaultAgentSetKey = "default"; 