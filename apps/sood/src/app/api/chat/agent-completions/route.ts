import { NextResponse } from "next/server";
import OpenAI from "openai";
import { rateLimit } from "@/app/lib/rateLimit";
import { NextRequest } from "next/server";

const openai = new OpenAI();

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
    const { agentName, agentSetKey, sessionId, channel, ...openaiBody } = body;
    
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
    
    const openaiRequest = {
      model: openaiBody.model || 'gpt-4o',
      messages: validatedMessages,
      temperature: openaiBody.temperature || 0.7,
      max_tokens: openaiBody.max_tokens || 1000,
      ...(transformedTools && transformedTools.length > 0 ? { tools: transformedTools } : {})
    };
    
    // ===== DETAILED LOGGING FOR DEBUGGING =====
    console.log(`[Agent API] ===== OPENAI REQUEST DETAILS =====`);
    console.log(`[Agent API] Agent: ${agentName}, Session: ${sessionId}`);
    console.log(`[Agent API] Model: ${openaiRequest.model}`);
    console.log(`[Agent API] Messages count: ${openaiRequest.messages.length}`);
    console.log(`[Agent API] Tools count: ${transformedTools ? transformedTools.length : 0}`);
    
    // Log the last user message
    const lastMessage = openaiRequest.messages[openaiRequest.messages.length - 1];
    console.log(`[Agent API] Last message:`, JSON.stringify(lastMessage, null, 2));
    
    // Log system message (first message)
    if (openaiRequest.messages.length > 0) {
      console.log(`[Agent API] First message:`, JSON.stringify(openaiRequest.messages[0], null, 2));
    }
    
    // Log all messages for debugging
    console.log(`[Agent API] All messages:`, JSON.stringify(openaiRequest.messages, null, 2));
    
    // Log tools if present
    if (transformedTools && transformedTools.length > 0) {
      console.log(`[Agent API] Available tools:`, transformedTools.map((t: any) => t.function.name));
      console.log(`[Agent API] Tools details:`, JSON.stringify(transformedTools, null, 2));
    }
    
    console.log(`[Agent API] ===== SENDING TO OPENAI =====`);
    
    // Make the API call to OpenAI
    const completion = await openai.chat.completions.create(openaiRequest);
    
    // ===== DETAILED RESPONSE LOGGING =====
    console.log(`[Agent API] ===== OPENAI RESPONSE DETAILS =====`);
    console.log(`[Agent API] Response received for agent: ${agentName}`);
    
    // Extract message details
    const message = completion.choices?.[0]?.message;
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
    
    // Return response with agent context
    return NextResponse.json({
      content: message?.content || null,
      agentName: agentName,
      sessionId: sessionId,
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
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        'X-Agent-Name': agentName || 'unknown',
        'X-Session-ID': sessionId || 'unknown',
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