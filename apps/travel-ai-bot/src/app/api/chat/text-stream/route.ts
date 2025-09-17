import { NextRequest } from 'next/server';
import { rateLimit } from '@/app/lib/rateLimit';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const openai = new OpenAI();
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';

async function fetchJson(url: string) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) return { ok: false, status: r.status } as any;
  const j = await r.json();
  return { ok: true, json: j } as any;
}

// Rate limit: 20 streams/minute per IP for text stream
const RATE_LIMIT_CONFIG = { limit: 20, windowMs: 60 * 1000 };

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id') || '';
    const agentSetKey = searchParams.get('agent_set_key') || '';
    const agentName = searchParams.get('agent_name') || '';
    const agentKey = searchParams.get('agent_key') || '';
    const language = searchParams.get('language') || 'en';
    const userText = (searchParams.get('text') || '').trim();
    const lat = searchParams.get('lat');
    const long = searchParams.get('long');

    console.log('[SSE:text-stream] ▶ start', {
      sessionId,
      agentSetKey,
      agentName,
      agentKey,
      language,
      userTextPreview: userText.slice(0, 120)
    });

    if (!sessionId) {
      return new Response('Missing session_id', { status: 400 });
    }
    if (!userText) {
      return new Response('Missing text', { status: 400 });
    }

    // Rate limit by client IP
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    const rl = rateLimit(clientIp, RATE_LIMIT_CONFIG);
    if (!rl.success) {
      return new Response('Too many requests', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rl.limit.toString(),
          'X-RateLimit-Remaining': rl.remaining.toString(),
          'X-RateLimit-Reset': rl.reset.toString(),
        },
      });
    }

    // Fixed model for text mode per tenant policy
    const model = process.env.TEXT_MODEL || 'gpt-4o';

    // Resolve agent instructions from DB by key or fallback to name
    let resolvedKey = agentKey || '';
    if (!resolvedKey && agentName) {
      // try to find agent by listing and matching name
      const agentsRes = await fetchJson(`${BACKEND_URL}/api/admin/agents`);
      if (agentsRes.ok) {
        const list = Array.isArray(agentsRes.json) ? agentsRes.json : [];
        const found = list.find((a: any) => a.name === agentName);
        resolvedKey = found?.agent_key || '';
      }
    }

    let instructions = '';
    let tools: any[] = [];
    if (resolvedKey) {
      const base = await fetchJson(`${BACKEND_URL}/api/agents/${encodeURIComponent(resolvedKey)}/prompt?category=base`);
      instructions = base.ok ? (base.json?.content || '') : '';
      const toolsRes = await fetchJson(`${BACKEND_URL}/api/admin/agents/${encodeURIComponent(resolvedKey)}/tools`);
      if (toolsRes.ok && Array.isArray(toolsRes.json)) {
        tools = (toolsRes.json as any[]).map((t: any) => ({
          type: 'function',
          function: {
            name: t.function_name,
            description: t.function_description,
            parameters: t.function_parameters || { type: 'object', properties: {} }
          }
        }));
        try {
          console.log('[SSE:text-stream] tools for agent', { agent: agentName || resolvedKey, toolNames: (tools || []).map((x: any) => x?.function?.name).filter(Boolean) });
          const toolSummaries = (tools || []).map((x: any) => ({
            name: x?.function?.name,
            required: Array.isArray(x?.function?.parameters?.required) ? x.function.parameters.required : [],
            properties: x?.function?.parameters?.properties ? Object.keys(x.function.parameters.properties) : []
          }));
          console.log('[SSE:text-stream] tools detailed', { agent: agentName || resolvedKey, tools: toolSummaries });
          // Emit to client for visibility
          // Note: send() is defined inside stream start; buffer to emit later
        } catch {}
      }
    }

    // Inject transfer_to_{agent} tools dynamically from DB (DB-driven, no hardcode)
    try {
      const agentsRes = await fetchJson(`${BACKEND_URL}/api/admin/agents`);
      if (agentsRes.ok && Array.isArray(agentsRes.json)) {
        const transferTools = (agentsRes.json as any[])
          .filter((a: any) => a.is_enabled)
          .filter((a: any) => a.name && a.name !== agentName)
          .map((a: any) => ({
            type: 'function',
            function: {
              name: `transfer_to_${a.name}`,
              description: `Transfer conversation control to agent ${a.name}. Use when the other agent is better suited.`,
              parameters: {
                type: 'object',
                properties: {
                  rationale_for_transfer: { type: 'string', description: 'Brief reason for transferring' },
                  conversation_context: { type: 'string', description: 'Key user intent/context to carry over' }
                }
              }
            }
          }));
        tools = [...tools, ...transferTools];
        console.log('[SSE:text-stream] tools prepared', { ownTools: tools.length - transferTools.length, transferTools: transferTools.length });
      }
    } catch {}
    const locationHint = (lat && long) ? `\nUser location: lat=${lat}, long=${long}` : '';
    if (!instructions) {
      instructions = `You are a helpful assistant. Channel=text. Language=${language}.${locationHint}`;
    } else {
      instructions = `${instructions}\n\n[Channel=text, Language=${language}]${locationHint}`;
    }
    // Nudge the model to prefer tool-based transfers over narrating and always include a short user-facing message
    instructions = `${instructions}\n\nAgent handoff policy: If another agent is better suited, you MUST call the function transfer_to_{agentName} with rationale_for_transfer and conversation_context. Do NOT describe the transfer in natural language.\nAlways include a brief, user-facing response even when using tools.`;

    // Minimal messages; server may later reconstruct full history from DB
    const messages: any[] = [
      { role: 'system', content: instructions },
      { role: 'user', content: userText },
    ];

    // Create SSE stream
    const encoder = new TextEncoder();
    let started = false;
    let finalText = '';
    let transferTarget: string | null = null;
    let transferArgsStr: string = '';
    const seenToolCallsInitial: Array<{ name: string; argsChunkLen: number }> = [];
    const aggregatedArgsInitial: Record<string, string> = {};

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, data?: any) => {
          const payload = data === undefined ? '' : typeof data === 'string' ? data : JSON.stringify(data);
          const chunk = `event: ${event}\n` + (payload ? `data: ${payload}\n` : 'data: {}\n') + `\n`;
          controller.enqueue(encoder.encode(chunk));
        };
        // Helper to safely emit debug blocks
        const emitToolsDebug = (phase: 'initial' | 'target' | 'target_with_transfers', agent: string, list: any[]) => {
          try {
            const toolSummaries = (list || []).map((x: any) => ({
              name: x?.function?.name,
              required: Array.isArray(x?.function?.parameters?.required) ? x.function.parameters.required : [],
              properties: x?.function?.parameters?.properties ? Object.keys(x.function.parameters.properties) : []
            }));
            send('debug', { type: 'tools', phase, agent, tools: toolSummaries });
          } catch {}
        };
        // Emit initial tools debug to client
        try { emitToolsDebug('initial', agentName || resolvedKey, tools); } catch {}
        try {
          const completion = await openai.chat.completions.create({
            model,
            stream: true,
            messages,
            temperature: 0.7,
            max_tokens: 2000,
            ...(tools.length > 0 ? { tools } : {}),
            tool_choice: 'auto',
          } as any);

          for await (const chunk of completion as any) {
            const choice = chunk?.choices?.[0];
            const delta = choice?.delta || {};
            if (!started) {
              started = true;
              send('response_start');
              console.log('[SSE:text-stream] event: response_start');
            }
            if (typeof delta?.content === 'string' && delta.content) {
              finalText += delta.content;
              send('delta', delta.content);
            }
            // Detect streamed tool_calls for transfer_to_{agent}
            const tc = delta?.tool_calls?.[0];
            if (tc?.function && typeof tc.function?.name === 'string') {
              const fn = tc.function.name as string;
              const argLen = typeof tc.function.arguments === 'string' ? tc.function.arguments.length : 0;
              try { seenToolCallsInitial.push({ name: fn, argsChunkLen: argLen }); } catch {}
              if (fn.startsWith('transfer_to_')) {
                try {
                  const dest = fn.replace('transfer_to_', '').trim();
                  if (dest) transferTarget = dest;
                  // Accumulate streamed function arguments (arrive chunked)
                  if (typeof tc.function.arguments === 'string' && tc.function.arguments) {
                    transferArgsStr += tc.function.arguments;
                  }
                  console.log('[SSE:text-stream] 🔀 detected transfer tool', { function: fn, destination: transferTarget });
                  send('debug', { type: 'tool_call_delta', phase: 'initial', name: fn, argsChunkLen: argLen });
                } catch {}
              } else {
                console.log('[SSE:text-stream] 🔧 tool_call delta', { name: fn, argsChunkLen: argLen });
                if (typeof tc.function.arguments === 'string' && tc.function.arguments) {
                  aggregatedArgsInitial[fn] = (aggregatedArgsInitial[fn] || '') + tc.function.arguments;
                }
                send('debug', { type: 'tool_call_delta', phase: 'initial', name: fn, argsChunkLen: argLen });
              }
            }
          }

          // Emit initial tool_calls summary (if any) before handling transfer or finalization
          try {
            const callsSummaryInitial = Object.entries(aggregatedArgsInitial).map(([name, args]) => {
              let parsed: any = null; let parsedOk = false;
              try { parsed = JSON.parse(args); parsedOk = true; } catch {}
              return {
                name,
                argsPreview: (args as string).slice(0, 500),
                parsedOk,
                parsedKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [],
                parsedPreview: parsedOk ? JSON.stringify(parsed).slice(0, 500) : ''
              };
            });
            if (callsSummaryInitial.length > 0) {
              console.log('[SSE:text-stream] initial tool_calls summary', { calls: callsSummaryInitial });
              send('debug', { type: 'tool_calls_summary', phase: 'initial', calls: callsSummaryInitial });
            }
          } catch {}

          // If model requested transfer_to_{agent}, emit agent_transfer and continue with a follow-up completion from the new agent
          if (transferTarget) {
            console.log('[SSE:text-stream] event: agent_transfer', { agentName: transferTarget });
            send('agent_transfer', { agentName: transferTarget });

            // Load target agent instructions/tools from DB
            try {
              // Parse carried context from streamed tool args if present
              let carriedContext: string | null = null;
              try {
                const parsed = JSON.parse(transferArgsStr || '{}');
                carriedContext = typeof parsed?.conversation_context === 'string' ? parsed.conversation_context : null;
                console.log('[SSE:text-stream] transfer args parsed', { rawLen: transferArgsStr.length, contextPreview: (carriedContext || '').slice(0, 120) });
              } catch (e: any) {
                console.warn('[SSE:text-stream] transfer args parse failed', e?.message);
              }

              let targetKey = '';
              const agentsRes = await fetchJson(`${BACKEND_URL}/api/admin/agents`);
              if (agentsRes.ok && Array.isArray(agentsRes.json)) {
                const found = (agentsRes.json as any[]).find((a: any) => a.name === transferTarget);
                targetKey = found?.agent_key || '';
              }
              let targetInstructions = '';
              let targetTools: any[] = [];
              if (targetKey) {
                const base2 = await fetchJson(`${BACKEND_URL}/api/agents/${encodeURIComponent(targetKey)}/prompt?category=base`);
                targetInstructions = base2.ok ? (base2.json?.content || '') : '';
                const toolsRes2 = await fetchJson(`${BACKEND_URL}/api/admin/agents/${encodeURIComponent(targetKey)}/tools`);
                if (toolsRes2.ok && Array.isArray(toolsRes2.json)) {
                  targetTools = (toolsRes2.json as any[]).map((t: any) => ({
                    type: 'function',
                    function: {
                      name: t.function_name,
                      description: t.function_description,
                      parameters: t.function_parameters || { type: 'object', properties: {} }
                    }
                  }));
                  try {
                    console.log('[SSE:text-stream] target tools (DB)', { agent: transferTarget, toolNames: (targetTools || []).map((x: any) => x?.function?.name).filter(Boolean) });
                    const toolSummaries2 = (targetTools || []).map((x: any) => ({
                      name: x?.function?.name,
                      required: Array.isArray(x?.function?.parameters?.required) ? x.function.parameters.required : [],
                      properties: x?.function?.parameters?.properties ? Object.keys(x.function.parameters.properties) : []
                    }));
                    console.log('[SSE:text-stream] target tools detailed (DB)', { agent: transferTarget, tools: toolSummaries2 });
                    emitToolsDebug('target', transferTarget, targetTools);
                  } catch {}
                }
              }
              const locationHint2 = (lat && long) ? `\nUser location: lat=${lat}, long=${long}` : '';
              if (!targetInstructions) {
                targetInstructions = `You are a helpful assistant. Channel=text. Language=${language}.${locationHint2}`;
              } else {
                targetInstructions = `${targetInstructions}\n\n[Channel=text, Language=${language}]${locationHint2}`;
              }
              targetInstructions = `${targetInstructions}\n\nAgent handoff policy: If another agent is better suited, you MUST call the function transfer_to_{agentName}. Do NOT describe the transfer in natural language.\nHandoff continuity: Do NOT greet or introduce yourself. Continue the user's previous intent immediately without asking them to repeat. Use available tools to fulfill the request. Keep responses concise and actionable.`;

              // Also inject transfer tools for the target agent set
              if (agentsRes.ok && Array.isArray(agentsRes.json)) {
                const transferTools2 = (agentsRes.json as any[])
                  .filter((a: any) => a.is_enabled)
                  .filter((a: any) => a.name && a.name !== transferTarget)
                  .map((a: any) => ({
                    type: 'function',
                    function: {
                      name: `transfer_to_${a.name}`,
                      description: `Transfer conversation control to agent ${a.name}.`,
                      parameters: { type: 'object', properties: {
                        rationale_for_transfer: { type: 'string' },
                        conversation_context: { type: 'string' }
                      }}
                    }
                  }));
                targetTools = [...targetTools, ...transferTools2];
                try {
                  console.log('[SSE:text-stream] target tools (with transfers)', { agent: transferTarget, toolNames: (targetTools || []).map((x: any) => x?.function?.name).filter(Boolean) });
                  const toolSummaries3 = (targetTools || []).map((x: any) => ({
                    name: x?.function?.name,
                    required: Array.isArray(x?.function?.parameters?.required) ? x.function.parameters.required : [],
                    properties: x?.function?.parameters?.properties ? Object.keys(x.function.parameters.properties) : []
                  }));
                  console.log('[SSE:text-stream] target tools detailed (with transfers)', { agent: transferTarget, tools: toolSummaries3 });
                  emitToolsDebug('target_with_transfers', transferTarget, targetTools);
                } catch {}
              }

              const carried = (carriedContext && carriedContext.trim()) ? carriedContext.trim() : userText;
              const followupMessages: any[] = [
                { role: 'system', content: targetInstructions },
                { role: 'user', content: carried },
              ];

              console.log('[SSE:text-stream] ▶ follow-up completion for', { agentName: transferTarget, tools: targetTools.length, carriedPreview: carried.slice(0, 120) });
              const completion2 = await openai.chat.completions.create({
                model,
                stream: true,
                messages: followupMessages,
                temperature: 0.7,
                max_tokens: 2000,
                ...(targetTools.length > 0 ? { tools: targetTools } : {}),
                tool_choice: 'auto',
              } as any);

              let finalText2 = '';
              const seenToolCalls: Array<{ name: string; argsChunkLen: number }> = [];
              const aggregatedArgsFollow: Record<string, string> = {};
              send('response_start');
              for await (const chunk2 of completion2 as any) {
                const choice2 = chunk2?.choices?.[0];
                const delta2 = choice2?.delta || {};
                if (typeof delta2?.content === 'string' && delta2.content) {
                  finalText2 += delta2.content;
                  send('delta', delta2.content);
                }
                const tc2 = delta2?.tool_calls?.[0];
                if (tc2?.function && typeof tc2.function?.name === 'string') {
                  try {
                    const nm = tc2.function.name as string;
                    const argLen = typeof tc2.function.arguments === 'string' ? tc2.function.arguments.length : 0;
                    seenToolCalls.push({ name: nm, argsChunkLen: argLen });
                    console.log('[SSE:text-stream] follow-up tool_call delta', { name: nm, argsChunkLen: argLen });
                    if (typeof tc2.function.arguments === 'string' && tc2.function.arguments) {
                      aggregatedArgsFollow[nm] = (aggregatedArgsFollow[nm] || '') + tc2.function.arguments;
                    }
                    send('debug', { type: 'tool_call_delta', phase: 'followup', name: nm, argsChunkLen: argLen });
                  } catch {}
                }
              }
              try {
                const callsSummary = Object.entries(aggregatedArgsFollow).map(([name, args]) => {
                  let parsed: any = null; let parsedOk = false;
                  try { parsed = JSON.parse(args); parsedOk = true; } catch {}
                  return { name, argsPreview: args.slice(0, 300), parsedOk, parsedKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [] };
                });
                console.log('[SSE:text-stream] follow-up tool_calls summary', { agent: transferTarget, calls: callsSummary });
                send('debug', { type: 'tool_calls_summary', phase: 'followup', agent: transferTarget, calls: callsSummary });
              } catch {}

              // If tool calls were seen but no args streamed, probe once (non-stream) to fetch full arguments for logging
              try {
                if (seenToolCalls.length > 0 && Object.keys(aggregatedArgsFollow).length === 0) {
                  console.log('[SSE:text-stream] ▶ follow-up args probe (non-stream)');
                  const probe = await openai.chat.completions.create({
                    model,
                    stream: false,
                    messages: followupMessages,
                    temperature: 0,
                    max_tokens: 512,
                    ...(targetTools.length > 0 ? { tools: targetTools } : {}),
                    tool_choice: 'auto',
                  } as any);
                  const tc = (probe as any)?.choices?.[0]?.message?.tool_calls || [];
                  const dump = (tc as any[]).map((t: any) => {
                    const nm = t?.function?.name || '';
                    const argStr = t?.function?.arguments || '';
                    let parsed: any = null; let parsedOk = false; let parsedKeys: string[] = [];
                    try { parsed = JSON.parse(argStr); parsedOk = true; parsedKeys = parsed && typeof parsed === 'object' ? Object.keys(parsed) : []; } catch {}
                    return { name: nm, argsPreview: String(argStr).slice(0, 1000), parsedOk, parsedKeys };
                  });
                  console.log('[SSE:text-stream] ◀ follow-up args probe result', { toolCalls: dump });
                  send('debug', { type: 'tool_calls_args_probe', phase: 'followup', agent: transferTarget, toolCalls: dump });
                }
              } catch {}
              if (!finalText2 || !finalText2.trim()) {
                // If model streamed tool calls but no text, execute via agent-completions (server runs DB-mapped tools)
                if (seenToolCalls.length > 0) {
                  try {
                    const scheme = (req.headers.get('x-forwarded-proto') || 'http');
                    const host = req.headers.get('host');
                    const baseUrl = `${scheme}://${host}`;
                    console.log('[SSE:text-stream] ▶ follow-up: executing tools via agent-completions', { agentName: transferTarget, toolCalls: seenToolCalls.map(t => t.name) });
                    send('debug', { type: 'agent_completions_start', phase: 'followup', agent: transferTarget, toolCalls: seenToolCalls.map(t => t.name) });
                    const resp2 = await fetch(`${baseUrl}/api/chat/agent-completions`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        model,
                        agentName: transferTarget,
                        agentKey: targetKey || transferTarget,
                        agentSetKey: agentSetKey,
                        sessionId,
                        messages: [
                          { role: 'system', content: targetInstructions },
                          { role: 'user', content: carried },
                        ],
                        ...(targetTools.length > 0 ? { tools: targetTools } : {}),
                        temperature: 0.7,
                        max_tokens: 2000,
                      })
                    });
                    if (resp2.ok) {
                      const j2 = await resp2.json();
                      const toolCallsDbg2 = j2?.choices?.[0]?.message?.tool_calls || [];
                      const tcDetails = toolCallsDbg2.map((t: any) => {
                        const nm = t?.function?.name || '';
                        const argStr = t?.function?.arguments || '';
                        let parsed: any = null; let parsedOk = false; let parsedKeys: string[] = [];
                        try { parsed = JSON.parse(argStr); parsedOk = true; parsedKeys = parsed && typeof parsed === 'object' ? Object.keys(parsed) : []; } catch {}
                        return { name: nm, argsPreview: String(argStr).slice(0, 500), parsedOk, parsedKeys };
                      });
                      try { console.log('[SSE:text-stream] ◀ follow-up agent-completions result', { toolCalls: tcDetails, textPreview: String(j2?.choices?.[0]?.message?.content || '').slice(0, 200) }); } catch {}
                      try { send('debug', { type: 'agent_completions_result', phase: 'followup', agent: transferTarget, toolCalls: tcDetails, textPreview: String(j2?.choices?.[0]?.message?.content || '').slice(0, 200) }); } catch {}
                      finalText2 = String(j2?.choices?.[0]?.message?.content || '');
                    }
                  } catch (e: any) {
                    console.warn('[SSE:text-stream] follow-up agent-completions failed', e?.message);
                    try { send('debug', { type: 'agent_completions_error', phase: 'followup', agent: transferTarget, message: e?.message || 'unknown' }); } catch {}
                  }
                }
                if (!finalText2 || !finalText2.trim()) {
                  // Intent-carrying fallback (avoid generic greeting)
                  const defaultIntentCarry = language.toLowerCase().startsWith('th')
                    ? `กำลังดำเนินการตามคำขอของคุณ: ${carried}`
                    : `Working on your request: ${carried}`;
                  finalText2 = defaultIntentCarry;
                }
              }
              console.log('[SSE:text-stream] follow-up raw', { agentName: transferTarget, toolCalls: seenToolCalls, textPreview: finalText2.slice(0, 200) });
              console.log('[SSE:text-stream] event: response_done', { agentName: transferTarget, textPreview: finalText2.slice(0, 120) });
              send('response_done', { text: finalText2, agentName: transferTarget });
              controller.close();
              return;
            } catch (e: any) {
              console.warn('[SSE:text-stream] follow-up failed, falling back to empty text', e?.message);
              send('response_done', { text: '', agentName: transferTarget });
              controller.close();
              return;
            }
          }

          // Otherwise, finish with any final text from the original agent
          if (!finalText || !finalText.trim()) {
            // If no direct text, try non-streaming tool execution via agent-completions API (DB-driven)
            try {
              const scheme = (req.headers.get('x-forwarded-proto') || 'http');
              const host = req.headers.get('host');
              const baseUrl = `${scheme}://${host}`;
              console.log('[SSE:text-stream] ▶ fallback to agent-completions', { agentName: agentName || resolvedKey, tools: (tools || []).length, sawToolCalls: seenToolCallsInitial.map(t => t.name) });
              const resp = await fetch(`${baseUrl}/api/chat/agent-completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model,
                  agentName: agentName || resolvedKey,
                  agentKey: resolvedKey || agentKey || agentName,
                  agentSetKey,
                  sessionId,
                  messages: [
                    { role: 'system', content: instructions },
                    { role: 'user', content: userText },
                  ],
                  ...(tools.length > 0 ? { tools } : {}),
                  temperature: 0.7,
                  max_tokens: 2000,
                })
              });
              let text = '';
              if (resp.ok) {
                const j = await resp.json();
                const toolCallsDbg = j?.choices?.[0]?.message?.tool_calls || [];
                try { console.log('[SSE:text-stream] ◀ agent-completions result', { toolCalls: toolCallsDbg.map((t: any) => t?.function?.name).filter(Boolean), textPreview: String(j?.choices?.[0]?.message?.content || '').slice(0, 200) }); } catch {}
                text = String(j?.choices?.[0]?.message?.content || '');
              }
              if (!text || !text.trim()) {
                text = language.toLowerCase().startsWith('th') ? `กำลังดำเนินการตามคำขอของคุณ: ${userText}` : `Working on your request: ${userText}`;
              }
              send('response_start');
              send('response_done', { text, agentName });
              console.log('[SSE:text-stream] event: response_done', { agentName, textPreview: text.slice(0, 120) });
              controller.close();
              return;
            } catch (e: any) {
              console.warn('[SSE:text-stream] fallback agent-completions failed', e?.message);
              send('response_done', { text: '', agentName });
              controller.close();
              return;
            }
          } else {
            console.log('[SSE:text-stream] event: response_done', { agentName, textPreview: finalText.slice(0, 120) });
            send('response_done', { text: finalText, agentName });
            controller.close();
          }
        } catch (err: any) {
          const message = err?.message || 'stream error';
          const chunk = `event: error\n` + `data: ${JSON.stringify({ message })}\n\n`;
          try { controller.enqueue(encoder.encode(chunk)); } catch {}
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    return new Response(`Internal error: ${error?.message || 'unknown'}`, { status: 500 });
  }
}
