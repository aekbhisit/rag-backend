/**
 * AI Function Execution Test Suite
 * Tests the complete flow: AI Function Call → DB Tool Lookup → Parameter Mapping → Skill Handler Execution
 */

import { Pool } from 'pg';
import { SKILL_HANDLERS } from './index';

// Test configuration
const TEST_CONFIG = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rag_assistant',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  testAgent: 'test-agent-execution',
  testTimeout: 30000
};

// Test data interfaces
interface TestFunctionCall {
  function: {
    name: string;
    arguments: string;
  };
  expectedResult?: any;
  expectedError?: string;
}

interface TestToolConfig {
  agent_key: string;
  tool_key: string;
  function_name: string;
  function_description: string;
  function_parameters: any;
  parameter_mapping: any;
  enabled: boolean;
}

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  result?: any;
  error?: string;
  details?: any;
}

class AIFunctionExecutionTester {
  private pool: Pool;
  private testResults: TestResult[] = [];

  constructor() {
    this.pool = new Pool(TEST_CONFIG.database);
  }

  async setup(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    // Create test agent
    await this.createTestAgent();
    
    // Create test tools
    await this.createTestTools();
    
    console.log('✅ Test environment setup complete');
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test environment...');
    
    // Remove test data
    await this.pool.query('DELETE FROM agent_tools WHERE agent_key = $1', [TEST_CONFIG.testAgent]);
    await this.pool.query('DELETE FROM agents WHERE agent_key = $1', [TEST_CONFIG.testAgent]);
    
    await this.pool.end();
    console.log('✅ Cleanup complete');
  }

  private async createTestAgent(): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO agents (agent_key, name, public_description, is_enabled, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (agent_key) DO NOTHING
      `, [TEST_CONFIG.testAgent, 'Test Agent', 'Test agent for function execution', true, '00000000-0000-0000-0000-000000000000']);
    } catch (error) {
      console.warn('Test agent creation failed:', error);
    }
  }

  private async createTestTools(): Promise<void> {
    const testTools: Partial<TestToolConfig>[] = [
      {
        agent_key: TEST_CONFIG.testAgent,
        tool_key: 'skill.http.request',
        function_name: 'httpRequest',
        function_description: 'Make HTTP request',
        function_parameters: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            method: { type: 'string' }
          },
          required: ['url']
        },
        parameter_mapping: {
          url: 'url',
          method: 'method'
        },
        enabled: true
      },
      {
        agent_key: TEST_CONFIG.testAgent,
        tool_key: 'skill.text.summarize',
        function_name: 'summarizeText',
        function_description: 'Summarize text content',
        function_parameters: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            maxLength: { type: 'number' }
          },
          required: ['text']
        },
        parameter_mapping: {
          text: 'text',
          maxLength: 'maxLength'
        },
        enabled: true
      },
      {
        agent_key: TEST_CONFIG.testAgent,
        tool_key: 'skill.time.now',
        function_name: 'getCurrentTime',
        function_description: 'Get current time',
        function_parameters: {
          type: 'object',
          properties: {
            format: { type: 'string' }
          }
        },
        parameter_mapping: null, // No mapping needed
        enabled: true
      },
      {
        agent_key: TEST_CONFIG.testAgent,
        tool_key: 'core.intentionChange',
        function_name: 'changeIntention',
        function_description: 'Change user intention',
        function_parameters: {
          type: 'object',
          properties: {
            newIntention: { type: 'string' }
          },
          required: ['newIntention']
        },
        parameter_mapping: {
          newIntention: 'newIntention'
        },
        enabled: true
      }
    ];

    for (const tool of testTools) {
      try {
        // First delete any existing tool with same agent_key and tool_key
        await this.pool.query(`
          DELETE FROM agent_tools 
          WHERE agent_key = $1 AND tool_key = $2 AND tenant_id = $3 AND locale = $4
        `, [tool.agent_key, tool.tool_key, '00000000-0000-0000-0000-000000000000', 'en']);
        
        await this.pool.query(`
          INSERT INTO agent_tools (
            agent_key, tool_key, function_name, function_description, 
            function_parameters, parameter_mapping, enabled, position, tenant_id, locale
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          tool.agent_key,
          tool.tool_key,
          tool.function_name,
          tool.function_description,
          JSON.stringify(tool.function_parameters),
          tool.parameter_mapping ? JSON.stringify(tool.parameter_mapping) : null,
          tool.enabled,
          0,
          '00000000-0000-0000-0000-000000000000',
          'en'
        ]);
      } catch (error) {
        console.warn(`Test tool creation failed for ${tool.function_name}:`, error);
      }
    }
  }

  async runTest(testName: string, testFunction: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    console.log(`🧪 Running test: ${testName}`);
    
    try {
      const result = await Promise.race([
        testFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), TEST_CONFIG.testTimeout)
        )
      ]);
      
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        testName,
        success: true,
        duration,
        result
      };
      
      this.testResults.push(testResult);
      console.log(`✅ Test passed: ${testName} (${duration}ms)`);
      return testResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.testResults.push(testResult);
      console.log(`❌ Test failed: ${testName} (${duration}ms) - ${testResult.error}`);
      return testResult;
    }
  }

  // Test 1: Database Tool Retrieval
  async testDatabaseToolRetrieval(): Promise<any> {
    const result = await this.pool.query(`
      SELECT * FROM agent_tools 
      WHERE agent_key = $1 AND enabled = true 
      ORDER BY position ASC
    `, [TEST_CONFIG.testAgent]);
    
    if (result.rows.length === 0) {
      throw new Error('No tools found for test agent');
    }
    
    return {
      toolsFound: result.rows.length,
      tools: result.rows.map(row => ({
        function_name: row.function_name,
        tool_key: row.tool_key,
        enabled: row.enabled
      }))
    };
  }

  // Test 2: Parameter Mapping
  async testParameterMapping(): Promise<any> {
    const toolConfig = await this.pool.query(`
      SELECT function_name, parameter_mapping FROM agent_tools 
      WHERE agent_key = $1 AND function_name = $2
    `, [TEST_CONFIG.testAgent, 'summarizeText']);
    
    if (toolConfig.rows.length === 0) {
      throw new Error('Test tool not found');
    }
    
    const mapping = toolConfig.rows[0].parameter_mapping;
    const aiArgs = { text: 'test text to summarize', maxLength: 100 };
    
    // Apply parameter mapping
    let mappedArgs = aiArgs;
    if (mapping) {
      const mappingObj = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;
      mappedArgs = {};
      for (const [aiKey, realKey] of Object.entries(mappingObj)) {
        if (aiKey in aiArgs) {
          mappedArgs[realKey] = aiArgs[aiKey];
        }
      }
    }
    
    return {
      originalArgs: aiArgs,
      mapping: mapping,
      mappedArgs: mappedArgs
    };
  }

  // Test 3: Skill Handler Execution
  async testSkillHandlerExecution(): Promise<any> {
    // Test web search handler
    const webSearchResult = await SKILL_HANDLERS.webSearch({
      searchQuery: 'artificial intelligence trends 2024',
      maxResults: 3
    });
    
    // Test time now handler
    const timeResult = await SKILL_HANDLERS.timeNow({});
    
    return {
      webSearch: webSearchResult,
      timeNow: timeResult
    };
  }

  // Test 4: Complete Function Call Execution
  async testCompleteFunctionCallExecution(): Promise<any> {
    const functionCall: TestFunctionCall = {
      function: {
        name: 'httpRequest',
        arguments: JSON.stringify({
          url: 'https://api.example.com/data',
          method: 'GET'
        })
      }
    };
    
    // Step 1: Get tool configuration from database
    const toolConfig = await this.pool.query(`
      SELECT * FROM agent_tools 
      WHERE agent_key = $1 AND function_name = $2 AND enabled = true
    `, [TEST_CONFIG.testAgent, functionCall.function.name]);
    
    if (toolConfig.rows.length === 0) {
      throw new Error(`Tool not found: ${functionCall.function.name}`);
    }
    
    const tool = toolConfig.rows[0];
    
    // Step 2: Parse AI arguments
    const aiArgs = JSON.parse(functionCall.function.arguments);
    
    // Step 3: Apply parameter mapping
    let mappedArgs = aiArgs;
    if (tool.parameter_mapping) {
      const mapping = typeof tool.parameter_mapping === 'string' 
        ? JSON.parse(tool.parameter_mapping) 
        : tool.parameter_mapping;
      
      mappedArgs = {};
      for (const [aiKey, realKey] of Object.entries(mapping)) {
        if (aiKey in aiArgs) {
          mappedArgs[realKey] = aiArgs[aiKey];
        }
      }
    }
    
    // Step 4: Execute skill handler
    const skillHandler = SKILL_HANDLERS.httpRequest;
    const executionResult = await skillHandler(mappedArgs);
    
    return {
      functionCall: functionCall,
      toolConfig: {
        function_name: tool.function_name,
        tool_key: tool.tool_key,
        parameter_mapping: tool.parameter_mapping
      },
      aiArgs: aiArgs,
      mappedArgs: mappedArgs,
      executionResult: executionResult
    };
  }

  // Test 5: Error Handling
  async testErrorHandling(): Promise<any> {
    const errorTests = [];
    
    // Test 1: Invalid function name
    try {
      const invalidTool = await this.pool.query(`
        SELECT * FROM agent_tools 
        WHERE agent_key = $1 AND function_name = $2
      `, [TEST_CONFIG.testAgent, 'nonExistentFunction']);
      
      errorTests.push({
        test: 'Invalid function name',
        success: invalidTool.rows.length === 0,
        result: 'No tool found as expected'
      });
    } catch (error) {
      errorTests.push({
        test: 'Invalid function name',
        success: false,
        error: error.message
      });
    }
    
    // Test 2: Invalid JSON arguments
    try {
      JSON.parse('invalid json');
      errorTests.push({
        test: 'Invalid JSON arguments',
        success: false,
        error: 'Should have thrown error'
      });
    } catch (error) {
      errorTests.push({
        test: 'Invalid JSON arguments',
        success: true,
        result: 'JSON parse error caught as expected'
      });
    }
    
    // Test 3: Skill handler error
    try {
      await SKILL_HANDLERS.webSearch({}); // Missing required parameter
      errorTests.push({
        test: 'Missing required parameter',
        success: false,
        error: 'Should have thrown error'
      });
    } catch (error) {
      errorTests.push({
        test: 'Missing required parameter',
        success: true,
        result: 'Error caught as expected'
      });
    }
    
    return { errorTests };
  }

  // Test 6: Performance Test
  async testPerformance(): Promise<any> {
    const iterations = 10;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      // Simulate complete function call execution
      const toolConfig = await this.pool.query(`
        SELECT * FROM agent_tools 
        WHERE agent_key = $1 AND function_name = $2
      `, [TEST_CONFIG.testAgent, 'httpRequest']);
      
      const aiArgs = { url: `https://api.example.com/test${i}`, method: 'GET' };
      await SKILL_HANDLERS.httpRequest(aiArgs);
      
      const duration = Date.now() - startTime;
      times.push(duration);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      iterations,
      averageTime: avgTime,
      minTime,
      maxTime,
      allTimes: times
    };
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting AI Function Execution Test Suite...\n');
    
    await this.setup();
    
    try {
      // Run all tests
      await this.runTest('Database Tool Retrieval', () => this.testDatabaseToolRetrieval());
      await this.runTest('Parameter Mapping', () => this.testParameterMapping());
      await this.runTest('Skill Handler Execution', () => this.testSkillHandlerExecution());
      await this.runTest('Complete Function Call Execution', () => this.testCompleteFunctionCallExecution());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      await this.runTest('Performance Test', () => this.testPerformance());
      
      // Generate report
      this.generateReport();
      
    } finally {
      await this.cleanup();
    }
  }

  private generateReport(): void {
    console.log('\n📊 Test Report');
    console.log('='.repeat(50));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${(totalDuration / totalTests).toFixed(2)}ms`);
    
    console.log('\n📋 Test Details:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.testName} (${result.duration}ms)`);
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    if (failedTests > 0) {
      console.log('\n❌ Some tests failed. Check the details above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Export for use in other test files
export { AIFunctionExecutionTester, TestFunctionCall, TestToolConfig, TestResult };

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new AIFunctionExecutionTester();
  tester.runAllTests().catch(console.error);
}
