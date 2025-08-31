/**
 * Ticket Marketplace Agent Functions
 * 
 * Function definitions and schemas for the ticket marketplace AI agent,
 * enabling natural language interaction with ticket search, recommendations, and purchases.
 */

import { Tool } from "@/app/types";

/**
 * Search tickets based on user criteria
 */
export const searchTicketsFunction: Tool = {
  type: "function",
  name: "searchTickets",
  description: "Search for event tickets based on user criteria like event type, location, date, and price range",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Natural language search query (e.g., 'football tickets', 'Taylor Swift concert')"
      },
      category: {
        type: "string",
        enum: ["CONCERT", "SPORTS", "THEATER", "COMEDY", "FESTIVAL", "CONFERENCE", "OTHER"],
        description: "Event category to filter by"
      },
      city: {
        type: "string",
        description: "City name to search in (e.g., 'New York', 'Los Angeles')"
      },
      dateFrom: {
        type: "string",
        description: "Start date for event search in YYYY-MM-DD format"
      },
      dateTo: {
        type: "string", 
        description: "End date for event search in YYYY-MM-DD format"
      },
      minPrice: {
        type: "number",
        description: "Minimum ticket price in USD"
      },
      maxPrice: {
        type: "number",
        description: "Maximum ticket price in USD"
      },
      sortBy: {
        type: "string",
        enum: ["RELEVANCE", "PRICE_LOW", "PRICE_HIGH", "DATE", "DISTANCE"],
        description: "Sort order for search results"
      },
      verifiedOnly: {
        type: "boolean",
        description: "Only show verified tickets from trusted sellers"
      },
      transferableOnly: {
        type: "boolean", 
        description: "Only show transferable tickets"
      }
    },
    additionalProperties: false
  }
};

/**
 * Get personalized ticket recommendations
 */
export const getRecommendationsFunction: Tool = {
  type: "function",
  name: "getRecommendations", 
  description: "Get personalized ticket recommendations based on user preferences, history, and behavior",
  parameters: {
    type: "object",
    properties: {
      maxResults: {
        type: "number",
        description: "Maximum number of recommendations to return (default: 10)"
      },
      categories: {
        type: "array",
        items: { type: "string" },
        description: "Preferred event categories for recommendations"
      },
      priceRange: {
        type: "object",
        properties: {
          min: { type: "number" },
          max: { type: "number" }
        },
        description: "Price range for recommendations"
      },
      location: {
        type: "string",
        description: "Preferred location for events"
      }
    },
    additionalProperties: false
  }
};

/**
 * Get detailed information about a specific ticket
 */
export const getTicketDetailsFunction: Tool = {
  type: "function",
  name: "getTicketDetails",
  description: "Get comprehensive details about a specific ticket including event info, venue details, and seller information",
  parameters: {
    type: "object", 
    properties: {
      ticketId: {
        type: "string",
        description: "Unique ID of the ticket to get details for"
      }
    },
    required: ["ticketId"],
    additionalProperties: false
  }
};

/**
 * Display tickets visually using Bot Action Framework
 */
export const displayTicketsFunction: Tool = {
  type: "function",
  name: "displayTickets", 
  description: "Display a list of tickets in the UI using visual cards with images, prices, and event details",
  parameters: {
    type: "object",
    properties: {
      tickets: {
        type: "array",
        items: { type: "object" },
        description: "Array of ticket objects to display"
      },
      title: {
        type: "string",
        description: "Title for the ticket display section"
      },
      layout: {
        type: "string",
        enum: ["grid", "list", "carousel"],
        description: "Layout style for displaying tickets"
      },
      showFilters: {
        type: "boolean",
        description: "Whether to show filter options"
      }
    },
    required: ["tickets"],
    additionalProperties: false
  }
};

/**
 * Check current market pricing for similar tickets
 */
export const checkPricingFunction: Tool = {
  type: "function", 
  name: "checkPricing",
  description: "Analyze market pricing for similar tickets and provide price insights and trends",
  parameters: {
    type: "object",
    properties: {
      eventName: {
        type: "string",
        description: "Name of the event to check pricing for"
      },
      venue: {
        type: "string", 
        description: "Venue name"
      },
      date: {
        type: "string",
        description: "Event date in YYYY-MM-DD format"
      },
      section: {
        type: "string",
        description: "Seating section to analyze pricing for"
      }
    },
    required: ["eventName"],
    additionalProperties: false
  }
};

/**
 * Get venue information and details
 */
export const getVenueInfoFunction: Tool = {
  type: "function",
  name: "getVenueInfo",
  description: "Get detailed information about a venue including location, capacity, amenities, and directions",
  parameters: {
    type: "object",
    properties: {
      venueName: {
        type: "string", 
        description: "Name of the venue"
      },
      city: {
        type: "string",
        description: "City where the venue is located"
      },
      includeDirections: {
        type: "boolean",
        description: "Include driving/public transit directions"
      },
      includeNearbyParking: {
        type: "boolean", 
        description: "Include information about nearby parking"
      }
    },
    required: ["venueName"],
    additionalProperties: false
  }
};

/**
 * Find similar or alternative tickets
 */
export const findSimilarTicketsFunction: Tool = {
  type: "function",
  name: "findSimilarTickets",
  description: "Find similar tickets or alternative events based on a specific ticket or event",
  parameters: {
    type: "object",
    properties: {
      ticketId: {
        type: "string",
        description: "ID of the reference ticket to find similar options"
      },
      eventType: {
        type: "string",
        description: "Type of event to find alternatives for"
      },
      performer: {
        type: "string",
        description: "Artist, team, or performer to find similar acts"
      },
      maxResults: {
        type: "number",
        description: "Maximum number of similar tickets to return"
      }
    },
    additionalProperties: false
  }
};

/**
 * Get trending or popular tickets
 */
export const getTrendingTicketsFunction: Tool = {
  type: "function", 
  name: "getTrendingTickets",
  description: "Get currently trending or most popular tickets in a category or location",
  parameters: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["CONCERT", "SPORTS", "THEATER", "COMEDY", "FESTIVAL", "CONFERENCE", "OTHER"],
        description: "Event category to get trending tickets for"
      },
      location: {
        type: "string",
        description: "City or location to get trending tickets for"
      },
      timeframe: {
        type: "string",
        enum: ["1d", "7d", "30d"],
        description: "Time period for trending analysis (1 day, 7 days, 30 days)"
      }
    },
    additionalProperties: false
  }
};

/**
 * Initiate ticket purchase process
 */
export const initiatePurchaseFunction: Tool = {
  type: "function",
  name: "initiatePurchase", 
  description: "Start the secure purchase process for selected tickets",
  parameters: {
    type: "object",
    properties: {
      ticketId: {
        type: "string",
        description: "ID of the ticket to purchase"
      },
      quantity: {
        type: "number",
        description: "Number of tickets to purchase (default: 1)"
      },
      offerPrice: {
        type: "number", 
        description: "Offer price if negotiating (optional)"
      },
      buyerMessage: {
        type: "string",
        description: "Message to seller (optional)"
      }
    },
    required: ["ticketId"],
    additionalProperties: false
  }
};

/**
 * Send message to ticket seller
 */
export const contactSellerFunction: Tool = {
  type: "function",
  name: "contactSeller",
  description: "Send a message to a ticket seller for questions or negotiations",
  parameters: {
    type: "object",
    properties: {
      ticketId: {
        type: "string", 
        description: "ID of the ticket the message is about"
      },
      message: {
        type: "string",
        description: "Message to send to the seller"
      },
      requestType: {
        type: "string",
        enum: ["QUESTION", "PRICE_NEGOTIATION", "PURCHASE_INQUIRY", "OTHER"],
        description: "Type of message being sent"
      }
    },
    required: ["ticketId", "message"],
    additionalProperties: false
  }
};

/**
 * Save ticket to user's favorites or watchlist
 */
export const saveTicketFunction: Tool = {
  type: "function",
  name: "saveTicket",
  description: "Save a ticket to user's favorites or watchlist for later viewing",
  parameters: {
    type: "object",
    properties: {
      ticketId: {
        type: "string",
        description: "ID of the ticket to save"
      },
      listType: {
        type: "string", 
        enum: ["FAVORITES", "WATCHLIST", "PRICE_ALERTS"],
        description: "Type of list to save ticket to"
      },
      notes: {
        type: "string",
        description: "Personal notes about the ticket (optional)"
      }
    },
    required: ["ticketId"],
    additionalProperties: false
  }
};

/**
 * Set up price alerts for tickets
 */
export const setPriceAlertFunction: Tool = {
  type: "function",
  name: "setPriceAlert",
  description: "Set up price drop alerts for specific tickets or events",
  parameters: {
    type: "object",
    properties: {
      ticketId: {
        type: "string",
        description: "Specific ticket ID to monitor (optional)"
      },
      eventName: {
        type: "string",
        description: "Event name to monitor for new listings"
      },
      targetPrice: {
        type: "number", 
        description: "Price threshold for alerts"
      },
      alertType: {
        type: "string",
        enum: ["PRICE_DROP", "NEW_LISTING", "AVAILABILITY"],
        description: "Type of alert to set up"
      }
    },
    additionalProperties: false
  }
};

// Export all functions as an array
export const ticketMarketplaceFunctions: Tool[] = [
  searchTicketsFunction,
  getRecommendationsFunction, 
  getTicketDetailsFunction,
  displayTicketsFunction,
  checkPricingFunction,
  getVenueInfoFunction,
  findSimilarTicketsFunction,
  getTrendingTicketsFunction,
  initiatePurchaseFunction,
  contactSellerFunction,
  saveTicketFunction,
  setPriceAlertFunction
];