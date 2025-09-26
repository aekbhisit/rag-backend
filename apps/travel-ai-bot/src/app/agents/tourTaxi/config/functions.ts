import type { Tool } from "@/app/types";

export const tourTaxiTools: Tool[] = [
  {
    type: "function",
    name: "tourTaxiKnowledgeSearch",
    description: "Search tours/taxi knowledge with optional max result control.",
    parameters: {
      type: "object",
      properties: {
        searchQuery: { type: "string", description: "User query" },
        maxResults: { type: "number", description: "Maximum results (default 5)" },
      },
      required: ["searchQuery"],
    },
  },
];


