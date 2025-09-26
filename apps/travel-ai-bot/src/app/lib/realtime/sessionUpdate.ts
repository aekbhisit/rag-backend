export interface UpdateSessionDeps {
  sendEventSafe: (evt: any) => boolean;
  isConnected: () => boolean;
  getSelectedAgentName: () => string;
  getAgentInstructions: () => { instructions: string; source: 'instructions' | 'systemPrompt' | 'none' } | null;
}

export interface UpdateSessionOptions {
  isPTTActive: boolean;
  transcriptionLanguage?: string;
  shouldTriggerResponse?: boolean;
  safeCreateResponse: () => Promise<boolean>;
}

/**
 * Build and send session.update payload for PTT mode and optional kickoff.
 * Logs useful information for debugging.
 */
export async function updateRealtimeSession(
  deps: UpdateSessionDeps,
  opts: UpdateSessionOptions
): Promise<void> {
  const { sendEventSafe, isConnected, getSelectedAgentName, getAgentInstructions } = deps;
  const { isPTTActive, transcriptionLanguage, shouldTriggerResponse = false, safeCreateResponse } = opts;

  if (!isConnected()) {
    console.log('[SDK-Realtime] ⏭️ Skipping updateSession - not connected');
    return;
  }

  // PTT-only: disable server VAD always; we capture only during PTT via input_audio_buffer.*
  const turnDetection = null;

  console.log('[SDK-Realtime] 🔄 Updating session:', {
    selectedAgentName: getSelectedAgentName(),
    isPTTActive,
    turnDetection,
    shouldTriggerResponse,
    timestamp: new Date().toISOString()
  });

  // Log the system prompt that will be used by the selected agent for clarity
  try {
    const info = getAgentInstructions();
    if (info) {
      console.log('[SDK-Realtime] 🧾 updateSession: system prompt for agent:', {
        agentName: getSelectedAgentName(),
        systemPromptLength: info.instructions.length,
        systemPromptPreview: info.instructions,
        fullSystemPrompt: info.instructions,
        source: info.source
      });
    }
  } catch {}

  try {
    // Build enriched instructions similar to text-mode
    let enrichedInstructions: string | undefined;
    try {
      const info = getAgentInstructions();
      const base = info?.instructions || '';
      const language = (transcriptionLanguage || 'en').split('-')[0];
      const path = typeof window !== 'undefined' ? (window.location?.pathname || '') : '';
      const locationHint = path ? `\nCurrent page path: ${path}` : '';
      let guidance = '';
      if (path) {
        const parts = path.split('/').filter(Boolean);
        const isSpecific = parts.length >= 2; // e.g. /travel/taxi
        if (isSpecific) {
          guidance = `\nIf the Current page path points to a specific travel page, DO NOT call navigate again. Prefer using the extractContent tool with an appropriate scope to read on-screen content and answer.`;
        } else {
          guidance = `\nIf the Current page path is a generic hub (e.g., /travel) and the user asks to view specific information, PREFER calling the navigate tool to the most relevant in-app page. After navigation, you may call extractContent if needed to answer.`;
        }
      }
      enrichedInstructions = base
        ? `${base}\n\n[Channel=realtime, Language=${language}]${locationHint}${guidance}`
        : `You are a helpful assistant. Channel=realtime. Language=${language}.${locationHint}${guidance}`;
    } catch {}

    const sessionPayload: any = {
      type: 'session.update',
      session: {
        turn_detection: turnDetection,
        input_audio_transcription: {
          model: 'gpt-4o-mini-transcribe',
          language: transcriptionLanguage,
        },
        ...(enrichedInstructions ? { instructions: enrichedInstructions } : {})
      }
    };

    // Do not update voice here to avoid cannot_update_voice; rely on agent voice config
    sendEventSafe(sessionPayload);
    console.log('[SDK-Realtime] ✅ Session update sent successfully for agent:', getSelectedAgentName(), {
      includedVoice: false
    });

    // When PTT is active, clear any existing audio buffer
    if (isPTTActive) {
      sendEventSafe({ type: 'input_audio_buffer.clear' });
    }

    // Send initial message to trigger agent response (OpenAI approach)
    if (shouldTriggerResponse) {
      const messageId = `msg-${Date.now()}`;
      sendEventSafe({
        type: 'conversation.item.create',
        item: {
          id: messageId,
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'hi' }],
        },
      });
      await safeCreateResponse();
      console.log('[SDK-Realtime] ✅ Sent initial trigger message to new agent');
    }
  } catch (e) {
    console.error('[SDK-Realtime] ❌ Failed to update session:', {
      error: e,
      selectedAgentName: getSelectedAgentName(),
      timestamp: new Date().toISOString()
    });
  }
}


