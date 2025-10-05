import { setGlobalAgentHandoffTrigger } from '@/app/lib/sdk-agent-wrapper';

/**
 * Install a global agent handoff trigger that only updates UI state.
 * The OpenAI SDK handles actual agent switching internally.
 */
export function installGlobalHandoffTrigger(opts: {
  isConnected: () => boolean;
  isConnecting: () => boolean;
  setActiveAgentNameState?: (name: string) => void;
  onAgentTransfer?: (name: string) => void;
}) {
  const handoffTrigger = (targetAgent: string, context: any) => {
    console.log('[SDK-Realtime] 🎯 GLOBAL HANDOFF TRIGGER CALLED!', {
      targetAgent,
      context,
      isConnected: opts.isConnected(),
      isConnecting: opts.isConnecting(),
    });
    // UI update only; SDK performs actual handoff
    opts.setActiveAgentNameState?.(targetAgent);
    opts.onAgentTransfer?.(targetAgent);
    console.log('[SDK-Realtime] ✅ Agent handoff completed (UI updated only):', targetAgent);
  };

  setGlobalAgentHandoffTrigger(handoffTrigger);
  return () => setGlobalAgentHandoffTrigger(() => {});
}


