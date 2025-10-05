/**
 * Default agent navigation configuration
 * - If you want to restrict which pages the default agent can navigate to,
 *   list the allowed travel slugs here (e.g., ["taxi", "tours", "places"]).
 * - Leave as null to allow all pages discovered by the sitemap.
 */
export const DEFAULT_AGENT_ALLOWED_TRAVEL_PAGES: string[] | null = null;

export type PageHint = {
  title?: string;
  description?: string;
  keywords?: string[];
  examples?: string[];
  priority?: number;
};

/**
 * Human-friendly descriptions to help the model select the right page.
 * Keyed by travel slug (e.g., 'taxi' → '/travel/taxi').
 */
export const DEFAULT_AGENT_PAGE_HINTS: Record<string, PageHint> = {
  taxi: {
    title: 'Taxi & Transfers',
    description: 'Request a taxi, book airport transfers, or hire a day tour taxi.',
    keywords: ['taxi', 'cab', 'transfer', 'airport', 'ride'],
    examples: ['I want taxi', 'Book airport taxi', 'Call a cab to the hotel'],
    priority: 0.95,
  },
  tours: {
    title: 'Tours & Packages',
    description: 'Browse and book tours, packages, and curated activities.',
    keywords: ['tour', 'package', 'activities', 'excursion', 'ทัวร์', 'แพคเกจ', 'แพ็กเกจ', 'จองทัวร์', 'ซื้อทัวร์'],
    examples: ['Find a day tour', 'Suggest family tours', 'Book a snorkeling trip', 'สนใจซื้อทัวร์', 'อยากจองทัวร์', 'มีแพคเกจทัวร์ไหม'],
    priority: 0.9,
  },
  places: {
    title: 'Places & Nearby',
    description: 'Discover nearby places such as cafes, restaurants, and attractions.',
    keywords: ['nearby', 'places', 'cafe', 'restaurant', 'attraction'],
    examples: ['Find cafe nearby', 'Attractions near me', 'Good restaurants around here'],
    priority: 0.9,
  },
  itinerary: {
    title: 'Itinerary Planner',
    description: 'Plan or refine your travel itinerary and schedules.',
    keywords: ['itinerary', 'plan', 'schedule', 'trip plan'],
    examples: ['Plan my 3-day trip', 'Adjust my itinerary'],
  },
  'getting-around': {
    title: 'Getting Around',
    description: 'Transport options, routes, and tips for moving around the city.',
    keywords: ['transport', 'bus', 'train', 'boat', 'route'],
    examples: ['How to get to the airport', 'Public transport options'],
  },
  rent: {
    title: 'Rentals',
    description: 'Rent cars, scooters, or bicycles for your stay.',
    keywords: ['rent', 'car', 'scooter', 'bike'],
    examples: ['Rent a scooter', 'Car rental for tomorrow'],
  },
  language: {
    title: 'Language Helpers',
    description: 'Common phrases and language assistance.',
    keywords: ['language', 'thai phrases', 'translation'],
    examples: ['How to say hello in Thai', 'Useful phrases for ordering food'],
  },
  essentials: {
    title: 'Essentials',
    description: 'Money, SIM card, weather, health, and other essentials.',
    keywords: ['sim', 'money', 'weather', 'health'],
    examples: ['Where to buy a SIM', 'What’s the weather like'],
  },
  emergency: {
    title: 'Emergency Info',
    description: 'Emergency contacts and steps to take in urgent situations.',
    keywords: ['emergency', 'police', 'hospital'],
    examples: ['Emergency number', 'Nearest hospital'],
    priority: 1.0,
  },
  accessibility: {
    title: 'Accessibility',
    description: 'Accessibility services, facilities, and guidance.',
    keywords: ['accessibility', 'wheelchair', 'assist'],
    examples: ['Wheelchair access near me'],
  },
  notifications: {
    title: 'Notifications',
    description: 'Travel alerts, notices, and announcements.',
    keywords: ['alert', 'notice', 'notification'],
    examples: ['Any travel alerts?', 'Important notices'],
  },
  'our-hotel': {
    title: 'Our Hotel',
    description: 'Hotel info, services, and on-site facilities.',
    keywords: ['hotel', 'services', 'amenities'],
    examples: ['What facilities does the hotel have?', 'Hotel services'],
  },
  help: {
    title: 'Help & Support',
    description: 'General help topics and guidance.',
    keywords: ['help', 'support', 'faq'],
    examples: ['I need help', 'Support options'],
  },
};


