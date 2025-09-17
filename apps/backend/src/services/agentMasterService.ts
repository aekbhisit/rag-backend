import { Pool } from 'pg';
import { AgentMasterConversationsRepository } from '../repositories/agentMasterConversationsRepository';
import { AgentMasterMessagesRepository } from '../repositories/agentMasterMessagesRepository';
import { AgentMasterAiUsageRepository } from '../repositories/agentMasterAiUsageRepository';
import { TenantsRepository } from '../repositories/tenantsRepository';
import { getPostgresPool } from '../adapters/db/postgresClient';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  function_name?: string;
  function_args?: any;
  function_result?: any;
  tokens_used?: number;
};

export type ConversationContext = {
  conversationId: string;
  messages: ChatMessage[];
  memory: Record<string, any>;
  agentHistory?: any[];
  toolSchemas?: any[];
};

export type AiConfig = {
  apiKey: string;
  model: string;
  provider: string;
  maxTokens: number;
  temperature: number;
};

export class AgentMasterService {
  private conversationsRepo: AgentMasterConversationsRepository;
  private messagesRepo: AgentMasterMessagesRepository;
  private aiUsageRepo: AgentMasterAiUsageRepository;
  private tenantsRepo: TenantsRepository;

  constructor(private pool: Pool) {
    this.conversationsRepo = new AgentMasterConversationsRepository(pool);
    this.messagesRepo = new AgentMasterMessagesRepository(pool);
    this.aiUsageRepo = new AgentMasterAiUsageRepository(pool);
    this.tenantsRepo = new TenantsRepository(pool);
  }

  async getTenantAiConfig(tenantId: string): Promise<AiConfig> {
    const tenant = await this.tenantsRepo.get(tenantId);
    const ai: any = tenant?.settings?.ai || {};
    const genCfg: any = ai.generating || {};
    
    const provider: string = (genCfg.provider || 'openai').toLowerCase();
    const model: string = genCfg.model || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
    const providerKey: string | undefined = ai?.providers?.[provider]?.apiKey || 
      (provider === 'openai' ? process.env.OPENAI_API_KEY : undefined);
    
    if (!providerKey) {
      throw new Error(`No API key configured for provider: ${provider}`);
    }

    return {
      apiKey: providerKey,
      model,
      provider,
      maxTokens: typeof genCfg.maxTokens === 'number' ? genCfg.maxTokens : 2048,
      temperature: typeof genCfg.temperature === 'number' ? genCfg.temperature : 0.2,
    };
  }

  async createConversation(tenantId: string, userId: string, title: string, sessionId?: string, agentKey?: string): Promise<string> {
    const conversationId = await this.conversationsRepo.create({
      tenant_id: tenantId,
      session_id: sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      user_id: userId,
      title,
      status: 'active',
      metadata: {},
      agent_key: agentKey || null
    });

    return conversationId;
  }

  async getConversation(conversationId: string): Promise<ConversationContext | null> {
    const conversation = await this.conversationsRepo.get(conversationId);
    if (!conversation) return null;

    const messages = await this.messagesRepo.listByConversation(conversationId);
    const memory = await this.getConversationMemory(conversationId);

    return {
      conversationId,
      messages: messages.map(msg => ({
        role: msg.role as any,
        content: msg.content,
        function_name: msg.function_name || undefined,
        function_args: msg.function_args || undefined,
        function_result: msg.function_result || undefined,
        tokens_used: msg.tokens_used || undefined
      })),
      memory
    };
  }

  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    const messages = await this.messagesRepo.listByConversation(conversationId);
    return messages.map(msg => ({
      role: msg.role as any,
      content: msg.content,
      function_name: msg.function_name || undefined,
      function_args: msg.function_args || undefined,
      function_result: msg.function_result || undefined,
      tokens_used: msg.tokens_used || undefined
    }));
  }

  async chatWithAI(tenantId: string, userId: string, conversationId: string, message: string, agentKey?: string): Promise<any> {
    try {
      // Get tenant AI configuration
      const aiConfig = await this.getTenantAiConfig(tenantId);
      
      // Get conversation context
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Save user message
      const userMessageId = await this.messagesRepo.create({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        function_name: null,
        function_args: null,
        function_result: null,
        tokens_used: null
      });

      // Start recursive function calling with a maximum depth of 10
      const finalResponse = await this.executeRecursiveFunctionCalls(
        conversationId, 
        tenantId, 
        userId, 
        conversation.messages, 
        message, 
        agentKey, 
        aiConfig,
        0, // Start with depth 0
        new Set() // Start with empty executed functions set
      );

      // Get all messages from this conversation to include function call details
      const allMessages = await this.getConversationMessages(conversationId);
      const functionCalls = allMessages
        .filter(msg => msg.role === 'assistant' && msg.function_name)
        .map(msg => {
          let functionArgs = {};
          let functionResult = null;
          
          try {
            functionArgs = msg.function_args ? 
              (typeof msg.function_args === 'string' ? JSON.parse(msg.function_args) : msg.function_args) : 
              {};
          } catch (e) {
            console.warn('Failed to parse function_args:', msg.function_args);
            functionArgs = {};
          }
          
          try {
            functionResult = msg.function_result ? 
              (typeof msg.function_result === 'string' ? JSON.parse(msg.function_result) : msg.function_result) : 
              null;
          } catch (e) {
            console.warn('Failed to parse function_result:', msg.function_result);
            functionResult = null;
          }
          
          return {
            function_name: msg.function_name,
            function_args: functionArgs,
            function_result: functionResult,
            status: msg.function_result ? 'completed' : 'pending'
          };
        });

      return {
        ...finalResponse,
        function_calls: functionCalls,
        total_function_calls: functionCalls.length,
        test_results: finalResponse.test_results || []
      };
    } catch (error) {
      console.error('Error in chatWithAI:', error);
      throw error;
    }
  }

  private async executeRecursiveFunctionCalls(
    conversationId: string,
    tenantId: string,
    userId: string,
    conversationMessages: ChatMessage[],
    userMessage: string,
    agentKey: string | undefined,
    aiConfig: AiConfig,
    depth: number,
    executedFunctions: Set<string> = new Set()
  ): Promise<any> {
    // Safety check: prevent infinite loops and excessive function calls
    if (depth >= 10) {
      console.warn(`Maximum recursive depth (10) reached for conversation ${conversationId}`);
      const testResults = this.extractTestResultsFromMessages(conversationMessages);
      return {
        message: "I've reached the maximum number of function calls. Please try a simpler request or break it down into smaller steps.",
        warning: "Maximum recursive depth reached",
        test_results: testResults
      };
    }
    
    // HARD LIMIT: Maximum 3 function calls total - this is a strict limit
    if (executedFunctions.size >= 3) {
      console.warn(`HARD LIMIT: Maximum 3 function calls reached for conversation ${conversationId}`);
      const testResults = this.extractTestResultsFromMessages(conversationMessages);
      return {
        message: "I've completed the task with the available functions. Please let me know if you need anything else.",
        final_response: true,
        total_function_calls: executedFunctions.size,
        warning: "HARD LIMIT: Maximum 3 function calls reached",
        test_results: testResults
      };
    }
    
    // If we've already made 2 function calls, force the AI to provide a final response
    if (executedFunctions.size >= 2) {
      // Prepare messages for OpenAI without function calling
      const messages = this.prepareOpenAIMessages(conversationMessages, userMessage, agentKey);
      
      // Call OpenAI WITHOUT function calling to get final response
      const openaiResponse = await this.callOpenAI(messages, aiConfig, false); // Disable function calling
      
      // Save assistant message
      await this.messagesRepo.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: openaiResponse.content,
        function_name: null,
        function_args: null,
        function_result: null,
        tokens_used: openaiResponse.usage?.total_tokens || null
      });

      // Log AI usage
      if (openaiResponse.usage) {
        try {
          await this.aiUsageRepo.create({
            conversation_id: conversationId,
            message_id: conversationId, // Use conversation ID as message ID for simplicity
            tenant_id: tenantId,
            operation: 'chat',
            provider: aiConfig.provider,
            model: aiConfig.model,
            start_time: new Date().toISOString(),
            end_time: new Date().toISOString(),
            latency_ms: 0,
            usage_total_tokens: openaiResponse.usage.total_tokens,
            cost_total_usd: this.calculateCost(openaiResponse.usage, aiConfig.model),
            cost_currency: 'USD',
            status: 'success',
            function_calls: null,
            metadata: {}
          });
        } catch (usageError) {
          console.error('Error logging AI usage (continuing):', usageError);
        }
      }

      const testResults = this.extractTestResultsFromMessages(conversationMessages);
      return {
        message: openaiResponse.content,
        final_response: true,
        total_function_calls: executedFunctions.size,
        warning: "HARD LIMIT: Function calling disabled after 2 calls",
        test_results: testResults
      };
    }

    // Prepare messages for OpenAI
    const messages = this.prepareOpenAIMessages(conversationMessages, userMessage, agentKey);
    
    // Call OpenAI with function calling
    const openaiResponse = await this.callOpenAI(messages, aiConfig);
    
    // Save assistant message
    const assistantMessageId = await this.messagesRepo.create({
      conversation_id: conversationId,
      role: 'assistant',
      content: openaiResponse.content,
      function_name: openaiResponse.function_call?.name || null,
      function_args: openaiResponse.function_call?.arguments ? JSON.stringify(openaiResponse.function_call.arguments) : null,
      function_result: null,
      tokens_used: openaiResponse.usage?.total_tokens || null
    });

    // Log AI usage
    if (openaiResponse.usage) {
      try {
        await this.aiUsageRepo.create({
          conversation_id: conversationId,
          message_id: assistantMessageId,
          tenant_id: tenantId,
          operation: 'chat',
          provider: aiConfig.provider,
          model: aiConfig.model,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          latency_ms: 0,
          usage_total_tokens: openaiResponse.usage.total_tokens,
          cost_total_usd: this.calculateCost(openaiResponse.usage, aiConfig.model),
          cost_currency: 'USD',
          status: 'success',
          function_calls: openaiResponse.function_call ? [openaiResponse.function_call] : null,
          metadata: {}
        });
      } catch (usageError) {
        console.error('Error logging AI usage (continuing):', usageError);
      }
    }

    // If there's a function call, execute it and continue recursively
    if (openaiResponse.function_call) {
      // Create a unique key for this function call to prevent duplicates
      const functionCallKey = `${openaiResponse.function_call.name}_${JSON.stringify(openaiResponse.function_call.arguments)}`;
      
      // Check if we've already executed this exact function call
      if (executedFunctions.has(functionCallKey)) {
        console.warn(`Duplicate function call detected: ${functionCallKey}. Skipping to prevent infinite loops.`);
        const testResults = this.extractTestResultsFromMessages(conversationMessages);
        return {
          message: openaiResponse.content,
          final_response: true,
          total_function_calls: depth,
          warning: "Duplicate function call detected and skipped",
          test_results: testResults
        };
      }
      
      // Add this function call to our executed set
      executedFunctions.add(functionCallKey);
      
      const functionResult = await this.executeFunction(openaiResponse.function_call, tenantId, userId);
      
      // Update assistant message with function result
      await this.messagesRepo.update(assistantMessageId, {
        function_result: JSON.stringify(functionResult)
      });

      // Create function message
      await this.messagesRepo.create({
        conversation_id: conversationId,
        role: 'function',
        content: JSON.stringify(functionResult),
        function_name: openaiResponse.function_call.name,
        function_args: JSON.stringify(openaiResponse.function_call.arguments),
        function_result: null,
        tokens_used: null
      });

      // Get updated conversation messages for the next iteration
      const updatedMessages = await this.getConversationMessages(conversationId);
      
      // Continue recursively with the function result and updated executed functions set
      return await this.executeRecursiveFunctionCalls(
        conversationId,
        tenantId,
        userId,
        updatedMessages,
        userMessage, // Keep the original user message
        agentKey,
        aiConfig,
        depth + 1,
        executedFunctions // Pass the updated set
      );
    }

    // No more function calls, return the final response with test results
    const testResults = this.extractTestResultsFromMessages(conversationMessages);
    
    return {
      message: openaiResponse.content,
      final_response: true,
      total_function_calls: depth,
      test_results: testResults
    };
  }

  private extractTestResultsFromMessages(conversationMessages: ChatMessage[]): any[] {
    const testResults: any[] = [];
    
    conversationMessages.forEach(msg => {
      if (msg.role === 'function' && msg.function_name === 'add_tool_to_agent' && msg.function_result) {
        try {
          const functionResult = typeof msg.function_result === 'string' ? 
            JSON.parse(msg.function_result) : msg.function_result;
          
          if (functionResult.test_result) {
            testResults.push({
              tool_name: functionResult.agent_tool?.alias || 'Unknown Tool',
              test_success: functionResult.test_result.success,
              test_message: functionResult.test_result.message,
              test_params: functionResult.test_result.test_params,
              api_response: functionResult.test_result.api_response,
              error: functionResult.test_result.error
            });
          }
        } catch (e) {
          console.warn('Failed to parse function result for test results:', e);
        }
      }
    });
    
    return testResults;
  }

  private prepareOpenAIMessages(conversationMessages: ChatMessage[], userMessage: string, agentKey?: string): any[] {
    const systemPrompt = this.buildSystemPrompt(agentKey);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages.slice(-10).map(msg => {
        const message: any = {
          role: msg.role,
          content: msg.content
        };
        
        // Only assistant messages should have function_call
        if (msg.role === 'assistant' && msg.function_name) {
          message.function_call = { 
            name: msg.function_name, 
            arguments: msg.function_args || '{}' 
          };
        }
        
        // Function messages should have name and function_result
        if (msg.role === 'function' && msg.function_name) {
          message.name = msg.function_name;
          message.function_result = msg.function_result;
        }
        
        return message;
      }),
      { role: 'user', content: userMessage }
    ];

    return messages;
  }

  private buildSystemPrompt(agentKey?: string): string {
    let prompt = `You are an AI assistant that helps manage and improve AI agents, prompts, and tools. You have access to various functions to help you accomplish tasks.

Your capabilities include:
- Creating and updating agents
- Managing prompts for agents
- Adding and configuring tools for agents
- Reading existing configurations
- Analyzing and suggesting improvements

CRITICAL RULES - ALWAYS FOLLOW THESE:
1. NEVER rely on conversation memory or previous responses
2. ALWAYS call functions to get current information
3. ALWAYS call functions to make changes
4. NEVER provide generic responses without calling functions first
5. NEVER make duplicate function calls - each function should only be called once per task
6. BE EFFICIENT - minimize the number of function calls needed
7. MAXIMUM 3 FUNCTION CALLS TOTAL - this is a hard limit

IMPORTANT WORKFLOW FOR PROMPT UPDATES:
1. When asked to create or update a prompt, FIRST call get_prompt to see the current prompt
2. If there's an existing prompt and you want to update it, use update_prompt with the new content
3. If you encounter a database constraint error (like "duplicate key value violates unique constraint"), it means there's already an active prompt
4. In such cases, you should update the existing prompt rather than trying to create a new one
5. Always explain what you're doing and why

CRITICAL: You can make multiple function calls in sequence to complete a task, but be EXTREMELY efficient:
- Call get_prompt ONCE to get current state
- Call update_prompt ONCE to make changes
- Call get_prompt ONCE more to verify the update
- Do NOT repeat the same function calls multiple times
- MAXIMUM 3 FUNCTION CALLS TOTAL for most tasks

For example, if asked to "create a prompt for system support":
1. Call get_prompt ONCE to see the current prompt
2. Call update_prompt ONCE to update it with the new content
3. Call get_prompt ONCE more to verify the update
4. Provide a final summary of what was accomplished

IMPORTANT: Even if you think you know the current state, ALWAYS call get_prompt first to verify the current situation. Never assume or remember previous states.

TOOL CREATION AND TESTING:
- When you add a tool to an agent, the system automatically tests the tool after creation
- ALWAYS include the test results in your response to the user
- If test results show success, mention that the tool was created and tested successfully
- If test results show failure, explain what went wrong and suggest solutions
- Include details about what parameters were tested and the test outcome
- CRITICAL: Look for test_summary in function call results and display it prominently
- When you see test_summary in the function result, copy and paste it exactly as provided
- The test_summary contains formatted test results that should be shown to the user
- ALWAYS display the test_summary when it's available in the function result
- Even if a tool is already added (error message), still display the test_summary if available
- For already-added tools, mention that the tool was already present but show the test results
- MANDATORY: For EVERY function call that has a test_summary, you MUST include it in your response
- Do not summarize or paraphrase the test_summary - display it exactly as provided
- If you see multiple function calls with test_summary, display ALL of them

EFFICIENCY RULES:
- Each function should be called maximum ONCE per task
- If you get an error, fix it and continue, don't retry the same call
- Plan your function calls in advance to minimize redundancy
- Use the minimum number of calls needed to complete the task
- MAXIMUM 3 FUNCTION CALLS TOTAL - this is a hard limit

HARD LIMITS:
- Maximum 3 function calls per task
- Maximum 10 recursive depth
- No duplicate function calls
- No excessive function calls

Always be helpful, clear, and explain what you're doing. If you need to call a function, do so. If you encounter an error, explain what went wrong and suggest solutions.

Current context: ${agentKey ? `Working with agent: ${agentKey}` : 'No specific agent selected'}`;

    return prompt;
  }

  private async callOpenAI(messages: any[], aiConfig: AiConfig, enableFunctionCalling: boolean = true): Promise<any> {
    const OpenAI = await import('openai');
    
    const openai = new OpenAI.default({
      apiKey: aiConfig.apiKey,
    });

    const requestConfig: any = {
      model: aiConfig.model,
      messages,
      max_tokens: aiConfig.maxTokens,
      temperature: aiConfig.temperature,
    };

    // Only enable function calling if requested
    if (enableFunctionCalling) {
      requestConfig.tools = this.getAvailableFunctions().map(func => ({
        type: 'function',
        function: func
      }));
      requestConfig.tool_choice = 'auto';
    }

    const response = await openai.chat.completions.create(requestConfig);

    const choice = response.choices[0];
    if (!choice) {
      throw new Error('No response from OpenAI');
    }

    return {
      content: choice.message?.content || '',
      function_call: choice.message?.tool_calls?.[0] ? {
        name: choice.message.tool_calls[0].function.name,
        arguments: choice.message.tool_calls[0].function.arguments
      } : undefined,
      usage: response.usage
    };
  }

  private getAvailableFunctions(): any[] {
    return [
      {
        name: 'get_agent',
        description: 'Get details of a specific agent',
        parameters: {
          type: 'object',
          properties: {
            agent_key: {
              type: 'string',
              description: 'The key of the agent to retrieve'
            }
          },
          required: ['agent_key']
        }
      },
      {
        name: 'list_agents',
        description: 'List all available agents',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'integer',
              description: 'Maximum number of agents to return',
              default: 50
            }
          }
        }
      },
      {
        name: 'get_prompt',
        description: 'Get the current prompt for a specific agent',
        parameters: {
          type: 'object',
          properties: {
            agent_key: {
              type: 'string',
              description: 'The key of the agent to get the prompt for'
            },
            category: {
              type: 'string',
              description: 'The category of prompt to retrieve (base, initial_system)',
              default: 'base'
            }
          },
          required: ['agent_key']
        }
      },
      {
        name: 'update_prompt',
        description: 'Update or create a prompt for a specific agent. This function will automatically handle existing prompts by updating them if they exist, or creating new ones if they don\'t.',
        parameters: {
          type: 'object',
          properties: {
            agent_key: {
              type: 'string',
              description: 'The key of the agent to update'
            },
            category: {
              type: 'string',
              description: 'The category of prompt to update (base, initial_system)',
              default: 'base'
            },
            content: {
              type: 'string',
              description: 'The new prompt content'
            }
          },
          required: ['agent_key', 'content']
        }
      },
      {
        name: 'list_available_tools',
        description: 'List all available tools that can be added to agents',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter tools by category (optional)'
            }
          }
        }
      },
      {
        name: 'add_tool_to_agent',
        description: 'Add a tool to a specific agent',
        parameters: {
          type: 'object',
          properties: {
            agent_key: {
              type: 'string',
              description: 'The key of the agent to add the tool to'
            },
            tool_key: {
              type: 'string',
              description: 'The key of the tool to add'
            },
            alias: {
              type: 'string',
              description: 'Optional friendly name for the tool'
            },
            arg_defaults: {
              type: 'object',
              description: 'Default parameter values for the tool'
            }
          },
          required: ['agent_key', 'tool_key']
        }
      }
    ];
  }

  private async executeFunction(functionCall: any, tenantId: string, userId: string): Promise<any> {
    const { name, arguments: args } = functionCall;
    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

    try {
      switch (name) {
        case 'get_agent':
          return await this.getAgent(parsedArgs.agent_key);
        case 'list_agents':
          return await this.listAgents(parsedArgs.limit || 50);
        case 'get_prompt':
          return await this.getPrompt(parsedArgs.agent_key, parsedArgs.category || 'base');
        case 'update_prompt':
          return await this.updatePrompt(parsedArgs.agent_key, parsedArgs.category || 'base', parsedArgs.content);
        case 'list_available_tools':
          return await this.listAvailableTools(parsedArgs.category);
        case 'add_tool_to_agent':
          return await this.addToolToAgent(parsedArgs.agent_key, parsedArgs.tool_key, parsedArgs.alias, parsedArgs.arg_defaults);
        default:
          throw new Error(`Unknown function: ${name}`);
      }
    } catch (error) {
      console.error(`Error executing function ${name}:`, error);
      return { error: error.message };
    }
  }

  private calculateCost(usage: any, model: string): number {
    // Simplified cost calculation - you can make this more sophisticated
    const costPer1kTokens = {
      'gpt-4o': 0.005,
      'gpt-4o-mini': 0.00015,
      'gpt-4': 0.03,
      'gpt-3.5-turbo': 0.002
    };
    
    const costPerToken = (costPer1kTokens[model] || 0.002) / 1000;
    return usage.total_tokens * costPerToken;
  }

  private generateAIFunctionConfig(tool: any, alias?: string): {
    function_name: string;
    function_description: string;
    function_parameters: any;
    parameter_mapping: any;
  } {
    const toolName = alias || tool.name;
    const toolKey = tool.tool_key;
    const inputSchema = tool.input_schema || { type: 'object', properties: {} };
    
    // Generate AI-friendly function name (lowercase, underscores, no spaces)
    const functionName = this.generateFunctionName(toolName, toolKey);
    
    // Generate AI-friendly function description
    const functionDescription = this.generateFunctionDescription(toolName, toolKey, inputSchema);
    
    // Generate AI function parameters from input_schema
    const functionParameters = this.generateFunctionParameters(inputSchema);
    
    // Generate parameter mapping (AI param -> tool param)
    const parameterMapping = this.generateParameterMapping(inputSchema);
    
    return {
      function_name: functionName,
      function_description: functionDescription,
      function_parameters: functionParameters,
      parameter_mapping: parameterMapping
    };
  }

  private generateFunctionName(toolName: string, toolKey: string): string {
    // Use tool key as base, but make it more AI-friendly
    const keyParts = toolKey.split('.');
    const lastPart = keyParts[keyParts.length - 1];
    
    // Convert camelCase to snake_case
    return lastPart
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  private generateFunctionDescription(toolName: string, toolKey: string, inputSchema: any): string {
    const category = toolKey.split('.')[0];
    const requiredParams = inputSchema.required || [];
    const paramCount = requiredParams.length;
    
    let description = `${toolName}`;
    
    // Add context based on category
    switch (category) {
      case 'skill':
        if (toolKey.includes('rag') || toolKey.includes('search')) {
          description += ' - Search and retrieve information from knowledge base';
        } else if (toolKey.includes('http') || toolKey.includes('api')) {
          description += ' - Make HTTP requests to external APIs';
        } else if (toolKey.includes('file') || toolKey.includes('fs')) {
          description += ' - Read or write files';
        } else if (toolKey.includes('time')) {
          description += ' - Get current time and date information';
        } else if (toolKey.includes('text')) {
          description += ' - Process and analyze text content';
        } else if (toolKey.includes('data')) {
          description += ' - Parse and process data formats';
        } else if (toolKey.includes('geo') || toolKey.includes('location')) {
          description += ' - Find locations and geographic information';
        } else if (toolKey.includes('web')) {
          description += ' - Browse web pages and extract content';
        } else {
          description += ' - Execute specialized functionality';
        }
        break;
      case 'core':
        description += ' - Core system functionality';
        break;
      case 'ui':
        description += ' - User interface interaction';
        break;
      default:
        description += ' - Tool functionality';
    }
    
    // Add parameter context
    if (paramCount > 0) {
      description += `. Requires ${paramCount} parameter${paramCount > 1 ? 's' : ''}`;
    }
    
    return description;
  }

  private generateFunctionParameters(inputSchema: any): any {
    const properties = inputSchema.properties || {};
    const required = inputSchema.required || [];
    
    const aiProperties: any = {};
    const aiRequired: string[] = [];
    
    // Generate AI-friendly parameter names and types
    Object.keys(properties).forEach((paramName, index) => {
      const param = properties[paramName];
      const aiParamName = this.generateAIParameterName(paramName, index);
      
      const mappedType = this.mapParameterType(param.type);
      const base: any = {
        type: mappedType,
        description: this.generateParameterDescription(paramName, param)
      };

      // Ensure array schemas include items, fallback to string if unspecified
      if (mappedType === 'array') {
        const itemType = param?.items?.type ? this.mapParameterType(param.items.type) : 'string';
        base.items = param?.items ? { ...(typeof param.items === 'object' ? param.items : {}), type: itemType } : { type: itemType };
      }

      aiProperties[aiParamName] = base;
      
      // Add enum values if present
      if (param.enum) {
        aiProperties[aiParamName].enum = param.enum;
      }
      
      // Mark as required if in required array
      if (required.includes(paramName)) {
        aiRequired.push(aiParamName);
      }
    });
    
    return {
      type: 'object',
      properties: aiProperties,
      required: aiRequired
    };
  }

  private generateAIParameterName(paramName: string, index: number): string {
    // Convert parameter names to AI-friendly format
    const nameMap: { [key: string]: string } = {
      'text_query': 'query',
      'csvData': 'data',
      'newIntention': 'intention',
      'targetAgent': 'agent',
      'request_body': 'body',
      'file_path': 'path',
      'file_content': 'content',
      'url': 'url',
      'location': 'location',
      'radius': 'radius',
      'method': 'method',
      'headers': 'headers',
      'format': 'format',
      'timezone': 'timezone',
      'action': 'action',
      'key': 'key',
      'value': 'value',
      'reason': 'reason',
      'context': 'context',
      'summary': 'summary',
      'type': 'type',
      'delimiter': 'delimiter',
      'hasHeader': 'has_header',
      'body': 'body',
      'path': 'path'
    };
    
    // Use mapped name if available, otherwise use generic name
    return nameMap[paramName] || `param_${index + 1}`;
  }

  private mapParameterType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'object': 'object',
      'array': 'array'
    };
    
    return typeMap[type] || 'string';
  }

  private generateParameterDescription(paramName: string, param: any): string {
    // Generate helpful descriptions based on parameter name and type
    const descriptions: { [key: string]: string } = {
      'query': 'The search query or question to process',
      'data': 'The data to process or analyze',
      'intention': 'The new intention or goal to set',
      'agent': 'The target agent to transfer to',
      'body': 'The request body or content to send',
      'path': 'The file path or URL path to access',
      'content': 'The content to write or process',
      'url': 'The URL to access or process',
      'location': 'The location or address to search',
      'radius': 'The search radius in meters',
      'method': 'The HTTP method to use',
      'headers': 'HTTP headers to include',
      'format': 'The format for the output',
      'timezone': 'The timezone to use',
      'action': 'The action to perform',
      'key': 'The key or identifier',
      'value': 'The value to set or retrieve',
      'reason': 'The reason for the action',
      'context': 'Additional context information',
      'summary': 'A summary of the action',
      'type': 'The type or category',
      'delimiter': 'The delimiter character',
      'has_header': 'Whether the data has a header row'
    };
    
    return descriptions[paramName] || `The ${paramName} parameter`;
  }

  private generateParameterMapping(inputSchema: any): any {
    const properties = inputSchema.properties || {};
    const mapping: any = {};
    
    // Create mapping from AI parameter names to tool parameter names
    Object.keys(properties).forEach((paramName, index) => {
      const aiParamName = this.generateAIParameterName(paramName, index);
      mapping[aiParamName] = paramName;
    });
    
    return mapping;
  }

  // Function implementations
  private async getAgent(agentKey: string): Promise<any> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM agents WHERE agent_key = $1',
        [agentKey]
      );
      return result.rows[0] || { error: 'Agent not found' };
    } catch (error) {
      console.error('Error getting agent:', error);
      return { error: error.message };
    }
  }

  private async listAgents(limit: number = 50): Promise<any> {
    try {
      const result = await this.pool.query(
        'SELECT agent_key, name, public_description, is_enabled, is_default FROM agents ORDER BY is_default DESC, name ASC LIMIT $1',
        [limit]
      );
      return { agents: result.rows };
    } catch (error) {
      console.error('Error listing agents:', error);
      return { error: error.message };
    }
  }

  private async getPrompt(agentKey: string, category: string = 'base'): Promise<any> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM agent_prompts WHERE agent_key = $1 AND category = $2 ORDER BY version DESC LIMIT 1',
        [agentKey, category]
      );
      return result.rows[0] || { error: 'Prompt not found' };
    } catch (error) {
      console.error('Error getting prompt:', error);
      return { error: error.message };
    }
  }

  private async updatePrompt(agentKey: string, category: string = 'base', content: string): Promise<any> {
    try {
      // First, deactivate any existing active prompts for this agent and category
      await this.pool.query(
        `UPDATE agent_prompts 
         SET is_published = false, updated_at = now() 
         WHERE agent_key = $1 AND category = $2 AND is_published = true`,
        [agentKey, category]
      );
      
      // Get current prompt to increment version
      const currentPrompt = await this.getPrompt(agentKey, category);
      const newVersion = currentPrompt.version ? currentPrompt.version + 1 : 1;
      
      // Now insert the new prompt
      const result = await this.pool.query(
        `INSERT INTO agent_prompts (agent_key, category, content, version, tenant_id, locale, is_published, metadata) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [agentKey, category, content, newVersion, 'acc44cdb-8da5-4226-9569-1233a39f564f', 'en', true, '{}']
      );
      
      return { 
        success: true, 
        prompt: result.rows[0],
        message: `Updated ${category} prompt for agent ${agentKey} to version ${newVersion}`
      };
    } catch (error) {
      console.error('Error updating prompt:', error);
      return { error: error.message };
    }
  }

  private async listAvailableTools(category?: string): Promise<any> {
    try {
      let query = 'SELECT * FROM tool_registry WHERE is_enabled = true';
      const params: any[] = [];
      
      if (category) {
        query += ' AND category = $1';
        params.push(category);
      }
      
      query += ' ORDER BY name ASC';
      
      const result = await this.pool.query(query, params);
      return { tools: result.rows };
    } catch (error) {
      console.error('Error listing tools:', error);
      return { error: error.message };
    }
  }

  private async addToolToAgent(agentKey: string, toolKey: string, alias?: string, argDefaults?: any): Promise<any> {
    try {
      // First check if the agent exists
      const agent = await this.getAgent(agentKey);
      if (agent.error) {
        return { error: `Agent not found: ${agentKey}` };
      }

      // Check if the tool exists
      const toolResult = await this.pool.query(
        'SELECT * FROM tool_registry WHERE tool_key = $1 AND is_enabled = true',
        [toolKey]
      );
      
      if (toolResult.rows.length === 0) {
        return { error: `Tool not found: ${toolKey}` };
      }

      const tool = toolResult.rows[0];

      // Check if tool is already added to agent
      const existingTool = await this.pool.query(
        'SELECT * FROM agent_tools WHERE agent_key = $1 AND tool_key = $2',
        [agentKey, toolKey]
      );

      if (existingTool.rows.length > 0) {
        // Tool already exists, but let's test it to show current functionality
        const existingToolData = existingTool.rows[0];
        const testResult = await this.testToolAfterCreation(existingToolData, tool);
        
        return { 
          error: `Tool ${toolKey} is already added to agent ${agentKey}`,
          agent_tool: existingToolData,
          test_result: testResult,
          test_summary: `🔧 Tool Test Results (Already Added):
✅ Tool: ${tool.name} - Test Status: ${testResult.success ? 'SUCCESS' : 'FAILED'}
📋 Test Parameters: ${JSON.stringify(testResult.test_params || {})}
📊 Test Outcome: ${testResult.message}
🎯 API Response: ${JSON.stringify(testResult.api_response || {})}`
        };
      }

      // Get the next position for the tool
      const positionResult = await this.pool.query(
        'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM agent_tools WHERE agent_key = $1',
        [agentKey]
      );
      const nextPosition = positionResult.rows[0].next_position;

      // Generate AI function parameters from tool's input_schema
      const aiFunctionConfig = this.generateAIFunctionConfig(tool, alias);

      // Add tool to agent with AI function parameters
      const result = await this.pool.query(
        `INSERT INTO agent_tools (agent_key, tool_key, alias, arg_defaults, arg_templates, guardrails, position, tenant_id, function_name, function_description, function_parameters, parameter_mapping) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
         RETURNING *`,
        [
          agentKey, 
          toolKey, 
          alias || tool.name,
          argDefaults ? JSON.stringify(argDefaults) : '{}',
          '{}', // arg_templates
          '{}', // guardrails
          nextPosition,
          '00000000-0000-0000-0000-000000000000', // default tenant
          aiFunctionConfig.function_name,
          aiFunctionConfig.function_description,
          JSON.stringify(aiFunctionConfig.function_parameters),
          JSON.stringify(aiFunctionConfig.parameter_mapping)
        ]
      );

      const createdTool = result.rows[0];

      // Test the tool after creation to confirm it works properly
      const testResult = await this.testToolAfterCreation(createdTool, tool);

      return {
        success: true,
        agent_tool: createdTool,
        test_result: testResult,
        message: `Successfully added tool ${tool.name} to agent ${agentKey} with AI function parameters${testResult.success ? ' and verified functionality' : ' but test failed'}`,
        test_summary: `🔧 Tool Test Results:
✅ Tool: ${tool.name} - Test Status: ${testResult.success ? 'SUCCESS' : 'FAILED'}
📋 Test Parameters: ${JSON.stringify(testResult.test_params || {})}
📊 Test Outcome: ${testResult.message}
🎯 API Response: ${JSON.stringify(testResult.api_response || {})}`
      };
    } catch (error) {
      console.error('Error adding tool to agent:', error);
      return { error: error.message };
    }
  }

  private async testToolAfterCreation(agentTool: any, toolRegistry: any): Promise<any> {
    try {
      // Generate test parameters based on the AI function parameters
      const testParams = this.generateTestParameters(agentTool.function_parameters);
      
      if (!testParams || Object.keys(testParams).length === 0) {
        return {
          success: true,
          message: "Tool created successfully - no parameters to test",
          test_params: {},
          api_response: null
        };
      }

      // Generate the API call body using parameter mapping
      const requestBody = this.generateTestRequestBody(testParams, agentTool.parameter_mapping);

      // Make a test API call to verify the tool works
      const testResponse = await this.makeTestAPICall(toolRegistry, requestBody);

      return {
        success: testResponse.success,
        message: testResponse.success ? "Tool test successful" : `Tool test failed: ${testResponse.error}`,
        test_params: testParams,
        api_response: testResponse.response,
        error: testResponse.error
      };
    } catch (error) {
      console.error('Error testing tool after creation:', error);
      return {
        success: false,
        message: `Tool test failed: ${error.message}`,
        test_params: {},
        api_response: null,
        error: error.message
      };
    }
  }

  private generateTestParameters(functionParameters: any): any {
    if (!functionParameters || !functionParameters.properties) {
      return {};
    }

    const testParams: any = {};
    const properties = functionParameters.properties;
    const required = functionParameters.required || [];

    Object.keys(properties).forEach(paramName => {
      const param = properties[paramName];
      
      // Generate appropriate test values based on parameter type and name
      if (required.includes(paramName)) {
        testParams[paramName] = this.generateTestValue(paramName, param);
      }
    });

    return testParams;
  }

  private generateTestValue(paramName: string, param: any): any {
    // Generate appropriate test values based on parameter name and type
    const testValues: { [key: string]: any } = {
      'query': 'test query',
      'data': 'test data',
      'intention': 'test intention',
      'agent': 'test-agent',
      'body': { test: 'data' },
      'path': '/test/path',
      'content': 'test content',
      'url': 'https://example.com',
      'location': 'test location',
      'radius': 1000,
      'method': 'GET',
      'headers': { 'Content-Type': 'application/json' },
      'format': 'json',
      'timezone': 'UTC',
      'action': 'get',
      'key': 'test_key',
      'value': 'test_value',
      'reason': 'test reason',
      'context': 'test context',
      'summary': 'test summary',
      'type': 'test',
      'delimiter': ',',
      'has_header': true
    };

    // Use specific test value if available
    if (testValues[paramName]) {
      return testValues[paramName];
    }

    // Generate based on type
    switch (param.type) {
      case 'string':
        return param.enum ? param.enum[0] : 'test string';
      case 'number':
        return 123;
      case 'boolean':
        return true;
      case 'object':
        return { test: 'object' };
      case 'array':
        return ['test', 'array'];
      default:
        return 'test value';
    }
  }

  private generateTestRequestBody(testParams: any, parameterMapping: any): any {
    if (!parameterMapping) {
      return testParams;
    }

    const requestBody: any = {};
    
    Object.keys(testParams).forEach(aiParam => {
      const toolParam = parameterMapping[aiParam];
      if (toolParam) {
        requestBody[toolParam] = testParams[aiParam];
      } else {
        requestBody[aiParam] = testParams[aiParam];
      }
    });

    return requestBody;
  }

  private async makeTestAPICall(toolRegistry: any, requestBody: any): Promise<any> {
    try {
      // Use skill handler execution instead of simulation
      const baseUrl = process.env.APP_URL || 'http://localhost:3001';
      
      // Create a temporary tool configuration for testing
      const tempToolConfig = {
        id: `temp-${Date.now()}`,
        tool_key: toolRegistry.tool_key,
        function_name: toolRegistry.name || 'testFunction',
        parameter_mapping: null, // Will be applied by the skill handler
        arg_defaults: {},
        overrides: {}
      };

      // Call the skill handler test endpoint
      const response = await fetch(`${baseUrl}/api/admin/tool-test/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'test-user'
        },
        body: JSON.stringify({
          toolId: tempToolConfig.id,
          testParams: requestBody,
          toolConfig: tempToolConfig
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: result.success,
        response: result.result,
        executionTime: result.executionTime,
        parameterMapping: result.parameterMapping
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        response: null
      };
    }
  }

  async addMessage(conversationId: string, message: ChatMessage): Promise<string> {
    const messageId = await this.messagesRepo.create({
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      function_name: message.function_name || null,
      function_args: message.function_args || null,
      function_result: message.function_result || null,
      tokens_used: message.tokens_used || null
    });

    return messageId;
  }

  async getConversationMemory(conversationId: string): Promise<Record<string, any>> {
    // This would be implemented with the memory repository
    // For now, return empty object
    return {};
  }

  async updateConversationMemory(conversationId: string, key: string, value: any): Promise<void> {
    // This would be implemented with the memory repository
    // For now, no-op
  }

  async logAiUsage(usageData: {
    conversationId: string;
    messageId: string;
    tenantId: string;
    operation: string;
    provider: string;
    model: string;
    startTime: string;
    endTime: string;
    latencyMs: number;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    cost?: {
      inputUsd?: number;
      outputUsd?: number;
      totalUsd?: number;
    };
    status?: string;
    errorMessage?: string;
    functionCalls?: any;
  }): Promise<string> {
    return await this.aiUsageRepo.create({
      conversation_id: usageData.conversationId,
      message_id: usageData.messageId,
      tenant_id: usageData.tenantId,
      operation: usageData.operation,
      provider: usageData.provider,
      model: usageData.model,
      start_time: usageData.startTime,
      end_time: usageData.endTime,
      latency_ms: usageData.latencyMs,
      usage_input_tokens: usageData.usage?.inputTokens || null,
      usage_output_tokens: usageData.usage?.outputTokens || null,
      usage_total_tokens: usageData.usage?.totalTokens || null,
      cost_input_usd: usageData.cost?.inputUsd || null,
      cost_output_usd: usageData.cost?.outputUsd || null,
      cost_total_usd: usageData.cost?.totalUsd || null,
      cost_currency: 'USD',
      status: usageData.status || 'success',
      error_message: usageData.errorMessage || null,
      function_calls: usageData.functionCalls || null,
      metadata: {}
    });
  }

  async getUsageSummary(conversationId: string) {
    return await this.aiUsageRepo.getUsageSummary(conversationId);
  }

  async getTenantUsageSummary(tenantId: string, fromDate?: string, toDate?: string) {
    return await this.aiUsageRepo.getTenantUsageSummary(tenantId, fromDate, toDate);
  }

  async listConversations(tenantId: string, limit = 50, offset = 0) {
    return await this.conversationsRepo.listByTenant(tenantId, limit, offset);
  }

  async listConversationsByUser(userId: string, limit = 50, offset = 0) {
    return await this.conversationsRepo.listByUser(userId, limit, offset);
  }

  async updateConversation(conversationId: string, updates: {
    title?: string;
    status?: string;
    metadata?: any;
  }) {
    await this.conversationsRepo.update(conversationId, updates);
  }

  async archiveConversation(conversationId: string) {
    await this.conversationsRepo.archive(conversationId);
  }

  async deleteConversation(conversationId: string) {
    // First delete all AI usage records associated with this conversation
    await this.aiUsageRepo.deleteByConversation(conversationId);
    // Then delete all messages associated with this conversation
    await this.messagesRepo.deleteByConversation(conversationId);
    // Finally delete the conversation itself
    await this.conversationsRepo.delete(conversationId);
  }

  async getConversationHistory(conversationId: string, limit = 50) {
    return await this.messagesRepo.getConversationHistory(conversationId, limit);
  }

  async getRecentMessages(conversationId: string, count = 10) {
    return await this.messagesRepo.getRecentMessages(conversationId, count);
  }

  async getTokenUsage(conversationId: string) {
    return await this.messagesRepo.getTokenUsage(conversationId);
  }

  async getFunctionCalls(conversationId: string) {
    return await this.messagesRepo.getFunctionCalls(conversationId);
  }
}
