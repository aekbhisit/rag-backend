import { RealtimeAgent, tool } from '@openai/agents/realtime';

export const travelGuideAgent = new RealtimeAgent({
  name: 'travelGuide',
  voice: 'sage',
  handoffDescription:
    'Specialized travel guide agent that provides recommendations, cultural insights, and detailed information about Thailand destinations.',

  instructions: `
# Personality and Tone
## Identity
You are an expert Thailand travel guide with deep local knowledge and cultural understanding. You've spent years exploring every corner of Thailand, from bustling Bangkok to remote mountain villages. Your expertise covers history, culture, cuisine, transportation, and hidden gems that most tourists never discover.

## Task
Your primary role is to provide comprehensive travel guidance, recommendations, and cultural insights for Thailand. You help travelers discover the best destinations, understand local customs, find authentic experiences, and plan their itineraries.

## Demeanor
You're enthusiastic about sharing Thailand's beauty and culture while being respectful of local traditions. You're patient with questions and always eager to provide detailed, helpful information.

## Tone
Your voice is warm and knowledgeable, with genuine excitement about Thailand's offerings. You speak with authority about local knowledge while remaining approachable and encouraging.

## Level of Enthusiasm
You're highly enthusiastic about Thailand and travel, but you channel this energy into helpful, detailed responses rather than overwhelming excitement.

## Level of Formality
You maintain a professional yet friendly tone, using appropriate language for international travelers while sharing cultural insights respectfully.

## Level of Emotion
You're passionate about travel and culture, showing genuine care for helping travelers have meaningful experiences in Thailand.

## Filler Words
You use natural conversational fillers occasionally to make interactions feel more personal and engaging.

## Pacing
Your pacing is steady and informative, giving travelers time to absorb the wealth of information you provide.

## Other details
You're always ready with practical tips, cultural context, and recommendations that enhance the travel experience.

# Context
- Expertise: Thailand travel, culture, history, cuisine, transportation
- Coverage: All of Thailand with special focus on major destinations
- Languages: English, Thai (cultural context)
- Specialties: Cultural insights, hidden gems, practical travel tips

# Overall Instructions
- Provide detailed, accurate information about Thailand destinations
- Share cultural insights and local customs
- Offer practical travel tips and recommendations
- Help with itinerary planning and destination selection
- Be respectful of local culture and traditions
`,

  tools: [
    tool({
      name: 'get_destination_info',
      description:
        'Get detailed information about a specific destination in Thailand including attractions, culture, and practical tips.',
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description: 'The destination name (e.g., Bangkok, Chiang Mai, Phuket)',
          },
          interests: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Traveler interests (e.g., culture, nature, food, history)',
          },
        },
        required: ['destination'],
        additionalProperties: false,
      },
      execute: async (input: any) => {
        const { destination, interests = [] } = input as { destination: string; interests: string[] };
        
        // Mock destination data - in real implementation, this would query a database
        const destinations: Record<string, any> = {
          'bangkok': {
            name: 'Bangkok',
            highlights: [
              'Grand Palace and Wat Phra Kaew',
              'Chatuchak Weekend Market',
              'Floating Markets (Damnoen Saduak)',
              'Wat Arun (Temple of Dawn)',
              'Jim Thompson House'
            ],
            cultural_tips: [
              'Dress modestly when visiting temples',
              'Remove shoes before entering temples',
              'Don\'t point your feet at people or Buddha images',
              'Use the wai greeting (hands together, slight bow)'
            ],
            best_time: 'November to March (cool season)',
            transportation: 'BTS Skytrain, MRT, tuk-tuks, taxis, river boats'
          },
          'chiang mai': {
            name: 'Chiang Mai',
            highlights: [
              'Old City temples and moat',
              'Doi Suthep Temple',
              'Night Bazaar',
              'Elephant sanctuaries',
              'Hill tribe villages'
            ],
            cultural_tips: [
              'Respectful temple visits',
              'Support ethical elephant experiences',
              'Learn about hill tribe cultures respectfully',
              'Try local Lanna cuisine'
            ],
            best_time: 'November to February (cool season)',
            transportation: 'Songthaews (red trucks), motorbikes, walking'
          },
          'phuket': {
            name: 'Phuket',
            highlights: [
              'Patong Beach',
              'Phi Phi Islands',
              'Big Buddha',
              'Old Phuket Town',
              'James Bond Island'
            ],
            cultural_tips: [
              'Respect beach etiquette',
              'Support local businesses',
              'Be mindful of marine life',
              'Try local seafood'
            ],
            best_time: 'November to April (dry season)',
            transportation: 'Taxis, motorbikes, boats, songthaews'
          }
        };

        const dest = destinations[destination.toLowerCase()] || {
          name: destination,
          highlights: ['Please ask for specific information about this destination'],
          cultural_tips: ['General Thai cultural tips apply'],
          best_time: 'Varies by season',
          transportation: 'Local transportation available'
        };

        return {
          destination: dest,
          interests_matched: interests.length > 0 ? interests : ['general'],
          recommendations: dest.highlights.slice(0, 5)
        };
      },
    }),

    tool({
      name: 'get_cultural_insights',
      description:
        'Provide cultural insights, customs, and etiquette tips for Thailand.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['general', 'temple_etiquette', 'dining', 'greetings', 'clothing', 'festivals'],
            description: 'Specific cultural topic to learn about',
          },
        },
        required: ['topic'],
        additionalProperties: false,
      },
      execute: async (input: any) => {
        const { topic } = input as { topic: string };
        
        const culturalInfo: Record<string, any> = {
          general: {
            title: 'General Thai Culture',
            tips: [
              'Thailand is known as the "Land of Smiles" - smiling is very important',
              'Respect for the monarchy is deeply ingrained in Thai culture',
              'Buddhism is the main religion - be respectful of religious practices',
              'Thai people value harmony and avoiding conflict',
              'Personal space is different - closer than Western cultures'
            ]
          },
          temple_etiquette: {
            title: 'Temple Etiquette',
            tips: [
              'Dress modestly - cover shoulders and knees',
              'Remove shoes before entering temple buildings',
              'Don\'t point feet at Buddha images or people',
              'Don\'t touch monks if you\'re a woman',
              'Keep voice low and be respectful',
              'Don\'t take photos of people praying'
            ]
          },
          dining: {
            title: 'Dining Etiquette',
            tips: [
              'Use spoon and fork (not chopsticks for Thai food)',
              'Don\'t put fork in mouth - use it to push food onto spoon',
              'Try a bit of everything if invited to share',
              'Don\'t waste food - it\'s considered disrespectful',
              'Wait for the host to start eating',
              'Compliment the food - it\'s appreciated'
            ]
          },
          greetings: {
            title: 'Greetings and Social Interaction',
            tips: [
              'Use the wai greeting (hands together, slight bow)',
              'Higher hands and deeper bow show more respect',
              'Don\'t wai children or service staff',
              'Address people by their first name with "Khun" (Mr./Ms.)',
              'Don\'t touch people\'s heads - considered sacred',
              'Use right hand for giving and receiving'
            ]
          }
        };

        return culturalInfo[topic] || culturalInfo.general;
      },
    }),

    tool({
      name: 'plan_itinerary',
      description:
        'Help plan a travel itinerary for Thailand based on interests, duration, and budget.',
      parameters: {
        type: 'object',
        properties: {
          duration_days: {
            type: 'number',
            description: 'Number of days for the trip',
          },
          interests: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Travel interests and preferences',
          },
          budget_level: {
            type: 'string',
            enum: ['budget', 'mid-range', 'luxury'],
            description: 'Budget level for the trip',
          },
          starting_location: {
            type: 'string',
            description: 'Starting location or preferred arrival city',
          },
        },
        required: ['duration_days', 'interests', 'budget_level'],
        additionalProperties: false,
      },
      execute: async (input: any) => {
        const { duration_days, interests, budget_level, starting_location = 'Bangkok' } = input as {
          duration_days: number;
          interests: string[];
          budget_level: string;
          starting_location?: string;
        };

        // Generate a sample itinerary based on inputs
        const itinerary = {
          duration: duration_days,
          budget_level,
          starting_location,
          suggested_destinations: [],
          daily_plan: [],
          budget_estimates: {
            budget: { accommodation: '$10-30/night', food: '$5-15/day', activities: '$10-25/day' },
            'mid-range': { accommodation: '$30-80/night', food: '$15-40/day', activities: '$25-60/day' },
            luxury: { accommodation: '$80+/night', food: '$40+/day', activities: '$60+/day' }
          }
        };

        // Add destinations based on duration and interests
        if (duration_days <= 3) {
          itinerary.suggested_destinations = ['Bangkok'];
        } else if (duration_days <= 7) {
          itinerary.suggested_destinations = ['Bangkok', 'Chiang Mai'];
        } else {
          itinerary.suggested_destinations = ['Bangkok', 'Chiang Mai', 'Phuket'];
        }

        // Generate daily plan
        for (let day = 1; day <= Math.min(duration_days, 7); day++) {
          itinerary.daily_plan.push({
            day,
            activities: [
              `Day ${day} activities based on your interests: ${interests.join(', ')}`,
              'Cultural experiences and local recommendations',
              'Dining suggestions and local cuisine'
            ]
          });
        }

        return itinerary;
      },
    }),
  ],

  handoffs: [],
});
