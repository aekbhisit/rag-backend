import { RealtimeAgent } from '@openai/agents/realtime';
import { createVoiceModeAgent } from '@/app/lib/sdk-agent-wrapper';
import { CORE_SCHEMAS, UI_SCHEMAS } from '@/app/agents/core/functions';
import { AgentConfig } from '@/app/types';
import { UniversalMessage } from '@/app/types';

/**
 * Voice Agent Factory
 * -------------------
 *
 * Pure factory for creating voice-mode SDK agents from database configs.
 * - No hard-coded handlers; tool logic remains DB- and @core-driven.
 * - Mirrors logic currently embedded in useSDKRealtimeSession (extracted for clarity).
 */

export interface CreateAllVoiceAgentsOptions {
  sessionId: string;
  onMessage?: (message: UniversalMessage) => void;
}

/**
 * Create all voice-mode agents from DB configs, applying:
 * - Downstream agent wiring
 * - Core and UI schema injection (with voice-mode restrictions)
 * - Handoff links between agents
 */
export function createAllVoiceAgents(
  allAgentConfigs: AgentConfig[],
  options: CreateAllVoiceAgentsOptions
): RealtimeAgent[] {
  try {
    if (!Array.isArray(allAgentConfigs) || allAgentConfigs.length === 0) {
      return [];
    }

    const { sessionId, onMessage } = options;

    console.log('[VoiceAgentFactory] 🔄 Creating voice agents from configs:', allAgentConfigs.map(c => c.name));

    // 1) Add downstream agents to each config
    const agentsWithDownstream = allAgentConfigs.map(agentConfig => {
      const downstreamAgents = allAgentConfigs
        .filter(a => a.name !== agentConfig.name)
        .map(a => ({ name: a.name, publicDescription: a.publicDescription }));

      return {
        ...agentConfig,
        downstreamAgents
      } as AgentConfig & { downstreamAgents: Array<{ name: string; publicDescription?: string }> };
    });

    // 2) Inject core and UI schemas just like text mode, with voice-mode restrictions
    const coreAndUiSchemas = [...CORE_SCHEMAS, ...UI_SCHEMAS];
    // Voice mode: avoid exposing generic transfer tools to the model to prevent confusion
    const SKIP_TOOL_NAMES = new Set(['transferAgents', 'transferBack', 'intentionChange']);
    // Restrict certain tools to specific agents only (from DB design)
    const ONLY_AGENT_FOR_TOOL: Record<string, string> = {
      placeKnowledgeSearch: 'placeGuide',
    };

    const agentsWithCoreFunctions = agentsWithDownstream.map(agentConfig => {
      const existingToolNames = new Set((agentConfig.tools || []).map((t: any) => t.name || t.function?.name));
      const newTools = coreAndUiSchemas.filter(schema => {
        const toolName = (schema as any).name || (schema as any).function?.name;
        if (!toolName) return false;
        // Skip generic transfer tools in voice mode
        if (SKIP_TOOL_NAMES.has(toolName)) return false;
        // Enforce per-agent restriction
        const onlyAgent = ONLY_AGENT_FOR_TOOL[toolName as string];
        if (onlyAgent && agentConfig.name !== onlyAgent) return false;
        return !existingToolNames.has(toolName);
      });

      // Also filter out any existing instances of the skipped tools and enforce per-agent restriction on DB-provided tools
      const filteredExisting = (agentConfig.tools || []).filter((t: any) => {
        const nm = t.name || t.function?.name;
        if (SKIP_TOOL_NAMES.has(nm)) return false;
        const onlyAgent = ONLY_AGENT_FOR_TOOL[nm as string];
        if (onlyAgent && agentConfig.name !== onlyAgent) return false;
        return true;
      });

      return {
        ...agentConfig,
        tools: [...filteredExisting, ...newTools]
      } as AgentConfig;
    });

    console.log('[VoiceAgentFactory] 🧩 Tool injection complete:',
      agentsWithCoreFunctions.map(a => ({ name: a.name, tools: a.tools?.length || 0 }))
    );

    // 3) Create SDK agents
    const sdkAgents = agentsWithCoreFunctions.map(agentConfig => {
      return createVoiceModeAgent(agentConfig, (message: string) => {
        if (!onMessage) return;
        const universalMessage: UniversalMessage = {
          id: `msg-${Date.now()}`,
          sessionId,
          timestamp: new Date().toISOString(),
          type: 'text',
          content: message,
          metadata: {
            source: 'ai',
            channel: 'realtime',
            language: 'en',
            agentName: agentConfig.name
          }
        };
        try { onMessage(universalMessage); } catch {}
      });
    });

    // 4) Wire handoffs: each agent can handoff to all others in the same set
    try {
      sdkAgents.forEach((a: any) => {
        const others = sdkAgents.filter((b: any) => b.name !== a.name);
        (a as any).handoffs = others;
      });
      console.log('[VoiceAgentFactory] 🔗 Handoffs wired between agents:', sdkAgents.map((a: any) => ({
        name: a.name,
        handoffs: (a.handoffs || []).map((h: any) => h.name)
      })));
    } catch (e) {
      console.warn('[VoiceAgentFactory] ⚠️ Failed wiring handoffs', e);
    }

    return sdkAgents;
  } catch (e) {
    console.error('[VoiceAgentFactory] ❌ Failed to create voice agents:', e);
    return [];
  }
}


