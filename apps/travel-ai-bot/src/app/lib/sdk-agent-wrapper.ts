import { RealtimeAgent, tool } from '@openai/agents/realtime';
import { AgentConfig } from '@/app/types';
import { ALL_HANDLERS } from '@/app/agents/core/functions';

/**
 * VOICE MODE: Direct SDK Agent Creation (No Wrapper Concept)
 *
 * This module provides two APIs:
 * - createVoiceModeAgent: Preferred flow for voice mode that builds a RealtimeAgent
 *   directly from DB configuration without an extra wrapper.
 * - DatabaseAgentWrapper: Legacy compatibility wrapper used primarily for text mode.
 *
 * Key behaviors and constraints:
 * 1. Agents are created from database configs (no hard-coded tools/handlers).
 * 2. Global user interaction state gates tool execution until the user interacts.
 * 3. Handoffs are triggered via a global trigger function supplied by the hook.
 * 4. session.update() should be used for agent switching; sessions are not recreated.
 */

// ===== Global State & Configuration =====
// Global user interaction state - shared across all agents
let globalUserInteracted = false;

/**
 * Mark that a user has interacted at least once.
 * Enables tool execution across all agents for the current session.
 */
export function markGlobalUserInteraction() {
  globalUserInteracted = true;
  console.log('[SDK-Global] 👤 Global user interaction marked - all tools now enabled');
}

// Global agent handoff trigger - will be set by the hook
let globalAgentHandoffTrigger: ((targetAgent: string, context: any) => void) | null = null;

/**
 * Supply the callback used to perform agent handoffs.
 * The caller (hook) owns the implementation and wiring.
 */
export function setGlobalAgentHandoffTrigger(trigger: (targetAgent: string, context: any) => void) {
  globalAgentHandoffTrigger = trigger;
  console.log('[SDK-Global] 🎯 Global agent handoff trigger set');
}

/**
 * Trigger a handoff to a target agent with optional context.
 * This delegates to the callback supplied via setGlobalAgentHandoffTrigger.
 */
export function triggerGlobalAgentHandoff(targetAgent: string, context: any) {
  if (globalAgentHandoffTrigger) {
    console.log('[SDK-Global] 🎯 Triggering global agent handoff:', { targetAgent, context });
    globalAgentHandoffTrigger(targetAgent, context);
  } else {
    console.error('[SDK-Global] ❌ No global agent handoff trigger set');
  }
}

// Cached client location for tools that require lat/long
let cachedClientLocation: { lat: number; long: number } | null = null;
/**
 * Resolve client geolocation if available; otherwise return a default (Bangkok).
 * The value is cached for the session to avoid repeated geolocation prompts.
 */
async function getClientLocationOrDefault(): Promise<{ lat: number; long: number }> {
  if (cachedClientLocation) return cachedClientLocation;
  try {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const loc = await new Promise<{ lat: number; long: number }>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, long: pos.coords.longitude }),
          () => resolve({ lat: 13.7563, long: 100.5018 }),
          { timeout: 5000, enableHighAccuracy: false }
        );
      });
      cachedClientLocation = loc;
      console.log('[SDK-Global] 🌍 Client location resolved:', loc);
      return loc;
    }
  } catch {}
  const fallback = { lat: 13.7563, long: 100.5018 };
  cachedClientLocation = fallback;
  console.log('[SDK-Global] 🌍 Using fallback location:', fallback);
  return fallback;
}

// Select default voice per agent name if not provided in DB config
function selectVoiceForAgent(agentName: string): string {
  try {
    const name = (agentName || '').toLowerCase();
    if (name === 'welcomeagent' || name === 'welcome' || name === 'default' || name === 'รับแขก') {
      console.log('[SDK-Global] 🎯 selectVoiceForAgent: alloy', { name });
      return 'alloy';
    }
    if (name === 'placeguide' || name === 'place_guide') {
      console.log('[SDK-Global] 🎯 selectVoiceForAgent: verse', { name });
      return 'verse';
    }
  } catch {}
  return 'alloy';
}

// Log-once guards to avoid confusing duplicate logs across rebuilds
const TOOLS_LOGGED_AGENTS = new Set<string>();
const PROMPT_LOGGED_AGENTS = new Set<string>();

// ===== Public API: Voice Mode Agent =====
/**
 * Create a RealtimeAgent directly from a database AgentConfig for voice mode.
 * - Preserves dynamic tool mapping. No hard-coded handlers are introduced here.
 * - Defers handoffs to the server or global trigger as appropriate.
 */
export function createVoiceModeAgent(agentConfig: AgentConfig, onMessage?: (message: string) => void): RealtimeAgent {
  // Handle case where tools might not be an array
  if (!agentConfig.tools || !Array.isArray(agentConfig.tools)) {
    return new RealtimeAgent({
      name: agentConfig.name,
      voice: (agentConfig as any).voice || selectVoiceForAgent(agentConfig.name),
      instructions: agentConfig.systemPrompt || ''
    });
  }

  // Debug: Log tools being processed (once per agent)
  if (!TOOLS_LOGGED_AGENTS.has(agentConfig.name)) {
    const toLog = Array.isArray(agentConfig.tools) ? agentConfig.tools : [];
    console.log(`[SDK-Voice] 🔍 Processing tools for ${agentConfig.name}:`, {
      totalTools: toLog.length || 0,
      toolNames: toLog.map((t: any) => t.function?.name || t.name) || [],
      rawTools: toLog.map((t: any) => ({
        name: t.function?.name || t.name,
        type: t.type,
        hasFunction: !!t.function,
        hasName: !!t.name
      })) || []
    });
    TOOLS_LOGGED_AGENTS.add(agentConfig.name);
  }

  // Convert database tools to SDK tool format (DB-defined)
  const dbSdkTools = (agentConfig.tools as any[]).map((dbTool: any) => {
    const toolName = dbTool.function?.name || dbTool.name || 'unnamed';
    // No longer support legacy transferAgents; if present in DB tools, treat as normal unknown tool
    const description = dbTool.function?.description || dbTool.description || '';
    const parameters = dbTool.function?.parameters || dbTool.parameters || {
      type: 'object',
      properties: {},
      required: []
    };

    // Register via tool() for proper SDK shape (needsApproval etc.)
    return tool({
      name: toolName,
      description,
      parameters,
      execute: async (input: any) => {
        // For server-handled per-destination handoff tools, do nothing locally
        if (typeof toolName === 'string' && toolName.startsWith('transfer_to_')) {
          console.log(`[SDK-Voice] 🔁 Server-handled handoff tool invoked locally (no-op): ${toolName}`, input);
          return { ok: true } as any;
        }
        const resolvedName = dbTool.function?.name || dbTool.name;
        console.log(`[SDK-Voice] 🔧 Tool ${resolvedName} called with:`, input);
        
        // Check global user interaction state
        if (!globalUserInteracted) {
          console.log(`[SDK-Voice] 🚫 Blocking ${resolvedName} - no user interaction yet`);
          return {
            success: false,
            message: `Waiting for user interaction before ${resolvedName}`,
            blocked: true
          };
        }

        try {
          // Execute using multiple resolution strategies (text-mode parity)
          let handler: any = (agentConfig as any)?.toolLogic?.[resolvedName];

          if (!handler) {
            handler = (ALL_HANDLERS as any)?.[resolvedName];
          }

          if (typeof handler !== 'function') {
            try {
              const skillKey: string | undefined = (agentConfig as any)?.functionSkillKeys?.[resolvedName];
              if (skillKey && skillKey.startsWith('skill.')) {
                const mod = await import('@/app/agents/core/functions/handlers/skill');
                const map = (mod as any)?.SKILL_KEY_TO_HANDLER || {};
                if (typeof map[skillKey] === 'function') {
                  handler = map[skillKey];
                  console.log(`[SDK-Voice] 🔧 Resolved ${resolvedName} via skill key: ${skillKey}`);
                }
              }
            } catch (e) {
              console.warn('[SDK-Voice] ⚠️ Failed loading skill handlers for', resolvedName, e);
            }
          }

          if (typeof handler !== 'function') {
            try {
              const skillKey: string | undefined = (agentConfig as any)?.functionSkillKeys?.[resolvedName];
              if (skillKey && skillKey.startsWith('ui.')) {
                const modUI = await import('@/app/agents/core/functions/handlers/ui');
                const UI_HANDLERS = (modUI as any)?.UI_HANDLERS || {};
                const uiName = skillKey.split('.')[1];
                const candidate = UI_HANDLERS[resolvedName] || UI_HANDLERS[uiName];
                if (typeof candidate === 'function') {
                  handler = candidate;
                  console.log(`[SDK-Voice] 🔧 Resolved ${resolvedName} via UI skill key: ${skillKey}`);
                }
              }
            } catch (e) {
              console.warn('[SDK-Voice] ⚠️ Failed loading UI handlers for', resolvedName, e);
            }
          }

          if (typeof handler !== 'function') {
            try {
              const modBAF = await import('@/botActionFramework/FunctionCallMapper');
              const getBotActionFunctionDefinitions = (modBAF as any)?.getBotActionFunctionDefinitions;
              const defs = typeof getBotActionFunctionDefinitions === 'function' ? (getBotActionFunctionDefinitions() || []) : [];
              const toolDef = defs.find((t: any) => (t.function?.name || t.name) === resolvedName);
              if (toolDef?.function?.handler && typeof toolDef.function.handler === 'function') {
                handler = toolDef.function.handler;
                console.log(`[SDK-Voice] 🔧 Resolved ${resolvedName} via Bot Action Framework`);
              }
            } catch (e) {
              console.warn('[SDK-Voice] ⚠️ Failed loading Bot Action Framework for', resolvedName, e);
            }
          }

          if (typeof handler === 'function') {
            console.log(`[SDK-Voice] 🔧 Executing ${resolvedName} via resolved handler`);
            let handlerInput = input;
            // Generic geo injection: if tool schema includes lat/long and they are missing, inject client location
            try {
              const schema: any = parameters;
              const props: any = schema && typeof schema === 'object' ? (schema as any).properties : undefined;
              const expectsGeo = !!(props && (props.lat || props.long));
              if (expectsGeo) {
                const needsLat = typeof handlerInput?.lat !== 'number';
                const needsLong = typeof handlerInput?.long !== 'number';
                if (needsLat || needsLong) {
                  const loc = await getClientLocationOrDefault();
                  handlerInput = { lat: loc.lat, long: loc.long, ...handlerInput };
                  console.log('[SDK-Voice] 📍 Injected client location for tool:', { tool: resolvedName, lat: handlerInput.lat, long: handlerInput.long });
                }
              }
            } catch (e) {
              console.warn('[SDK-Voice] ⚠️ Geo injection check failed', e);
            }
            const result = await handler(handlerInput, [] as any);
            return result;
          }

          console.log(`[SDK-Voice] ⚠️ No handler found for ${resolvedName}`);
          return { success: false, message: `No handler found for ${resolvedName}`, error: true };
        } catch (error: any) {
          console.error(`[SDK-Voice] ❌ Error executing ${toolName}:`, error);
          return {
            success: false,
            message: `Error executing ${toolName}: ${error}`,
            error: true
          };
        }
      }
    });
  }).filter(Boolean);

  // Auto-generate transfer_to_{agent} tools for voice handoff based on downstreamAgents
  const downstream: Array<{ name: string; publicDescription?: string }> = (agentConfig as any)?.downstreamAgents || [];
  const autoHandoffTools = downstream.map((a) => tool({
    name: `transfer_to_${a.name}`,
    description: `Handoff to agent ${a.name}${a.publicDescription ? ` – ${a.publicDescription}` : ''}`,
    parameters: {
      type: 'object',
      properties: {
        rationale_for_transfer: { type: 'string' },
        conversation_context: { type: 'string' },
      },
      required: [],
      additionalProperties: true
    } as any,
    execute: async (input: any) => {
      // Server/transport handles the actual handoff; local no-op with logging
      console.log(`[SDK-Voice] 🔁 Requested handoff via transfer_to_${a.name}`, input);
      return { ok: true } as any;
    }
  }));

  // Merge tools: DB-defined + core transferAgents (if needed) + dynamic transfer_to_* handoffs
  const sdkTools = [...dbSdkTools, ...autoHandoffTools];

  // Log the agent's system prompt for debugging (once per agent)
  const instructions = agentConfig.instructions || agentConfig.systemPrompt || '';
  if (!PROMPT_LOGGED_AGENTS.has(agentConfig.name)) {
    console.log(`[SDK-Voice] 📝 Agent ${agentConfig.name} system prompt:`, {
      agentName: agentConfig.name,
      promptLength: instructions.length,
      promptPreview: instructions.substring(0, 200) + '...',
      fullPrompt: instructions,
      source: agentConfig.instructions ? 'instructions' : (agentConfig.systemPrompt ? 'systemPrompt' : 'none')
    });
    PROMPT_LOGGED_AGENTS.add(agentConfig.name);
  }

  return new RealtimeAgent({
    name: agentConfig.name,
    voice: (agentConfig as any).voice || selectVoiceForAgent(agentConfig.name),
    instructions: agentConfig.instructions || agentConfig.systemPrompt || '',
    tools: sdkTools
  });
}

// ===== Legacy API: DatabaseAgentWrapper (Text Mode Compatibility) =====
/**
 * Legacy wrapper that adapts AgentConfig to a RealtimeAgent for non-voice flows.
 * Maintained for compatibility. Prefer createVoiceModeAgent for voice flows.
 */
export class DatabaseAgentWrapper {
  private agentConfig: AgentConfig;
  private sdkAgent: RealtimeAgent;
  private onMessageCallback?: (message: string) => void;

  constructor(agentConfig: AgentConfig, onMessage?: (message: string) => void) {
    this.agentConfig = agentConfig;
    this.onMessageCallback = onMessage;
    this.sdkAgent = this.createSDKAgent();
  }

  // Method to mark that user has interacted (global state)
  public markUserInteraction() {
    globalUserInteracted = true;
    console.log('[SDK-Wrapper] 👤 User interaction detected, enabling tool execution globally', {
      agentName: this.agentConfig.name,
      globalUserInteracted: globalUserInteracted
    });
  }

  // Method to create AI response message based on function call
  private createAIResponseMessage(toolName: string, input: any, result: any) {
    if (!this.onMessageCallback) return;
    
    // Don't create automatic responses if user hasn't interacted yet
    if (!globalUserInteracted) {
      // Skipping AI response - no user interaction yet
      return;
    }

    // Prefer handler-provided text, avoid any hard-coded phrasing
    const preferredText =
      (typeof result?.fallbackText === 'string' && result.fallbackText.trim()) ? result.fallbackText.trim() :
      (typeof result?.message === 'string' && result.message.trim()) ? result.message.trim() : '';

    if (!preferredText) {
      return; // No user-facing text to emit from tool
    }

    console.log('[SDK-Wrapper] 🤖 Tool response text:', preferredText);
    this.onMessageCallback(preferredText);
  }

  /**
   * Build the underlying RealtimeAgent from the current AgentConfig.
   */
  private createSDKAgent(): RealtimeAgent {
    // Agent creation handled silently
    
    // Handle case where tools might not be an array
    if (!this.agentConfig.tools || !Array.isArray(this.agentConfig.tools)) {
      // No valid tools array found, using empty array
      return new RealtimeAgent({
        name: this.agentConfig.name,
        voice: 'alloy',
        instructions: this.agentConfig.systemPrompt || ''
      });
    }
    
    // Convert database tools to SDK tool format
    const sdkTools = this.agentConfig.tools.map((dbTool: any) => {
      return tool({
        name: dbTool.function?.name || dbTool.name || 'unnamed',
        description: dbTool.function?.description || dbTool.description || '',
        parameters: dbTool.function?.parameters || dbTool.parameters || {
          type: 'object',
          properties: {},
          required: []
        },
        execute: async (input: any) => {
          // Use existing function execution system from VoiceChatInterface
          console.log(`[SDK-Wrapper] 🔧 Tool ${dbTool.function?.name || dbTool.name} called with:`, input);
          
          const toolName = dbTool.function?.name || dbTool.name;
          console.log(`[SDK-Wrapper] 🔧 Executing tool: ${toolName}`);
          console.log(`[SDK-Wrapper] 🔧 Input parameters:`, JSON.stringify(input, null, 2));
          
          // Block ALL tools until explicit user interaction occurs (global state)
          if (!globalUserInteracted) {
            console.log(`[SDK-Wrapper] 🚫 Blocking automatic ${toolName} call - no user interaction yet`, {
              globalUserInteracted: globalUserInteracted,
              agentName: this.agentConfig.name
            });
            return {
              success: false,
              message: `Waiting for user interaction before ${toolName}`,
              blocked: true
            };
          }
          
          try {
            // Try to find handler in core functions first
            let handler = (ALL_HANDLERS as any)?.[toolName];
            
            // If no direct handler, try to resolve via skill key mapping
            if (typeof handler !== 'function') {
              try {
                const skillKey: string | undefined = (this.agentConfig as any)?.functionSkillKeys?.[toolName];
                if (skillKey) {
                  const { SKILL_KEY_TO_HANDLER } = await import('@/app/agents/core/functions/handlers/skill');
                  handler = (SKILL_KEY_TO_HANDLER as any)[skillKey];
                }
              } catch (error) {
                console.warn(`[SDK-Wrapper] Failed to load skill handler for ${toolName}:`, error);
              }
            }
            
            // If still no handler, try UI handlers
            if (typeof handler !== 'function') {
              try {
                const { UI_HANDLERS } = await import('@/app/agents/core/functions/handlers/ui');
                handler = (UI_HANDLERS as any)[toolName];
              } catch (error) {
                console.warn(`[SDK-Wrapper] Failed to load UI handler for ${toolName}:`, error);
              }
            }
            
            if (typeof handler === 'function') {
              console.log(`[SDK-Wrapper] 🔧 Found handler for ${toolName}, executing...`);
              const result = await handler(input, [] as any);
              console.log(`[SDK-Wrapper] 🔧 Tool result:`, result);
              
              // Create AI response message for better UX
              this.createAIResponseMessage(toolName, input, result);
              
              return result;
            } else {
              console.warn(`[SDK-Wrapper] ⚠️ No handler found for tool: ${toolName}`);
              return {
                success: false,
                error: `No handler found for tool: ${toolName}`,
                timestamp: new Date().toISOString()
              };
            }
          } catch (error) {
            console.error(`[SDK-Wrapper] ❌ Error executing tool ${toolName}:`, error);
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              timestamp: new Date().toISOString()
            };
          }
        }
      });
    }) || [];

    return new RealtimeAgent({
      name: this.agentConfig.name,
      instructions: this.agentConfig.instructions || this.agentConfig.systemPrompt || '',
      tools: sdkTools
    });
  }

  /**
   * Get the SDK agent instance
   */
  getSDKAgent(): RealtimeAgent {
    return this.sdkAgent;
  }

  /**
   * Get the original database agent configuration
   */
  getAgentConfig(): AgentConfig {
    return this.agentConfig;
  }

  /**
   * Update the agent configuration and recreate the SDK agent
   */
  updateAgentConfig(newConfig: AgentConfig): void {
    this.agentConfig = newConfig;
    this.sdkAgent = this.createSDKAgent();
  }
}

// ===== Factories =====
/**
 * Factory function to create SDK agents from database configurations
 */
export function createSDKAgentFromDB(agentConfig: AgentConfig): DatabaseAgentWrapper {
  return new DatabaseAgentWrapper(agentConfig);
}

/**
 * Create multiple SDK agents from an array of database configurations
 */
export function createSDKAgentsFromDB(agentConfigs: AgentConfig[]): DatabaseAgentWrapper[] {
  return agentConfigs.map(config => createSDKAgentFromDB(config));
}
