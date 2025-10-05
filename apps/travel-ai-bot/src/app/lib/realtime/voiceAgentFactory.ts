import { RealtimeAgent } from '@openai/agents/realtime';
import { createVoiceModeAgent } from '@/app/lib/sdk-agent-wrapper';
// Core/UI schemas are not injected automatically; voice tools come from DB-configured agent.tools
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

  // 2) Create SDK agents directly from DB-provided tools (no core injection)
  const sdkAgents = agentsWithDownstream.map(agentConfig => {
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


