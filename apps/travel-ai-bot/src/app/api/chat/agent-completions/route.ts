import { NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/app/lib/rateLimit";
import { NextRequest } from "next/server";
import { createCollector } from "@/app/lib/conversationCollector";


const openai = new OpenAI();
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3001';

// Rate limit configuration: 10 requests per minute for agent chat
const RATE_LIMIT_CONFIG = {
  limit: 10,
  windowMs: 60 * 1000, // 1 minute in milliseconds
};

export async function POST(req: NextRequest) {
  try {
    // Get client IP address from request
    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';
    
    // Apply rate limiting
    const rateLimitResult = rateLimit(clientIp, RATE_LIMIT_CONFIG);

    // If rate limit exceeded, return 429 Too Many Requests
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests, please try again later." },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          }
        }
      );
    }

    // Retrieve the entire JSON object from the request.
    const body = await req.json();
    
    // Extract agent-specific fields
    const { agentName, agentKey, agentSetKey, sessionId, channel, testMode, ...openaiBody } = body;
    
    // Log agent context for debugging
    console.log(`[Agent API] Processing request for agent: ${agentName}, session: ${sessionId}`);
    
    // Transform tools to OpenAI format if they exist
    let transformedTools = null;
    if (openaiBody.tools && openaiBody.tools.length > 0) {
      transformedTools = openaiBody.tools.map((tool: any) => {
        // Check if tool is already in OpenAI format
        if (tool.function) {
          return tool;
        }
        
        // Transform from our format to OpenAI format
        return {
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }
        };
      });
    }

    // Build OpenAI request - ensure we have the required fields
    const messages = openaiBody.messages || [];
    
    // ===== VALIDATE MESSAGES ARRAY =====
    console.log(`[Agent API] ===== VALIDATING MESSAGES =====`);
    console.log(`[Agent API] Raw messages received:`, JSON.stringify(messages, null, 2));
    
    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      console.error(`[Agent API] Invalid messages array:`, messages);
      return NextResponse.json({ 
        error: "Messages array is required and must not be empty",
        agentError: true,
        timestamp: new Date().toISOString(),
        errorType: 'ValidationError'
      }, { 
        status: 400,
        headers: {
          'X-Error-Type': 'validation-error'
        }
      });
    }
    
    // Validate each message has required fields
    const validatedMessages = messages.map((msg: any, index: number) => {
      if (!msg.role) {
        console.error(`[Agent API] Message ${index} missing role:`, msg);
        throw new Error(`Message ${index} is missing required 'role' field`);
      }
      
      if (!msg.content && !msg.tool_calls) {
        console.error(`[Agent API] Message ${index} missing content:`, msg);
        throw new Error(`Message ${index} is missing required 'content' field`);
      }
      
      // Ensure role is valid
      const validRoles = ['system', 'user', 'assistant', 'tool'];
      if (!validRoles.includes(msg.role)) {
        console.error(`[Agent API] Message ${index} has invalid role:`, msg.role);
        throw new Error(`Message ${index} has invalid role '${msg.role}'. Must be one of: ${validRoles.join(', ')}`);
      }
      
      return {
        role: msg.role,
        content: msg.content || '',
        ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
        ...(msg.tool_call_id ? { tool_call_id: msg.tool_call_id } : {})
      };
    });
    
    console.log(`[Agent API] Validated messages count: ${validatedMessages.length}`);
    console.log(`[Agent API] First message role: ${validatedMessages[0]?.role}`);
    console.log(`[Agent API] Last message role: ${validatedMessages[validatedMessages.length - 1]?.role}`);
    
    const baseRequest: any = {
      model: openaiBody.model || 'gpt-4o',
      temperature: openaiBody.temperature || 0.7,
      max_tokens: openaiBody.max_tokens || 1000,
      ...(transformedTools && transformedTools.length > 0 ? { 
        tools: transformedTools,
        tool_choice: openaiBody.tool_choice || 'auto'
      } : {})
    };
    
    // ===== DETAILED LOGGING FOR DEBUGGING =====
    console.log(`[Agent API] ===== OPENAI REQUEST DETAILS =====`);
    console.log(`[Agent API] Agent: ${agentName}, Session: ${sessionId}`);
    console.log(`[Agent API] Model: ${baseRequest.model}`);
    console.log(`[Agent API] Messages count: ${validatedMessages.length}`);
    console.log(`[Agent API] Tools count: ${transformedTools ? transformedTools.length : 0}`);
    
    // Log the last user message
    const lastMessage = validatedMessages[validatedMessages.length - 1];
    console.log(`[Agent API] Last message:`, JSON.stringify(lastMessage, null, 2));
    
    // Log system message (first message)
    if (validatedMessages.length > 0) {
      console.log(`[Agent API] First message:`, JSON.stringify(validatedMessages[0], null, 2));
    }
    
    // Log all messages for debugging
    console.log(`[Agent API] All messages:`, JSON.stringify(validatedMessages, null, 2));
    
    // Log tools if present
    if (transformedTools && transformedTools.length > 0) {
      console.log(`[Agent API] Available tools:`, transformedTools.map((t: any) => t.function.name));
      console.log(`[Agent API] Tools details:`, JSON.stringify(transformedTools, null, 2));
    }
    
    // ===== TOOL-EXECUTION LOOP WITH MAX DEPTH =====
    function safeParseJSON(str: string) {
      try { return JSON.parse(str || '{}'); } catch { return {}; }
    }

    // ========== Skill Tool Catalog ==========
    type SkillId =
      | 'skill.rag.place'
      | 'skill.knowledge.search'
      | 'skill.web.search'
      | 'skill.http.request'
      | 'skill.rag.search'
      | 'skill.text.summarize'
      | 'skill.time.now'
      | 'skill.rag.contexts'
      | 'skill.fs.readText'
      | 'skill.fs.writeText'
      | 'skill.data.parseCSV'
      | 'skill.data.parseJSON'
      | 'skill.web.browse'
      | 'skill.web.crawl';

    const functionNameToSkill: Record<string, SkillId> = {
      placeKnowledgeSearch: 'skill.rag.place',
      knowledgeSearch: 'skill.knowledge.search',
      webSearch: 'skill.web.search',
      httpRequest: 'skill.http.request',
      ragSearch: 'skill.rag.search',
      textSummarize: 'skill.text.summarize',
      timeNow: 'skill.time.now',
      fsReadText: 'skill.fs.readText',
      fsWriteText: 'skill.fs.writeText',
      dataParseCSV: 'skill.data.parseCSV',
      dataParseJSON: 'skill.data.parseJSON',
      webBrowse: 'skill.web.browse',
      webCrawl: 'skill.web.crawl',
    };

    async function fetchAgentTools(agentKeyParam: string): Promise<any[]> {
      try {
        const r = await fetch(`${BACKEND_URL}/api/admin/agents/${encodeURIComponent(agentKeyParam)}/tools`, { cache: 'no-store' });
        if (!r.ok) return [];
        return await r.json();
      } catch { return []; }
    }

    function applyParamMapping(args: any, mapping: any): any {
      if (!mapping || typeof mapping !== 'object') return args;
      const out: any = { ...args };
      try {
        for (const [target, source] of Object.entries(mapping)) {
          if (source && Object.prototype.hasOwnProperty.call(args, source as string)) {
            out[target] = (args as any)[source as string];
          }
        }
      } catch {}
      return out;
    }

    async function execSkillById(skillId: SkillId, argsObj: any, toolCfg?: any): Promise<any> {
      // Normalize params with defaults/mapping/overrides
      const defaults = (toolCfg?.arg_defaults && typeof toolCfg.arg_defaults === 'object') ? toolCfg.arg_defaults : {};
      const overrides = (toolCfg?.overrides && typeof toolCfg.overrides === 'object') ? toolCfg.overrides : {};
      const mapped = applyParamMapping({ ...defaults, ...(argsObj || {}) }, toolCfg?.parameter_mapping);
      const args = { ...mapped, ...overrides };

      switch (skillId) {
        case 'skill.rag.place': {
          const { ragPlaceSearchHandler } = await import('@/app/agents/core/functions/handlers/skill/rag-place');
          return await ragPlaceSearchHandler({
            searchQuery: String(args?.searchQuery || args?.query || ''),
            category: args?.category,
            lat: typeof args?.lat === 'number' ? args.lat : undefined,
            long: typeof args?.long === 'number' ? args.long : undefined,
            maxDistanceKm: typeof args?.maxDistanceKm === 'number' ? args.maxDistanceKm : 5,
            maxResults: typeof args?.maxResults === 'number' ? args.maxResults : 3,
            // Pass through mapped parameters from DB configuration
            endpointUrl: args?.endpointUrl,
            tenantId: args?.tenantId,
            headers: args?.headers,
            distance_weight: args?.distance_weight,
            fulltext_weight: args?.fulltext_weight,
            semantic_weight: args?.semantic_weight,
          });
        }

        case 'skill.web.search': {
          const { webSearchHandler } = await import('@/app/agents/core/functions/handlers/skill/web-search');
          return await webSearchHandler({ searchQuery: args?.query ?? args?.searchQuery, maxResults: args?.topK ?? args?.maxResults, searchType: args?.searchType });
        }
        case 'skill.http.request': {
          // Security-sensitive: allow only whitelisted domains in future
          return { success: false, error: 'http.request disabled in server API' };
        }
        case 'skill.rag.search': {
          const { ragSearchHandler } = await import('@/app/agents/core/functions/handlers/skill/rag-search');
          return await ragSearchHandler({ 
            query: args?.query, 
            topK: args?.topK, 
            filters: args?.filters,
            // Pass through mapped parameters from DB configuration
            endpointUrl: args?.endpointUrl,
            tenantId: args?.tenantId,
            headers: args?.headers,
            category: args?.category,
          });
        }
        case 'skill.rag.contexts': {
          const { ragContextsHandler } = await import('@/app/agents/core/functions/handlers/skill/rag-contexts');
          return await ragContextsHandler({ 
            query: args?.query, 
            topK: args?.topK,
            // Pass through mapped parameters from DB configuration
            endpointUrl: args?.endpointUrl,
            tenantId: args?.tenantId,
            headers: args?.headers,
          });
        }
        case 'skill.fs.readText': {
          const { fsReadTextHandler } = await import('@/app/agents/core/functions/handlers/skill/fs-read-text');
          return await fsReadTextHandler({ filePath: args?.filePath, encoding: args?.encoding, maxSize: args?.maxSize });
        }
        case 'skill.fs.writeText': {
          const { fsWriteTextHandler } = await import('@/app/agents/core/functions/handlers/skill/fs-write-text');
          return await fsWriteTextHandler({ filePath: args?.filePath, content: args?.content, encoding: args?.encoding });
        }
        case 'skill.data.parseCSV': {
          const { dataParseCSVHandler } = await import('@/app/agents/core/functions/handlers/skill/data-parse-csv');
          return await dataParseCSVHandler({ csvData: args?.csvData, delimiter: args?.delimiter, hasHeader: args?.hasHeader });
        }
        case 'skill.data.parseJSON': {
          const { dataParseJSONHandler } = await import('@/app/agents/core/functions/handlers/skill/data-parse-json');
          return await dataParseJSONHandler({ jsonData: args?.jsonData ?? args?.json, schema: args?.schema, strict: args?.strict });
        }
        case 'skill.web.browse': {
          const { webBrowseHandler } = await import('@/app/agents/core/functions/handlers/skill/web-browse');
          return await webBrowseHandler({ url: args?.url, selector: args?.selector, waitFor: args?.waitFor });
        }
        case 'skill.web.crawl': {
          const { webCrawlHandler } = await import('@/app/agents/core/functions/handlers/skill/web-crawl');
          return await webCrawlHandler({ startUrl: args?.startUrl, maxPages: args?.maxPages, selectors: args?.selectors });
        }
        case 'skill.text.summarize': {
          const { textSummarizeHandler } = await import('@/app/agents/core/functions/handlers/skill/text-summarize');
          return await textSummarizeHandler({ 
            text: args?.text, 
            maxLength: args?.maxLength,
            maxTokens: args?.maxTokens,
            style: args?.style,
          });
        }
        case 'skill.time.now': {
          const { timeNowHandler } = await import('@/app/agents/core/functions/handlers/skill/time-now');
          return await timeNowHandler({ 
            timezone: args?.timezone,
            format: args?.format,
          });
        }
        default:
          return { ok: false, error: `Unknown skill: ${skillId}` };
      }
    }

    async function executeToolCall(toolName: string, argsObj: any): Promise<any> {
      try {
        // 1) Skill catalog route with DB config
        const agentTools = await fetchAgentTools(agentKey || agentName || '');
        const toolCfg = Array.isArray(agentTools) ? agentTools.find((t: any) => t.function_name === toolName) : null;
        const skillId = (toolCfg?.overrides?.skill_id as SkillId) || functionNameToSkill[toolName];
        if (skillId) {
          return await execSkillById(skillId, argsObj, toolCfg);
        }
        // 2) Minimal generic handlers
        if (toolName === 'intentionChange') {
          return { acknowledged: true, ...argsObj };
        }
        if (toolName === 'transferAgents') {
          const destination = argsObj?.destination_agent || argsObj?.target || '';
          return { destination_agent: destination, did_transfer: false, rationale_for_transfer: argsObj?.rationale_for_transfer || '' };
        }
        if (toolName === 'transferBack') {
          return { did_transfer_back: true, rationale_for_transfer: argsObj?.rationale_for_transfer || '' };
        }
        if (toolName === 'navigateToMain' || toolName === 'navigateToPrevious') {
          return { navigated: toolName, ...argsObj };
        }
        return { ok: true, echo: argsObj };
      } catch (e: any) {
        return { ok: false, error: e?.message || 'tool exec failed' };
      }
    }

    let conversation = validatedMessages.slice();

    // If the last message is an assistant with tool_calls but no following tool outputs, execute them now
    const lastMsg = conversation[conversation.length - 1];
    if (lastMsg?.role === 'assistant' && Array.isArray((lastMsg as any).tool_calls) && (lastMsg as any).tool_calls.length > 0) {
      console.log('[Agent API] Pre-processing pending tool calls from incoming messages');
      const executed: any[] = [];
      for (const tc of (lastMsg as any).tool_calls) {
        const args = safeParseJSON(tc.function?.arguments || '{}');
        const result = await executeToolCall(tc.function?.name, args);
        conversation.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result || {}) } as any);
        executed.push({ name: tc.function?.name, args, result });
      }
      if (testMode === true) {
        return NextResponse.json({
          testMode: true,
          executedTools: executed,
          agentName, agentKey, sessionId
        });
      }
    }

    console.log(`[Agent API] ===== SENDING TO OPENAI (loop start) =====`);
    console.log(`[Agent API] Final request to OpenAI:`, JSON.stringify({ ...baseRequest, messages: conversation }, null, 2));
    const t0 = Date.now();
    let completion = await openai.chat.completions.create({ ...baseRequest, messages: conversation });
    let message = completion.choices?.[0]?.message;
    const firstHasTransfer = Array.isArray(message?.tool_calls) && message!.tool_calls!.some(tc => tc?.function?.name === 'transferAgents');
    if (firstHasTransfer) {
      console.log('[Agent API] Detected transferAgents in first response – returning tool_calls to client without server execution');
      const responseData = {
        content: message?.content || null,
        agentName: agentName,
        sessionId: sessionId,
        backendSessionId: sessionId,
        choices: completion.choices,
        usage: completion.usage,
        hasToolCalls: true,
        hasContent: !!message?.content,
        toolCalls: message?.tool_calls || null,
        agentContext: {
          agentName,
          sessionId,
          agentSetKey,
          channel,
          toolsUsed: openaiBody.tools?.length || 0,
          timestamp: new Date().toISOString()
        }
      };
      return NextResponse.json(responseData);
    }
    let loopDepth = 0;
    while (loopDepth < 10 && message?.tool_calls && message.tool_calls.length > 0) {
      console.log(`[Agent API] Tool calls detected in response (iteration ${loopDepth + 1})`, message.tool_calls.map(tc => tc.function?.name));
      // If transferAgents appears in subsequent iterations, stop looping and return it to client
      const hasTransferLater = message.tool_calls.some(tc => tc?.function?.name === 'transferAgents');
      if (hasTransferLater) {
        console.log('[Agent API] transferAgents detected during loop – returning tool_calls to client');
        const responseData = {
          content: message?.content || null,
          agentName: agentName,
          sessionId: sessionId,
          backendSessionId: sessionId,
          choices: [{ index: 0, finish_reason: 'tool_calls', message } as any],
          usage: completion.usage,
          hasToolCalls: true,
          hasContent: !!message?.content,
          toolCalls: message?.tool_calls || null,
          agentContext: {
            agentName,
            sessionId,
            agentSetKey,
            channel,
            toolsUsed: openaiBody.tools?.length || 0,
            timestamp: new Date().toISOString()
          }
        };
        return NextResponse.json(responseData);
      }
      // Append assistant tool call message to conversation
      conversation.push({ role: 'assistant', content: '', tool_calls: message.tool_calls } as any);
      // Execute tools and append tool outputs
      for (const tc of message.tool_calls) {
        const args = safeParseJSON(tc.function?.arguments || '{}');
        const result = await executeToolCall(tc.function?.name, args);
        conversation.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result || {}) } as any);
      }
      // Ask model to continue with tool outputs included
      completion = await openai.chat.completions.create({ ...baseRequest, messages: conversation });
      message = completion.choices?.[0]?.message;
      loopDepth++;
    }
    
    // ===== DETAILED RESPONSE LOGGING =====
    console.log(`[Agent API] ===== OPENAI RESPONSE DETAILS =====`);
    console.log(`[Agent API] Response received for agent: ${agentName}`);
    
    // Extract message details
    // message already set by loop
    const hasToolCalls = message?.tool_calls && message.tool_calls.length > 0;
    const hasContent = message?.content && message.content.trim().length > 0;
    
    console.log(`[Agent API] Response has content: ${hasContent}`);
    console.log(`[Agent API] Response has tool calls: ${hasToolCalls}`);
    
    if (hasContent) {
      console.log(`[Agent API] Response content:`, JSON.stringify(message?.content, null, 2));
    }
    
    // Log function calls for debugging
    if (hasToolCalls && message?.tool_calls) {
      console.log(`[Agent API] Function calls detected:`, message.tool_calls.map(tc => tc.function.name));
      console.log(`[Agent API] Function calls details:`, JSON.stringify(message.tool_calls, null, 2));
      
      // Log each function call separately
      message.tool_calls.forEach((toolCall, index) => {
        console.log(`[Agent API] ===== FUNCTION CALL ${index + 1} =====`);
        console.log(`[Agent API] Function name: ${toolCall.function.name}`);
        console.log(`[Agent API] Function arguments:`, JSON.stringify(toolCall.function.arguments, null, 2));
        console.log(`[Agent API] Call ID: ${toolCall.id}`);
      });
    }
    
    console.log(`[Agent API] Usage:`, JSON.stringify(completion.usage, null, 2));
    console.log(`[Agent API] ===== END OPENAI RESPONSE =====`);
    
    // Log successful completion
    console.log(`[Agent API] Successful completion for agent: ${agentName}`);
    console.log(`[Agent API] 🔍 Response analysis: hasContent=${hasContent}, hasToolCalls=${hasToolCalls}`);
    console.log(`[Agent API] 🔍 Message content length: ${message?.content?.length || 0}`);
    console.log(`[Agent API] 🔍 Tool calls count: ${message?.tool_calls?.length || 0}`);
    
    // Persist messages to backend (best-effort)
    // Use sessionId directly - no mapping or backend session creation
    try {
      const collector = createCollector();
      console.log(`[Agent API] ℹ️ Using session id directly: ${sessionId}`);
      
      // Optional: Log last user message (disabled by default to avoid duplicates; UI logs user messages already)
      const SHOULD_LOG_USER = process.env.NEXT_PUBLIC_LOG_USER_FROM_AGENT === 'true';
      if (SHOULD_LOG_USER && sessionId) {
        const lastUser = validatedMessages.slice().reverse().find((m: any) => m.role === 'user');
        if (lastUser) {
          try {
            await collector.createMessage({
              session_id: sessionId,
              role: 'user',
              type: 'text',
              content: String(lastUser.content || ''),
              content_tokens: completion.usage?.prompt_tokens || null,
              model: baseRequest.model,
              latency_ms: Date.now() - t0,
              meta: { 
                channel: channel || 'normal', 
                agentName, 
                latency_ms: Date.now() - t0,
                original_frontend_session_id: sessionId,
                is_internal: true,
                source: 'agent-completions'
              }
            });
            console.log(`[Agent API] ✅ Logged user message for session ${sessionId}`);
          } catch (err: any) {
            console.warn(`[Agent API] ❌ Failed to log user message: ${err?.message}`);
          }
        }
      }
      
      // Log assistant content if present
      if (message?.content && sessionId) {
        try {
          await collector.createMessage({
            session_id: sessionId,
            role: 'assistant',
            type: 'text',
            content: String(message.content),
            response_tokens: completion.usage?.completion_tokens || null,
            total_tokens: completion.usage?.total_tokens || null,
            model: baseRequest.model,
            latency_ms: Date.now() - t0,
            meta: { 
              channel: channel || 'normal', 
              agentName,
              original_frontend_session_id: sessionId,
              is_internal: false,
              source: 'agent-completions'
            }
          });
          console.log(`[Agent API] ✅ Logged assistant message for session ${sessionId}`);
        } catch (err: any) {
          console.warn(`[Agent API] ❌ Failed to log assistant message: ${err?.message}`);
        }
      }
    } catch (err: any) {
      console.warn(`[Agent API] ❌ Message logging failed: ${err?.message}`);
    }

    // Return response with agent context
    const responseData = {
      content: message?.content || null,
      agentName: agentName,
      sessionId: sessionId,
      backendSessionId: sessionId,
      choices: completion.choices,
      usage: completion.usage,
      hasToolCalls,
      hasContent,
      toolCalls: hasToolCalls ? message.tool_calls : null,
      agentContext: {
        agentName,
        sessionId,
        agentSetKey,
        channel,
        toolsUsed: openaiBody.tools?.length || 0,
        timestamp: new Date().toISOString()
      }
    };
    console.log(`[Agent API] 📤 Returning response data:`, {
      hasContent: !!responseData.content,
      hasToolCalls: responseData.hasToolCalls,
      toolCallsCount: responseData.toolCalls?.length || 0,
      toolCallsData: responseData.toolCalls
    });
    return NextResponse.json(responseData, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        'X-Agent-Name': agentName || 'unknown',
        'X-Session-ID': sessionId || 'unknown',
        'X-Backend-Session-ID': sessionId,
      }
    });
  } catch (error: any) {
    console.error(`[Agent API] Error in /chat/agent-completions:`, error);
    console.error(`[Agent API] Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return more specific error information for agent context
    return NextResponse.json({ 
      error: error.message,
      agentError: true,
      timestamp: new Date().toISOString(),
      errorType: error.name || 'UnknownError'
    }, { 
      status: 500,
      headers: {
        'X-Error-Type': 'agent-completion-error'
      }
    });
  }
} 