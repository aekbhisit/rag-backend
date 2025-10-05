import { NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/app/lib/rateLimit";
import { NextRequest } from "next/server";
import { createCollector } from "@/app/lib/conversationCollector";
import { getAiConfig } from "@/app/lib/getAiConfig";

/**
 * /services/chat/agent-completions - Agent Chat Completions Endpoint
 * ================================================================
 * 
 * PURPOSE:
 * - Handles agent-based chat completions with tool execution
 * - Fetches agent tools and instructions from database
 * - Executes tools and provides follow-up responses
 * - Used for both direct agent calls and follow-up tool executions
 * 
 * USAGE:
 * - POST: Used for agent chat completions with tool support
 * - Called by: text-stream/route.ts, ChatInterface.tsx (extractContent follow-up)
 * - Handles: Tool execution, agent transfers, location injection
 * 
 * FEATURES:
 * - Rate limiting (10 requests/minute)
 * - Agent tool fetching from database
 * - Tool execution with follow-up responses
 * - Location injection for placeKnowledgeSearch
 * - Agent transfer support
 * - Conversation logging
 * 
 * EXAMPLES:
 * - POST /services/chat/agent-completions (with agentName, sessionId, messages)
 * - POST /services/chat/agent-completions (with userText for follow-up)
 * 
 * TOOLS SUPPORTED:
 * - placeKnowledgeSearch (with location injection)
 * - extractContent (UI tool execution)
 * - transfer_to_placeGuide (agent transfers)
 */

// Initialize OpenAI client with database API key (deferred until runtime)
const getOpenAI = async () => {
  const aiConfig = await getAiConfig();
  return new OpenAI({ apiKey: aiConfig.apiKey });
};
const DEFAULT_MODEL = process.env.TEXT_MODEL || 'gpt-4o';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3100';
const TENANT_ID = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000000';

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
    const { agentName, agentKey, agentSetKey, sessionId, channel, testMode, lat, long, userText, ...openaiBody } = body;
    
    // Log agent context for debugging
    console.log(`[Agent API] Processing request for agent: ${agentName}, session: ${sessionId}`);
    
    // Fetch agent configuration, instructions, and tools from database
    let agentConfig: any = null;
    let agentInstructions: string = '';
    let agentTools: any[] = [];
    
    try {
      // Fetch agent configuration
      const agentRes = await fetch(`${BACKEND_URL}/api/admin/agents/${encodeURIComponent(agentKey || agentName)}`, {
        headers: { 'X-Tenant-ID': TENANT_ID }
      });
      if (agentRes.ok) {
        agentConfig = await agentRes.json();
        console.log(`[Agent API] Loaded agent config for ${agentKey || agentName}`);
      }
      
      // Fetch agent instructions from agent_prompts table
      const instructionsRes = await fetch(`${BACKEND_URL}/api/admin/agents/${encodeURIComponent(agentKey || agentName)}/prompts?category=system&locale=en&is_published=true`, {
        headers: { 'X-Tenant-ID': TENANT_ID }
      });
      if (instructionsRes.ok) {
        const instructionsData = await instructionsRes.json();
        if (Array.isArray(instructionsData) && instructionsData.length > 0) {
          agentInstructions = instructionsData[0].content || '';
          console.log(`[Agent API] Loaded agent instructions for ${agentKey || agentName}`);
        }
      }
      
      // Fetch agent tools
      const toolsRes = await fetch(`${BACKEND_URL}/api/admin/agents/${encodeURIComponent(agentKey || agentName)}/tools`, {
        headers: { 'X-Tenant-ID': TENANT_ID }
      });
      if (toolsRes.ok) {
        agentTools = await toolsRes.json();
        console.log(`[Agent API] Loaded ${agentTools.length} tools for agent ${agentKey || agentName}`);
      }
    } catch (error) {
      console.warn(`[Agent API] Failed to load agent config/instructions/tools for ${agentKey || agentName}:`, error);
    }

    // Transform tools to OpenAI format
    const transformedTools = agentTools
      .filter((tool: any) => tool.enabled && tool.function_name)
      .map((tool: any) => ({
        type: 'function',
        function: {
          name: tool.function_name,
          description: tool.function_description || `Tool: ${tool.function_name}`,
          parameters: tool.function_parameters || { type: 'object', properties: {} }
        }
      }));

    // Prepare messages with agent instructions
    let messages = openaiBody.messages || [];
    // If only userText provided, build messages from it
    if ((!messages || messages.length === 0) && typeof userText === 'string' && userText.trim()) {
      messages = [{ role: 'user', content: userText.trim() }];
    }
    
    // Add agent instructions as system message if available
    if (agentInstructions) {
      // Check if there's already a system message
      const hasSystemMessage = messages.some((msg: any) => msg.role === 'system');
      
      if (hasSystemMessage) {
        // Update existing system message with agent instructions
        messages = messages.map((msg: any) => 
          msg.role === 'system' 
            ? { ...msg, content: `${agentInstructions}\n\n${msg.content}` }
            : msg
        );
      } else {
        // Add new system message with agent instructions
        messages = [
          { role: 'system', content: agentInstructions },
          ...messages
        ];
      }
    }

    // Create the completion request
    const model = (openaiBody as any)?.model || DEFAULT_MODEL;
    const completionRequest = {
      model,
      ...openaiBody,
      messages,
      ...(transformedTools.length > 0 ? { tools: transformedTools } : {}),
    } as any;

    // Get OpenAI client with database API key
    const openai = await getOpenAI();
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create(completionRequest);

    // Extract tool calls for processing
    const toolCalls = completion.choices?.[0]?.message?.tool_calls || [];
    
    // Process tool calls if any
    let toolResults: any[] = [];
    if (toolCalls.length > 0) {
      console.log(`[Agent API] Processing ${toolCalls.length} tool calls`);
      
      for (const toolCall of toolCalls) {
        if (toolCall.type === 'function' && toolCall.function) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          console.log(`[Agent API] Executing tool: ${functionName}`, functionArgs);
          
          // Handle placeKnowledgeSearch tool with location injection
          if (functionName === 'placeKnowledgeSearch') {
            try {
              // Inject location from request if not provided in function args
              if (typeof functionArgs.lat !== 'number' && typeof lat === 'number') {
                functionArgs.lat = lat;
              }
              if (typeof functionArgs.long !== 'number' && typeof long === 'number') {
                functionArgs.long = long;
              }
              
              // Check if location is provided, if not, return error asking for location
              if (typeof functionArgs.lat !== 'number' || typeof functionArgs.long !== 'number') {
                toolResults.push({
                  id: toolCall.id,
                  type: 'function',
                  function: {
                    name: functionName,
                    content: JSON.stringify({ 
                      success: false, 
                      error: 'Location required', 
                      message: 'Please provide your current location to search for places nearby. You can share your location or specify coordinates (lat, long).' 
                    })
                  }
                });
                continue;
              }
              
              // Call the RAG place search handler
              const { ragPlaceSearchHandler } = await import('@/app/agents/core/functions/handlers/skill/rag-place');
              const result = await ragPlaceSearchHandler(functionArgs);
              
              toolResults.push({
                id: toolCall.id,
                type: 'function',
                function: {
                  name: functionName,
                  content: JSON.stringify(result)
                }
              });
              
              console.log(`[Agent API] Tool result:`, result);
            } catch (error: any) {
              console.error(`[Agent API] Error executing ${functionName}:`, error);
              toolResults.push({
                id: toolCall.id,
                type: 'function',
                function: {
                  name: functionName,
                  content: JSON.stringify({ success: false, error: error.message })
                }
              });
            }
          } else if (functionName === 'extractContent') {
            // Handle extractContent tool
            try {
              console.log(`[Agent API] ExtractContent - Function args:`, functionArgs);
              const { extractContentHandler } = await import('@/app/agents/core/functions/handlers/ui/extract-content');
              const result = await extractContentHandler(functionArgs);
              
              console.log(`[Agent API] ExtractContent - Raw result:`, JSON.stringify(result, null, 2));
              console.log(`[Agent API] ExtractContent - Result success:`, result?.success);
              console.log(`[Agent API] ExtractContent - Result content length:`, result?.content?.length || 0);
              console.log(`[Agent API] ExtractContent - Result content:`, result?.content);
              
              toolResults.push({
                id: toolCall.id,
                type: 'function',
                function: {
                  name: functionName,
                  content: JSON.stringify(result)
                }
              });
              
              console.log(`[Agent API] ExtractContent - Tool result pushed:`, JSON.stringify(toolResults[toolResults.length - 1], null, 2));
            } catch (error: any) {
              console.error(`[Agent API] Error executing ${functionName}:`, error);
              toolResults.push({
                id: toolCall.id,
                type: 'function',
                function: {
                  name: functionName,
                  content: JSON.stringify({ success: false, error: error.message })
                }
              });
            }
          } else {
            // For other tools, return a placeholder response
            toolResults.push({
              id: toolCall.id,
              type: 'function',
              function: {
                name: functionName,
                content: JSON.stringify({ success: false, message: `Tool ${functionName} not implemented` })
              }
            });
          }
        }
      }
      
      // If we have tool results, make another API call to get the final response
      if (toolResults.length > 0) {
        console.log(`[Agent API] Making follow-up call with ${toolResults.length} tool results`);
        console.log(`[Agent API] Tool results:`, JSON.stringify(toolResults, null, 2));
        
        // Add tool results to messages
        const followUpMessages = [
          ...messages,
          {
            role: 'assistant',
            content: null,
            tool_calls: toolCalls
          },
          ...toolResults.map(result => ({
            role: 'tool',
            content: result.function.content,
            tool_call_id: result.id
          }))
        ];
        
        console.log(`[Agent API] Follow-up messages:`, JSON.stringify(followUpMessages, null, 2));
        
        // Get OpenAI client for follow-up request
        const openai = await getOpenAI();
        
        // Make follow-up completion request
        const followUpCompletion = await openai.chat.completions.create({
          model,
          ...openaiBody,
          messages: followUpMessages,
          tools: transformedTools
        } as any);
        
        console.log(`[Agent API] Follow-up completion response:`, JSON.stringify(followUpCompletion, null, 2));
        
        // Return the follow-up completion
        return NextResponse.json(followUpCompletion, {
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'X-Agent-Name': agentName || 'unknown',
            'X-Session-ID': sessionId || 'unknown',
            'X-Backend-Session-ID': sessionId,
          }
        });
      }
    }

    // Create response data
    const responseData = {
      ...completion,
      choices: completion.choices?.map(choice => ({
        ...choice,
        message: {
          ...choice.message,
          ...(toolResults.length > 0 ? { 
            tool_calls: toolCalls,
            content: toolResults.length > 0 ? null : choice.message.content
          } : {}),
        }
      }))
    };

    // Log conversation if collector is available
    try {
      const collector = createCollector();
      // Note: ConversationCollector doesn't have recordInteraction method
      // Individual message logging can be added here if needed
    } catch (error) {
      console.warn('[Agent API] Failed to initialize collector:', error);
    }

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
