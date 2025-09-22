import { NextRequest, NextResponse } from "next/server";
import { createCollector } from "@/app/lib/conversationCollector";
import { getMappedBackendSessionId, setMappedBackendSessionId } from "@/app/lib/backendSessionRegistry";
import { estimateMessageTokens } from "@/app/lib/tokenCounter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      session_id,
      role,
      type,
      content,
      channel,
      meta,
      // Optional, prefer provided values when present
      content_tokens: providedContentTokens,
      response_tokens: providedResponseTokens,
      total_tokens: providedTotalTokens,
      model: providedModel,
      latency_ms: providedLatencyMs,
      // Optional prompt/citation attachments
      prompt_template,
      prompt_params,
      tools_declared,
      citations
    } = body || {};

    if (!session_id || !role || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const collector = createCollector();
    
    // Calculate token counts for the message (fallbacks if not provided)
    const contentStr = typeof content === 'string' ? content : (content == null ? '' : String(content));
    const tokenStats = estimateMessageTokens(contentStr, role as any);
    console.log('[MsgLogAPI] Incoming body fields:', {
      role,
      type,
      channel,
      hasContent: !!contentStr,
      providedContentTokens,
      providedResponseTokens,
      providedTotalTokens,
      providedModel,
      providedLatencyMs
    });
    const hasProvidedContentTokens = typeof providedContentTokens === 'number' && !isNaN(providedContentTokens);
    const hasProvidedResponseTokens = typeof providedResponseTokens === 'number' && !isNaN(providedResponseTokens);
    const hasProvidedTotalTokens = typeof providedTotalTokens === 'number' && !isNaN(providedTotalTokens);

    let resolvedContentTokens = hasProvidedContentTokens
      ? providedContentTokens
      : ((role === 'user') ? tokenStats.total_tokens : null);

    // Assistant fallback: derive prompt tokens from totals if available, or estimate from provided prompt text
    if (role === 'assistant' && (resolvedContentTokens == null)) {
      if (hasProvidedTotalTokens && hasProvidedResponseTokens) {
        const diff = (providedTotalTokens as number) - (providedResponseTokens as number);
        if (isFinite(diff) && diff >= 0) {
          resolvedContentTokens = diff;
        }
      }
      // If still null, try to estimate from meta.prompt_estimate_text
      if (resolvedContentTokens == null && meta && typeof meta.prompt_estimate_text === 'string' && meta.prompt_estimate_text.trim() !== '') {
        try {
          const estimateStr = String(meta.prompt_estimate_text);
          const promptEst = estimateMessageTokens(estimateStr, 'user' as any);
          if (promptEst && typeof promptEst.total_tokens === 'number') {
            resolvedContentTokens = promptEst.total_tokens;
          }
        } catch {}
      }
      // Final fallback: estimate from assistant content itself (approximate prompt size)
      if (resolvedContentTokens == null && typeof contentStr === 'string' && contentStr.trim() !== '') {
        try {
          const est = estimateMessageTokens(contentStr, 'user' as any);
          resolvedContentTokens = est?.total_tokens ?? null;
        } catch {}
      }
    }
    const resolvedResponseTokens = (role === 'assistant')
      ? (hasProvidedResponseTokens ? providedResponseTokens : tokenStats.total_tokens)
      : null;
    const resolvedTotalTokens = hasProvidedTotalTokens ? providedTotalTokens : tokenStats.total_tokens;

    const usingEstimated = !(hasProvidedContentTokens || hasProvidedResponseTokens || hasProvidedTotalTokens);
    const resolvedModel = (typeof providedModel === 'string' && providedModel.trim() !== '') ? providedModel : undefined;
    const resolvedLatencyMs = (typeof providedLatencyMs === 'number' && isFinite(providedLatencyMs)) ? providedLatencyMs : undefined;
    console.log('[MsgLogAPI] Resolved token fields:', {
      resolvedContentTokens,
      resolvedResponseTokens,
      resolvedTotalTokens,
      resolvedModel,
      resolvedLatencyMs,
      usingEstimated
    });
    
    // Resolve backend session mapping if available, but do NOT proactively create a new session here.
    // We first attempt to save with the provided session_id (assume it's already a backend id).
    // If that fails, we'll create a new session and map the provided id in the catch block below.
    let mapped = getMappedBackendSessionId(session_id);
    let targetSessionId = mapped || session_id;

    try {
      const saved = await collector.createMessage({
          session_id: targetSessionId,
          role,
          type,
          content: contentStr || null,
          content_tokens: resolvedContentTokens,
          response_tokens: resolvedResponseTokens,
          total_tokens: resolvedTotalTokens,
          ...(resolvedModel ? { model: resolvedModel } : {}),
          ...(typeof resolvedLatencyMs === 'number' ? { latency_ms: resolvedLatencyMs } : {}),
          meta: {
            channel,
            estimated_tokens: usingEstimated,
            token_breakdown: tokenStats,
            usage_source: usingEstimated ? 'estimated' : 'provided',
            // Mark as internal if provided by client (e.g., chain-of-thought or system hints)
            is_internal: meta?.is_internal === true,
            ...(meta || {})
          }
        });
      // Attach prompt/citations if provided
      try {
        if (saved?.id && (prompt_template || tools_declared || prompt_params)) {
          await collector.attachPrompt(String(saved.id), {
            template: String(prompt_template || ''),
            params: prompt_params ?? undefined,
            tools_declared: tools_declared ?? undefined
          } as any);
        }
        if (saved?.id && Array.isArray(citations) && citations.length > 0) {
          const items = citations.map((c: any) => ({
            chunk_id: String(c?.chunk_id || c?.context_id || ''),
            source_type: String(c?.source_type || 'context'),
            source_uri: c?.source_uri ?? null,
            score: typeof c?.score === 'number' ? c.score : null,
            highlight: c?.highlight ?? null,
            metadata: c?.metadata ?? {}
          }));
          await collector.logCitations(String(saved.id), items);
        }
      } catch {}
      console.log('[MsgLogAPI] Saved message:', {
        id: saved?.id,
        role: saved?.role,
        content_tokens: saved?.content_tokens,
        response_tokens: saved?.response_tokens,
        total_tokens: saved?.total_tokens,
        model: saved?.model,
        latency_ms: saved?.latency_ms
      });
      return NextResponse.json({ ok: true, message: saved }, { status: 201 });
    } catch (firstError: any) {
      // If message creation failed (commonly because the session doesn't exist yet),
      // create a new session, map the provided session_id to it, and retry once.
      console.warn('[MsgLogAPI] createMessage failed, attempting session auto-create + retry:', firstError?.message || firstError);
      try {
        const newSession = await collector.createSession({
          channel: (channel as any) || 'normal',
          status: 'active',
          meta: { 
            original_session_id: session_id,
            auto_created: true,
            ...(meta || {})
          }
        });
        try { setMappedBackendSessionId(session_id, newSession.id); } catch {}
        
        const saved = await collector.createMessage({
            session_id: newSession.id,
            role,
            type,
            content: contentStr || null,
            content_tokens: resolvedContentTokens,
            response_tokens: resolvedResponseTokens,
            total_tokens: resolvedTotalTokens,
            ...(resolvedModel ? { model: resolvedModel } : {}),
            ...(typeof resolvedLatencyMs === 'number' ? { latency_ms: resolvedLatencyMs } : {}),
            meta: {
              channel,
              original_session_id: session_id,
              estimated_tokens: usingEstimated,
              token_breakdown: tokenStats,
              usage_source: usingEstimated ? 'estimated' : 'provided',
              ...(meta || {})
            }
          });
        // Attach prompt/citations if provided
        try {
          if (saved?.id && (prompt_template || tools_declared || prompt_params)) {
            await collector.attachPrompt(String(saved.id), {
              template: String(prompt_template || ''),
              params: prompt_params ?? undefined,
              tools_declared: tools_declared ?? undefined
            } as any);
          }
          if (saved?.id && Array.isArray(citations) && citations.length > 0) {
            const items = citations.map((c: any) => ({
              chunk_id: String(c?.chunk_id || c?.context_id || ''),
              source_type: String(c?.source_type || 'context'),
              source_uri: c?.source_uri ?? null,
              score: typeof c?.score === 'number' ? c.score : null,
              highlight: c?.highlight ?? null,
              metadata: c?.metadata ?? {}
            }));
            await collector.logCitations(String(saved.id), items);
          }
        } catch {}
        return NextResponse.json({ 
          ok: true, 
          message: saved,
          note: `Created new session ${newSession.id} for original session ${session_id}`
        }, { status: 201 });
      } catch (secondError: any) {
        console.error('[MsgLogAPI] Fallback session create + retry failed:', secondError);
        throw secondError;
      }
    }
  } catch (err: any) {
    console.error('[MsgLogAPI] Error:', err);
    return NextResponse.json({ error: err?.message || 'Unhandled error', stack: err?.stack || null }, { status: 500 });
  }
}


