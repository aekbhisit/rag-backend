import type { Tool } from "@/app/types";

export const placeGuideTools: Tool[] = [
  {
    type: "function",
    name: "placeKnowledgeSearch",
    description: "Search nearby places/POIs with optional explicit filters.",
    parameters: {
      type: "object",
      properties: {
        searchQuery: { type: "string", description: "User query or keywords" },
        category: {
          type: "string",
          description: "Optional explicit category override",
          enum: ["Cafe", "Restaurant", "Attraction", ""],
        },
        lat: { type: "number", description: "Latitude override (optional)" },
        long: { type: "number", description: "Longitude override (optional)" },
        maxDistanceKm: { type: "number", description: "Search radius in km (default 5)" },
        maxResults: { type: "number", description: "Max results (default 3)" },
      },
      required: ["searchQuery"],
    },
  },
];


