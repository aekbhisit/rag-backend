/**
 * Default Agent - Entry point that can redirect to other agents
 */
import { injectTransferTools, getCoreSchemasByConfig, getCoreHandlersByConfig, type CoreFunctionConfig } from "../core/functions";
import { DEFAULT_AGENT_ALLOWED_TRAVEL_PAGES, DEFAULT_AGENT_PAGE_HINTS } from "./config/navigationTargets";
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
    { name: "frontDeskAuthentication", publicDescription: "Front desk services and authentication" },
    { name: "placeGuide", publicDescription: "General place and destination info" },
    { name: "tourTaxi", publicDescription: "Tour packages and taxi transfer info" }
  ]
};

// Include only core and transfer tools for the default agent (no skill-specific functions)
const CORE_FUNCTION_CONFIG: CoreFunctionConfig = { core: true, skill: false, ui: true };
const coreSchemas = getCoreSchemasByConfig(CORE_FUNCTION_CONFIG);
const coreHandlers = getCoreHandlersByConfig(CORE_FUNCTION_CONFIG);

const agentWithCore = {
  ...agentWithDownstreams,
  tools: [
    ...((agentWithDownstreams as any).tools || []),
    ...coreSchemas,
    // Single navigation tool (one-call): provide intent and it resolves & navigates
    {
      type: 'function',
      name: 'navigate',
      description: 'Navigate user to the best-matching /travel page in one call. Provide intent (e.g., "I want taxi"). The assistant will resolve the correct page from the live sitemap. Known example slugs include: ' + Object.keys(DEFAULT_AGENT_PAGE_HINTS).join(', '),
      parameters: {
        type: 'object',
        properties: {
          intent: { type: 'string', description: 'User intent or utterance, e.g., "I want taxi"' }
        },
        required: ['intent']
      }
    },
    // Generic content extraction from UI
    {
      type: 'function',
      name: 'extractContent',
      description: 'Extract structured content from the current screen (lists/cards/details) so you can answer or decide next steps. Use when user refers to items like "first package".',
      parameters: {
        type: 'object',
        properties: {
          scope: { type: 'string', description: "Logical area, e.g., 'tours', 'places', 'taxi', 'help'" },
          limit: { type: 'number', description: 'Max items to return (default 10)' },
          detail: { type: 'boolean', description: 'Include detailed fields where available' }
        }
      }
    },
    // Generic item selection by id/index when appropriate
    {
      type: 'function',
      name: 'selectItem',
      description: 'Select/open an item on the current screen. Prefer after extractContent to resolve the right item.',
      parameters: {
        type: 'object',
        properties: {
          itemType: { type: 'string', description: "Type, e.g., 'tour', 'place', 'article'" },
          itemId: { type: 'string', description: 'ID of the item if known' },
          index: { type: 'number', description: '1-based index in the current list' },
          position: { type: 'string', description: "Alternative to index: 'first'|'second'|'last'" },
          selector: { type: 'string', description: 'Keyword selector, e.g., title snippet' }
        },
        required: ['itemType']
      }
    }
  ],
  toolLogic: {
    ...((agentWithDownstreams as any).toolLogic || {}),
    ...coreHandlers,
    async selectItem(args: any) {
      try {
        const { handleFunctionCall } = await import('@/botActionFramework');
        return await handleFunctionCall({ name: 'selectItem', arguments: JSON.stringify(args || {}) });
      } catch (e: any) {
        return { success: false, error: e?.message || 'Failed to select item' };
      }
    },
    async extractContent(args: any) {
      // Generic pass-through to EXTRACT_CONTENT so the agent can ask for on-screen data
      try {
        const { handleFunctionCall } = await import('@/botActionFramework');
        const result = await handleFunctionCall({ name: 'extractContent', arguments: JSON.stringify(args || {}) });
        return result || { success: false };
      } catch (e: any) {
        return { success: false, error: e?.message || 'Failed to extract content' };
      }
    },
    async navigate(args: any) {
      try {
        const intent = String(args?.intent || '').toLowerCase();
        let candidates: any[] = Array.isArray(args?.candidates) ? args.candidates : [];

        // Build from embedded hints only (no external calls)
        if (!candidates.length) {
          candidates = Object.entries(DEFAULT_AGENT_PAGE_HINTS).map(([slug, h]) => ({
            slug,
            path: `/travel/${slug}`,
            title: h.title || slug,
            description: h.description,
            keywords: h.keywords,
            examples: h.examples,
            priority: h.priority,
          }));
        }

        // Optional allowlist filter
        if (Array.isArray(DEFAULT_AGENT_ALLOWED_TRAVEL_PAGES)) {
          candidates = candidates.filter(c => c.slug && DEFAULT_AGENT_ALLOWED_TRAVEL_PAGES!.includes(c.slug));
        }

        // Score candidates
        const scoreOf = (c: any) => {
          let score = 0;
          const add = (n: number) => (score += n);
          const contains = (s?: string) => typeof s === 'string' && s.toLowerCase().includes(intent);
          if (Array.isArray(c.keywords)) c.keywords.forEach((k: string) => { if (intent.includes(String(k).toLowerCase())) add(3); });
          if (Array.isArray(c.examples)) c.examples.forEach((ex: string) => { if (intent.includes(String(ex).toLowerCase())) add(2); });
          if (contains(c.title)) add(2);
          if (contains(c.description)) add(1);
          if (typeof c.priority === 'number') add(c.priority);
          // prefer shorter paths on tie
          add(Math.max(0, 2 - ((c.path || '').split('/').length - 2) * 0.25));
          return score;
        };

        let best = null as any;
        let bestScore = -Infinity;
        for (const c of candidates) {
          const s = scoreOf(c);
          if (s > bestScore) { bestScore = s; best = c; }
        }
        if (!best || !best.path) return { success: false, error: 'No suitable destination found' };

        // Navigate
        const { handleFunctionCall } = await import('@/botActionFramework');
        await handleFunctionCall({ name: 'navigatePage', arguments: JSON.stringify({ pageName: 'travel', path: best.path }) });
        return { success: true, navigated: best.path, selected: best };
      } catch (e: any) {
        return { success: false, error: e?.message || 'Failed to navigate' };
      }
    }
  }
};

// Add transfer tools
const agents = injectTransferTools([agentWithCore]);

export default agents; 