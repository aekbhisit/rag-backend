type Ref<T> = { current: T };

export interface SessionEventDeps {
  // Basic helpers
  sendEventSafe: (evt: any) => boolean;
  setIsConnected: (v: boolean) => void;
  setIsConnecting: (v: boolean) => void;
  setMicEnabled?: (enabled: boolean) => void;
  setActiveAgentNameState?: (name: string) => void;
  onAgentTransfer?: (name: string) => void;
  onError?: (e: Error) => void;
  setError: (msg: string | null) => void;
  updateSession: () => void;

  // Refs and state used across handlers
  sessionRef: Ref<any>;
  selectedAgentNameRef: Ref<string>;
  allAgentConfigsRef: Ref<any[]>;
  audioElementRef: Ref<HTMLAudioElement | null>;
  allowAgentRunsRef: Ref<boolean>;
  currentResponseRef: Ref<any>;
  aiPlaceholderCreatedRef: Ref<boolean>;
  userTranscriptionCompleteRef: Ref<boolean>;
  functionCallNameByIdRef: Ref<Map<string, string>>;
  assistantResponseHandledRef: Ref<boolean>;
  currentOutputAgentRef: Ref<string>;
  appliedVoiceRef: Ref<string>;
  transferContextRef: Ref<{agentName: string, rationale: string, context: string} | null>;
  handoffKickoffSentRef: Ref<boolean>;

  // Response queue tools
  waitForResponseDone: () => Promise<void>;
  resetResponseCompletionPromise: () => void;
  processResponseQueue: () => void | Promise<void>;
  responseCompletionResolveRef: Ref<(() => void) | null>;

  // Callbacks
  onResponseStart?: () => void;
  onResponseStartFromDelta?: (agentName?: string) => void;
  onResponseDelta?: (delta: string) => void;
  onResponseDone?: (text: string, agentName?: string) => void;
  acceptResponses?: boolean;
  shouldAcceptResponseStart?: () => boolean;
  onTranscript?: (text: string) => void;
  onTranscriptDelta?: (delta: string) => void;
  onUserVoiceItemCreated?: (initialText?: string) => void;
  markUserInteraction: () => void;

  // Agents payload getter for connect
  getAgents: () => any[];
}

export function registerSessionEventHandlers(session: any, deps: SessionEventDeps) {
  // Error handler
  (session as any).on('error', (err: any) => {
    const errorMessage = err?.message || (err as any)?.error?.message || err?.type || 'Session error';
    try {
      console.log('[SDK-Realtime] ❌ Detailed error analysis:', {
        timestamp: new Date().toISOString(),
        event: 'error',
        message: err?.message || 'Unknown error',
        type: err?.type || 'unknown',
        code: err?.code || 'unknown',
        name: err?.name || 'Error',
      });
      console.error('[SDK] Session error:', err);
    } catch {}
    deps.setError(errorMessage);
    deps.onError?.(new Error(errorMessage));
  });

  // Agent handoff
  session.on('agent_handoff', async (event: any) => {
    try {
      console.log('[SDK-Realtime] 🎯 AGENT HANDOFF EVENT DETECTED!', { rawEvent: event, timestamp: new Date().toISOString() });
      deps.handoffKickoffSentRef.current = false;
      const history = event.context?.history || [];
      const lastItem = history[history.length - 1];
      let parsedName: string | undefined;
      if (lastItem?.name && typeof lastItem.name === 'string') {
        if (lastItem.name.startsWith('transfer_to_')) parsedName = lastItem.name.replace('transfer_to_', '');
        else if (lastItem.name.startsWith('transferAgents')) parsedName = lastItem.name.replace('transferAgents', '');
      }
      const agentName = parsedName || event.agent_name || '';

      // Try to retrieve handoff summary
      let handoffSummary = '';
      try {
        for (let i = history.length - 1; i >= 0; i--) {
          const it = history[i];
          if (it?.type === 'function_call' && typeof it?.arguments === 'string') {
            try {
              const parsed = JSON.parse(it.arguments);
              if (typeof parsed?.handoff_summary === 'string' && parsed.handoff_summary.trim().length > 0) {
                handoffSummary = parsed.handoff_summary.trim(); break;
              }
            } catch {}
          }
        }
      } catch {}

      if (agentName) {
        try {
          deps.setActiveAgentNameState?.(agentName);
          deps.onAgentTransfer?.(agentName);
          deps.selectedAgentNameRef.current = agentName;
          console.log('[SDK-Realtime] ✅ UI agent switched on handoff to:', agentName);
        } catch (e) { console.warn('[SDK-Realtime] ⚠️ Failed to sync UI on handoff', e); }
      }

      try { await deps.waitForResponseDone(); } catch {}
      try {
        const kickoff = handoffSummary && handoffSummary.length > 0 ? handoffSummary : '';
        deps.transferContextRef.current = { agentName: agentName || '', rationale: '', context: kickoff };
        deps.handoffKickoffSentRef.current = false;
        console.log('[SDK-Realtime] 📝 Stored kickoff summary for agent (deferred until response.done):', agentName);
      } catch {}
    } catch {}
  });

  // Connect
  ;(session as any).on('connect', () => {
    try {
      console.log('[SDK-Realtime] 🔌 connect:', { timestamp: new Date().toISOString(), event: 'connect', isConnected: true, isConnecting: false });
      deps.setIsConnected(true);
      deps.setIsConnecting(false);
      try {
        if (typeof (session as any).setAgents === 'function') {
          (session as any).setAgents(deps.getAgents());
          console.log('[SDK-Realtime] ✅ Registered all agents with session on connect via setAgents');
        } else {
          console.warn('[SDK-Realtime] ⚠️ session.setAgents not available on connect');
        }
      } catch (e) { console.warn('[SDK-Realtime] ⚠️ Failed to register agents on connect', e); }
      try { (session as any).mute?.(true); } catch {}
      try { deps.setMicEnabled?.(false); } catch {}
      deps.updateSession();
    } catch {}
  });

  // Disconnect
  ;(session as any).on('disconnect', () => {
    try {
      console.log('[SDK-Realtime] 🔌 disconnect:', { timestamp: new Date().toISOString(), event: 'disconnect', isConnected: false, isConnecting: false });
      deps.setIsConnected(false);
      deps.setIsConnecting(false);
    } catch {}
  });

  // Transport events
  ;(session as any).on('transport_event', async (event: any) => {
    if (event.type == 'response.done') {
      try {
        console.log('[SDK-Realtime] 🚌 transport_event:', {
          timestamp: new Date().toISOString(), eventType: event.type, rawEvent: event,
          itemId: event.item_id, hasTranscript: !!event.transcript, hasDelta: !!event.delta,
          transcript: event.transcript, delta: event.delta
        });
      } catch {}
    }

    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed': {
        const itemId = event.item_id;
        const finalTranscript = (event.transcript || '').trim();
        if (itemId && deps.onTranscript && finalTranscript) {
          deps.onTranscript(finalTranscript);
          deps.userTranscriptionCompleteRef.current = true;
        }
        break;
      }
      case 'conversation.item.input_audio_transcription.delta': {
        if (event.delta && deps.onTranscriptDelta) {
          try { deps.onTranscriptDelta(event.delta); } catch (e) { console.error('[SDK] onTranscriptDelta error:', e); }
        }
        break;
      }
      case 'conversation.item.input_audio_transcription.failed': {
        console.warn('[SDK] Transcription failed:', event);
        break;
      }
      case 'response.audio_transcript.delta': {
        const itemId = event.item_id;
        const deltaText = event.delta || '';
        if (itemId && deltaText) {
          if (deps.onResponseStartFromDelta && !deps.aiPlaceholderCreatedRef.current) {
            try {
              if (!deps.currentResponseRef.current) {
                deps.currentResponseRef.current = {
                  id: `response-${Date.now()}`, type: 'audio_transcript', created_at: new Date().toISOString(), content: [], placeholderCreated: false
                };
              }
              try {
                if (deps.audioElementRef.current) {
                  deps.audioElementRef.current.muted = false;
                  deps.audioElementRef.current.play().catch(() => {});
                }
              } catch {}
              deps.onResponseStartFromDelta(deps.currentOutputAgentRef.current);
              deps.aiPlaceholderCreatedRef.current = true;
              if (deps.currentResponseRef.current) deps.currentResponseRef.current.placeholderCreated = true;
            } catch (e) { console.error('[SDK] onResponseStartFromDelta error:', e); }
          }
          if (deps.onResponseDelta) {
            try { deps.onResponseDelta(deltaText); } catch (e) { console.error('[SDK] response.audio_transcript.delta error:', e); }
          }
        }
        break;
      }
      case 'response.audio_transcript.done': {
        const itemId = event.item_id;
        const finalTranscript = (event.transcript || '').trim();
        if (itemId && finalTranscript && deps.onResponseDone) {
          try {
            console.log('[SDK-Realtime] 🗣️ Assistant transcript done from agent:', deps.currentOutputAgentRef.current);
            deps.assistantResponseHandledRef.current = true;
            deps.onResponseDone(finalTranscript, deps.currentOutputAgentRef.current);
          } catch (e) { console.error('[SDK] response.audio_transcript.done error:', e); }
        }
        break;
      }
      case 'response.function_call_arguments.done': {
        const resolvedName = (event.name || (event.call_id ? deps.functionCallNameByIdRef.current.get(event.call_id) : undefined) || undefined);
        console.log('[SDK-Realtime] 🔧 function_call_arguments.done:', {
          timestamp: new Date().toISOString(), eventType: 'response.function_call_arguments.done', rawEvent: event,
          itemId: event.item_id, functionName: resolvedName, arguments: event.arguments, callId: event.call_id, status: event.status
        });
        break;
      }
      case 'response.output_item.done': {
        console.log('[SDK-Realtime] 📤 output_item.done:', {
          timestamp: new Date().toISOString(), eventType: 'response.output_item.done', rawEvent: event,
          itemId: event.item_id, itemType: event.item?.type, functionName: event.item?.name, arguments: event.item?.arguments,
          callId: event.item?.call_id, status: event.item?.status, responseId: event.response_id
        });
        try {
          if (event.item?.type === 'function_call' && event.item?.call_id && event.item?.name) {
            deps.functionCallNameByIdRef.current.set(event.item.call_id, event.item.name);
          }
        } catch {}
        if (event.item?.type === 'message' || event.item?.type === 'assistant_response' || event.item?.type === 'audio_transcript') {
          console.log('[SDK-Realtime] 🧩 Output item attributed to agent:', deps.currentOutputAgentRef.current);
        }
        break;
      }
      case 'response.done': {
        try {
          console.log('[SDK-Realtime] 🏁 response.done transport event:', {
            timestamp: new Date().toISOString(), eventType: 'response.done', rawEvent: event,
            responseId: event.response?.id, status: event.response?.status, output: event.response?.output,
            hasOutput: !!event.response?.output?.length, voice: event.response?.voice || 'unknown', appliedVoice: deps.appliedVoiceRef.current || 'unknown'
          });
        } catch {}
        // Reset response state
        try {
          // Mark not active and unlock via queue controller public refs
          (deps as any).isResponseActiveRef && ((deps as any).isResponseActiveRef.current = false);
          (deps as any).activeResponseIdRef && ((deps as any).activeResponseIdRef.current = null);
          (deps as any).responseCreationLockRef && ((deps as any).responseCreationLockRef.current = false);
        } catch {}
        console.log('[SDK-Realtime] 🔄 Response state reset - ready for new responses');
        if (deps.responseCompletionResolveRef?.current) {
          try { deps.responseCompletionResolveRef.current(); deps.resetResponseCompletionPromise(); console.log('[SDK-Realtime] ✅ Response completion promise resolved'); } catch {}
        }
        try { await deps.processResponseQueue(); } catch {}

        // Fallback transcript extraction
        try {
          const outputs = Array.isArray(event.response?.output) ? event.response.output : [];
          let transcriptText = '';
          for (const item of outputs) {
            if (item?.type === 'message' && Array.isArray(item.content)) {
              for (const c of item.content) {
                if (typeof c?.transcript === 'string' && c.transcript.trim().length > 0) { transcriptText = c.transcript.trim(); break; }
                if (typeof c?.text === 'string' && c.text.trim().length > 0) { transcriptText = c.text.trim(); break; }
              }
            }
            if (transcriptText) break;
          }
          if (transcriptText) {
            console.log('[SDK-Realtime] 🧩 Using response.done transcript fallback from agent:', deps.currentOutputAgentRef.current);
            try { deps.onResponseStartFromDelta?.(deps.currentOutputAgentRef.current); } catch (e) { console.warn('[SDK] onResponseStartFromDelta fallback error:', e); }
            try { deps.onResponseDone?.(transcriptText, deps.currentOutputAgentRef.current); } catch (e) { console.warn('[SDK] onResponseDone fallback error:', e); }
          }
        } catch (e) { console.warn('[SDK] Fallback transcript extraction failed:', e); }
        break;
      }
      case 'session.updated': {
        console.log('[SDK-Realtime] 🔄 session.updated transport event');
        break;
      }
    }
  });

  // Response created
  ;(session as any).on('response.created', (data: any) => {
    (deps as any).isResponseActiveRef && ((deps as any).isResponseActiveRef.current = true);
    (deps as any).activeResponseIdRef && ((deps as any).activeResponseIdRef.current = data.id);
    deps.assistantResponseHandledRef.current = false;
    try {
      if (deps.audioElementRef.current) {
        deps.audioElementRef.current.muted = false;
        deps.audioElementRef.current.play().catch(() => {});
      }
    } catch {}
    console.log('[SDK-Realtime] 🆕 response.created:', {
      timestamp: new Date().toISOString(), event: 'response.created', rawData: data, responseId: data.id, responseType: data.type, createdAt: data.created_at
    });
    deps.currentResponseRef.current = { id: data.id, type: data.type, created_at: data.created_at, content: [] };
    deps.aiPlaceholderCreatedRef.current = false;
    if (!deps.allowAgentRunsRef.current) {
      try { deps.sendEventSafe({ type: 'response.cancel' }); } catch (e) { console.warn('[SDK] Auto-cancel failed', e); }
      return;
    }
    if (deps.acceptResponses && (!deps.shouldAcceptResponseStart || deps.shouldAcceptResponseStart()) && deps.onResponseStart) {
      try { deps.onResponseStart(); } catch (e) { console.error('[SDK] onResponseStart error:', e); }
    }
  });

  // Agent start
  ;(session as any).on('agent_start', (data: any) => {
    const serverAgentName = (data as any)?.agent_name || (data as any)?.agent?.name || null;
    const effectiveName = serverAgentName || deps.selectedAgentNameRef.current;
    const selectedAgentConfig = (deps.allAgentConfigsRef.current || []).find((c: any) => c.name === effectiveName) || (deps.allAgentConfigsRef.current || [])[0] || null;
    console.log('[SDK-Realtime] 🤖 agent_start:', {
      timestamp: new Date().toISOString(), event: 'agent_start', rawData: data, allowAgentRuns: deps.allowAgentRunsRef.current,
      serverAgentName, uiSelectedAgentName: deps.selectedAgentNameRef.current
    });

    if (selectedAgentConfig) {
      const instructions = selectedAgentConfig.instructions || selectedAgentConfig.systemPrompt || '';
      console.log('[SDK-Realtime] 📝 Agent starting with configuration:', {
        agentName: effectiveName,
        systemPromptLength: instructions.length,
        systemPromptPreview: instructions.substring(0, 300) + '...',
        fullSystemPrompt: instructions,
        source: selectedAgentConfig.instructions ? 'instructions' : (selectedAgentConfig.systemPrompt ? 'systemPrompt' : 'none'),
        toolsCount: selectedAgentConfig.tools?.length || 0,
        toolNames: selectedAgentConfig.tools?.map((t: any) => t.function?.name || t.name) || [],
        downstreamAgents: selectedAgentConfig.downstreamAgents?.map((a: any) => a.name) || []
      });
    }

    try {
      deps.sessionRef.current && (deps.sessionRef.current as any);
      deps.currentOutputAgentRef.current = effectiveName || '';
      console.log('[SDK-Realtime] ✅ Session ready for agent:', effectiveName || null);
      if (serverAgentName && serverAgentName !== effectiveName) {
        deps.setActiveAgentNameState?.(serverAgentName);
        deps.onAgentTransfer?.(serverAgentName);
        console.log('[SDK-Realtime] 🔄 Synced UI selected agent with server agent_start:', serverAgentName);
      }
    } catch {}

    if (!deps.allowAgentRunsRef.current) {
      try { deps.sendEventSafe({ type: 'input_audio_buffer.clear' }); } catch {}
      return;
    }
  });

  // Agent end
  ;(session as any).on('agent_end', async (data: any) => {
    console.log('[SDK-Realtime] 🏁 agent_end:', { timestamp: new Date().toISOString(), event: 'agent_end', rawData: data, allowAgentRuns: deps.allowAgentRunsRef.current });
    if (!deps.allowAgentRunsRef.current) {
      try { deps.sendEventSafe({ type: 'input_audio_buffer.clear' }); } catch {}
      return;
    }
    try { deps.transferContextRef.current = null; deps.handoffKickoffSentRef.current = true; } catch {}
  });

  // response.create (server intent)
  ;(session as any).on('response.create', (data: any) => {
    console.log('[SDK-Realtime] 🎬 response.create:', { timestamp: new Date().toISOString(), event: 'response.create', rawData: data, allowAgentRuns: deps.allowAgentRunsRef.current });
    if (!deps.allowAgentRunsRef.current) {
      try { deps.sendEventSafe({ type: 'input_audio_buffer.clear' }); } catch {}
      return;
    }
  });

  // Conversation item created
  ;(session as any).on('conversation.item.created', (data: any) => {
    console.log('[SDK-Realtime] 💬 conversation.item.created:', {
      timestamp: new Date().toISOString(), event: 'conversation.item.created', rawData: data,
      itemRole: data?.item?.role, itemType: data?.item?.type, itemContent: data?.item?.content,
      hasText: !!(data?.item?.content?.[0]?.text || data?.item?.content?.[0]?.transcript),
      text: data?.item?.content?.[0]?.text || data?.item?.content?.[0]?.transcript || ''
    });

    try {
      const role = data?.item?.role;
      const type = data?.item?.type;
      const text = data?.item?.content?.[0]?.text || data?.item?.content?.[0]?.transcript || '';
      console.log('[SDK-Realtime] 🔍 conversation.item.created analysis:', { role, type, text: (text || '').trim(), hasText: !!(text || '').trim(), isUser: role === 'user' });

      if (role === 'user' && (text || '').trim()) {
        console.log('[SDK-Realtime] 👤 User message detected, calling markUserInteraction()');
        deps.markUserInteraction();
        console.log('[SDK-Realtime] 👤 User interaction marked via SDK conversation.item.created - tools now enabled');
        try {
          if (deps.transferContextRef.current && !deps.handoffKickoffSentRef.current) {
            console.log('[SDK-Realtime] ⏭️ Clearing pending kickoff due to new user message');
            deps.transferContextRef.current = null;
            deps.handoffKickoffSentRef.current = true;
          }
        } catch {}
      } else {
        console.log('[SDK-Realtime] ⏭️ Skipping markUserInteraction - not a user message or no text');
      }

      if (role === 'user' || type === 'input_audio') {
        deps.onUserVoiceItemCreated?.(typeof text === 'string' ? text : undefined);
        try {
          if (deps.transferContextRef.current && !deps.handoffKickoffSentRef.current) {
            console.log('[SDK-Realtime] ⏭️ Clearing pending kickoff due to user audio/input');
            deps.transferContextRef.current = null;
            deps.handoffKickoffSentRef.current = true;
          }
        } catch {}
      }
    } catch (error) {
      console.error('[SDK-Realtime] ❌ Error in conversation.item.created handler:', error);
    }
  });
}


